import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const execAsync = promisify(exec);

// ファイルシステム調査エンドポイント
router.get('/investigate-files', async (_req: Request, res: Response) => {
  try {
    console.log('🔍 データ復旧調査開始');
    
    const investigation = {
      timestamp: new Date().toISOString(),
      dataDirectory: '/app/data',
      findings: {} as any
    };
    
    // 1. データディレクトリの内容確認
    try {
      const dataDir = '/app/data';
      if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir, { withFileTypes: true });
        investigation.findings.dataDirectoryContents = files.map(file => ({
          name: file.name,
          isFile: file.isFile(),
          isDirectory: file.isDirectory(),
          stats: file.isFile() ? fs.statSync(path.join(dataDir, file.name)) : null
        }));
      } else {
        investigation.findings.dataDirectoryContents = 'Directory does not exist';
      }
    } catch (error) {
      investigation.findings.dataDirectoryError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // 2. データベースファイルの詳細確認
    try {
      const dbPath = '/app/data/production.db';
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        investigation.findings.databaseFile = {
          exists: true,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime
        };
      } else {
        investigation.findings.databaseFile = { exists: false };
      }
    } catch (error) {
      investigation.findings.databaseFileError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // 3. SQLiteのWALファイル確認
    try {
      const walPath = '/app/data/production.db-wal';
      const shmPath = '/app/data/production.db-shm';
      
      investigation.findings.walFiles = {
        wal: fs.existsSync(walPath) ? {
          exists: true,
          size: fs.statSync(walPath).size,
          modified: fs.statSync(walPath).mtime
        } : { exists: false },
        shm: fs.existsSync(shmPath) ? {
          exists: true,
          size: fs.statSync(shmPath).size,
          modified: fs.statSync(shmPath).mtime
        } : { exists: false }
      };
    } catch (error) {
      investigation.findings.walFilesError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // 4. バックアップファイルの検索
    try {
      const { stdout } = await execAsync('find /app -name "*.db*" -o -name "*backup*" -o -name "*dump*" 2>/dev/null || true');
      investigation.findings.backupFiles = stdout.trim().split('\n').filter(line => line.length > 0);
    } catch (error) {
      investigation.findings.backupFilesError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // 5. SQLiteの整合性チェック
    try {
      const { stdout } = await execAsync('sqlite3 /app/data/production.db "PRAGMA integrity_check;" 2>/dev/null || echo "Database not accessible"');
      investigation.findings.integrityCheck = stdout.trim();
    } catch (error) {
      investigation.findings.integrityCheckError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    console.log('✅ データ復旧調査完了');
    
    res.json({
      success: true,
      investigation
    });
  } catch (error) {
    console.error('❌ データ復旧調査失敗:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Investigation failed'
    });
  }
});

// データベース復旧試行エンドポイント
router.post('/attempt-recovery', async (_req: Request, res: Response) => {
  try {
    console.log('🔧 データベース復旧試行開始');
    
    const recovery = {
      timestamp: new Date().toISOString(),
      attempts: [] as any[]
    };
    
    // 1. WALファイルからの復旧試行
    try {
      const { stdout, stderr } = await execAsync('sqlite3 /app/data/production.db "PRAGMA wal_checkpoint(FULL);" 2>&1');
      recovery.attempts.push({
        method: 'WAL checkpoint',
        success: !stderr.includes('Error'),
        output: stdout,
        error: stderr
      });
    } catch (error) {
      recovery.attempts.push({
        method: 'WAL checkpoint',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // 2. データベースの再構築試行
    try {
      const { stdout, stderr } = await execAsync('sqlite3 /app/data/production.db "VACUUM;" 2>&1');
      recovery.attempts.push({
        method: 'Database VACUUM',
        success: !stderr.includes('Error'),
        output: stdout,
        error: stderr
      });
    } catch (error) {
      recovery.attempts.push({
        method: 'Database VACUUM',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    console.log('✅ データベース復旧試行完了');
    
    res.json({
      success: true,
      recovery
    });
  } catch (error) {
    console.error('❌ データベース復旧試行失敗:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Recovery attempt failed'
    });
  }
});

export default router;

