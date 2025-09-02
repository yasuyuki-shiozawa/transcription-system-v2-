import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createTestSession() {
  try {
    // テスト用セッションを作成
    const session = await prisma.session.create({
      data: {
        id: 'test-session-id',
        name: 'ハイライト機能テスト',
        date: new Date('2025-09-02'),
        status: 'draft'
      }
    });

    // テスト用TranscriptionDataを作成
    const transcriptionData = await prisma.transcriptionData.create({
      data: {
        id: 'test-transcription-id',
        sessionId: session.id,
        source: 'test',
        originalFileName: 'test.txt',
        status: 'PROCESSED',
        fileType: 'text'
      }
    });

    // テスト用セクションを作成
    const section = await prisma.section.create({
      data: {
        id: 'test-section-id',
        transcriptionDataId: transcriptionData.id,
        sectionNumber: '0001',
        speaker: 'テストユーザー',
        timestamp: '00:00',
        content: `0001	田中太郎	00:15	これはハイライト機能のテストです。この文章の一部をハイライトして、正しく表示されるかを確認します。
0002	佐藤花子	00:30	ハイライト機能では、黄色、青色、緑色、ピンク色、オレンジ色の5つの色を使用できます。
0003	山田次郎	00:45	編集モードでハイライトを作成し、通常表示モードで正しく表示されることを確認する必要があります。
0004	鈴木一郎	01:00	この機能により、重要な部分を視覚的に強調することができるようになります。
0005	高橋美咲	01:15	ハイライトをクリックすると削除できる機能も実装されています。
0006	伊藤健一	01:30	複数のハイライトが重複している場合でも、正しく表示される必要があります。`,
        order: 1
      }
    });

    console.log('✅ テストデータが作成されました:');
    console.log('Session ID:', session.id);
    console.log('TranscriptionData ID:', transcriptionData.id);
    console.log('Section ID:', section.id);

    return { session, transcriptionData, section };
  } catch (error) {
    console.error('❌ テストデータ作成エラー:', error);
    throw error;
  }
}

// 直接実行された場合
if (require.main === module) {
  createTestSession()
    .then(() => {
      console.log('✅ テストデータ作成完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

