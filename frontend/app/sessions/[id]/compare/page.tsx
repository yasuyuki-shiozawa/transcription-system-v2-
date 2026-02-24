'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import EditableManusSection from '../../../../components/EditableManusSection';
import EditableNottaSection from '../../../../components/EditableNottaSection';
import UndoButton from '../../../../components/UndoButton';

interface Section {
  id: string;
  sectionNumber: string;
  speaker: string;
  timestamp: string;
  content: string;
  order: number;
}

interface TranscriptionData {
  id: string;
  source: string;
  sections: Section[];
}

export default function ComparePage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [nottaData, setNottaData] = useState<TranscriptionData | null>(null);
  const [manusData, setManusData] = useState<TranscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${sessionId}/transcriptions`);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }
      const data = await response.json();
      
      if (data.success) {
        const notta = data.data.find((t: TranscriptionData) => t.source === 'notta');
        const manus = data.data.find((t: TranscriptionData) => t.source === 'manus' || t.source === 'user_test');
        
        setNottaData(notta || null);
        setManusData(manus || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchData();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">データを読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">エラー: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            ← セッション詳細に戻る
          </button>
          <UndoButton 
            sessionId={sessionId} 
            onUndoSuccess={() => {
              // Undo成功後にデータを再取得
              fetchData();
            }}
          />
        </div>

        <h1 className="text-2xl font-bold mb-6">データ比較</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NOTTAデータ */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-purple-700">NOTTAデータ</h2>
            {nottaData && nottaData.sections.length > 0 ? (
              <div className="space-y-4">
                {nottaData.sections.map((section) => (
                  <EditableNottaSection
                    key={section.id}
                    section={section}
                    onUpdate={async () => {}}
                    onSectionDeleted={async () => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                NOTTAデータがありません
              </div>
            )}
          </div>

          {/* Manusデータ */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-700">Manusデータ</h2>
            {manusData && manusData.sections.length > 0 ? (
              <div className="space-y-4">
                {manusData.sections.map((section) => (
                  <EditableManusSection
                    key={section.id}
                    section={section}
                    onUpdate={async () => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Manusデータがありません
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

