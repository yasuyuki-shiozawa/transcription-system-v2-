import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AudioFileUpload from '../AudioFileUpload';

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('AudioFileUpload', () => {
  const defaultProps = {
    sessionId: 'test-session-123',
    source: 'notta' as const,
    onUploadComplete: jest.fn(),
    uploading: false,
    setUploading: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('ファイル選択', () => {
    it('コンポーネントが正しくレンダリングされる', () => {
      render(<AudioFileUpload {...defaultProps} />);
      
      expect(screen.getByText(/音声ファイルをドラッグ＆ドロップ/)).toBeInTheDocument();
      expect(screen.getByText(/MP3, WAV \(最大100MB\)/)).toBeInTheDocument();
    });

    it('MP3ファイルを選択できる', async () => {
      const user = userEvent.setup();
      render(<AudioFileUpload {...defaultProps} />);
      
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      expect(screen.getByText('test.mp3')).toBeInTheDocument();
      expect(screen.getByText(/音声プレビュー/)).toBeInTheDocument();
    });

    it('WAVファイルを選択できる', async () => {
      const user = userEvent.setup();
      render(<AudioFileUpload {...defaultProps} />);
      
      const file = new File(['audio content'], 'test.wav', { type: 'audio/wav' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      expect(screen.getByText('test.wav')).toBeInTheDocument();
    });
  });

  describe('ファイル検証', () => {
    it('100MB以上のファイルを拒否する', async () => {
      const user = userEvent.setup();
      render(<AudioFileUpload {...defaultProps} />);
      
      // 101MBのファイルを作成
      const largeFile = new File(
        [new ArrayBuffer(101 * 1024 * 1024)], 
        'large.mp3', 
        { type: 'audio/mpeg' }
      );
      
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, largeFile);
      
      expect(screen.getByText(/ファイルサイズが大きすぎます/)).toBeInTheDocument();
      expect(screen.queryByText(/アップロード/)).not.toBeInTheDocument();
    });

    it('非対応ファイル形式を拒否する', async () => {
      const user = userEvent.setup();
      render(<AudioFileUpload {...defaultProps} />);
      
      const invalidFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, invalidFile);
      
      expect(screen.getByText(/MP3またはWAVファイルのみアップロード可能です/)).toBeInTheDocument();
    });

    it('拡張子での検証も行う', async () => {
      const user = userEvent.setup();
      render(<AudioFileUpload {...defaultProps} />);
      
      // MIMEタイプが空でも拡張子で判定
      const file = new File(['content'], 'test.mp3', { type: '' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      expect(screen.getByText('test.mp3')).toBeInTheDocument();
      expect(screen.queryByText(/MP3またはWAVファイルのみ/)).not.toBeInTheDocument();
    });
  });

  describe('アップロード処理', () => {
    it('アップロードボタンでAPIを呼び出す', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<AudioFileUpload {...defaultProps} />);
      
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      const uploadButton = screen.getByText('アップロード');
      
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/sessions/test-session-123/upload/audio/notta',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
      });
      
      expect(defaultProps.onUploadComplete).toHaveBeenCalled();
    });

    it('アップロード中はボタンを無効化する', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AudioFileUpload {...defaultProps} />);
      
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      
      // アップロード中の状態に更新
      rerender(<AudioFileUpload {...defaultProps} uploading={true} />);
      
      const uploadButton = screen.getByText('アップロード中...');
      expect(uploadButton).toBeDisabled();
    });

    it('プログレスバーを表示する', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(<AudioFileUpload {...defaultProps} />);
      
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      const uploadButton = screen.getByText('アップロード');
      
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/アップロード中.../)).toBeInTheDocument();
      });
    });

    it('エラー時にエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<AudioFileUpload {...defaultProps} />);
      
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      const uploadButton = screen.getByText('アップロード');
      
      await user.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/アップロード中にエラーが発生しました/)).toBeInTheDocument();
      });
    });
  });

  describe('UI操作', () => {
    it('キャンセルボタンで選択をリセットする', async () => {
      const user = userEvent.setup();
      render(<AudioFileUpload {...defaultProps} />);
      
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      expect(screen.getByText('test.mp3')).toBeInTheDocument();
      
      const cancelButton = screen.getByText('キャンセル');
      await user.click(cancelButton);
      
      expect(screen.queryByText('test.mp3')).not.toBeInTheDocument();
      expect(screen.getByText(/音声ファイルをドラッグ＆ドロップ/)).toBeInTheDocument();
    });

    it('ファイルサイズを適切にフォーマットする', async () => {
      const user = userEvent.setup();
      render(<AudioFileUpload {...defaultProps} />);
      
      // 5.5MBのファイル
      const file = new File(
        [new ArrayBuffer(5.5 * 1024 * 1024)], 
        'test.mp3', 
        { type: 'audio/mpeg' }
      );
      
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);
      
      expect(screen.getByText(/5\.5 MB/)).toBeInTheDocument();
    });
  });

  describe('ソース別の処理', () => {
    it('NOTTAソースで正しいAPIエンドポイントを呼ぶ', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<AudioFileUpload {...defaultProps} source="notta" />);
      
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      await user.click(screen.getByText('アップロード'));
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/upload/audio/notta'),
          expect.any(Object)
        );
      });
    });

    it('MANUSソースで正しいAPIエンドポイントを呼ぶ', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<AudioFileUpload {...defaultProps} source="manus" />);
      
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(input, file);
      await user.click(screen.getByText('アップロード'));
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/upload/audio/manus'),
          expect.any(Object)
        );
      });
    });
  });
});