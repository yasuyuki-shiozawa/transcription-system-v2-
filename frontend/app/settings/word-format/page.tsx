'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface WordFormatSettings {
  // ヘッダー設定
  showHeader: boolean;
  questionerLabel: string; // "質問者"
  dateLabel: string; // "日時"
  questionLabel: string; // "質問"
  
  // フォント設定
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  
  // ページ設定
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  
  // セクション設定
  sectionNumberFormat: string; // "（１）", "①", "1."など
  showSpeakerName: boolean;
  showTimestamp: boolean;
  showCumulativeTime: boolean;
}

const defaultSettings: WordFormatSettings = {
  showHeader: true,
  questionerLabel: "質問者",
  dateLabel: "日時",
  questionLabel: "質問",
  fontFamily: "MS Mincho",
  fontSize: 10.5,
  lineHeight: 1.5,
  marginTop: 25.4,
  marginBottom: 25.4,
  marginLeft: 30,
  marginRight: 30,
  sectionNumberFormat: "（{number}）",
  showSpeakerName: true,
  showTimestamp: true,
  showCumulativeTime: true,
};

export default function WordFormatSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<WordFormatSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved settings
    const savedSettings = localStorage.getItem('wordFormatSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('wordFormatSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← ホームに戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Word形式 書式設定</h1>
          <p className="mt-2 text-gray-600">議事録のWord出力時の書式を設定します</p>
        </div>

        <div className="space-y-6">
          {/* ヘッダー設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">ヘッダー設定</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showHeader"
                  checked={settings.showHeader}
                  onChange={(e) => setSettings({...settings, showHeader: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="showHeader" className="text-sm font-medium">
                  ヘッダー情報を表示する
                </label>
              </div>

              {settings.showHeader && (
                <div className="ml-6 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        質問者ラベル
                      </label>
                      <input
                        type="text"
                        value={settings.questionerLabel}
                        onChange={(e) => setSettings({...settings, questionerLabel: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        日時ラベル
                      </label>
                      <input
                        type="text"
                        value={settings.dateLabel}
                        onChange={(e) => setSettings({...settings, dateLabel: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      質問ラベル
                    </label>
                    <input
                      type="text"
                      value={settings.questionLabel}
                      onChange={(e) => setSettings({...settings, questionLabel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* フォント設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">フォント設定</h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  フォント
                </label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => setSettings({...settings, fontFamily: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="MS Mincho">MS 明朝</option>
                  <option value="MS Gothic">MS ゴシック</option>
                  <option value="Yu Mincho">游明朝</option>
                  <option value="Yu Gothic">游ゴシック</option>
                  <option value="Meiryo">メイリオ</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文字サイズ (pt)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.fontSize}
                  onChange={(e) => setSettings({...settings, fontSize: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  行間
                </label>
                <select
                  value={settings.lineHeight}
                  onChange={(e) => setSettings({...settings, lineHeight: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="1">1行</option>
                  <option value="1.15">1.15行</option>
                  <option value="1.5">1.5行</option>
                  <option value="2">2行</option>
                </select>
              </div>
            </div>
          </div>

          {/* ページ設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">ページ余白 (mm)</h2>
            
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">上</label>
                <input
                  type="number"
                  value={settings.marginTop}
                  onChange={(e) => setSettings({...settings, marginTop: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">下</label>
                <input
                  type="number"
                  value={settings.marginBottom}
                  onChange={(e) => setSettings({...settings, marginBottom: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">左</label>
                <input
                  type="number"
                  value={settings.marginLeft}
                  onChange={(e) => setSettings({...settings, marginLeft: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">右</label>
                <input
                  type="number"
                  value={settings.marginRight}
                  onChange={(e) => setSettings({...settings, marginRight: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* セクション設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">セクション表示設定</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  セクション番号形式
                </label>
                <select
                  value={settings.sectionNumberFormat}
                  onChange={(e) => setSettings({...settings, sectionNumberFormat: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="（{number}）">（１）（２）（３）...</option>
                  <option value="{number}.">1. 2. 3. ...</option>
                  <option value="①">① ② ③ ...</option>
                  <option value="【{number}】">【1】【2】【3】...</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.showSpeakerName}
                    onChange={(e) => setSettings({...settings, showSpeakerName: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">話者名を表示</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.showTimestamp}
                    onChange={(e) => setSettings({...settings, showTimestamp: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">タイムスタンプを表示</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.showCumulativeTime}
                    onChange={(e) => setSettings({...settings, showCumulativeTime: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">累積時間を表示</span>
                </label>
              </div>
            </div>
          </div>

          {/* プレビュー */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">プレビュー</h2>
            <div className="border border-gray-300 rounded p-4 bg-gray-50">
              {settings.showHeader && (
                <div className="mb-4">
                  <p><strong>{settings.questionerLabel}</strong>　比嘉武宏</p>
                  <p><strong>{settings.dateLabel}</strong>　　令和７年３月３日（月）</p>
                  <p className="mt-2"><strong>{settings.questionLabel}</strong>　　４　牧港補給地区の跡地利用について</p>
                  <p className="ml-8">
                    {settings.sectionNumberFormat.replace('{number}', '1')} 返還後の支障除去期間中の補償金について
                  </p>
                </div>
              )}
              
              <div className="mt-4 p-4 bg-white rounded">
                <p className="text-xs text-gray-600">（00：01：55）（00：00：00）</p>
                <p className="font-bold">比嘉武宏議員：</p>
                <p className="ml-8">
                  　　　　　４番目です。牧港補給地区、これはもう浦添市の未来、そして西海岸との...
                </p>
                <p className="text-xs text-gray-600 mt-2">（00：02：53）（00：00：58）</p>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">
                  ※ これは書式設定のプレビューです。実際の出力では選択されたセクションの内容が表示されます。
                </p>
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              初期設定に戻す
            </button>
            
            <div className="flex items-center space-x-4">
              {saved && (
                <span className="text-green-600 text-sm">✓ 保存しました</span>
              )}
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                設定を保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}