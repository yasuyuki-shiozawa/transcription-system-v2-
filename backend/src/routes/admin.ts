import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);

// データベース初期化エンドポイント
router.post('/init-database', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Manual database initialization requested');
    
    // Prisma db pushを実行
    const { stdout, stderr } = await execAsync('npx prisma db push --force-reset');
    
    console.log('✅ Database initialization completed');
    console.log('stdout:', stdout);
    if (stderr) {
      console.log('stderr:', stderr);
    }
    
    res.json({
      success: true,
      message: 'Database initialized successfully',
      stdout,
      stderr
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Database initialization failed'
    });
  }
});

// 環境情報確認エンドポイント
router.get('/env-info', (req: Request, res: Response) => {
  res.json({
    success: true,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      RENDER: process.env.RENDER,
      RENDER_SERVICE_ID: process.env.RENDER_SERVICE_ID ? 'set' : 'not set'
    }
  });
});

export default router;

