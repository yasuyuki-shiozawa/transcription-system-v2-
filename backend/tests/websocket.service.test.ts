import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketService, TranscriptionProgress } from '../src/services/websocketService';
import { suppressConsole, restoreConsole, waitForSocketEvent } from './setup';

describe('WebSocketService - Comprehensive Backend Tests', () => {
  let httpServer: HTTPServer;
  let websocketService: WebSocketService;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeEach(async () => {
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
    
    // Suppress console output for cleaner test output
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
  });

  describe('Service Initialization', () => {
    it('should initialize with correct CORS configuration', () => {
      expect(websocketService).toBeInstanceOf(WebSocketService);
      
      // Access private io property for testing
      const io = (websocketService as any).io as SocketIOServer;
      expect(io).toBeInstanceOf(SocketIOServer);
      
      // Check CORS configuration
      const corsOptions = io.engine.opts.cors;
      expect(corsOptions.origin).toBe(process.env.FRONTEND_URL || 'http://localhost:3000');
      expect(corsOptions.methods).toEqual(['GET', 'POST']);
    });

    it('should set correct WebSocket path', () => {
      const io = (websocketService as any).io as SocketIOServer;
      expect(io.engine.opts.path).toBe('/ws/transcribe-progress');
    });

    it('should initialize empty activeTranscriptions map', () => {
      const activeTranscriptions = (websocketService as any).activeTranscriptions;
      expect(activeTranscriptions).toBeInstanceOf(Map);
      expect(activeTranscriptions.size).toBe(0);
    });
  });

  describe('Client Connection Management', () => {
    it('should handle client connection successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      restoreConsole();
      
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });

      await waitForSocketEvent(clientSocket, 'connect');
      
      expect(clientSocket.connected).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/✅ WebSocket client connected:/)
      );
      
      suppressConsole();
    });

    it('should handle client disconnection gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      restoreConsole();
      
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });

      await waitForSocketEvent(clientSocket, 'connect');
      
      clientSocket.disconnect();
      
      // Wait for disconnect event to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/❌ WebSocket client disconnected:/)
      );
      
      suppressConsole();
    });

    it('should handle multiple simultaneous connections', async () => {
      const clients: ClientSocket[] = [];
      const connectionPromises: Promise<void>[] = [];

      // Create 5 simultaneous connections
      for (let i = 0; i < 5; i++) {
        const client = ClientIO(`http://localhost:${serverPort}`, {
          path: '/ws/transcribe-progress',
          transports: ['websocket']
        });
        clients.push(client);
        connectionPromises.push(waitForSocketEvent(client, 'connect'));
      }

      await Promise.all(connectionPromises);

      // All clients should be connected
      clients.forEach(client => {
        expect(client.connected).toBe(true);
      });

      // Clean up
      clients.forEach(client => client.disconnect());
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      await waitForSocketEvent(clientSocket, 'connect');
    });

    it('should handle transcription subscription', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      restoreConsole();
      
      const transcriptionId = 'test-transcription-123';
      
      clientSocket.emit('subscribe-transcription', transcriptionId);
      
      // Wait for subscription to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        `📡 Client subscribed to transcription: ${transcriptionId}`
      );
      
      suppressConsole();
    });

    it('should send existing progress on subscription', async () => {
      const transcriptionId = 'test-transcription-456';
      
      // Start upload to create progress
      websocketService.startUpload(transcriptionId, 'test-file.mp3');
      
      // Subscribe and expect to receive existing progress
      clientSocket.emit('subscribe-transcription', transcriptionId);
      
      const progressData = await waitForSocketEvent(clientSocket, 'transcription-progress');
      
      expect(progressData).toEqual(
        expect.objectContaining({
          transcriptionId,
          status: 'uploading',
          progress: 0,
          currentStep: expect.stringContaining('test-file.mp3')
        })
      );
    });

    it('should handle transcription unsubscription', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      restoreConsole();
      
      const transcriptionId = 'test-transcription-789';
      
      // First subscribe
      clientSocket.emit('subscribe-transcription', transcriptionId);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Then unsubscribe
      clientSocket.emit('unsubscribe-transcription', transcriptionId);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        `📡 Client unsubscribed from transcription: ${transcriptionId}`
      );
      
      suppressConsole();
    });

    it('should handle multiple clients subscribing to same transcription', async () => {
      const transcriptionId = 'shared-transcription';
      
      // Create second client
      const clientSocket2 = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      await waitForSocketEvent(clientSocket2, 'connect');
      
      // Both clients subscribe to same transcription
      clientSocket.emit('subscribe-transcription', transcriptionId);
      clientSocket2.emit('subscribe-transcription', transcriptionId);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start upload - both clients should receive updates
      websocketService.startUpload(transcriptionId, 'shared-file.mp3');
      
      const [progress1, progress2] = await Promise.all([
        waitForSocketEvent(clientSocket, 'transcription-progress'),
        waitForSocketEvent(clientSocket2, 'transcription-progress')
      ]);
      
      expect(progress1).toEqual(progress2);
      expect(progress1.transcriptionId).toBe(transcriptionId);
      
      clientSocket2.disconnect();
    });
  });

  describe('Progress Update Methods', () => {
    beforeEach(async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        path: '/ws/transcribe-progress',
        transports: ['websocket']
      });
      await waitForSocketEvent(clientSocket, 'connect');
    });

    describe('Upload Progress', () => {
      it('should start upload and broadcast initial progress', async () => {
        const transcriptionId = 'upload-test-1';
        const filename = 'test-audio.mp3';
        
        clientSocket.emit('subscribe-transcription', transcriptionId);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        websocketService.startUpload(transcriptionId, filename);
        
        const progress = await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        expect(progress).toEqual({
          transcriptionId,
          status: 'uploading',
          progress: 0,
          currentStep: `アップロード開始: ${filename}`
        });
      });

      it('should update upload progress correctly', async () => {
        const transcriptionId = 'upload-test-2';
        
        clientSocket.emit('subscribe-transcription', transcriptionId);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Start upload
        websocketService.startUpload(transcriptionId, 'test.mp3');
        await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        // Update progress to 50%
        websocketService.updateUploadProgress(transcriptionId, 50);
        
        const progress = await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        expect(progress.progress).toBe(15); // 50% * 0.3 = 15% of total
        expect(progress.currentStep).toBe('アップロード中... 50%');
        expect(progress.status).toBe('uploading');
      });

      it('should handle upload progress boundary values', async () => {
        const transcriptionId = 'upload-boundary-test';
        
        clientSocket.emit('subscribe-transcription', transcriptionId);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        websocketService.startUpload(transcriptionId, 'test.mp3');
        await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        // Test 0% progress
        websocketService.updateUploadProgress(transcriptionId, 0);
        let progress = await waitForSocketEvent(clientSocket, 'transcription-progress');
        expect(progress.progress).toBe(0);
        
        // Test 100% progress
        websocketService.updateUploadProgress(transcriptionId, 100);
        progress = await waitForSocketEvent(clientSocket, 'transcription-progress');
        expect(progress.progress).toBe(30); // 100% * 0.3 = 30% of total
      });
    });

    describe('Transcription Progress', () => {
      it('should start transcription and update status', async () => {
        const transcriptionId = 'transcription-test-1';
        
        clientSocket.emit('subscribe-transcription', transcriptionId);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Start upload first
        websocketService.startUpload(transcriptionId, 'test.mp3');
        await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        // Start transcription
        websocketService.startTranscription(transcriptionId);
        
        const progress = await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        expect(progress).toEqual(
          expect.objectContaining({
            transcriptionId,
            status: 'transcribing',
            progress: 30,
            currentStep: 'Whisper API で音声認識中...',
            estimatedTime: 120
          })
        );
      });

      it('should update transcription progress with custom steps', async () => {
        const transcriptionId = 'transcription-test-2';
        
        clientSocket.emit('subscribe-transcription', transcriptionId);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        websocketService.startUpload(transcriptionId, 'test.mp3');
        await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        websocketService.startTranscription(transcriptionId);
        await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        // Update transcription progress
        websocketService.updateTranscriptionProgressById(
          transcriptionId, 
          50, 
          'カスタム処理ステップ'
        );
        
        const progress = await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        expect(progress.progress).toBe(65); // 30 + (50 * 0.7) = 65
        expect(progress.currentStep).toBe('カスタム処理ステップ');
        expect(progress.estimatedTime).toBe(115); // 120 - 5
      });

      it('should handle transcription completion', async () => {
        const transcriptionId = 'completion-test';
        const result = 'Transcribed text result';
        
        clientSocket.emit('subscribe-transcription', transcriptionId);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        websocketService.startUpload(transcriptionId, 'test.mp3');
        await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        websocketService.completeTranscription(transcriptionId, result);
        
        const progress = await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        expect(progress).toEqual(
          expect.objectContaining({
            transcriptionId,
            status: 'completed',
            progress: 100,
            currentStep: '転写完了！',
            estimatedTime: 0
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle and broadcast errors', async () => {
        const transcriptionId = 'error-test';
        const errorMessage = 'API connection failed';
        
        clientSocket.emit('subscribe-transcription', transcriptionId);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        websocketService.startUpload(transcriptionId, 'test.mp3');
        await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        websocketService.reportError(transcriptionId, errorMessage);
        
        const progress = await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        expect(progress).toEqual(
          expect.objectContaining({
            transcriptionId,
            status: 'error',
            currentStep: 'エラーが発生しました',
            error: errorMessage
          })
        );
      });

      it('should handle missing transcription ID gracefully', () => {
        // These should not throw errors
        expect(() => {
          websocketService.updateUploadProgress('non-existent', 50);
          websocketService.startTranscription('non-existent');
          websocketService.updateTranscriptionProgressById('non-existent', 75);
          websocketService.completeTranscription('non-existent', 'result');
          websocketService.reportError('non-existent', 'error');
        }).not.toThrow();
      });
    });

    describe('Queue Management', () => {
      it('should update queue position correctly', async () => {
        const transcriptionId = 'queue-test';
        
        clientSocket.emit('subscribe-transcription', transcriptionId);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        websocketService.startUpload(transcriptionId, 'test.mp3');
        await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        websocketService.updateQueuePosition(transcriptionId, 3, 10);
        
        const progress = await waitForSocketEvent(clientSocket, 'transcription-progress');
        
        expect(progress).toEqual(
          expect.objectContaining({
            transcriptionId,
            queuePosition: 3,
            currentStep: '処理待ち... (3/10)'
          })
        );
      });
    });
  });

  describe('Memory Management', () => {
    it('should clean up completed transcriptions after timeout', async (done) => {
      const transcriptionId = 'cleanup-test';
      
      websocketService.startUpload(transcriptionId, 'test.mp3');
      websocketService.completeTranscription(transcriptionId, 'result');
      
      // Check that transcription exists
      const activeTranscriptions = (websocketService as any).activeTranscriptions;
      expect(activeTranscriptions.has(transcriptionId)).toBe(true);
      
      // Wait for cleanup timeout (5 seconds + buffer)
      setTimeout(() => {
        expect(activeTranscriptions.has(transcriptionId)).toBe(false);
        done();
      }, 5100);
    });

    it('should track multiple concurrent transcriptions', () => {
      const transcriptionIds = ['concurrent-1', 'concurrent-2', 'concurrent-3'];
      
      transcriptionIds.forEach(id => {
        websocketService.startUpload(id, `file-${id}.mp3`);
      });
      
      const activeTranscriptions = (websocketService as any).activeTranscriptions;
      expect(activeTranscriptions.size).toBe(3);
      
      transcriptionIds.forEach(id => {
        expect(activeTranscriptions.has(id)).toBe(true);
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should handle high-frequency progress updates', async () => {
      const transcriptionId = 'performance-test';
      
      clientSocket.emit('subscribe-transcription', transcriptionId);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      websocketService.startUpload(transcriptionId, 'test.mp3');
      await waitForSocketEvent(clientSocket, 'transcription-progress');
      
      const startTime = Date.now();
      const updateCount = 100;
      
      // Send rapid progress updates
      for (let i = 0; i < updateCount; i++) {
        websocketService.updateUploadProgress(transcriptionId, i);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete updates in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should measure message broadcast latency', async () => {
      const transcriptionId = 'latency-test';
      
      clientSocket.emit('subscribe-transcription', transcriptionId);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const startTime = Date.now();
      
      websocketService.startUpload(transcriptionId, 'latency-test.mp3');
      
      await waitForSocketEvent(clientSocket, 'transcription-progress');
      
      const latency = Date.now() - startTime;
      
      // WebSocket latency should be minimal (less than 100ms in local test)
      expect(latency).toBeLessThan(100);
    });
  });

  describe('Security Validation', () => {
    it('should handle malformed subscription requests', async () => {
      clientSocket.emit('subscribe-transcription', null);
      clientSocket.emit('subscribe-transcription', undefined);
      clientSocket.emit('subscribe-transcription', '');
      clientSocket.emit('subscribe-transcription', 123);
      clientSocket.emit('subscribe-transcription', {});
      
      // Should not crash or throw errors
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(clientSocket.connected).toBe(true);
    });

    it('should validate transcription ID format', () => {
      const invalidIds = ['', null, undefined, 123, {}, []];
      
      invalidIds.forEach(id => {
        expect(() => {
          websocketService.startUpload(id as any, 'test.mp3');
        }).not.toThrow();
      });
    });

    it('should handle oversized progress data', () => {
      const transcriptionId = 'oversized-test';
      const largeStep = 'A'.repeat(10000); // 10KB string
      
      expect(() => {
        websocketService.startUpload(transcriptionId, 'test.mp3');
        websocketService.updateTranscriptionProgressById(
          transcriptionId, 
          50, 
          largeStep
        );
      }).not.toThrow();
    });
  });

  describe('Connection Resilience', () => {
    it('should handle socket disconnection during progress updates', async () => {
      const transcriptionId = 'resilience-test';
      
      clientSocket.emit('subscribe-transcription', transcriptionId);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      websocketService.startUpload(transcriptionId, 'test.mp3');
      await waitForSocketEvent(clientSocket, 'transcription-progress');
      
      // Disconnect client
      clientSocket.disconnect();
      
      // Continue sending updates (should not crash)
      expect(() => {
        websocketService.updateUploadProgress(transcriptionId, 50);
        websocketService.startTranscription(transcriptionId);
        websocketService.completeTranscription(transcriptionId, 'result');
      }).not.toThrow();
    });

    it('should handle rapid connect/disconnect cycles', async () => {
      for (let i = 0; i < 5; i++) {
        const client = ClientIO(`http://localhost:${serverPort}`, {
          path: '/ws/transcribe-progress',
          transports: ['websocket']
        });
        
        await waitForSocketEvent(client, 'connect');
        expect(client.connected).toBe(true);
        
        client.disconnect();
        
        // Small delay between cycles
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });
  });
});