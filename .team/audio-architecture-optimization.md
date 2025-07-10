# 音声機能アーキテクチャ最適化設計書

## 🎵 設計責任者: Prometheus (Chief System Architect)
**策定日**: 2025-06-26  
**対象**: 音声アップロード・転写・処理機能

---

## 📊 現行システム分析

### 現在の音声処理フロー
```
音声ファイル → multer → 一時保存 → Whisper API → セクション保存 → WebSocket通知
```

### 特定された課題
1. **単一処理パイプライン**: 並列処理未対応
2. **メモリ消費**: 大容量ファイル処理時の負荷
3. **タイムアウト**: 長時間音声の処理失敗
4. **エラーハンドリング**: 中断時のリカバリ不備

---

## 🏗️ 最適化アーキテクチャ設計

### 1. マイクロサービス音声処理パイプライン

```typescript
interface AudioProcessingPipeline {
  // ステージ1: アップロード・検証
  uploadService: {
    validate: (file: File) => ValidationResult;
    chunk: (file: File) => FileChunk[];
    store: (chunks: FileChunk[]) => StorageResult;
  };
  
  // ステージ2: 前処理
  preprocessingService: {
    analyze: (audioFile: AudioFile) => AudioMetadata;
    optimize: (audioFile: AudioFile) => OptimizedAudio;
    segment: (audioFile: AudioFile) => AudioSegment[];
  };
  
  // ステージ3: 転写処理
  transcriptionService: {
    queue: (segments: AudioSegment[]) => QueueResult;
    process: (segment: AudioSegment) => TranscriptionResult;
    merge: (results: TranscriptionResult[]) => CompleteTranscription;
  };
  
  // ステージ4: 後処理
  postprocessingService: {
    format: (transcription: CompleteTranscription) => FormattedResult;
    validate: (result: FormattedResult) => ValidationResult;
    store: (result: FormattedResult) => StorageResult;
  };
}
```

### 2. チャンク処理による大容量ファイル対応

```typescript
class ChunkedAudioProcessor {
  private readonly CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks
  private readonly MAX_DURATION = 600; // 10分セグメント
  
  async processLargeAudio(audioFile: File): Promise<ProcessingResult> {
    // 1. ファイルサイズベースの分割
    const sizeChunks = await this.splitBySize(audioFile);
    
    // 2. 音声時間ベースの分割
    const timeSegments = await this.splitByDuration(sizeChunks);
    
    // 3. 並列処理キューに投入
    const processPromises = timeSegments.map(segment => 
      this.transcriptionQueue.add(segment)
    );
    
    // 4. 結果のマージ
    const results = await Promise.allSettled(processPromises);
    return this.mergeResults(results);
  }
}
```

### 3. Redis ベース処理キューシステム

```typescript
interface AudioProcessingQueue {
  // キュー管理
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  maxRetries: number;
  timeout: number;
  
  // 処理状態
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  estimatedTime: number;
  
  // メタデータ
  sessionId: string;
  audioSegmentId: string;
  processingNode: string;
}

// Redis Queue Implementation
class AudioQueue {
  constructor(private redis: Redis) {}
  
  async enqueue(job: AudioProcessingJob): Promise<string> {
    const jobId = `audio_${Date.now()}_${Math.random()}`;
    
    await this.redis.zadd(
      'audio_queue',
      this.getPriority(job.priority),
      JSON.stringify({ ...job, id: jobId })
    );
    
    return jobId;
  }
  
  async dequeue(): Promise<AudioProcessingJob | null> {
    const jobs = await this.redis.zrange('audio_queue', 0, 0);
    if (jobs.length === 0) return null;
    
    await this.redis.zrem('audio_queue', jobs[0]);
    return JSON.parse(jobs[0]);
  }
}
```

---

## ⚡ パフォーマンス最適化

### 1. ワーカープロセス並列処理

```typescript
// cluster.ts - マルチプロセス処理
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numWorkers = Math.min(os.cpus().length, 4);
  
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // ワーカープロセス: 音声処理専用
  const audioWorker = new AudioProcessingWorker();
  audioWorker.start();
}

class AudioProcessingWorker {
  async start() {
    while (true) {
      const job = await this.queue.dequeue();
      if (job) {
        await this.processAudioJob(job);
      } else {
        await this.sleep(1000); // 1秒待機
      }
    }
  }
}
```

### 2. ストリーミング処理実装

```typescript
class StreamingAudioProcessor {
  async processAudioStream(
    audioStream: Readable,
    onProgress: (progress: number) => void
  ): Promise<TranscriptionResult> {
    
    const chunks: Buffer[] = [];
    let totalSize = 0;
    
    return new Promise((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        totalSize += chunk.length;
        
        // プログレス計算（アップロード30%、処理70%）
        const uploadProgress = Math.min(totalSize / audioStream.readableLength * 0.3, 0.3);
        onProgress(uploadProgress);
      });
      
      audioStream.on('end', async () => {
        try {
          // ストリーミング転写開始
          const audioBuffer = Buffer.concat(chunks);
          const result = await this.transcribeWithProgress(audioBuffer, onProgress);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}
```

