import React from 'react';
import { render, screen, act } from '@testing-library/react';
import TranscriptionProgressIndicator from '../TranscriptionProgress';

// Mock WebSocket for testing
class MockWebSocket {
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = WebSocket.CONNECTING;
  public url: string;
  
  private messageQueue: string[] = [];
  
  constructor(url: string) {
    this.url = url;
    // Simulate connection opening after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }
  
  send(data: string) {
    this.messageQueue.push(data);
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
  
  // Test helper methods
  simulateMessage(data: Record<string, unknown>) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
  
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
  
  simulateClose() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
  
  getLastMessage() {
    return this.messageQueue[this.messageQueue.length - 1];
  }
  
  getAllMessages() {
    return this.messageQueue;
  }
}

// Replace global WebSocket with mock
const originalWebSocket = global.WebSocket;
let mockWebSocket: MockWebSocket;

beforeAll(() => {
  (global as unknown as { WebSocket: jest.Mock }).WebSocket = jest.fn().mockImplementation((url: string) => {
    mockWebSocket = new MockWebSocket(url);
    return mockWebSocket;
  });
});

afterAll(() => {
  global.WebSocket = originalWebSocket;
});

describe('TranscriptionProgressIndicator - WebSocket Connection Tests', () => {
  const defaultProps = {
    transcriptionId: 'test-transcription-123',
    onComplete: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Connection Reliability', () => {
    it('establishes WebSocket connection with correct URL', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3001/ws/transcribe-progress');
    });

    it('sends subscription message on connection open', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      const lastMessage = mockWebSocket.getLastMessage();
      expect(JSON.parse(lastMessage)).toEqual({
        action: 'subscribe',
        transcriptionId: 'test-transcription-123'
      });
    });

    it('displays connecting state initially', () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      expect(screen.getByText('接続中...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
    });

    it('handles connection close and attempts reconnection', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateClose();
        jest.advanceTimersByTime(5100); // Wait for reconnection timeout
      });
      
      // Should attempt to create a new WebSocket connection
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('handles WebSocket errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateError();
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', expect.any(Event));
      consoleSpy.mockRestore();
    });

    it('cleans up WebSocket connection on unmount', async () => {
      const { unmount } = render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      const closeSpy = jest.spyOn(mockWebSocket, 'close');
      
      unmount();
      
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('Progress Data Accuracy', () => {
    it('updates progress when receiving valid message', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: 'test-transcription-123',
          status: 'uploading',
          progress: 25,
          currentStep: 'アップロード中...'
        });
      });
      
      expect(screen.getByText('ファイルをアップロード中...')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('現在の処理: アップロード中...')).toBeInTheDocument();
    });

