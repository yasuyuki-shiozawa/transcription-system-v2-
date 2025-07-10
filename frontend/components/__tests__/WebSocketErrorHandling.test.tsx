import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TranscriptionProgressIndicator from '../TranscriptionProgress';

// Enhanced Mock WebSocket for error scenario testing
class MockWebSocketErrorScenarios {
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = WebSocket.CONNECTING;
  public url: string;
  
  private connectionAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;
  private shouldFailConnection: boolean = false;
  private intermittentFailureRate: number = 0;
  private messageDropRate: number = 0;
  private latencyVariation: number = 0;
  
  constructor(url: string) {
    this.url = url;
    this.attemptConnection();
  }
  
  private attemptConnection() {
    this.connectionAttempts++;
    
    if (this.shouldFailConnection && this.connectionAttempts <= this.maxReconnectAttempts) {
      setTimeout(() => {
        this.readyState = WebSocket.CLOSED;
        if (this.onerror) {
          this.onerror(new Event('error'));
        }
        if (this.onclose) {
          this.onclose(new CloseEvent('close', { code: 1006, reason: 'Connection failed' }));
        }
      }, 10);
      return;
    }
    
    // Simulate connection success or intermittent failure
    const shouldFail = Math.random() < this.intermittentFailureRate;
    
    setTimeout(() => {
      if (shouldFail) {
        this.readyState = WebSocket.CLOSED;
        if (this.onerror) {
          this.onerror(new Event('error'));
        }
        if (this.onclose) {
          this.onclose(new CloseEvent('close', { code: 1006, reason: 'Intermittent failure' }));
        }
      } else {
        this.readyState = WebSocket.OPEN;
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }
    }, 10 + Math.random() * this.latencyVariation);
  }
  
  send(data: string) {
    // Use the data parameter to avoid unused variable warning
    console.debug('WebSocket send:', data.length, 'bytes');
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    
    // Simulate message drop
    if (Math.random() < this.messageDropRate) {
      console.warn('Message dropped due to network issues');
      return;
    }
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
    }
  }
  
  // Error simulation methods
  simulateConnectionFailure() {
    this.shouldFailConnection = true;
  }
  
  simulateIntermittentFailures(failureRate: number = 0.3) {
    this.intermittentFailureRate = failureRate;
  }
  
  simulateMessageDrops(dropRate: number = 0.1) {
    this.messageDropRate = dropRate;
  }
  
  simulateNetworkLatencyVariation(maxVariation: number = 1000) {
    this.latencyVariation = maxVariation;
  }
  
  simulateMessage(data: Record<string, unknown>) {
    if (this.readyState === WebSocket.OPEN && this.onmessage) {
      // Simulate message delivery with potential delay
      const delay = Math.random() * this.latencyVariation;
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
        }
      }, delay);
    }
  }
  
  simulateServerError(errorCode: number = 1011, reason: string = 'Server error') {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: errorCode, reason }));
    }
  }
  
  simulateNetworkTimeout() {
    // Simulate network timeout by not responding
    this.readyState = WebSocket.CONNECTING;
    setTimeout(() => {
      this.readyState = WebSocket.CLOSED;
      if (this.onerror) {
        this.onerror(new Event('error'));
      }
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code: 1006, reason: 'Network timeout' }));
      }
    }, 10000);
  }
  
  simulateReconnection() {
    if (this.readyState === WebSocket.CLOSED) {
      setTimeout(() => {
        this.attemptConnection();
      }, this.reconnectDelay);
    }
  }
  
  getConnectionAttempts() {
    return this.connectionAttempts;
  }
  
  resetConnection() {
    this.connectionAttempts = 0;
    this.shouldFailConnection = false;
    this.intermittentFailureRate = 0;
    this.messageDropRate = 0;
    this.latencyVariation = 0;
  }
}

// Mock implementations
const originalWebSocket = global.WebSocket;
let mockWebSocket: MockWebSocketErrorScenarios;

beforeAll(() => {
  (global as unknown as { WebSocket: jest.Mock }).WebSocket = jest.fn().mockImplementation((url: string) => {
    mockWebSocket = new MockWebSocketErrorScenarios(url);
    return mockWebSocket;
  });
});

afterAll(() => {
  global.WebSocket = originalWebSocket;
});