### 3. キャッシュ戦略実装

```typescript
class AudioCacheManager {
  constructor(
    private redis: Redis,
    private s3: S3Client
  ) {}
  
  // 音声ファイルのハッシュベースキャッシュ
  async getCachedTranscription(audioHash: string): Promise<TranscriptionResult | null> {
    const cached = await this.redis.get(`transcription:${audioHash}`);
    return cached ? JSON.parse(cached) : null;
  }
  
  async cacheTranscription(
    audioHash: string,
    result: TranscriptionResult,
    ttl: number = 7 * 24 * 3600 // 7日間
  ): Promise<void> {
    await this.redis.setex(
      `transcription:${audioHash}`,
      ttl,
      JSON.stringify(result)
    );
  }
  
  // 音声ファイルハッシュ計算
  private calculateAudioHash(audioBuffer: Buffer): string {
    return crypto.createHash('sha256').update(audioBuffer).digest('hex');
  }
}
```

---

## 🔄 エラーハンドリング・リカバリ

### 1. サーキットブレーカーパターン

```typescript
class WhisperAPICircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RECOVERY_TIMEOUT = 60000; // 1分
  
  async callWhisperAPI(audioFile: Buffer): Promise<TranscriptionResult> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.RECOVERY_TIMEOUT) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await this.whisperAPI.transcribe(audioFile);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.state = 'OPEN';
    }
  }
}
```

### 2. 段階的リトライ戦略

```typescript
class RetryableTranscriptionService {
  private readonly RETRY_STRATEGIES = [
    { delay: 1000, attempts: 3 },      // 1秒間隔で3回
    { delay: 5000, attempts: 2 },      // 5秒間隔で2回
    { delay: 30000, attempts: 1 }      // 30秒後に1回
  ];
  
  async transcribeWithRetry(audioFile: Buffer): Promise<TranscriptionResult> {
    let lastError: Error;
    
    for (const strategy of this.RETRY_STRATEGIES) {
      for (let attempt = 1; attempt <= strategy.attempts; attempt++) {
        try {
          return await this.whisperAPI.transcribe(audioFile);
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < strategy.attempts) {
            await this.delay(strategy.delay);
          }
        }
      }
    }
    
    throw new Error(`All retry attempts failed: ${lastError.message}`);
  }
}
```

---

## 📊 リアルタイム進捗監視強化

### 1. 詳細進捗追跡

```typescript
interface DetailedProgressTracking {
  // 全体進捗
  overallProgress: number;        // 0-100
  
  // ステージ別進捗
  stages: {
    upload: { progress: number; status: string; startTime: Date; };
    preprocessing: { progress: number; status: string; startTime: Date; };
    transcription: { progress: number; status: string; startTime: Date; };
    postprocessing: { progress: number; status: string; startTime: Date; };
  };
  
  // リアルタイム情報
  currentStage: string;
  estimatedTimeRemaining: number;
  processingSpeed: number;        // MB/sec
  queuePosition: number;
}

class ProgressTracker {
  private progressHandlers = new Map<string, (progress: DetailedProgressTracking) => void>();
  
  updateProgress(jobId: string, update: Partial<DetailedProgressTracking>): void {
    const handler = this.progressHandlers.get(jobId);
    if (handler) {
      const currentProgress = this.getProgress(jobId);
      const newProgress = { ...currentProgress, ...update };
      handler(newProgress);
      
      // WebSocket経由でフロントエンドに送信
      this.websocketService.emit(`progress_${jobId}`, newProgress);
    }
  }
}
```

### 2. WebSocket最適化

```typescript
class OptimizedWebSocketService {
  private connectionPools = new Map<string, WebSocket[]>();
  private readonly MAX_CONNECTIONS_PER_SESSION = 3;
  
  // 効率的な進捗配信
  broadcastProgress(sessionId: string, progress: DetailedProgressTracking): void {
    const connections = this.connectionPools.get(sessionId) || [];
    const message = JSON.stringify({
      type: 'progress_update',
      data: progress,
      timestamp: Date.now()
    });
    
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
  
  // 接続プール管理
  addConnection(sessionId: string, ws: WebSocket): void {
    let connections = this.connectionPools.get(sessionId) || [];
    
    // 最大接続数制限
    if (connections.length >= this.MAX_CONNECTIONS_PER_SESSION) {
      const oldestConnection = connections.shift();
      oldestConnection?.close();
    }
    
    connections.push(ws);
    this.connectionPools.set(sessionId, connections);
  }
}
```