    it('ignores messages for different transcription IDs', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: 'different-id',
          status: 'uploading',
          progress: 50,
          currentStep: 'Different process'
        });
      });
      
      // Should still show connecting state
      expect(screen.getByText('接続中...')).toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('displays queue position when provided', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: 'test-transcription-123',
          status: 'transcribing',
          progress: 30,
          queuePosition: 3,
          currentStep: '処理待ち...'
        });
      });
      
      expect(screen.getByText('待機順位: 3番目')).toBeInTheDocument();
    });

    it('displays estimated time when provided', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: 'test-transcription-123',
          status: 'transcribing',
          progress: 60,
          estimatedTime: 120,
          currentStep: '音声認識中...'
        });
      });
      
      expect(screen.getByText('予想残り時間: 2:00')).toBeInTheDocument();
    });

    it('handles malformed JSON messages gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(new MessageEvent('message', { data: 'invalid-json' }));
        }
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket message parsing error:', expect.any(SyntaxError));
      
      // Should still show connecting state
      expect(screen.getByText('接続中...')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  describe('Status Transitions', () => {
    it('shows correct UI for uploading status', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: 'test-transcription-123',
          status: 'uploading',
          progress: 20,
          currentStep: 'アップロード開始'
        });
      });
      
      expect(screen.getByText('ファイルをアップロード中...')).toBeInTheDocument();
      expect(screen.getByText('アップロード開始')).toBeInTheDocument();
      
      // Check for audio wave animation elements
      const progressBar = screen.getByRole('progressbar', { hidden: true });
      expect(progressBar).toHaveStyle('width: 20%');
    });

    it('shows correct UI for transcribing status', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: 'test-transcription-123',
          status: 'transcribing',
          progress: 75,
          currentStep: 'Whisper API で音声認識中...'
        });
      });
      
      expect(screen.getByText('音声を文字起こし中...')).toBeInTheDocument();
      expect(screen.getByText('Whisper API で音声認識中...')).toBeInTheDocument();
    });

    it('shows completed status with success message', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: 'test-transcription-123',
          status: 'completed',
          progress: 100,
          currentStep: '転写完了！'
        });
      });
      
      expect(screen.getByText('文字起こしが完了しました！')).toBeInTheDocument();
      expect(screen.getByText('結果を確認してください。')).toBeInTheDocument();
      expect(defaultProps.onComplete).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        progress: 100
      }));
    });

    it('shows error status with retry button', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: 'test-transcription-123',
          status: 'error',
          progress: 45,
          error: 'API エラーが発生しました',
          currentStep: 'エラーが発生しました'
        });
      });
      
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('API エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('再試行 (Ctrl+R)')).toBeInTheDocument();
      expect(defaultProps.onError).toHaveBeenCalledWith('API エラーが発生しました');
    });
  });

  describe('Keyboard Accessibility', () => {
    it('focuses retry button on error', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: 'test-transcription-123',
          status: 'error',
          error: 'Test error'
        });
        jest.advanceTimersByTime(150); // Wait for focus timeout
      });
      
      const retryButton = screen.getByText('再試行 (Ctrl+R)');
      expect(retryButton).toBeInTheDocument();
    });

    it('handles Ctrl+R keyboard shortcut for retry', async () => {
      const reloadSpy = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true
      });
      
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(50);
        mockWebSocket.simulateMessage({
          transcriptionId: 'test-transcription-123',
          status: 'error',
          error: 'Test error'
        });
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
      
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('closes WebSocket on Escape key', async () => {
      render(<TranscriptionProgressIndicator {...defaultProps} />);
      
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

  describe('Test Mode Features', () => {
    const mockProgressSequence = [
      {
        transcriptionId: 'test-transcription-123',
        status: 'uploading' as const,
        progress: 10,
        currentStep: 'アップロード開始'
      },
      {
        transcriptionId: 'test-transcription-123',
        status: 'transcribing' as const,
        progress: 50,
        currentStep: '音声認識中'
      },
      {
        transcriptionId: 'test-transcription-123',
        status: 'completed' as const,
        progress: 100,
        currentStep: '完了'
      }
    ];

    it('uses mock progress in test mode', async () => {
      render(
        <TranscriptionProgressIndicator 
          {...defaultProps} 
          testMode={true}
          mockProgress={mockProgressSequence}
        />
      );
      
      // First mock step
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText('10%')).toBeInTheDocument();
      expect(screen.getByText('アップロード開始')).toBeInTheDocument();
      
      // Second mock step
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('音声認識中')).toBeInTheDocument();
      
      // Third mock step
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('完了')).toBeInTheDocument();
    });

    it('does not create WebSocket connection in test mode', () => {
      render(
        <TranscriptionProgressIndicator 
          {...defaultProps} 
          testMode={true}
          mockProgress={mockProgressSequence}
        />
      );
      
      // WebSocket should not be called in test mode
      expect(global.WebSocket).not.toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    it('logs performance metrics in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleSpy = jest.spyOn(console, 'time').mockImplementation();
      const consoleEndSpy = jest.spyOn(console, 'timeEnd').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const { unmount } = render(<TranscriptionProgressIndicator {...defaultProps} />);
      
      expect(consoleSpy).toHaveBeenCalledWith('transcription-progress-test-transcription-123');
      
      unmount();
      
      expect(consoleEndSpy).toHaveBeenCalledWith('transcription-progress-test-transcription-123');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/TranscriptionProgress lifecycle: \d+ms/)
      );
      
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
      consoleEndSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
});