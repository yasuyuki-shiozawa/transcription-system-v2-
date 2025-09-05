import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { setupEnvironment } from './utils/envConfig';
import routes from './routes';
import sectionSelectionRoutes from './routes/sectionSelectionRoutes';
import speakersRoutes from './routes/speakers';
import highlightRoutes from './routes/highlights';
import { ApiResponse } from './types';
import { initDatabase } from './utils/initDatabase';

// 環境変数を最初に設定
dotenv.config();
setupEnvironment();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet());
app.use(cors());

// VPN最適化設定
const isVPNOptimizationEnabled = process.env.VPN_OPTIMIZATION === 'true';
if (isVPNOptimizationEnabled) {
  // 圧縮設定（VPN環境でのデータ転送最適化）
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // 圧縮レベル（1-9、6がバランス良い）
  }));
  
  // タイムアウト設定
  app.use((req, res, next) => {
    const timeout = parseInt(process.env.REQUEST_TIMEOUT || '120000');
    req.setTimeout(timeout);
    res.setTimeout(timeout);
    next();
  });
} else {
  // 通常の圧縮設定
  app.use(compression());
}

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    checks: {
      database: 'pending',
      memory: 'pending',
      disk: 'pending'
    }
  };

  try {
    // データベース接続チェック
    const { prisma } = await import('./utils/prisma');
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.checks.database = 'healthy';
  } catch (error) {
    healthCheck.checks.database = 'unhealthy';
    healthCheck.status = 'DEGRADED';
  }

  // メモリ使用率チェック
  const memoryUsage = process.memoryUsage();
  const memoryThreshold = 1024 * 1024 * 1024; // 1GB
  if (memoryUsage.heapUsed < memoryThreshold) {
    healthCheck.checks.memory = 'healthy';
  } else {
    healthCheck.checks.memory = 'warning';
    healthCheck.status = 'DEGRADED';
  }

  // ディスク容量チェック（uploadsディレクトリ）
  try {
    const fs = await import('fs').then(m => m.promises);
    const stats = await fs.statfs(process.env.UPLOAD_DIR || './uploads');
    const freeSpaceGB = stats.bfree * stats.bsize / (1024 * 1024 * 1024);
    healthCheck.checks.disk = freeSpaceGB > 1 ? 'healthy' : 'warning';
  } catch {
    healthCheck.checks.disk = 'unknown';
  }

  const statusCode = healthCheck.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// 簡易ヘルスチェック（ロードバランサー用）
app.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// API routes
app.use('/api', routes);
app.use('/api', sectionSelectionRoutes);
app.use('/api/speakers', speakersRoutes);
app.use('/api', highlightRoutes);

// セッション関連のルートを追加
import sessionRoutes from './routes/sessions';
app.use('/api/sessions', sessionRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error('❌ Global error handler:', err);
  console.error(err.stack);
  
  const response: ApiResponse = {
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  };
  
  res.status(500).json(response);
});

// Initialize database before starting server
initDatabase().then(() => {
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
    console.log(`⚡️[server]: Health check at http://localhost:${PORT}/health`);
  });

  // Initialize WebSocket service for transcription progress
  import('./services/websocketService').then(({ initializeWebSocketService }) => {
    initializeWebSocketService(server);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // アプリケーションを終了しない
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // 重大なエラーの場合のみ終了
  if (error.message.includes('EADDRINUSE')) {
    process.exit(1);
  }
});