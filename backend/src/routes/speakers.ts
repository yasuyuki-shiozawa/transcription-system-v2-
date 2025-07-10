import express from 'express';
import { prisma } from '../utils/prisma';

const router = express.Router();

// 話者一覧を取得
router.get('/', async (_req, res) => {
  try {
    const speakers = await prisma.speaker.findMany({
      orderBy: [
        { speakerType: 'asc' },
        { fullName: 'asc' }
      ]
    });
    
    return res.json({
      success: true,
      data: speakers
    });
  } catch (error) {
    console.error('Error fetching speakers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch speakers'
    });
  }
});

// 話者を作成
router.post('/', async (req, res) => {
  try {
    const { fullName, displayName, aliases, speakerType } = req.body;
    
    if (!fullName) {
      return res.status(400).json({
        success: false,
        error: 'Full name is required'
      });
    }
    
    const speaker = await prisma.speaker.create({
      data: {
        fullName,
        displayName: displayName || fullName,
        aliases: aliases || '',
        speakerType: speakerType || 'MEMBER'
      }
    });
    
    return res.json({
      success: true,
      data: speaker
    });
  } catch (error) {
    console.error('Error creating speaker:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create speaker'
    });
  }
});

// 話者を更新
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, displayName, aliases, speakerType } = req.body;
    
    const speaker = await prisma.speaker.update({
      where: { id },
      data: {
        fullName,
        displayName,
        aliases,
        speakerType
      }
    });
    
    return res.json({
      success: true,
      data: speaker
    });
  } catch (error) {
    console.error('Error updating speaker:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update speaker'
    });
  }
});

// 話者を削除
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.speaker.delete({
      where: { id }
    });
    
    return res.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting speaker:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete speaker'
    });
  }
});

// 話者を名前で検索（エイリアスも含む）
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }
    
    // 正式名称、表示名、エイリアスのいずれかに一致する話者を検索
    const speakers = await prisma.speaker.findMany({
      where: {
        OR: [
          { fullName: { contains: query } },
          { displayName: { contains: query } },
          { aliases: { contains: query } }
        ]
      }
    });
    
    return res.json({
      success: true,
      data: speakers
    });
  } catch (error) {
    console.error('Error searching speakers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search speakers'
    });
  }
});

// 話者を特定の文字列から自動識別
router.post('/identify', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }
    
    // すべての話者を取得
    const speakers = await prisma.speaker.findMany();
    
    // テキストから話者を特定
    let identifiedSpeaker = null;
    
    for (const speaker of speakers) {
      // 正式名称で完全一致
      if (text.includes(speaker.fullName)) {
        identifiedSpeaker = speaker;
        break;
      }
      
      // 表示名で完全一致
      if (text.includes(speaker.displayName)) {
        identifiedSpeaker = speaker;
        break;
      }
      
      // エイリアスで一致（カンマ区切りを分割）
      if (speaker.aliases) {
        const aliasesList = speaker.aliases.split(',').map((alias: string) => alias.trim());
        for (const alias of aliasesList) {
          if (alias && text.includes(alias)) {
            identifiedSpeaker = speaker;
            break;
          }
        }
        if (identifiedSpeaker) break;
      }
    }
    
    return res.json({
      success: true,
      data: identifiedSpeaker
    });
  } catch (error) {
    console.error('Error identifying speaker:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to identify speaker'
    });
  }
});

export default router;