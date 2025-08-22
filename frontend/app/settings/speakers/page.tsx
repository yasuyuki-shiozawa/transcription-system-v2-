'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Speaker {
  id: string;
  fullName: string;
  displayName: string;
  aliases: string;
  speakerType: string;
}

export default function SpeakersSettings() {
  const router = useRouter();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    fullName: '',
    displayName: '',
    aliases: '',
    speakerType: 'MEMBER'
  });

  useEffect(() => {
    fetchSpeakers();
  }, []);

  const fetchSpeakers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/speakers`);
      const data = await response.json();
      if (data.success) {
        setSpeakers(data.data);
      }
    } catch (error) {
      console.error('Error fetching speakers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingSpeaker 
        ? `/api/speakers/${editingSpeaker.id}`
        : '/api/speakers';
        
      const method = editingSpeaker ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        fetchSpeakers();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving speaker:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この話者を削除しますか？')) return;
    
    try {
      const response = await fetch(`/api/speakers/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchSpeakers();
      }
    } catch (error) {
      console.error('Error deleting speaker:', error);
    }
  };

  const handleEdit = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    setFormData({
      fullName: speaker.fullName,
      displayName: speaker.displayName,
      aliases: speaker.aliases,
      speakerType: speaker.speakerType
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      displayName: '',
      aliases: '',
      speakerType: 'MEMBER'
    });
    setEditingSpeaker(null);
    setShowAddForm(false);
  };

  const generateDisplayName = (fullName: string, type: string) => {
    if (type === 'MEMBER') {
      return `${fullName}議員`;
    } else if (type === 'STAFF') {
      return `${fullName}`;
    }
    return fullName;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← ホームに戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">話者管理</h1>
          <p className="mt-2 text-gray-600">議事録に登場する話者を管理します</p>
        </div>

        {/* 追加/編集フォーム */}
        {showAddForm && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">
              {editingSpeaker ? '話者を編集' : '新規話者登録'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    正式名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => {
                      const fullName = e.target.value;
                      setFormData({
                        ...formData,
                        fullName,
                        displayName: generateDisplayName(fullName, formData.speakerType)
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="例：比嘉武宏"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    種別 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.speakerType}
                    onChange={(e) => {
                      const type = e.target.value;
                      setFormData({
                        ...formData,
                        speakerType: type,
                        displayName: generateDisplayName(formData.fullName, type)
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="MEMBER">議員</option>
                    <option value="STAFF">職員</option>
                    <option value="OTHER">その他</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表示名
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="例：比嘉武宏議員"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  別名・略称（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={formData.aliases}
                  onChange={(e) => setFormData({...formData, aliases: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="例：比嘉,ヒガ,比嘉議員"
                />
                <p className="text-xs text-gray-500 mt-1">
                  議事録内で使用される可能性のある表記を登録してください
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingSpeaker ? '更新' : '登録'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 追加ボタン */}
        {!showAddForm && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              新規話者登録
            </button>
          </div>
        )}

        {/* 話者一覧 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : speakers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">話者が登録されていません</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    正式名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    表示名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    種別
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    別名
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {speakers.map((speaker) => (
                  <tr key={speaker.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {speaker.fullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {speaker.displayName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        speaker.speakerType === 'MEMBER' ? 'bg-blue-100 text-blue-800' :
                        speaker.speakerType === 'STAFF' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {speaker.speakerType === 'MEMBER' ? '議員' :
                         speaker.speakerType === 'STAFF' ? '職員' : 'その他'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {speaker.aliases || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(speaker)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(speaker.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}