import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { getQualityMetrics } from './qualityMetricsService';

export interface TranscriptionProgress {
  transcriptionId: string;
  status: 'uploading' | 'transcribing' | 'completed' | 'error';
  progress: number;
  queuePosition?: number;
  estimatedTime?: number;
  currentStep?: string;
  error?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private activeTranscriptions = new Map<string, TranscriptionProgress>();
  private qualityMetrics: any;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      },
      path: '/ws/transcribe-progress'
    });

    this.setupEventHandlers();
    
    // Initialize quality metrics
    try {
      this.qualityMetrics = getQualityMetrics();
    } catch (error) {
      console.warn('Quality metrics service not available:', error);
      this.qualityMetrics = null;
    }
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const connectionStartTime = Date.now();
      console.log(`✅ WebSocket client connected: ${socket.id}`);
      
      // Record successful connection
      if (this.qualityMetrics) {
        const connectionTime = Date.now() - connectionStartTime;
        this.qualityMetrics.recordConnectionAttempt(true, connectionTime);
      }

      // クライアントが転写状況を監視開始
      socket.on('subscribe-transcription', (transcriptionId: string) => {
        socket.join(`transcription-${transcriptionId}`);
        console.log(`📡 Client subscribed to transcription: ${transcriptionId}`);
        
        // 既存の進捗があれば送信
        const existingProgress = this.activeTranscriptions.get(transcriptionId);
        if (existingProgress) {
          socket.emit('transcription-progress', existingProgress);
        }
      });

      // 監視停止
      socket.on('unsubscribe-transcription', (transcriptionId: string) => {
        socket.leave(`transcription-${transcriptionId}`);
        console.log(`📡 Client unsubscribed from transcription: ${transcriptionId}`);
      });

      socket.on('disconnect', () => {
        console.log(`❌ WebSocket client disconnected: ${socket.id}`);
        
        // Record connection closed
        if (this.qualityMetrics) {
          this.qualityMetrics.recordConnectionClosed();
        }
      });
      
      socket.on('error', (error) => {
        console.error(`❌ WebSocket error for client ${socket.id}:`, error);
        
        // Record connection error
        if (this.qualityMetrics) {
          this.qualityMetrics.recordError('connection', error.message || 'Socket error', 'medium');
        }
      });
    });
  }

  // 転写進捗を更新してクライアントに通知
  private broadcastProgress(progress: TranscriptionProgress) {
    const messageStartTime = Date.now();
    
    this.activeTranscriptions.set(progress.transcriptionId, progress);
    
    try {
      // 該当の転写を監視しているクライアントに送信
      this.io.to(`transcription-${progress.transcriptionId}`)
        .emit('transcription-progress', progress);
      
      // Record successful message send
      if (this.qualityMetrics) {
        this.qualityMetrics.recordMessageSent();
        const latency = Date.now() - messageStartTime;
        this.qualityMetrics.recordMessageReceived(latency);
      }
      
      console.log(`📊 Progress updated for ${progress.transcriptionId}: ${progress.progress}%`);
    } catch (error) {
      console.error('Failed to broadcast progress:', error);
      
      // Record message error
      if (this.qualityMetrics) {
        this.qualityMetrics.recordMessageError(`Broadcast failed: ${error}`);
      }
    }
  }

  // アップロード開始
  startUpload(transcriptionId: string, filename: string) {
    const progress: TranscriptionProgress = {
      transcriptionId,
      status: 'uploading',
      progress: 0,
      currentStep: `アップロード開始: ${filename}`
    };
    this.broadcastProgress(progress);
  }

  // アップロード進捗更新
  updateUploadProgress(transcriptionId: string, progress: number) {
    const currentProgress = this.activeTranscriptions.get(transcriptionId);
    if (currentProgress) {
      this.broadcastProgress({
        ...currentProgress,
        progress: Math.round(progress * 0.3), // アップロードは全体の30%
        currentStep: `アップロード中... ${Math.round(progress)}%`
      });
    }
  }

  // 転写開始
  startTranscription(transcriptionId: string) {
    const currentProgress = this.activeTranscriptions.get(transcriptionId);
    if (currentProgress) {
      this.broadcastProgress({
        ...currentProgress,
        status: 'transcribing',
        progress: 30,
        currentStep: 'Whisper API で音声認識中...',
        estimatedTime: 120 // 120秒予想
      });
    }
  }

  // 転写進捗更新
  updateTranscriptionProgressById(transcriptionId: string, progress: number, step?: string) {
    const currentProgress = this.activeTranscriptions.get(transcriptionId);
    if (currentProgress) {
      this.broadcastProgress({
        ...currentProgress,
        progress: 30 + Math.round(progress * 0.7), // 転写は30-100%
        currentStep: step || '音声認識処理中...',
        estimatedTime: Math.max(0, (currentProgress.estimatedTime || 120) - 5)
      });
    }
  }

  // 転写完了
  completeTranscription(transcriptionId: string, _result: string) {
    const currentProgress = this.activeTranscriptions.get(transcriptionId);
    if (currentProgress) {
      this.broadcastProgress({
        ...currentProgress,
        status: 'completed',
        progress: 100,
        currentStep: '転写完了！',
        estimatedTime: 0
      });

      // 5秒後に状態をクリア
      setTimeout(() => {
        this.activeTranscriptions.delete(transcriptionId);
      }, 5000);
    }
  }

  // エラー発生
  reportError(transcriptionId: string, error: string) {
    const currentProgress = this.activeTranscriptions.get(transcriptionId);
    if (currentProgress) {
      // Record error in quality metrics
      if (this.qualityMetrics) {
        const severity = error.toLowerCase().includes('critical') ? 'critical' : 'high';
        this.qualityMetrics.recordError('transcription', error, severity);
      }
      
      this.broadcastProgress({
        ...currentProgress,
        status: 'error',
        currentStep: 'エラーが発生しました',
        error
      });
    }
  }

  // キュー管理
  updateQueuePosition(transcriptionId: string, position: number, totalQueue: number) {
    const currentProgress = this.activeTranscriptions.get(transcriptionId);
    if (currentProgress) {
      this.broadcastProgress({
        ...currentProgress,
        queuePosition: position,
        currentStep: `処理待ち... (${position}/${totalQueue})`
      });
    }
  }

  // Quality metrics and monitoring
  getQualityMetrics() {
    return this.qualityMetrics?.getMetrics() || null;
  }

  getQualityScore(): number {
    return this.qualityMetrics?.getQualityScore() || 0;
  }

  getHealthStatus(): string {
    return this.qualityMetrics?.getHealthStatus() || 'unknown';
  }

  generateQualityReport(): string {
    return this.qualityMetrics?.generateReport() || 'Quality metrics not available';
  }

  // Update performance metrics from external sources
  updatePerformanceMetrics(metrics: any) {
    if (this.qualityMetrics) {
      this.qualityMetrics.updatePerformanceMetrics({
        ...metrics,
        activeWebSocketConnections: this.io.engine.clientsCount || 0
      });
    }
  }
}

// シングルトンインスタンス
let websocketService: WebSocketService | null = null;

export const initializeWebSocketService = (server: HTTPServer): WebSocketService => {
  if (!websocketService) {
    websocketService = new WebSocketService(server);
    console.log('🚀 WebSocket service initialized for transcription progress');
  }
  return websocketService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!websocketService) {
    throw new Error('WebSocket service not initialized');
  }
  return websocketService;
};