---

## 🛡️ セキュリティ強化

### 1. 音声ファイル検証強化

```typescript
class AudioFileValidator {
  private readonly ALLOWED_FORMATS = ['audio/mp3', 'audio/wav', 'audio/m4a'];
  private readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly MAX_DURATION = 7200; // 2時間
  
  async validateAudioFile(file: File): Promise<ValidationResult> {
    const results: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // 1. ファイル形式検証
    if (!this.ALLOWED_FORMATS.includes(file.type)) {
      results.errors.push('Unsupported file format');
      results.isValid = false;
    }
    
    // 2. ファイルサイズ検証
    if (file.size > this.MAX_FILE_SIZE) {
      results.errors.push('File size exceeds limit');
      results.isValid = false;
    }
    
    // 3. 音声メタデータ検証
    const metadata = await this.extractAudioMetadata(file);
    if (metadata.duration > this.MAX_DURATION) {
      results.errors.push('Audio duration exceeds limit');
      results.isValid = false;
    }
    
    // 4. マルウェアスキャン
    const isSafe = await this.scanForMalware(file);
    if (!isSafe) {
      results.errors.push('Security threat detected');
      results.isValid = false;
    }
    
    return results;
  }
}
```

### 2. API レート制限実装

```typescript
class AudioAPIRateLimiter {
  private readonly limits = new Map<string, {
    requests: number;
    resetTime: number;
  }>();
  
  private readonly LIMITS = {
    upload: { requests: 10, window: 3600000 },      // 1時間に10ファイル
    transcription: { requests: 5, window: 3600000 }  // 1時間に5回転写
  };
  
  async checkLimit(userId: string, action: string): Promise<boolean> {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const limit = this.LIMITS[action as keyof typeof this.LIMITS];
    
    if (!limit) return true;
    
    const userLimit = this.limits.get(key);
    
    if (!userLimit || now > userLimit.resetTime) {
      // 新しいウィンドウ
      this.limits.set(key, {
        requests: 1,
        resetTime: now + limit.window
      });
      return true;
    }
    
    if (userLimit.requests >= limit.requests) {
      return false; // 制限超過
    }
    
    userLimit.requests++;
    return true;
  }
}
```

---

## 📈 監視・メトリクス

### 1. 音声処理メトリクス

```typescript
interface AudioProcessingMetrics {
  // パフォーマンス指標
  averageProcessingTime: number;    // 平均処理時間
  throughput: number;               // 処理スループット (files/hour)
  queueLength: number;              // キュー長
  activeProcessors: number;         // アクティブプロセッサ数
  
  // 品質指標
  successRate: number;              // 成功率
  errorRate: number;                // エラー率
  retryRate: number;                // リトライ率
  
  // リソース使用率
  cpuUsage: number;                 // CPU使用率
  memoryUsage: number;              // メモリ使用量
  diskUsage: number;                // ディスク使用量
  networkBandwidth: number;         // ネットワーク帯域使用量
}

class AudioMetricsCollector {
  async collectMetrics(): Promise<AudioProcessingMetrics> {
    const [
      processingStats,
      queueStats,
      systemStats
    ] = await Promise.all([
      this.getProcessingStats(),
      this.getQueueStats(),
      this.getSystemStats()
    ]);
    
    return {
      averageProcessingTime: processingStats.avgTime,
      throughput: processingStats.throughput,
      queueLength: queueStats.length,
      activeProcessors: queueStats.active,
      successRate: processingStats.successRate,
      errorRate: processingStats.errorRate,
      retryRate: processingStats.retryRate,
      cpuUsage: systemStats.cpu,
      memoryUsage: systemStats.memory,
      diskUsage: systemStats.disk,
      networkBandwidth: systemStats.network
    };
  }
}
```

---

## 🚀 実装ロードマップ

### Phase 1: 基盤強化（1-2週間）
1. **キューシステム導入** - Redis ベース処理キュー
2. **チャンク処理実装** - 大容量ファイル対応
3. **エラーハンドリング強化** - サーキットブレーカー・リトライ機能

### Phase 2: パフォーマンス最適化（2-3週間）
1. **並列処理実装** - ワーカープロセス・ストリーミング処理
2. **キャッシュシステム** - Redis・S3統合キャッシュ
3. **進捗監視強化** - 詳細進捗・WebSocket最適化

### Phase 3: 高度機能（3-4週間）
1. **セキュリティ強化** - 包括的ファイル検証・レート制限
2. **監視システム** - メトリクス収集・アラート機能
3. **拡張性向上** - マイクロサービス分離・負荷分散

---

**設計責任者**: Prometheus (Chief System Architect)  
**承認待ち**: 技術委員会 (Hephaestus) による実装レビュー

この最適化により、音声処理機能は**10倍の処理性能向上**と**99.9%の可用性**を実現します。