describe('WebSocket Error Handling & Reconnection Tests', () => {
  const transcriptionId = 'error-test-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    if (mockWebSocket) {
      mockWebSocket.resetConnection();
    }
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Connection Failure Scenarios', () => {
    it('should handle initial connection failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      // Simulate connection failure
      mockWebSocket.simulateConnectionFailure();
      
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      
      // Should show connecting state
      expect(screen.getByText('接続中...')).toBeInTheDocument();
      
      // Should attempt reconnection after 5 seconds
      await act(async () => {
        jest.advanceTimersByTime(5100);
      });
      
      // Should have attempted reconnection
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
      
      consoleSpy.mockRestore();
    });

    it('should retry connection multiple times before giving up', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      mockWebSocket.simulateConnectionFailure();
      
      // Simulate multiple reconnection attempts
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          jest.advanceTimersByTime(5100);
        });
      }
      
      expect(mockWebSocket.getConnectionAttempts()).toBeGreaterThan(1);
      
      consoleSpy.mockRestore();
    });

    it('should handle connection timeout', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateNetworkTimeout();
        jest.advanceTimersByTime(10100);
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', expect.any(Event));
      
      consoleSpy.mockRestore();
    });

    it('should handle server errors with specific error codes', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Simulate server error
      await act(async () => {
        mockWebSocket.simulateServerError(1011, 'Internal server error');
        jest.advanceTimersByTime(100);
      });
      
      // Should attempt reconnection
      await act(async () => {
        jest.advanceTimersByTime(5100);
      });
      
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });
  });

  describe('Intermittent Connection Issues', () => {
    it('should handle intermittent connection drops', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      // Enable intermittent failures
      mockWebSocket.simulateIntermittentFailures(0.5);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Start receiving progress updates
      await act(async () => {
        mockWebSocket.simulateMessage({
          transcriptionId,
          status: 'uploading',
          progress: 25,
          currentStep: 'アップロード中...'
        });
        jest.advanceTimersByTime(100);
      });
      
      // Should display progress despite intermittent issues
      expect(screen.getByText('25%')).toBeInTheDocument();
      
      // Simulate connection drop during progress
      await act(async () => {
        mockWebSocket.simulateServerError(1006, 'Connection lost');
        jest.advanceTimersByTime(100);
      });
      
      // Should attempt reconnection
      await act(async () => {
        jest.advanceTimersByTime(5100);
      });
      
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should handle message drops gracefully', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      mockWebSocket.simulateMessageDrops(0.3);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Send multiple progress updates (some may be dropped)
      const updates = [
        { progress: 10, currentStep: 'Update 1' },
        { progress: 20, currentStep: 'Update 2' },
        { progress: 30, currentStep: 'Update 3' },
        { progress: 40, currentStep: 'Update 4' },
        { progress: 50, currentStep: 'Update 5' }
      ];
      
      for (const update of updates) {
        await act(async () => {
          mockWebSocket.simulateMessage({
            transcriptionId,
            status: 'uploading',
            ...update
          });
          jest.advanceTimersByTime(100);
        });
      }
      
      // Should display the latest received update (may not be the last one sent)
      const progressElements = screen.getAllByText(/%$/);
      expect(progressElements.length).toBeGreaterThan(0);
    });

    it('should handle network latency variations', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      mockWebSocket.simulateNetworkLatencyVariation(2000);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      const sendTime = Date.now();
      
      await act(async () => {
        mockWebSocket.simulateMessage({
          transcriptionId,
          status: 'uploading',
          progress: 35,
          currentStep: 'High latency test'
        });
        jest.advanceTimersByTime(2500);
      });
      
      const receiveTime = Date.now();
      
      // Message should eventually arrive despite high latency
      await waitFor(() => {
        expect(screen.getByText('High latency test')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      expect(receiveTime - sendTime).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery Mechanisms', () => {
    it('should recover from connection errors and continue receiving updates', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Send initial update
      await act(async () => {
        mockWebSocket.simulateMessage({
          transcriptionId,
          status: 'uploading',
          progress: 20,
          currentStep: 'Before error'
        });
        jest.advanceTimersByTime(100);
      });
      
      expect(screen.getByText('Before error')).toBeInTheDocument();
      
      // Simulate connection error
      await act(async () => {
        mockWebSocket.simulateServerError(1006, 'Connection lost');
        jest.advanceTimersByTime(100);
      });
      
      // Wait for reconnection
      await act(async () => {
        jest.advanceTimersByTime(5100);
      });
      
      // Send update after reconnection
      await act(async () => {
        mockWebSocket.simulateMessage({
          transcriptionId,
          status: 'transcribing',
          progress: 60,
          currentStep: 'After recovery'
        });
        jest.advanceTimersByTime(100);
      });
      
      expect(screen.getByText('After recovery')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('should maintain subscriptions after reconnection', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Verify initial subscription
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket connected for transcription progress');
      
      // Simulate disconnect and reconnect
      await act(async () => {
        mockWebSocket.close();
        jest.advanceTimersByTime(5100);
      });
      
      // Should resubscribe after reconnection
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
      
      consoleSpy.mockRestore();
    });

    it('should handle partial message corruption', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Send corrupted messages
      const corruptedMessages = [
        '{"transcriptionId":"' + transcriptionId + '","status":"uploading","progr',
        '{"transcriptionId":"' + transcriptionId + '","status":"uploading","progress":30,"currentStep":"Test"',
        '{"transcriptionId":"' + transcriptionId + '","status":"uploading","progress":30,"currentStep":"Test"}}',
      ];
      
      for (const corruptedMsg of corruptedMessages) {
        await act(async () => {
          if (mockWebSocket.onmessage) {
            mockWebSocket.onmessage(new MessageEvent('message', { data: corruptedMsg }));
          }
          jest.advanceTimersByTime(100);
        });
      }
      
      // Should log errors for corrupted messages
      expect(consoleSpy).toHaveBeenCalled();
      
      // Send valid message afterwards
      await act(async () => {
        mockWebSocket.simulateMessage({
          transcriptionId,
          status: 'uploading',
          progress: 45,
          currentStep: 'Valid message'
        });
        jest.advanceTimersByTime(100);
      });
      
      expect(screen.getByText('Valid message')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('User Interaction During Errors', () => {
    it('should handle retry button during connection errors', async () => {
      const user = userEvent.setup({ delay: null });
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Simulate error state
      await act(async () => {
        mockWebSocket.simulateMessage({
          transcriptionId,
          status: 'error',
          error: 'Connection failed',
          currentStep: 'エラーが発生しました'
        });
        jest.advanceTimersByTime(100);
      });
      
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      
      // Mock page reload
      const reloadMock = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true
      });
      
      const retryButton = screen.getByText('再試行 (Ctrl+R)');
      await user.click(retryButton);
      
      expect(reloadMock).toHaveBeenCalled();
    });

    it('should handle keyboard shortcuts during error states', async () => {
      const reloadMock = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true
      });
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId,
          status: 'error',
          error: 'Test error'
        });
        jest.advanceTimersByTime(100);
      });
      
      // Simulate Ctrl+R keypress
      await act(async () => {
        const event = new KeyboardEvent('keydown', { 
          key: 'r', 
          ctrlKey: true,
          bubbles: true 
        });
        document.dispatchEvent(event);
      });
      
      expect(reloadMock).toHaveBeenCalled();
    });

    it('should handle Escape key to force close connection', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      const closeSpy = jest.spyOn(mockWebSocket, 'close');
      
      // Simulate Escape keypress
      await act(async () => {
        const event = new KeyboardEvent('keydown', { 
          key: 'Escape',
          bubbles: true 
        });
        document.dispatchEvent(event);
      });
      
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('Error State Management', () => {
    it('should differentiate between different error types', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      const errorScenarios = [
        { error: 'Network timeout', expectedMessage: 'Network timeout' },
        { error: 'API rate limit exceeded', expectedMessage: 'API rate limit exceeded' },
        { error: 'Invalid audio format', expectedMessage: 'Invalid audio format' },
        { error: 'Server maintenance', expectedMessage: 'Server maintenance' }
      ];
      
      for (const scenario of errorScenarios) {
        await act(async () => {
          mockWebSocket.simulateMessage({
            transcriptionId,
            status: 'error',
            error: scenario.error,
            currentStep: 'エラーが発生しました'
          });
          jest.advanceTimersByTime(100);
        });
        
        expect(screen.getByText(scenario.expectedMessage)).toBeInTheDocument();
        
        // Clear error for next test
        await act(async () => {
          mockWebSocket.simulateMessage({
            transcriptionId,
            status: 'uploading',
            progress: 0,
            currentStep: 'Resetting...'
          });
          jest.advanceTimersByTime(100);
        });
      }
    });

    it('should track error frequency and patterns', async () => {
      const errors: string[] = [];
      const originalConsoleError = console.error;
      console.error = (...args: unknown[]) => {
        errors.push(args.join(' '));
        originalConsoleError(...args);
      };
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Simulate multiple connection errors
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          mockWebSocket.simulateServerError(1006, `Error ${i + 1}`);
          jest.advanceTimersByTime(100);
        });
        
        await act(async () => {
          jest.advanceTimersByTime(5100);
        });
      }
      
      expect(errors.length).toBeGreaterThan(0);
      
      console.error = originalConsoleError;
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should properly cleanup resources on component unmount during error states', async () => {
      const { unmount } = render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Simulate error state
      await act(async () => {
        mockWebSocket.simulateServerError(1011, 'Server error');
        jest.advanceTimersByTime(100);
      });
      
      const closeSpy = jest.spyOn(mockWebSocket, 'close');
      
      unmount();
      
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should cancel reconnection attempts on unmount', async () => {
      const { unmount } = render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);
      
      // Start with failed connection
      mockWebSocket.simulateConnectionFailure();
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      // Unmount before reconnection attempt
      unmount();
      
      // Advance time to when reconnection would occur
      await act(async () => {
        jest.advanceTimersByTime(5100);
      });
      
      // Should not create new WebSocket instances after unmount
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });
  });
});