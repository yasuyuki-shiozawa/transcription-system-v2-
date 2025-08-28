'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EditableManusSection from '@/components/EditableManusSection';

// DEBUG: Add console log at module load
console.log('=== SESSION DETAIL PAGE MODULE LOADED ===', new Date().toISOString());

// API URL configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://transcription-system-obfr.onrender.com';

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
  endTimestamp?: string | null;
  content: string;
  isExcluded?: boolean;
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
  console.log('📄 SESSION DETAIL COMPONENT RENDERING', new Date().toISOString());
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  console.log('🆔 Session ID:', sessionId);

  const [session, setSession] = useState<Session | null>(null);
  const [transcriptions, setTranscriptions] = useState<TranscriptionData[]>([]);
  const [mappings, setMappings] = useState<SectionMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingNotta, setUploadingNotta] = useState(false);
  const [uploadingManus, setUploadingManus] = useState(false);
  const [viewMode, setViewMode] = useState<'upload' | 'compare'>('upload');
  const [includedSections, setIncludedSections] = useState<Set<string>>(new Set());
  const [showTimeCalculation, setShowTimeCalculation] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  console.log('📊 COMPONENT STATE:', {
    includedSectionsSize: includedSections.size,
    isInitialized,
    transcriptionsLength: transcriptions.length
  });

  useEffect(() => {
    console.log('🔄 SESSION DETAIL useEffect - Fetching session data for ID:', sessionId);
    fetchSessionData();
  }, [sessionId]);

  // ページ読み込み時に含めるセクションの状態を復元
  useEffect(() => {
    console.log('🔄 Checking initialization:', {
      isInitialized,
      transcriptionsLength: transcriptions.length,
      hasManusData: transcriptions.some(t => t.source === 'MANUS')
    });
    
    if (!isInitialized && transcriptions.length > 0) {
      const manusData = transcriptions.find(t => t.source === 'MANUS');
      if (manusData && manusData.sections.length > 0) {
        // オプトイン方式: デフォルトですべて未選択
        const included = new Set<string>();
        console.log('🔴 INITIALIZING OPT-IN MODE:', {
          total: manusData.sections.length,
          included: included.size,
          includedIds: Array.from(included),
          note: 'All sections start unchecked in opt-in mode',
          sections: manusData.sections.map(s => ({ id: s.id, isExcluded: s.isExcluded }))
        });
        setIncludedSections(included);
        setIsInitialized(true);
      }
    }
  }, [transcriptions, isInitialized]);

  const fetchSessionData = async () => {
    console.log('🔍 FETCHING SESSION DATA...');
    try {
      // Fetch session details
      console.log(`📡 Fetching from: ${API_URL}/api/sessions/${sessionId}`);
      const sessionRes = await fetch(`${API_URL}/api/sessions/${sessionId}`);
      console.log('📡 Session response status:', sessionRes.status);
      const sessionData = await sessionRes.json();
      if (sessionData.success) {
        setSession(sessionData.data);
      }

      // Fetch transcriptions
      const transcriptionsRes = await fetch(`${API_URL}/api/sessions/${sessionId}/upload/transcriptions`);
      const transcriptionsData = await transcriptionsRes.json();
      if (transcriptionsData.success) {
        setTranscriptions(transcriptionsData.data);
      }

      // Fetch mappings
      const mappingsRes = await fetch(`${API_URL}/api/sessions/${sessionId}/upload/mappings`);
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
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/upload/${source}`, {
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

  const updateManusSection = async (sectionId: string, updates: { speaker?: string; timestamp?: string; endTimestamp?: string | null; content?: string }) => {
    try {
      const response = await fetch(`${API_URL}/api/sections/${sectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update section');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh data to show updates
        await fetchSessionData();
      }
    } catch (error) {
      console.error('Error updating section:', error);
      throw error;
    }
  };

  const toggleIncludeSection = async (sectionId: string) => {
    const isCurrentlyIncluded = includedSections.has(sectionId);
    const newIncludedState = !isCurrentlyIncluded;

    console.log('Toggling section inclusion:', {
      sectionId,
      isCurrentlyIncluded,
      newIncludedState
    });

    // 楽観的にUIを更新
    setIncludedSections(prev => {
      const newSet = new Set(prev);
      if (newIncludedState) {
        newSet.add(sectionId);
      } else {
        newSet.delete(sectionId);
      }
      return newSet;
    });

    // データベースに保存（isExcludedの逆を保存）
    try {
      const response = await fetch(`${API_URL}/api/sections/${sectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isExcluded: !newIncludedState }),
      });

      console.log('PATCH response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        throw new Error('Failed to update section');
      }

      const data = await response.json();
      console.log('Server response:', data);
      
      // Update the local transcriptions data to reflect the change
      if (data.success) {
        setTranscriptions(prev => prev.map(trans => {
          if (trans.source === 'MANUS') {
            return {
              ...trans,
              sections: trans.sections.map(section => 
                section.id === sectionId 
                  ? { ...section, isExcluded: !newIncludedState }
                  : section
              )
            };
          }
          return trans;
        }));
      }
    } catch (error) {
      console.error('Error updating section inclusion:', error);
      // エラーの場合は元に戻す
      setIncludedSections(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyIncluded) {
          newSet.add(sectionId);
        } else {
          newSet.delete(sectionId);
        }
        return newSet;
      });
    }
  };

  // 時刻を秒数に変換する関数
  const timeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      // MM:SS形式
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS形式
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  // 秒数を時間形式に変換する関数
  const secondsToTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}時間${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  // 含まれるセクションの合計時間を計算
  const calculateTotalTime = () => {
    const manusData = transcriptions.find(t => t.source === 'MANUS');
    if (!manusData) return { totalSeconds: 0, missingSections: [] as Section[] };

    const includedSectionsList = manusData.sections.filter(
      section => includedSections.has(section.id)
    );

    let totalSeconds = 0;
    const missingSections: Section[] = [];

    includedSectionsList.forEach(section => {
      if (section.endTimestamp) {
        const duration = timeToSeconds(section.endTimestamp) - timeToSeconds(section.timestamp);
        if (duration > 0) {
          totalSeconds += duration;
        }
      } else {
        missingSections.push(section);
      }
    });

    return { totalSeconds, missingSections };
  };

  const downloadFilteredManusData = async () => {
    const manusData = transcriptions.find(t => t.source === 'MANUS');
    if (!manusData) return;

    // 含まれるセクションのみをフィルタリング
    const includedSectionsList = manusData.sections.filter(
      section => includedSections.has(section.id)
    );

    // セクション番号付きのテキストを生成
    let content = `${session?.name || 'セッション'}\n`;
    content += `開催日: ${session?.date ? new Date(session.date).toLocaleDateString('ja-JP') : ''}\n`;
    content += `出力セクション数: ${includedSectionsList.length}/${manusData.sections.length}\n`;
    content += '='.repeat(50) + '\n\n';

    content += includedSectionsList
      .map(section => {
        const header = `【セクション：${section.sectionNumber}】[${section.speaker}][${section.timestamp}${
          section.endTimestamp ? ` 〜 ${section.endTimestamp}` : ''
        }]`;
        return `${header}\n${section.content}`;
      })
      .join('\n\n');

    // ダウンロード処理
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `manus_filtered_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadFilteredManusAsWord = async () => {
    console.log('downloadFilteredManusAsWord called');
    const manusData = transcriptions.find(t => t.source === 'MANUS');
    if (!manusData) {
      console.log('No MANUS data found');
      return;
    }

    // 含まれるセクションIDのリストを作成
    const includedSectionIds = Array.from(includedSections);
    console.log('Included sections:', includedSectionIds);
    
    if (includedSectionIds.length === 0) {
      alert('ダウンロードするセクションを選択してください');
      return;
    }

    try {
      setIsDownloading(true);
      // 絶対URLを使用
      const url = `${API_URL}/api/sessions/${sessionId}/upload/download/manus/word`;
      console.log('Sending Word download request to:', url);
      console.log('Request body:', { includedSections: includedSectionIds });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ includedSections: includedSectionIds }),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${session?.name || 'manus'}_${new Date().toISOString().split('T')[0]}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('Word document downloaded successfully');
      } else {
        // Try to parse as JSON for error message, but handle binary responses
        let errorMessage = 'Unknown error';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        alert('Word形式のダウンロードに失敗しました: ' + errorMessage);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('ダウンロード中にエラーが発生しました');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadFilteredManusAsWordWithMacro = async () => {
    console.log('downloadFilteredManusAsWordWithMacro called');
    const manusData = transcriptions.find(t => t.source === 'MANUS');
    if (!manusData) {
      console.log('No MANUS data found');
      return;
    }

    // 含まれるセクションIDのリストを作成
    const includedSectionIds = Array.from(includedSections);
    console.log('Included sections:', includedSectionIds);
    
    if (includedSectionIds.length === 0) {
      alert('ダウンロードするセクションを選択してください');
      return;
    }

    try {
      setIsDownloading(true);
      // マクロ付きWord出力のエンドポイントを使用
      const url = `${API_URL}/api/sessions/${sessionId}/download/word-macro`;
      console.log('Sending macro Word download request to:', url);
      console.log('Request body:', { includedSections: includedSectionIds });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ includedSections: includedSectionIds }),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${session?.name || 'manus'}_macro_${new Date().toISOString().split('T')[0]}.docm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('Macro Word document downloaded successfully');
      } else {
        // Try to parse as JSON for error message, but handle binary responses
        let errorMessage = 'Unknown error';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        alert('マクロ付きWord形式のダウンロードに失敗しました: ' + errorMessage);
      }
    } catch (error) {
      console.error('Macro Word download error:', error);
      alert('マクロ付きWordダウンロード中にエラーが発生しました');
    } finally {
      setIsDownloading(false);
    }
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
                  <p className="text-sm text-gray-600 mb-4">
                    セクション数: {getNottaSections().length}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_URL}/api/sessions/${params.id}/upload/download/notta`);
                        if (response.ok) {
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.style.display = 'none';
                          a.href = url;
                          a.download = `notta_sectioned_${new Date().toISOString().split('T')[0]}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                        }
                      } catch (error) {
                        console.error('Download error:', error);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    セクション番号付きデータをダウンロード
                  </button>
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
                  <p className="text-sm text-gray-600 mb-4">
                    セクション数: {getManusSections().length}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_URL}/api/sessions/${params.id}/upload/download/manus`);
                        if (response.ok) {
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.style.display = 'none';
                          a.href = url;
                          a.download = `manus_sectioned_${new Date().toISOString().split('T')[0]}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                        }
                      } catch (error) {
                        console.error('Download error:', error);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    セクション番号付きデータをダウンロード
                  </button>
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
              <div>
                {/* フィルター済みダウンロードボタン */}
                {getManusSections().length > 0 && (() => {
                  const { totalSeconds, missingSections } = calculateTotalTime();
                  return (
                    <div className="mb-4 bg-white p-4 rounded-lg shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <p className="text-sm text-gray-600">
                              含めるセクション数: {includedSections.size} / {getManusSections().length}
                            </p>
                            {showTimeCalculation && (
                              <p className="text-sm font-semibold text-green-600">
                                合計時間: {secondsToTime(totalSeconds)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <button
                              onClick={() => setShowTimeCalculation(!showTimeCalculation)}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            >
                              {showTimeCalculation ? '計算を非表示' : '合計時間を計算'}
                            </button>
                            <div className="flex items-center space-x-2">
                              {includedSections.size > 0 && (
                                <button
                                  onClick={() => setIncludedSections(new Set())}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  すべての選択を解除
                                </button>
                              )}
                              {includedSections.size < getManusSections().length && (
                                <button
                                  onClick={() => {
                                    const allSectionIds = new Set(getManusSections().map(s => s.id));
                                    setIncludedSections(allSectionIds);
                                  }}
                                  className="text-xs text-green-600 hover:text-green-800"
                                >
                                  すべて選択
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={downloadFilteredManusData}
                            disabled={includedSections.size === 0 || isDownloading}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            テキスト形式でダウンロード
                          </button>
                          <button
                            onClick={downloadFilteredManusAsWord}
                            disabled={includedSections.size === 0 || isDownloading}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDownloading ? 'ダウンロード中...' : 'Word形式でダウンロード'}
                          </button>
                          <button
                            onClick={downloadFilteredManusAsWordWithMacro}
                            disabled={includedSections.size === 0 || isDownloading}
                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="話者名均等割り付けマクロ付きWord文書をダウンロード"
                          >
                            {isDownloading ? 'ダウンロード中...' : 'マクロ付きWord'}
                          </button>
                        </div>
                      </div>
                      {showTimeCalculation && missingSections.length > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm text-yellow-800 font-medium mb-1">
                                ⚠️ 終了時間が未入力のセクションがあります
                              </p>
                              <p className="text-xs text-yellow-700">
                                以下のセクションに終了時間を入力してください（合計時間に含まれていません）：
                              </p>
                            </div>
                            <button
                              onClick={() => setShowTimeCalculation(false)}
                              className="text-yellow-800 hover:text-yellow-900 ml-2"
                              title="警告を閉じる"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <ul className="mt-2 text-xs text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                            {missingSections.map(section => (
                              <li key={section.id}>
                                • セクション {section.sectionNumber} - {section.speaker} [{section.timestamp}]
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                          <EditableManusSection 
                            section={manus} 
                            onUpdate={updateManusSection}
                            isIncluded={includedSections.has(manus.id)}
                            onToggleInclude={toggleIncludeSection}
                            showWarning={showTimeCalculation}
                          />
                        ) : (
                          <p className="text-sm text-gray-400">データなし</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

