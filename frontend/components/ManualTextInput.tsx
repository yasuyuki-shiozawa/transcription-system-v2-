'use client';

import React, { useState } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';

interface ManualTextInputProps {
  sessionId: string;
  source: 'notta' | 'manus';
  onComplete: () => void;
  onCancel: () => void;
}

const ManualTextInput: React.FC<ManualTextInputProps> = ({
  sessionId,
  source,
  onComplete,
  onCancel,
}) => {
  const [text, setText] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('テキストを入力してください');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // APIエンドポイントに送信
      const response = await fetch(`/api/sessions/${sessionId}/upload/text/${source}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          speakerName: speakerName.trim() || '話者不明',
          format: 'manual',
        }),
      });

      if (!response.ok) {
        throw new Error('テキストの保存に失敗しました');
      }

      // 成功時の処理
      alert(`${source === 'notta' ? 'NOTTA' : 'Manus'}テキストを保存しました`);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setUploading(false);
    }
  };

  const handleTextPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // ペーストされたテキストの自動フォーマット
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      // 行番号や余分な空白を削除
      const cleanedText = pastedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
      
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newText = text.substring(0, start) + cleanedText + text.substring(end);
      setText(newText);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            手動テキスト入力モード
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
            title="キャンセル"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              音声ファイルの代わりに、テキストを直接入力または貼り付けできます
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              話者名（オプション）
            </label>
            <input
              type="text"
              value={speakerName}
              onChange={(e) => setSpeakerName(e.target.value)}
              placeholder="例：議長、田中委員"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              議事録テキスト <span className="text-red-500">*</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={handleTextPaste}
              placeholder="ここに議事録のテキストを入力または貼り付けてください..."
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="mt-1 text-sm text-gray-500">
              {text.length} 文字
            </div>
          </div>

          {error && (
            <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={uploading || !text.trim()}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors ${
                uploading || !text.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? '保存中...' : 'テキストを保存'}
            </button>
            <button
              onClick={onCancel}
              disabled={uploading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualTextInput;