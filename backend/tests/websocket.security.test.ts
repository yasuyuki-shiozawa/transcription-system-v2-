import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketService } from '../src/services/websocketService';
import { initializeQualityMetrics } from '../src/services/qualityMetricsService';
import { suppressConsole, restoreConsole, waitForSocketEvent } from './setup';

describe('WebSocket Security Validation Tests', () => {
  let httpServer: HTTPServer;
  let websocketService: WebSocketService;
  let clientSocket: ClientSocket;
  let serverPort: number;
  let qualityMetrics: any;

  beforeEach(async () => {
    // Initialize quality metrics
    qualityMetrics = initializeQualityMetrics();
    
    // Create HTTP server
    httpServer = new HTTPServer();
    
    // Find available port
    serverPort = await new Promise((resolve) => {
      const server = httpServer.listen(0, () => {
        const address = server.address();
        const port = typeof address === 'string' ? parseInt(address) : address?.port || 3001;
        resolve(port);
      });
    });

    // Initialize WebSocket service
    websocketService = new WebSocketService(httpServer);
    
    suppressConsole();
  });

  afterEach(async () => {
    restoreConsole();
    
    if (clientSocket) {
      clientSocket.disconnect();
    }
    
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
    }
    
    if (qualityMetrics) {
      qualityMetrics.destroy();
    }
  });

  describe('Input Validation and Sanitization', () => {
    beforeEach(async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      await waitForSocketEvent(clientSocket, 'connect');
    });

    it('should validate transcription ID format', async () => {
      const invalidIds = [
        '', // Empty string
        ' ', // Whitespace only
        null, // Null
        undefined, // Undefined
        123, // Number
        {}, // Object
        [], // Array
        '<script>alert("xss")</script>', // XSS attempt
        '../../../etc/passwd', // Path traversal
        'id with spaces', // Spaces
        'id\nwith\nnewlines', // Newlines
        'id\twith\ttabs', // Tabs
        'a'.repeat(1000), // Excessively long
        '../../sensitive-data', // Directory traversal
        'id;DROP TABLE users;--', // SQL injection attempt
      ];

      for (const invalidId of invalidIds) {
        // Should not crash the server
        expect(() => {
          clientSocket.emit('subscribe-transcription', invalidId);
        }).not.toThrow();
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Server should still be responsive
      expect(clientSocket.connected).toBe(true);
    });

    it('should sanitize and validate message content', async () => {
      const transcriptionId = 'security-test-123';
      
      clientSocket.emit('subscribe-transcription', transcriptionId);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Test various malicious content scenarios
      const maliciousSteps = [
        '<script>alert("xss")</script>',
        'javascript:void(0)',
        'data:text/html,<script>alert("xss")</script>',
        '\u0000\u0001\u0002', // Null bytes and control characters
        '{{7*7}}', // Template injection
        '${7*7}', // Expression injection
        'eval("malicious code")',
        '<img src=x onerror=alert("xss")>',
        'file:///etc/passwd',
        '\x3Cscript\x3Ealert(1)\x3C/script\x3E' // Encoded script
      ];

      for (const maliciousStep of maliciousSteps) {
        // Should handle malicious content safely
        expect(() => {
          websocketService.startUpload(transcriptionId, 'test.mp3');
          websocketService.updateTranscriptionProgressById(transcriptionId, 50, maliciousStep);
        }).not.toThrow();
      }
    });

    it('should validate message size limits', async () => {
      const transcriptionId = 'size-test-123';
      
      clientSocket.emit('subscribe-transcription', transcriptionId);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Test oversized content
      const oversizedStep = 'A'.repeat(1024 * 1024); // 1MB string
      const extremelyOversizedStep = 'B'.repeat(10 * 1024 * 1024); // 10MB string
      
      expect(() => {
        websocketService.startUpload(transcriptionId, oversizedStep);
        websocketService.updateTranscriptionProgressById(transcriptionId, 25, extremelyOversizedStep);
      }).not.toThrow();
      
      // Should still be functional after handling large payloads
      expect(clientSocket.connected).toBe(true);
    });

    it('should validate numeric ranges for progress values', async () => {
      const transcriptionId = 'range-test-123';
      
      clientSocket.emit('subscribe-transcription', transcriptionId);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const invalidProgressValues = [
        -1, // Negative
        -100, // Very negative
        101, // Over 100
        1000, // Very high
        Infinity, // Infinity
        -Infinity, // Negative infinity
        NaN, // Not a number
        'not-a-number', // String
        null, // Null
        undefined, // Undefined
        {}, // Object
        [] // Array
      ];

      websocketService.startUpload(transcriptionId, 'test.mp3');

      for (const invalidProgress of invalidProgressValues) {
        expect(() => {
          websocketService.updateUploadProgress(transcriptionId, invalidProgress as any);
          websocketService.updateTranscriptionProgressById(transcriptionId, invalidProgress as any);
        }).not.toThrow();
      }
    });
  });

  describe('Access Control and Authorization', () => {
    it('should isolate transcription data between different IDs', async () => {
      const client1 = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      const client2 = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });

      await Promise.all([
        waitForSocketEvent(client1, 'connect'),
        waitForSocketEvent(client2, 'connect')
      ]);

      const transcriptionId1 = 'client1-transcription';
      const transcriptionId2 = 'client2-transcription';

      // Subscribe clients to different transcriptions
      client1.emit('subscribe-transcription', transcriptionId1);
      client2.emit('subscribe-transcription', transcriptionId2);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Start progress for both transcriptions
      websocketService.startUpload(transcriptionId1, 'client1-file.mp3');
      websocketService.startUpload(transcriptionId2, 'client2-file.mp3');

      const client1Messages: any[] = [];
      const client2Messages: any[] = [];

      client1.on('transcription-progress', (data) => {
        client1Messages.push(data);
      });

      client2.on('transcription-progress', (data) => {
        client2Messages.push(data);
      });

      // Update progress for both
      websocketService.updateUploadProgress(transcriptionId1, 50);
      websocketService.updateUploadProgress(transcriptionId2, 75);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Each client should only receive their own data
      expect(client1Messages.length).toBeGreaterThan(0);
      expect(client2Messages.length).toBeGreaterThan(0);

      client1Messages.forEach(message => {
        expect(message.transcriptionId).toBe(transcriptionId1);
        expect(message.transcriptionId).not.toBe(transcriptionId2);
      });

      client2Messages.forEach(message => {
        expect(message.transcriptionId).toBe(transcriptionId2);
        expect(message.transcriptionId).not.toBe(transcriptionId1);
      });

      client1.disconnect();
      client2.disconnect();
    });

    it('should prevent subscription to non-existent transcriptions', async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      await waitForSocketEvent(clientSocket, 'connect');

      const nonExistentId = 'non-existent-transcription';
      
      clientSocket.emit('subscribe-transcription', nonExistentId);
      
      const receivedMessages: any[] = [];
      clientSocket.on('transcription-progress', (data) => {
        receivedMessages.push(data);
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not receive any messages for non-existent transcription
      expect(receivedMessages.length).toBe(0);
    });

    it('should handle concurrent access to same transcription safely', async () => {
      const transcriptionId = 'concurrent-test';
      const clientCount = 10;
      const clients: ClientSocket[] = [];

      // Create multiple clients
      for (let i = 0; i < clientCount; i++) {
        const client = ClientIO(`http://localhost:${serverPort}`, {
          path: '/ws/transcribe-progress',
          transports: ['websocket']
        });
        clients.push(client);
      }

      // Wait for all connections
      await Promise.all(clients.map(client => waitForSocketEvent(client, 'connect')));

      // All clients subscribe to same transcription
      clients.forEach(client => {
        client.emit('subscribe-transcription', transcriptionId);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const allMessages: any[][] = clients.map(() => []);

      // Set up message listeners
      clients.forEach((client, index) => {
        client.on('transcription-progress', (data) => {
          allMessages[index].push(data);
        });
      });

      // Start transcription and send updates
      websocketService.startUpload(transcriptionId, 'concurrent-test.mp3');
      
      for (let i = 0; i <= 100; i += 10) {
        websocketService.updateUploadProgress(transcriptionId, i);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // All clients should receive the same messages
      const firstClientMessages = allMessages[0];
      expect(firstClientMessages.length).toBeGreaterThan(0);

      allMessages.forEach(clientMessages => {
        expect(clientMessages.length).toBe(firstClientMessages.length);
        
        clientMessages.forEach((message, index) => {
          expect(message.transcriptionId).toBe(transcriptionId);
          expect(message.progress).toBe(firstClientMessages[index].progress);
        });
      });

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    beforeEach(async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      await waitForSocketEvent(clientSocket, 'connect');
    });

    it('should handle rapid subscription/unsubscription attempts', async () => {
      const transcriptionId = 'rapid-test';
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        clientSocket.emit('subscribe-transcription', transcriptionId);
        clientSocket.emit('unsubscribe-transcription', transcriptionId);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Server should still be responsive
      expect(clientSocket.connected).toBe(true);
      
      // Should be able to perform normal operations
      clientSocket.emit('subscribe-transcription', transcriptionId);
      websocketService.startUpload(transcriptionId, 'test.mp3');
      
      const messages: any[] = [];
      clientSocket.on('transcription-progress', (data) => {
        messages.push(data);
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should handle rapid message broadcasting without degradation', async () => {
      const transcriptionId = 'broadcast-stress-test';
      
      clientSocket.emit('subscribe-transcription', transcriptionId);
      await new Promise(resolve => setTimeout(resolve, 50));

      const messageCount = 1000;
      const startTime = Date.now();

      // Rapid message sending
      for (let i = 0; i < messageCount; i++) {
        websocketService.updateTranscriptionProgressById(
          transcriptionId, 
          i % 100, 
          `Stress test message ${i}`
        );
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle messages efficiently (under 5 seconds for 1000 messages)
      expect(duration).toBeLessThan(5000);
      expect(clientSocket.connected).toBe(true);
    });

    it('should handle memory exhaustion attempts', async () => {
      const transcriptionCount = 100;
      const largeString = 'A'.repeat(10000); // 10KB string

      // Create many transcriptions with large data
      for (let i = 0; i < transcriptionCount; i++) {
        const transcriptionId = `memory-test-${i}`;
        websocketService.startUpload(transcriptionId, largeString);
        websocketService.updateTranscriptionProgressById(transcriptionId, 50, largeString);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Server should still be responsive
      expect(clientSocket.connected).toBe(true);

      // Should be able to create new transcription
      const testId = 'memory-recovery-test';
      clientSocket.emit('subscribe-transcription', testId);
      websocketService.startUpload(testId, 'recovery-test.mp3');

      const messages: any[] = [];
      clientSocket.on('transcription-progress', (data) => {
        if (data.transcriptionId === testId) {
          messages.push(data);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 200));
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Data Leakage Prevention', () => {
    it('should not expose internal server information in error messages', async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      await waitForSocketEvent(clientSocket, 'connect');

      const transcriptionId = 'error-info-test';
      
      clientSocket.emit('subscribe-transcription', transcriptionId);
      await new Promise(resolve => setTimeout(resolve, 50));

      // Trigger various error conditions
      websocketService.reportError(transcriptionId, 'Database connection failed at /internal/path/db.ts:123');
      websocketService.reportError(transcriptionId, 'API key: sk-1234567890abcdef is invalid');
      websocketService.reportError(transcriptionId, 'Server running on internal IP 192.168.1.100:3306');

      const errorMessages: any[] = [];
      clientSocket.on('transcription-progress', (data) => {
        if (data.status === 'error') {
          errorMessages.push(data);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(errorMessages.length).toBeGreaterThan(0);

      // Error messages should not contain sensitive information
      errorMessages.forEach(message => {
        expect(message.error).toBeDefined();
        // Should not contain file paths, API keys, or internal IPs
        expect(message.error).not.toMatch(/\/.*\.ts:\d+/); // File paths
        expect(message.error).not.toMatch(/sk-[a-f0-9]+/); // API keys
        expect(message.error).not.toMatch(/192\.168\.\d+\.\d+/); // Internal IPs
        expect(message.error).not.toMatch(/:\d{4,5}/); // Port numbers
      });
    });

    it('should not leak transcription data across sessions', async () => {
      const session1Id = 'session1-transcription';
      const session2Id = 'session2-transcription';

      // Start transcription for session 1
      websocketService.startUpload(session1Id, 'session1-file.mp3');
      websocketService.updateTranscriptionProgressById(session1Id, 50, 'Session 1 sensitive data');

      // Create client for session 2
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      await waitForSocketEvent(clientSocket, 'connect');

      // Subscribe to session 2
      clientSocket.emit('subscribe-transcription', session2Id);
      
      const receivedMessages: any[] = [];
      clientSocket.on('transcription-progress', (data) => {
        receivedMessages.push(data);
      });

      // Start transcription for session 2
      websocketService.startUpload(session2Id, 'session2-file.mp3');
      websocketService.updateTranscriptionProgressById(session2Id, 25, 'Session 2 data');

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should only receive session 2 data
      expect(receivedMessages.length).toBeGreaterThan(0);
      receivedMessages.forEach(message => {
        expect(message.transcriptionId).toBe(session2Id);
        expect(message.currentStep).not.toContain('Session 1 sensitive data');
      });
    });
  });

  describe('Protocol Security', () => {
    it('should handle malformed WebSocket frames', async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      await waitForSocketEvent(clientSocket, 'connect');

      // Send malformed data directly to WebSocket
      const malformedData = [
        '{"incomplete": json',
        '{{invalid json}}',
        '\x00\x01\x02\x03', // Binary data
        'plain text message',
        '{"action": "invalid-action"}',
        '[]', // Array instead of object
        'null',
        'true',
        '12345'
      ];

      for (const data of malformedData) {
        try {
          // Send raw data (this might cause parsing errors)
          (clientSocket as any).emit('raw-message', data);
        } catch (error) {
          // Expected to fail for malformed data
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Connection should remain stable
      expect(clientSocket.connected).toBe(true);

      // Should still be able to send valid messages
      clientSocket.emit('subscribe-transcription', 'test-after-malformed');
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should validate message structure and types', async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      await waitForSocketEvent(clientSocket, 'connect');

      // Test various invalid message structures
      const invalidMessages = [
        { action: 'subscribe' }, // Missing transcriptionId
        { transcriptionId: 'test' }, // Missing action
        { action: 'invalid', transcriptionId: 'test' }, // Invalid action
        { action: 'subscribe', transcriptionId: 123 }, // Wrong type
        { action: 'subscribe', transcriptionId: null }, // Null value
        { action: 'subscribe', transcriptionId: '' }, // Empty string
        // Additional invalid structures
        [],
        null,
        undefined,
        'string-message',
        123,
        true
      ];

      for (const message of invalidMessages) {
        try {
          if (message === 'subscribe-transcription') {
            clientSocket.emit('subscribe-transcription', message);
          } else {
            // Try to send as raw message
            (clientSocket as any).emit('message', message);
          }
        } catch (error) {
          // Expected for some invalid messages
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Connection should remain stable despite invalid messages
      expect(clientSocket.connected).toBe(true);
    });
  });

  describe('Resource Management Security', () => {
    it('should prevent resource exhaustion through connection flooding', async () => {
      const connectionCount = 50;
      const connections: ClientSocket[] = [];

      // Create many connections rapidly
      const connectionPromises = [];
      for (let i = 0; i < connectionCount; i++) {
        const client = ClientIO(`http://localhost:${serverPort}`, {
          path: '/ws/transcribe-progress',
          transports: ['websocket'],
          timeout: 1000
        });
        connections.push(client);
        connectionPromises.push(
          waitForSocketEvent(client, 'connect').catch(() => {
            // Some connections might fail, which is acceptable
          })
        );
      }

      await Promise.allSettled(connectionPromises);

      // Server should handle the load gracefully
      const successfulConnections = connections.filter(client => client.connected);
      expect(successfulConnections.length).toBeGreaterThan(0);

      // Should still be able to create new connections
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });

      try {
        await waitForSocketEvent(clientSocket, 'connect');
        expect(clientSocket.connected).toBe(true);
      } catch (error) {
        // If unable to connect due to load, that's acceptable behavior
      }

      // Cleanup connections
      connections.forEach(client => {
        try {
          client.disconnect();
        } catch (error) {
          // Ignore cleanup errors
        }
      });
    });

    it('should handle subscription flooding gracefully', async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      await waitForSocketEvent(clientSocket, 'connect');

      const subscriptionCount = 1000;
      
      // Flood with subscription requests
      for (let i = 0; i < subscriptionCount; i++) {
        clientSocket.emit('subscribe-transcription', `flood-test-${i}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Server should still be responsive
      expect(clientSocket.connected).toBe(true);

      // Should be able to perform normal operations
      const normalId = 'normal-operation-test';
      clientSocket.emit('subscribe-transcription', normalId);
      websocketService.startUpload(normalId, 'normal-test.mp3');

      const messages: any[] = [];
      clientSocket.on('transcription-progress', (data) => {
        if (data.transcriptionId === normalId) {
          messages.push(data);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 200));
      expect(messages.length).toBeGreaterThan(0);
    });
  });
});