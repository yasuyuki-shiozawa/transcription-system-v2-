'use client';

import React, { useState } from 'react';
import { X, Send, Mail, Phone, MessageSquare } from 'lucide-react';

interface SupportContactProps {
  isOpen: boolean;
  onClose: () => void;
  errorContext?: {
    errorType?: string;
    fileName?: string;
    timestamp?: string;
  };
}

const SupportContact: React.FC<SupportContactProps> = ({
  isOpen,
  onClose,
  errorContext,
}) => {
  const [contactMethod, setContactMethod] = useState<'email' | 'phone' | 'chat'>('email');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      // APIエンドポイントに送信
      const response = await fetch('/api/support/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          contactMethod,
          errorContext,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setSent(true);
        setTimeout(() => {
          onClose();
          setSent(false);
          setFormData({
            name: '',
            email: '',
            phone: '',
            subject: '',
            message: '',
          });
        }, 3000);
      } else {
        throw new Error('送信に失敗しました');
      }
    } catch {
      alert('エラーが発生しました。別の方法でお問い合わせください。');
    } finally {
      setSending(false);
    }
  };

  const generateErrorReport = () => {
    if (!errorContext) return '';
    
    return `
エラー情報:
- エラータイプ: ${errorContext.errorType || '不明'}
- ファイル名: ${errorContext.fileName || 'なし'}
- 発生時刻: ${errorContext.timestamp || new Date().toISOString()}
`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">サポートへのお問い合わせ</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="p-6 text-center">
            <div className="mb-4">
              <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Send className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              お問い合わせを受け付けました
            </h3>
            <p className="text-gray-600">
              担当者より2営業日以内にご連絡いたします。
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* 連絡方法の選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ご希望の連絡方法
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setContactMethod('email')}
                  className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    contactMethod === 'email'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  メール
                </button>
                <button
                  type="button"
                  onClick={() => setContactMethod('phone')}
                  className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    contactMethod === 'phone'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  電話
                </button>
                <button
                  type="button"
                  onClick={() => setContactMethod('chat')}
                  className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    contactMethod === 'chat'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  チャット
                </button>
              </div>
            </div>

            {/* お名前 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* メールアドレス */}
            {(contactMethod === 'email' || contactMethod === 'chat') && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* 電話番号 */}
            {contactMethod === 'phone' && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  電話番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="090-0000-0000"
                />
              </div>
            )}

            {/* 件名 */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                件名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="例：音声ファイルのアップロードエラーについて"
              />
            </div>

            {/* お問い合わせ内容 */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                お問い合わせ内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="エラーの詳細や発生状況をお書きください..."
              />
            </div>

            {/* エラー情報の自動追加 */}
            {errorContext && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs text-gray-600">
                  以下のエラー情報が自動的に送信されます：
                </p>
                <pre className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                  {generateErrorReport()}
                </pre>
              </div>
            )}

            {/* 送信ボタン */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={sending}
                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors ${
                  sending
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? '送信中...' : '送信する'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium transition-colors"
              >
                キャンセル
              </button>
            </div>

            {/* 緊急連絡先 */}
            <div className="mt-4 pt-4 border-t text-sm text-gray-600">
              <p className="font-medium mb-1">お急ぎの場合：</p>
              <p>平日 9:00-17:00</p>
              <p>TEL: 03-XXXX-XXXX</p>
              <p>Email: support@example.com</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SupportContact;