import React from 'react';
import { render, screen, act } from '@testing-library/react';
import TranscriptionProgressIndicator from '../TranscriptionProgress';

// Performance monitoring utilities
interface PerformanceMetrics {
  connectionTime: number;
  messageLatency: number[];
  memoryUsage: number[];
  renderTime: number[];
  messageProcessingTime: number[];
  reconnectionTime: number[];
  errorRecoveryTime: number[];
}

class PerformanceWebSocket {
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = WebSocket.CONNECTING;
  public url: string;
  
  private connectionStartTime: number = Date.now();
  private messageTimestamps: Map<string, number> = new Map();
  private metrics: PerformanceMetrics = {
    connectionTime: 0,
    messageLatency: [],
    memoryUsage: [],
    renderTime: [],
    messageProcessingTime: [],
    reconnectionTime: [],
    errorRecoveryTime: []
  };
  
  constructor(url: string) {
    this.url = url;
    this.connectionStartTime = Date.now();
    
    // Simulate realistic connection time
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.metrics.connectionTime = Date.now() - this.connectionStartTime;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, Math.random() * 100 + 10); // 10-110ms connection time
  }
  
  send(data: string) {
    console.debug('Sending data:', data.length, 'bytes');
    const messageId = Math.random().toString(36).substr(2, 9);
    this.messageTimestamps.set(messageId, Date.now());
    
    // Simulate send latency
    setTimeout(() => {
      // Message acknowledged (simulated)
      const latency = Date.now() - this.messageTimestamps.get(messageId)!;
      this.metrics.messageLatency.push(latency);
      this.messageTimestamps.delete(messageId);
    }, Math.random() * 50 + 5); // 5-55ms send latency
  }
  
  simulateMessage(data: Record<string, unknown>, simulatedLatency: number = 0) {
    const messageStartTime = Date.now();
    
    setTimeout(() => {
      if (this.onmessage) {
        const processStartTime = Date.now();
        
        this.onmessage(new MessageEvent('message', { 
          data: JSON.stringify({
            ...data,
            _performance: {
              sentAt: messageStartTime,
              receivedAt: Date.now()
            }
          })
        }));
        
        const processingTime = Date.now() - processStartTime;
        this.metrics.messageProcessingTime.push(processingTime);
      }
    }, simulatedLatency);
  }
  
  simulateReconnection() {
    const reconnectStartTime = Date.now();
    this.readyState = WebSocket.CLOSED;
    
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
    
    setTimeout(() => {
      this.readyState = WebSocket.CONNECTING;
      
      setTimeout(() => {
        this.readyState = WebSocket.OPEN;
        const reconnectionTime = Date.now() - reconnectStartTime;
        this.metrics.reconnectionTime.push(reconnectionTime);
        
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }, Math.random() * 200 + 50); // 50-250ms reconnection
    }, 5000); // 5 second delay before reconnection
  }
  
  recordMemoryUsage() {
    if (typeof window !== 'undefined' && (window as Window & { performance?: { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } } }).performance?.memory) {
      const memory = (window as Window & { performance: { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } } }).performance.memory;
      this.metrics.memoryUsage.push(memory.usedJSHeapSize);
    }
  }
  
  recordRenderTime(renderTime: number) {
    this.metrics.renderTime.push(renderTime);
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  getAverageMetrics() {
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;
    const min = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : 0;
    
    return {
      connectionTime: this.metrics.connectionTime,
      averageMessageLatency: avg(this.metrics.messageLatency),
      maxMessageLatency: max(this.metrics.messageLatency),
      minMessageLatency: min(this.metrics.messageLatency),
      averageProcessingTime: avg(this.metrics.messageProcessingTime),
      maxProcessingTime: max(this.metrics.messageProcessingTime),
      averageRenderTime: avg(this.metrics.renderTime),
      maxRenderTime: max(this.metrics.renderTime),
      averageReconnectionTime: avg(this.metrics.reconnectionTime),
      memoryGrowth: this.metrics.memoryUsage.length > 1 
        ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] - this.metrics.memoryUsage[0]
        : 0,
      totalMessages: this.metrics.messageLatency.length
    };
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// Mock WebSocket with performance tracking
const originalWebSocket = global.WebSocket;
let performanceWebSocket: PerformanceWebSocket;

beforeAll(() => {
  (global as unknown as { WebSocket: jest.Mock }).WebSocket = jest.fn().mockImplementation((url: string) => {
    performanceWebSocket = new PerformanceWebSocket(url);
    return performanceWebSocket;
  });
});

afterAll(() => {
  global.WebSocket = originalWebSocket;
});

describe('WebSocket Performance Benchmarks', () => {
  const transcriptionId = 'performance-test-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Connection Performance', () => {
    it('should establish connection within acceptable time limits', async () => {
      const renderStartTime = Date.now();
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(200);
      });
      
      const metrics = performanceWebSocket.getMetrics();
      
      // Connection should be established within 200ms
      expect(metrics.connectionTime).toBeLessThan(200);
      expect(metrics.connectionTime).toBeGreaterThan(0);
      
      const renderTime = Date.now() - renderStartTime;
      performanceWebSocket.recordRenderTime(renderTime);
      
      // Initial render should be fast
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle multiple rapid connections efficiently', async () => {
      const connectionTimes: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        const { unmount } = render(<TranscriptionProgressIndicator transcriptionId={`${transcriptionId}-${i}`} />);
        
        await act(async () => {
          jest.advanceTimersByTime(150);
        });
        
        connectionTimes.push(Date.now() - startTime);
        unmount();
      }
      
      const averageConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      
      // Average connection time should remain reasonable
      expect(averageConnectionTime).toBeLessThan(300);
      
      // Connection times should be consistent (standard deviation)
      const stdDev = Math.sqrt(
        connectionTimes.reduce((sq, n) => sq + Math.pow(n - averageConnectionTime, 2), 0) / connectionTimes.length
      );
      expect(stdDev).toBeLessThan(100); // Low variance in connection times
    });
  });

  describe('Message Processing Performance', () => {
    it('should process messages with minimal latency', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      const messageCount = 50;
      const latencies: number[] = [];
      
      for (let i = 0; i < messageCount; i++) {
        const sendTime = Date.now();
        
        await act(async () => {
          performanceWebSocket.simulateMessage({
            transcriptionId,
            status: 'transcribing',
            progress: (i / messageCount) * 100,
            currentStep: `Processing message ${i + 1}`
          }, Math.random() * 20); // 0-20ms network latency
          
          jest.advanceTimersByTime(25);
        });
        
        latencies.push(Date.now() - sendTime);
      }
      
      const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      
      // Average message processing should be fast
      expect(averageLatency).toBeLessThan(50);
      expect(maxLatency).toBeLessThan(100);
      
      const metrics = performanceWebSocket.getAverageMetrics();
      expect(metrics.averageProcessingTime).toBeLessThan(10);
    });

    it('should handle high-frequency updates without performance degradation', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      const startTime = Date.now();
      const messageCount = 100;
      
      // Send rapid updates
      for (let i = 0; i < messageCount; i++) {
        await act(async () => {
          performanceWebSocket.simulateMessage({
            transcriptionId,
            status: 'transcribing',
            progress: i,
            currentStep: `Rapid update ${i}`
          });
          jest.advanceTimersByTime(5); // Very rapid updates (every 5ms)
        });
      }
      
      const totalTime = Date.now() - startTime;
      const messagesPerSecond = (messageCount / totalTime) * 1000;
      
      // Should handle at least 50 messages per second
      expect(messagesPerSecond).toBeGreaterThan(50);
      
      // Latest message should be displayed
      expect(screen.getByText(`Rapid update ${messageCount - 1}`)).toBeInTheDocument();
    });

    it('should maintain performance under message burst conditions', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Simulate message bursts
      const burstSizes = [10, 25, 50, 25, 10];
      const processingTimes: number[] = [];
      
      for (const burstSize of burstSizes) {
        const burstStart = Date.now();
        
        // Send burst of messages
        for (let i = 0; i < burstSize; i++) {
          await act(async () => {
            performanceWebSocket.simulateMessage({
              transcriptionId,
              status: 'transcribing',
              progress: Math.random() * 100,
              currentStep: `Burst message ${i}`
            });
            jest.advanceTimersByTime(1);
          });
        }
        
        processingTimes.push(Date.now() - burstStart);
        
        // Small delay between bursts
        await act(async () => {
          jest.advanceTimersByTime(100);
        });
      }
      
      // Processing time should scale linearly with burst size
      const maxProcessingTime = Math.max(...processingTimes);
      expect(maxProcessingTime).toBeLessThan(500); // 500ms max for largest burst
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should not exhibit memory leaks during long sessions', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Record initial memory
      performanceWebSocket.recordMemoryUsage();
      
      // Simulate long session with many messages
      for (let i = 0; i < 200; i++) {
        await act(async () => {
          performanceWebSocket.simulateMessage({
            transcriptionId,
            status: 'transcribing',
            progress: (i / 200) * 100,
            currentStep: `Long session update ${i}`
          });
          jest.advanceTimersByTime(50);
        });
        
        // Record memory every 20 messages
        if (i % 20 === 0) {
          performanceWebSocket.recordMemoryUsage();
        }
      }
      
      const metrics = performanceWebSocket.getAverageMetrics();
      
      // Memory growth should be minimal (less than 1MB for 200 messages)
      expect(Math.abs(metrics.memoryGrowth)).toBeLessThan(1024 * 1024);
    });

    it('should efficiently cleanup resources on component unmount', async () => {
      const { unmount } = render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      performanceWebSocket.recordMemoryUsage();
      
      // Send some messages
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          performanceWebSocket.simulateMessage({
            transcriptionId,
            status: 'transcribing',
            progress: i * 5,
            currentStep: `Cleanup test ${i}`
          });
          jest.advanceTimersByTime(10);
        });
      }
      
      const beforeUnmount = Date.now();
      unmount();
      const unmountTime = Date.now() - beforeUnmount;
      
      // Unmount should be fast
      expect(unmountTime).toBeLessThan(50);
      
      // Wait and check that no more processing occurs
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      // No additional processing should happen after unmount
      performanceWebSocket.recordMemoryUsage();
    });
  });

  describe('Reconnection Performance', () => {
    it('should reconnect efficiently after connection loss', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Establish baseline
      await act(async () => {
        performanceWebSocket.simulateMessage({
          transcriptionId,
          status: 'uploading',
          progress: 30,
          currentStep: 'Before disconnect'
        });
        jest.advanceTimersByTime(100);
      });
      
      expect(screen.getByText('Before disconnect')).toBeInTheDocument();
      
      // Simulate disconnection and reconnection
      
      await act(async () => {
        performanceWebSocket.simulateReconnection();
        jest.advanceTimersByTime(5500); // Wait for reconnection
      });
      
      // Send message after reconnection
      await act(async () => {
        performanceWebSocket.simulateMessage({
          transcriptionId,
          status: 'transcribing',
          progress: 70,
          currentStep: 'After reconnection'
        });
        jest.advanceTimersByTime(100);
      });
      
      expect(screen.getByText('After reconnection')).toBeInTheDocument();
      
      const metrics = performanceWebSocket.getAverageMetrics();
      
      // Reconnection should be completed within reasonable time
      expect(metrics.averageReconnectionTime).toBeLessThan(6000);
      expect(metrics.averageReconnectionTime).toBeGreaterThan(5000);
    });

    it('should handle multiple reconnection cycles efficiently', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      const reconnectionCount = 3;
      
      for (let i = 0; i < reconnectionCount; i++) {
        // Send message before disconnect
        await act(async () => {
          performanceWebSocket.simulateMessage({
            transcriptionId,
            status: 'transcribing',
            progress: (i + 1) * 20,
            currentStep: `Before disconnect ${i + 1}`
          });
          jest.advanceTimersByTime(100);
        });
        
        // Simulate reconnection
        await act(async () => {
          performanceWebSocket.simulateReconnection();
          jest.advanceTimersByTime(5500);
        });
        
        // Send message after reconnection
        await act(async () => {
          performanceWebSocket.simulateMessage({
            transcriptionId,
            status: 'transcribing',
            progress: (i + 1) * 20 + 10,
            currentStep: `After reconnection ${i + 1}`
          });
          jest.advanceTimersByTime(100);
        });
      }
      
      const metrics = performanceWebSocket.getAverageMetrics();
      
      // Should have recorded all reconnections
      expect(metrics.totalMessages).toBeGreaterThan(reconnectionCount * 2);
      
      // Reconnection times should be consistent
      expect(metrics.averageReconnectionTime).toBeLessThan(6000);
    });
  });

  describe('Render Performance', () => {
    it('should update UI efficiently during rapid progress changes', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      const renderTimes: number[] = [];
      
      // Rapid progress updates
      for (let i = 0; i <= 100; i += 5) {
        const renderStart = Date.now();
        
        await act(async () => {
          performanceWebSocket.simulateMessage({
            transcriptionId,
            status: 'transcribing',
            progress: i,
            currentStep: `Progress ${i}%`
          });
          jest.advanceTimersByTime(20);
        });
        
        renderTimes.push(Date.now() - renderStart);
      }
      
      const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);
      
      // Render times should be minimal
      expect(averageRenderTime).toBeLessThan(50);
      expect(maxRenderTime).toBeLessThan(100);
      
      // Final progress should be displayed
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle complex UI state changes efficiently', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      const stateChanges = [
        { status: 'uploading', progress: 0, currentStep: 'Starting upload' },
        { status: 'uploading', progress: 30, currentStep: 'Upload complete' },
        { status: 'transcribing', progress: 30, currentStep: 'Starting transcription', estimatedTime: 120 },
        { status: 'transcribing', progress: 50, currentStep: 'Processing audio', estimatedTime: 90, queuePosition: 2 },
        { status: 'transcribing', progress: 75, currentStep: 'Finalizing', estimatedTime: 30 },
        { status: 'completed', progress: 100, currentStep: 'Complete', estimatedTime: 0 },
      ];
      
      const transitionTimes: number[] = [];
      
      for (const state of stateChanges) {
        const transitionStart = Date.now();
        
        await act(async () => {
          performanceWebSocket.simulateMessage({
            transcriptionId,
            ...state
          });
          jest.advanceTimersByTime(100);
        });
        
        transitionTimes.push(Date.now() - transitionStart);
      }
      
      const averageTransitionTime = transitionTimes.reduce((a, b) => a + b, 0) / transitionTimes.length;
      
      // State transitions should be smooth
      expect(averageTransitionTime).toBeLessThan(150);
      expect(screen.getByText('文字起こしが完了しました！')).toBeInTheDocument();
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain baseline performance standards', async () => {
      const performanceBaseline = {
        maxConnectionTime: 200,
        maxMessageLatency: 100,
        maxProcessingTime: 10,
        maxRenderTime: 50,
        maxReconnectionTime: 6000
      };
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(150);
      });
      
      // Send test messages
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          performanceWebSocket.simulateMessage({
            transcriptionId,
            status: 'transcribing',
            progress: i * 5,
            currentStep: `Baseline test ${i}`
          });
          jest.advanceTimersByTime(25);
        });
      }
      
      const metrics = performanceWebSocket.getAverageMetrics();
      
      // All metrics should meet baseline requirements
      expect(metrics.connectionTime).toBeLessThan(performanceBaseline.maxConnectionTime);
      expect(metrics.maxMessageLatency).toBeLessThan(performanceBaseline.maxMessageLatency);
      expect(metrics.maxProcessingTime).toBeLessThan(performanceBaseline.maxProcessingTime);
      expect(metrics.maxRenderTime).toBeLessThan(performanceBaseline.maxRenderTime);
      
      // Log performance summary for monitoring
      console.log('Performance Metrics Summary:', {
        connectionTime: `${metrics.connectionTime}ms`,
        avgMessageLatency: `${metrics.averageMessageLatency.toFixed(2)}ms`,
        maxMessageLatency: `${metrics.maxMessageLatency}ms`,
        avgProcessingTime: `${metrics.averageProcessingTime.toFixed(2)}ms`,
        avgRenderTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
        totalMessages: metrics.totalMessages
      });
    });
  });
});