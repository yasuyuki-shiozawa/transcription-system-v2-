import { useState } from 'react';

interface SectionAddButtonProps {
  source: 'NOTTA' | 'MANUS';
  sessionId: string;
  onSectionAdded: () => void;
}

export default function SectionAddButton({ source, sessionId, onSectionAdded }: SectionAddButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    speaker: '',
    timestamp: '',
    endTimestamp: '',
    content: ''
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://transcription-system-obfr.onrender.com';

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.speaker || !formData.timestamp) {
      alert('話者名と開始時刻は必須です');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(`${API_URL}/api/sections/session/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source,
          speaker: formData.speaker,
          timestamp: formData.timestamp,
          endTimestamp: formData.endTimestamp || null,
          content: formData.content
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add section');
      }

      const data = await response.json();
      if (data.success) {
        // フォームをリセット
        setFormData({
          speaker: '',
          timestamp: '',
          endTimestamp: '',
          content: ''
        });
        setShowForm(false);
        onSectionAdded();
      } else {
        throw new Error(data.error || 'Failed to add section');
      }
    } catch (error) {
      console.error('Error adding section:', error);
      alert('セクションの追加に失敗しました');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      speaker: '',
      timestamp: '',
      endTimestamp: '',
      content: ''
    });
    setShowForm(false);
  };

  // 時刻入力のハンドラー
  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'timestamp' | 'endTimestamp') => {
    const value = e.target.value;
    const filtered = value.replace(/[^0-9:]/g, '');
    setFormData(prev => ({ ...prev, [field]: filtered }));
  };

  // 時刻フォーマット
  const handleTimeBlur = (value: string, field: 'timestamp' | 'endTimestamp') => {
    const numbers = value.replace(/[^\d]/g, '');
    
    if (numbers.length === 0) {
      return;
    }
    
    let formatted = '';
    if (numbers.length <= 4) {
      const mm = numbers.slice(0, 2).padStart(2, '0');
      const ss = numbers.slice(2, 4).padStart(2, '0');
      formatted = ss ? `${mm}:${ss}` : mm;
    } else {
      const hh = numbers.slice(0, 2).padStart(2, '0');
      const mm = numbers.slice(2, 4).padStart(2, '0');
      const ss = numbers.slice(4, 6).padStart(2, '0');
      formatted = ss ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
    }
    
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  if (showForm) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-medium text-blue-800 mb-3">
          新しい{source}セクションを追加
        </h3>
        <form onSubmit={handleAddSection} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                話者名 *
              </label>
              <input
                type="text"
                value={formData.speaker}
                onChange={(e) => setFormData(prev => ({ ...prev, speaker: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 市長"
                required
                disabled={isAdding}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                開始時刻 *
              </label>
              <input
                type="text"
                value={formData.timestamp}
                onChange={(e) => handleTimeInputChange(e, 'timestamp')}
                onBlur={(e) => handleTimeBlur(e.target.value, 'timestamp')}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0518"
                title="数字のみ入力（例: 0518 → 05:18）"
                required
                disabled={isAdding}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                終了時刻
              </label>
              <input
                type="text"
                value={formData.endTimestamp}
                onChange={(e) => handleTimeInputChange(e, 'endTimestamp')}
                onBlur={(e) => handleTimeBlur(e.target.value, 'endTimestamp')}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0545"
                title="数字のみ入力（例: 0545 → 05:45）"
                disabled={isAdding}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              内容
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="発言内容を入力..."
              disabled={isAdding}
            />
          </div>
          <div className="flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isAdding}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isAdding ? '追加中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="w-full mb-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <span>{source}セクションを追加</span>
    </button>
  );
}

