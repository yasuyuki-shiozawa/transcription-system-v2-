import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// セッション一覧取得
router.get('/', async (_req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('セッション一覧取得エラー:', error);
    res.status(500).json({ success: false, error: 'セッション一覧の取得に失敗しました' });
  }
});

// 特定セッション取得
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id }
    });
    
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    return res.json({ success: true, data: session });
  } catch (error) {
    console.error('セッション取得エラー:', error);
    return res.status(500).json({ success: false, error: 'セッションの取得に失敗しました' });
  }
});

// セッションの転写データ取得
router.get('/:id/transcriptions', async (req, res) => {
  try {
    const { id } = req.params;
    
    const transcriptions = await prisma.transcriptionData.findMany({
      where: { sessionId: id },
      include: {
        sections: {
          orderBy: { order: 'asc' }
        }
      }
    });
    
    res.json({ success: true, data: transcriptions });
  } catch (error) {
    console.error('転写データ取得エラー:', error);
    res.status(500).json({ success: false, error: '転写データの取得に失敗しました' });
  }
});

export default router;

