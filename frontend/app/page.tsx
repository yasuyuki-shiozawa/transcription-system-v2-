'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Session {
  id: string;
  name: string;
  date: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', date: '' });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      if (data.success) {
        setSessions(data.data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession),
      });
      const data = await response.json();
      if (data.success) {
        setShowNewSessionForm(false);
        setNewSession({ name: '', date: '' });
        fetchSessions();
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('本当にこのセッションを削除しますか？')) return;
    
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchSessions();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
    };
    
    const statusLabels = {
      DRAFT: '下書き',
      IN_PROGRESS: '進行中',
      COMPLETED: '完了',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusStyles[status as keyof typeof statusStyles] || statusStyles.DRAFT}`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">議会議事録作成システム</h1>
          <p className="mt-2 text-gray-600">セッションを選択して議事録の作成・編集を行います</p>
        </div>

        {/* New Session Form */}
        {showNewSessionForm && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">新規セッション作成</h2>
            <form onSubmit={createSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">セッション名</label>
                <input
                  type="text"
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="例：令和6年第1回定例会"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">開催日</label>
                <input
                  type="datetime-local"
                  value={newSession.date}
                  onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  作成
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewSessionForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6">
          <button
            onClick={() => setShowNewSessionForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={showNewSessionForm}
          >
            新規セッション作成
          </button>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">セッションがありません</p>
            <p className="mt-2 text-sm text-gray-400">新規セッションを作成してください</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <li key={session.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/sessions/${session.id}`}
                        className="block flex-1"
                      >
                        <div className="flex items-center">
                          <div className="flex-1">
                            <p className="text-lg font-medium text-blue-600 hover:text-blue-800">
                              {session.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              開催日: {formatDate(session.date)}
                            </p>
                          </div>
                          <div className="ml-4">
                            {getStatusBadge(session.status)}
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={() => deleteSession(session.id)}
                        className="ml-4 text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}