import { useState } from 'react';

interface SectionDeleteButtonProps {
  sectionId: string;
  sectionNumber: string;
  speaker: string;
  onSectionDeleted: () => void;
}

export default function SectionDeleteButton({ 
  sectionId, 
  sectionNumber, 
  speaker, 
  onSectionDeleted 
}: SectionDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://transcription-system-v2-backend.onrender.com';

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `セクション ${sectionNumber} (${speaker}) を削除しますか？\n\n削除後、残りのセクション番号が自動で振り直されます。`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/sections/${sectionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete section');
      }

      const data = await response.json();
      if (data.success) {
        onSectionDeleted();
      } else {
        throw new Error(data.error || 'Failed to delete section');
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      alert('セクションの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-800 disabled:opacity-50 p-1"
      title={`セクション ${sectionNumber} を削除`}
    >
      {isDeleting ? (
        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </button>
  );
}

