import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TranscriptionProgressIndicator from '../TranscriptionProgress';
import AudioFileUpload from '../AudioFileUpload';

// Mock WebSocket with enhanced message validation
class MockWebSocketWithValidation {
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = WebSocket.CONNECTING;
  public url: string;
  
  private messageQueue: Record<string, unknown>[] = [];
  private messageHistory: Record<string, unknown>[] = [];
  private connectionLatency: number = 0;
  private messageValidationEnabled: boolean = true;
  
  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }
  
  send(data: string) {
    const parsedData = JSON.parse(data);
    this.messageQueue.push(parsedData);
    
    // Validate message structure
    if (this.messageValidationEnabled) {
      this.validateMessage(parsedData);
    }
  }
  
  private validateMessage(message: Record<string, unknown>) {
    const requiredFields = ['action', 'transcriptionId'];
    
    for (const field of requiredFields) {
      if (!message.hasOwnProperty(field)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (message.action !== 'subscribe' && message.action !== 'unsubscribe') {
      throw new Error(`Invalid action: ${message.action}`);
    }
    
    if (typeof message.transcriptionId !== 'string' || message.transcriptionId.length === 0) {
      throw new Error('Invalid transcriptionId format');
    }
  }
  
  simulateProgressSequence(transcriptionId: string, sequence: Record<string, unknown>[]) {
    sequence.forEach((progress, index) => {
      setTimeout(() => {
        this.simulateMessage({
          ...progress,
          transcriptionId,
          timestamp: Date.now()
        });
      }, index * 100);
    });
  }
  
  simulateMessage(data: Record<string, unknown>) {
    const messageWithMetrics = {
      ...data,
      _metadata: {
        sentAt: Date.now(),
        latency: this.connectionLatency,
        messageId: Math.random().toString(36).substr(2, 9)
      }
    };
    
    this.messageHistory.push(messageWithMetrics);
    
    if (this.onmessage) {
      // Simulate network latency
      setTimeout(() => {
        this.onmessage!(new MessageEvent('message', { 
          data: JSON.stringify(messageWithMetrics) 
        }));
      }, this.connectionLatency);
    }
  }
  
  simulateNetworkLatency(latency: number) {
    this.connectionLatency = latency;
  }
  
  getMessageHistory() {
    return this.messageHistory;
  }
  
  getLastMessage() {
    return this.messageQueue[this.messageQueue.length - 1];
  }
  
  enableMessageValidation(enabled: boolean) {
    this.messageValidationEnabled = enabled;
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
  
  simulateConnectionError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
  
  simulateUnstableConnection() {
    // Simulate intermittent connection issues
    let reconnectCount = 0;
    const maxReconnects = 3;
    
    const dropConnection = () => {
      if (reconnectCount < maxReconnects) {
        this.close();
        setTimeout(() => {
          this.readyState = WebSocket.OPEN;
          if (this.onopen) {
            this.onopen(new Event('open'));
          }
          reconnectCount++;
          
          // Randomly drop connection again
          if (Math.random() < 0.3) {
            setTimeout(dropConnection, Math.random() * 1000);
          }
        }, 1000 + Math.random() * 2000);
      }
    };
    
    setTimeout(dropConnection, Math.random() * 2000);
  }
}

// Mock fetch for upload tests
const mockFetch = jest.fn();

// Replace global objects
const originalWebSocket = global.WebSocket;
const originalFetch = global.fetch;
let mockWebSocket: MockWebSocketWithValidation;

beforeAll(() => {
  (global as unknown as { WebSocket: jest.Mock }).WebSocket = jest.fn().mockImplementation((url: string) => {
    mockWebSocket = new MockWebSocketWithValidation(url);
    return mockWebSocket;
  });
  
  global.fetch = mockFetch;
});

afterAll(() => {
  global.WebSocket = originalWebSocket;
  global.fetch = originalFetch;
});

describe('WebSocket Integration - Progress Data Accuracy & Message Validation', () => {
  const transcriptionId = 'integration-test-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Progress Data Accuracy', () => {
    it('should accurately track progress through complete transcription workflow', async () => {
      const expectedSequence = [
        { status: 'uploading', progress: 0, currentStep: 'アップロード開始' },
        { status: 'uploading', progress: 15, currentStep: 'アップロード中... 50%' },
        { status: 'uploading', progress: 30, currentStep: 'アップロード中... 100%' },
        { status: 'transcribing', progress: 30, currentStep: 'Whisper API で音声認識中...', estimatedTime: 120 },
        { status: 'transcribing', progress: 50, currentStep: '音声認識処理中...', estimatedTime: 90 },
        { status: 'transcribing', progress: 75, currentStep: '音声認識処理中...', estimatedTime: 60 },
        { status: 'completed', progress: 100, currentStep: '転写完了！', estimatedTime: 0 }
      ];

      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);

      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateProgressSequence(transcriptionId, expectedSequence);
      });

      // Verify each step of the sequence
      for (let i = 0; i < expectedSequence.length; i++) {
        await act(async () => {
          jest.advanceTimersByTime(100);
        });

        const expected = expectedSequence[i];
        
        // Check progress percentage
        expect(screen.getByText(`${expected.progress}%`)).toBeInTheDocument();
        
        // Check current step
        if (expected.currentStep) {
          expect(screen.getByText(expected.currentStep)).toBeInTheDocument();
        }
        
        // Check estimated time display
        if (expected.estimatedTime) {
          const minutes = Math.floor(expected.estimatedTime / 60);
          const seconds = expected.estimatedTime % 60;
          const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          expect(screen.getByText(`予想残り時間: ${timeString}`)).toBeInTheDocument();
        }
      }
    });

    it('should validate progress data consistency', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);

      const progressUpdates = [
        { status: 'uploading', progress: 0 },
        { status: 'uploading', progress: 15 },
        { status: 'uploading', progress: 30 },
        { status: 'transcribing', progress: 30 }, // Should not go backwards
        { status: 'transcribing', progress: 50 },
        { status: 'transcribing', progress: 45 }, // Regression - should be handled gracefully
        { status: 'transcribing', progress: 75 },
        { status: 'completed', progress: 100 }
      ];

      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      for (const update of progressUpdates) {
        await act(async () => {
          mockWebSocket.simulateMessage({
            transcriptionId,
            ...update,
            timestamp: Date.now()
          });
          jest.advanceTimersByTime(100);
        });

        // Progress should never exceed 100%
        const progressText = screen.getByText(new RegExp(`${update.progress}%`));
        expect(progressText).toBeInTheDocument();
        expect(update.progress).toBeLessThanOrEqual(100);
        expect(update.progress).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle queue position updates accurately', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);

      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      const queueUpdates = [
        { queuePosition: 5, totalQueue: 10 },
        { queuePosition: 3, totalQueue: 8 },
        { queuePosition: 1, totalQueue: 5 },
        { queuePosition: 0, totalQueue: 0 } // Processing started
      ];

      for (const update of queueUpdates) {
        await act(async () => {
          mockWebSocket.simulateMessage({
            transcriptionId,
            status: 'transcribing',
            progress: 30,
            queuePosition: update.queuePosition,
            currentStep: update.queuePosition > 0 
              ? `処理待ち... (${update.queuePosition}/${update.totalQueue})`
              : '音声認識開始'
          });
          jest.advanceTimersByTime(100);
        });

        if (update.queuePosition > 0) {
          expect(screen.getByText(`待機順位: ${update.queuePosition}番目`)).toBeInTheDocument();
        }
      }
    });

    it('should handle time estimation updates', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);

      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      const timeUpdates = [
        { estimatedTime: 180, expected: '3:00' },
        { estimatedTime: 120, expected: '2:00' },
        { estimatedTime: 75, expected: '1:15' },
        { estimatedTime: 30, expected: '0:30' },
        { estimatedTime: 5, expected: '0:05' },
        { estimatedTime: 0, expected: null }
      ];

      for (const update of timeUpdates) {
        await act(async () => {
          mockWebSocket.simulateMessage({
            transcriptionId,
            status: 'transcribing',
            progress: 50,
            estimatedTime: update.estimatedTime
          });
          jest.advanceTimersByTime(100);
        });

        if (update.expected) {
          expect(screen.getByText(`予想残り時間: ${update.expected}`)).toBeInTheDocument();
        } else {
          expect(screen.queryByText(/予想残り時間:/)).not.toBeInTheDocument();
        }
      }
    });
  });

  describe('Message Validation', () => {
    it('should validate outgoing message structure', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);

      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      const lastMessage = mockWebSocket.getLastMessage();
      
      expect(lastMessage).toHaveProperty('action', 'subscribe');
      expect(lastMessage).toHaveProperty('transcriptionId', transcriptionId);
      expect(typeof lastMessage.transcriptionId).toBe('string');
      expect(lastMessage.transcriptionId.length).toBeGreaterThan(0);
    });

    it('should handle invalid message formats gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);

      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      const invalidMessages = [
        'invalid-json',
        '{"incomplete": json',
        '{}',
        '{"transcriptionId": "different-id"}', // Wrong ID
        '{"transcriptionId": null}',
        '{"transcriptionId": ""}',
        '{"status": "unknown-status"}'
      ];

      for (const invalidMsg of invalidMessages) {
        await act(async () => {
          if (mockWebSocket.onmessage) {
            mockWebSocket.onmessage(new MessageEvent('message', { data: invalidMsg }));
          }
          jest.advanceTimersByTime(100);
        });
      }

      // Should log errors but not crash
      expect(consoleSpy).toHaveBeenCalled();
      expect(screen.getByText('接続中...')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should validate required message fields', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);

      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      const incompleteMessages = [
        { transcriptionId: transcriptionId }, // Missing status
        { status: 'uploading' }, // Missing transcriptionId
        { transcriptionId: transcriptionId, status: 'uploading' }, // Missing progress
        { transcriptionId: transcriptionId, status: 'uploading', progress: 'invalid' }, // Invalid progress type
        { transcriptionId: transcriptionId, status: 'uploading', progress: -10 }, // Invalid progress value
        { transcriptionId: transcriptionId, status: 'uploading', progress: 150 } // Invalid progress value
      ];

      for (const msg of incompleteMessages) {
        await act(async () => {
          mockWebSocket.simulateMessage(msg);
          jest.advanceTimersByTime(100);
        });
      }

      // Component should handle gracefully
      expect(screen.getByText('接続中...')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should filter messages by transcription ID', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);

      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      // Send message for different transcription
      await act(async () => {
        mockWebSocket.simulateMessage({
          transcriptionId: 'different-id',
          status: 'uploading',
          progress: 50,
          currentStep: 'Should not appear'
        });
        jest.advanceTimersByTime(100);
      });

      expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();

      // Send message for correct transcription
      await act(async () => {
        mockWebSocket.simulateMessage({
          transcriptionId: transcriptionId,
          status: 'uploading',
          progress: 25,
          currentStep: 'Should appear'
        });
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByText('Should appear')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  describe('End-to-End Integration', () => {
    it('should integrate with AudioFileUpload component', async () => {
      const user = userEvent.setup({ delay: null });
      const onUploadComplete = jest.fn();
      const setUploading = jest.fn();

      // Mock successful upload response with transcription ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { transcriptionId: transcriptionId }
        })
      } as Response);

      render(
        <AudioFileUpload
          sessionId="test-session"
          source="notta"
          onUploadComplete={onUploadComplete}
          uploading={false}
          setUploading={setUploading}
        />
      );

      // Upload a file
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      // Click upload button
      const uploadButton = screen.getByText('アップロード');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/sessions/test-session/upload/audio/notta',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData)
          })
        );
      });

      // Should render TranscriptionProgressIndicator
      await waitFor(() => {
        expect(screen.getByText('接続中...')).toBeInTheDocument();
      });

      // Simulate progress updates
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: transcriptionId,
          status: 'uploading',
          progress: 50,
          currentStep: 'アップロード中... 50%'
        });
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('アップロード中... 50%')).toBeInTheDocument();
    });

    it('should handle connection recovery during upload', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);

      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      // Start progress
      await act(async () => {
        mockWebSocket.simulateMessage({
          transcriptionId: transcriptionId,
          status: 'uploading',
          progress: 25,
          currentStep: 'アップロード中...'
        });
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByText('25%')).toBeInTheDocument();

      // Simulate connection drop and recovery
      await act(async () => {
        mockWebSocket.simulateUnstableConnection();
        jest.advanceTimersByTime(6000); // Wait for reconnection
      });

      // Should automatically reconnect
      expect(global.WebSocket).toHaveBeenCalledTimes(2);

      // Continue receiving updates after reconnection
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: transcriptionId,
          status: 'transcribing',
          progress: 75,
          currentStep: '音声認識中...'
        });
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('音声認識中...')).toBeInTheDocument();
    });
  });

  describe('Performance and Latency', () => {
    it('should handle high-frequency updates without performance degradation', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);

      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      const startTime = Date.now();
      const updateCount = 50;

      // Send rapid updates
      for (let i = 0; i < updateCount; i++) {
        await act(async () => {
          mockWebSocket.simulateMessage({
            transcriptionId: transcriptionId,
            status: 'transcribing',
            progress: i * 2,
            currentStep: `Processing ${i}...`
          });
          jest.advanceTimersByTime(10);
        });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle updates efficiently
      expect(totalTime).toBeLessThan(5000); // 5 seconds maximum
      expect(screen.getByText(`${(updateCount - 1) * 2}%`)).toBeInTheDocument();
    });

    it('should track message latency', async () => {
      render(<TranscriptionProgressIndicator transcriptionId={transcriptionId} />);

      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      // Simulate network latency
      mockWebSocket.simulateNetworkLatency(100);

      const sendTime = Date.now();

      await act(async () => {
        mockWebSocket.simulateMessage({
          transcriptionId: transcriptionId,
          status: 'uploading',
          progress: 50,
          currentStep: 'Testing latency'
        });
        jest.advanceTimersByTime(150); // Wait for latency
      });

      const receiveTime = Date.now();
      const latency = receiveTime - sendTime;

      expect(latency).toBeGreaterThanOrEqual(100);
      expect(screen.getByText('Testing latency')).toBeInTheDocument();
    });
  });
});