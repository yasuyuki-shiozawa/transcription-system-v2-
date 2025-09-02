'use client';

import React, { useState, useEffect } from 'react';
import EditableManusSection from '../../components/EditableManusSection';

interface SessionData {
  id: string;
  name: string;
  date: string;
  status: string;
}

interface SectionData {
  id: string;
  sessionId: string;
  type: 'manus' | 'notta';
  content: string;
  order: number;
}

export default function TestRealSessionPage() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [sectionData, setSectionData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // テスト用のセッションとセクションデータを作成
    const testSession: SessionData = {
      id: 'test-session-id',
      name: 'ハイライト機能テスト',
      date: '2025-09-02',
      status: 'draft'
    };

    const testSection: SectionData = {
      id: 'test-section-id',
      sessionId: 'test-session-id',
      type: 'manus',
      content: `0001	田中太郎	00:15	これはハイライト機能のテストです。この文章の一部をハイライトして、正しく表示されるかを確認します。
0002	佐藤花子	00:30	ハイライト機能では、黄色、青色、緑色、ピンク色、オレンジ色の5つの色を使用できます。
0003	山田次郎	00:45	編集モードでハイライトを作成し、通常表示モードで正しく表示されることを確認する必要があります。
0004	鈴木一郎	01:00	この機能により、重要な部分を視覚的に強調することができるようになります。
0005	高橋美咲	01:15	ハイライトをクリックすると削除できる機能も実装されています。
0006	伊藤健一	01:30	複数のハイライトが重複している場合でも、正しく表示される必要があります。`,
      order: 1
    };

    setSessionData(testSession);
    setSectionData(testSection);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-red-500">エラー: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">実際のセッション環境でのハイライト機能テスト</h1>
      
      {sessionData && (
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">セッション情報</h2>
          <p><strong>ID:</strong> {sessionData.id}</p>
          <p><strong>名前:</strong> {sessionData.name}</p>
          <p><strong>日付:</strong> {sessionData.date}</p>
          <p><strong>ステータス:</strong> {sessionData.status}</p>
        </div>
      )}

      {sectionData && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Manusセクション</h2>
          <EditableManusSection
            section={{
              id: sectionData.id,
              sectionNumber: '0001',
              speaker: 'テストユーザー',
              timestamp: '00:00',
              content: sectionData.content,
              isExcluded: false
            }}
            onUpdate={async (sectionId, updates) => {
              console.log('セクション更新:', sectionId, updates);
              if (updates.content) {
                setSectionData(prev => prev ? { ...prev, content: updates.content! } : null);
              }
            }}
            isIncluded={true}
            onToggleInclude={(sectionId) => {
              console.log('セクション切り替え:', sectionId);
            }}
            showWarning={false}
            onSectionDeleted={() => {
              console.log('セクション削除');
            }}
          />
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">テスト手順</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>「本文編集」ボタンをクリックして編集モードに入る</li>
          <li>テキストを選択してハイライトを作成する</li>
          <li>異なる色でハイライトを作成する</li>
          <li>「保存」ボタンをクリックして変更を保存する</li>
          <li>通常表示モードでハイライトが正しく表示されることを確認する</li>
          <li>ハイライトをクリックして削除機能をテストする</li>
        </ol>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>※ ブラウザのコンソールでデバッグログを確認してください</p>
        <p>※ API呼び出しの状況もコンソールで確認できます</p>
      </div>
    </div>
  );
}

