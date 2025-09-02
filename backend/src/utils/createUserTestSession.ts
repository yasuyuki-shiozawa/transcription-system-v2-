import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createUserTestSession() {
  try {
    // ユーザーの「テスト用」セッションIDに対応するデータを作成
    const sessionId = 'cmezp0kro000fqc2gt1xijtkq';
    
    // 既存のセッションがあるかチェック
    const existingSession = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (existingSession) {
      console.log('✅ セッションは既に存在します:', existingSession.name);
    } else {
      // セッションを作成
      const session = await prisma.session.create({
        data: {
          id: sessionId,
          name: 'テスト用',
          date: new Date('2025-08-31'),
          status: 'draft'
        }
      });
      console.log('✅ セッションを作成しました:', session.name);
    }

    // TranscriptionDataを作成
    const transcriptionDataId = `${sessionId}-transcription`;
    const existingTranscription = await prisma.transcriptionData.findUnique({
      where: { id: transcriptionDataId }
    });

    if (!existingTranscription) {
      await prisma.transcriptionData.create({
        data: {
          id: transcriptionDataId,
          sessionId: sessionId,
          source: 'user_test',
          originalFileName: 'test_user_data.txt',
          status: 'PROCESSED',
          fileType: 'text'
        }
      });
      console.log('✅ TranscriptionDataを作成しました');
    }

    // テスト用セクションを作成
    const sectionId = `${sessionId}-section-001`;
    const existingSection = await prisma.section.findUnique({
      where: { id: sectionId }
    });

    if (!existingSection) {
      const section = await prisma.section.create({
        data: {
          id: sectionId,
          transcriptionDataId: transcriptionDataId,
          sectionNumber: '0001',
          speaker: 'テスト話者',
          timestamp: '00:00',
          content: `これはユーザーが作成した「テスト用」セッションでのハイライト機能テストです。
この文章では、重要な部分をハイライトして、議事録作成の効率性を向上させることができます。
ハイライト機能では、黄色、青色、緑色、ピンク色、オレンジ色の5つの色を使用できます。
編集モードでテキストを選択し、色を選択することで簡単にハイライトを作成できます。
作成したハイライトは通常表示モードでも継続して表示され、クリックすることで削除できます。
この機能により、議会議事録の重要な部分を視覚的に強調することが可能になります。`,
          order: 1
        }
      });
      console.log('✅ セクションを作成しました:', section.id);
    }

    console.log('🎯 ユーザーテストセッション準備完了');
    console.log('Session ID:', sessionId);
    console.log('Section ID:', sectionId);
    console.log('URL: http://localhost:3000/sessions/' + sessionId);

    return { sessionId, sectionId };
  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

// 直接実行された場合
if (require.main === module) {
  createUserTestSession()
    .then(() => {
      console.log('✅ ユーザーテストセッション作成完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

