'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Session {
  id: string;
  name: string;
  date: string;
  status: string;
}

interface Section {
  id: string;
  sectionNumber: string;
  speaker: string;
  timestamp: string;
  content: string;
}

interface TranscriptionData {
  id: string;
  source: string;
  originalFileName: string;
  status: string;
  sections: Section[];
}

interface SectionMapping {
  id: string;
  nottaSection: Section;
  manusSection: Section;
  confidence: number;
}

export default function SessionDetail() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [transcriptions, setTranscriptions] = useState<TranscriptionData[]>([]);
  const [mappings, setMappings] = useState<SectionMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingNotta, setUploadingNotta] = useState(false);
  const [uploadingManus, setUploadingManus] = useState(false);
  const [viewMode, setViewMode] = useState<'upload' | 'compare'>('upload');

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      // Fetch session details
      const sessionRes = await fetch(`/api/sessions/${sessionId}`);
      const sessionData = await sessionRes.json();
      if (sessionData.success) {
        setSession(sessionData.data);
      }

      // Fetch transcriptions
      const transcriptionsRes = await fetch(`/api/sessions/${sessionId}/upload/transcriptions`);
      const transcriptionsData = await transcriptionsRes.json();
      if (transcriptionsData.success) {
        setTranscriptions(transcriptionsData.data);
      }

      // Fetch mappings
      const mappingsRes = await fetch(`/api/sessions/${sessionId}/upload/mappings`);
      const mappingsData = await mappingsRes.json();
      if (mappingsData.success) {
        setMappings(mappingsData.data);
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, source: 'notta' | 'manus') => {
    const formData = new FormData();
    formData.append('file', file);

    const setUploading = source === 'notta' ? setUploadingNotta : setUploadingManus;
    setUploading(true);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/upload/${source}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        alert(`${source === 'notta' ? 'NOTTA' : 'Manus'}ファイルのアップロードが完了しました`);
        fetchSessionData();
        
        // Switch to compare view if both files are uploaded
        const hasNotta = transcriptions.some(t => t.source === 'NOTTA') || source === 'notta';
        const hasManus = transcriptions.some(t => t.source === 'MANUS') || source === 'manus';
        if (hasNotta && hasManus) {
          setViewMode('compare');
        }
      } else {
        alert('アップロードエラー: ' + data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('アップロード中にエラーが発生しました');
    } finally {
      setUploading(false);
    }
  };

  const getNottaSections = () => {
    const nottaData = transcriptions.find(t => t.source === 'NOTTA');
    return nottaData?.sections || [];
  };

  const getManusSections = () => {
    const manusData = transcriptions.find(t => t.source === 'MANUS');
    return manusData?.sections || [];
  };

  const getSyncedSections = () => {
    const nottaSections = getNottaSections();
    const manusSections = getManusSections();
    const syncedData: Array<{
      sectionNumber: string;
      notta?: Section;
      manus?: Section;
      mapping?: SectionMapping;
    }> = [];

    // Create a map of all unique section numbers
    const allSectionNumbers = new Set<string>();
    nottaSections.forEach(s => allSectionNumbers.add(s.sectionNumber));
    manusSections.forEach(s => allSectionNumbers.add(s.sectionNumber));

    // Sort section numbers
    const sortedNumbers = Array.from(allSectionNumbers).sort();

    // Build synced data
    sortedNumbers.forEach(sectionNumber => {
      const nottaSection = nottaSections.find(s => s.sectionNumber === sectionNumber);
      const manusSection = manusSections.find(s => s.sectionNumber === sectionNumber);
      const mapping = mappings.find(
        m => m.nottaSection?.sectionNumber === sectionNumber || 
             m.manusSection?.sectionNumber === sectionNumber
      );

      syncedData.push({
        sectionNumber,
        notta: nottaSection,
        manus: manusSection,
        mapping
      });
    });

    return syncedData;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">セッションが見つかりません</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← セッション一覧に戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{session.name}</h1>
          <p className="mt-2 text-gray-600">
            開催日: {new Date(session.date).toLocaleDateString('ja-JP')}
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setViewMode('upload')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ファイルアップロード
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'compare'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              データ比較
            </button>
          </nav>
        </div>

        {/* Upload View */}
        {viewMode === 'upload' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* NOTTA Upload */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">NOTTAデータ</h2>
              {transcriptions.find(t => t.source === 'NOTTA') ? (
                <div>
                  <p className="text-sm text-green-600 mb-2">✓ アップロード済み</p>
                  <p className="text-sm text-gray-600">
                    ファイル: {transcriptions.find(t => t.source === 'NOTTA')?.originalFileName}
                  </p>
                  <p className="text-sm text-gray-600">
                    セクション数: {getNottaSections().length}
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'notta');
                    }}
                    className="mb-4 text-sm"
                    disabled={uploadingNotta}
                  />
                  {uploadingNotta && (
                    <p className="text-sm text-blue-600">アップロード中...</p>
                  )}
                </div>
              )}
            </div>

            {/* Manus Upload */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Manusデータ</h2>
              {transcriptions.find(t => t.source === 'MANUS') ? (
                <div>
                  <p className="text-sm text-green-600 mb-2">✓ アップロード済み</p>
                  <p className="text-sm text-gray-600">
                    ファイル: {transcriptions.find(t => t.source === 'MANUS')?.originalFileName}
                  </p>
                  <p className="text-sm text-gray-600">
                    セクション数: {getManusSections().length}
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'manus');
                    }}
                    className="mb-4 text-sm"
                    disabled={uploadingManus}
                  />
                  {uploadingManus && (
                    <p className="text-sm text-blue-600">アップロード中...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compare View */}
        {viewMode === 'compare' && (
          <div>
            {getNottaSections().length === 0 && getManusSections().length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">データがアップロードされていません</p>
                <button
                  onClick={() => setViewMode('upload')}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  ファイルをアップロード
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {getSyncedSections().map(({ sectionNumber, notta, manus, mapping }) => (
                  <div key={sectionNumber} className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Section Header */}
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">セクション {sectionNumber}</span>
                        {mapping && (
                          <span className="text-sm text-gray-600">
                            マッチング確信度: {Math.round(mapping.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Section Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-x">
                      {/* NOTTA Column */}
                      <div className="p-4">
                        <h3 className="font-semibold text-blue-600 mb-2">NOTTA</h3>
                        {notta ? (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">
                              {notta.speaker} [{notta.timestamp}]
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{notta.content}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">データなし</p>
                        )}
                      </div>

                      {/* Manus Column */}
                      <div className="p-4">
                        <h3 className="font-semibold text-green-600 mb-2">Manus</h3>
                        {manus ? (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">
                              {manus.speaker} [{manus.timestamp}]
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{manus.content}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">データなし</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}