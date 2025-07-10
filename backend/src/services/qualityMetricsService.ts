import { EventEmitter } from 'events';

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  successfulConnections: number;
  failedConnections: number;
  reconnectionAttempts: number;
  averageConnectionTime: number;
  connectionFailureRate: number;
}

export interface MessageMetrics {
  totalMessagesSent: number;
  totalMessagesReceived: number;
  messageDropRate: number;
  averageMessageLatency: number;
  maxMessageLatency: number;
  messageProcessingErrors: number;
  throughputPerSecond: number;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeWebSocketConnections: number;
  messageQueueLength: number;
  averageResponseTime: number;
  uptime: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  connectionErrors: number;
  messageErrors: number;
  timeoutErrors: number;
  protocolErrors: number;
  errorRate: number;
  criticalErrors: number;
  errorsByType: Map<string, number>;
}

export interface QualityThresholds {
  maxConnectionFailureRate: number; // 5%
  maxMessageDropRate: number; // 1%
  maxAverageLatency: number; // 100ms
  maxErrorRate: number; // 2%
  minThroughput: number; // messages per second
  maxMemoryUsage: number; // MB
  maxResponseTime: number; // ms
}

export interface QualityAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  resolved: boolean;
}

export class QualityMetricsService extends EventEmitter {
  private connectionMetrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    reconnectionAttempts: 0,
    averageConnectionTime: 0,
    connectionFailureRate: 0
  };
  private messageMetrics: MessageMetrics = {
    totalMessagesSent: 0,
    totalMessagesReceived: 0,
    messageDropRate: 0,
    averageMessageLatency: 0,
    maxMessageLatency: 0,
    messageProcessingErrors: 0,
    throughputPerSecond: 0
  };
  private performanceMetrics: PerformanceMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    activeWebSocketConnections: 0,
    messageQueueLength: 0,
    averageResponseTime: 0,
    uptime: 0
  };
  private errorMetrics: ErrorMetrics = {
    totalErrors: 0,
    connectionErrors: 0,
    messageErrors: 0,
    timeoutErrors: 0,
    protocolErrors: 0,
    errorRate: 0,
    criticalErrors: 0,
    errorsByType: new Map<string, number>()
  };
  private qualityThresholds: QualityThresholds;
  private activeAlerts: Map<string, QualityAlert>;
  
  private metricsHistory: Array<{
    timestamp: Date;
    connectionMetrics: ConnectionMetrics;
    messageMetrics: MessageMetrics;
    performanceMetrics: PerformanceMetrics;
    errorMetrics: ErrorMetrics;
  }>;
  
  private startTime: Date;
  private connectionTimestamps: number[];
  private messageLatencies: number[];
  private recentErrors: Array<{ timestamp: Date; type: string; details: string }>;
  
  // Real-time tracking
  private messagesSentLastSecond: number = 0;
  private messagesReceivedLastSecond: number = 0;
  private throughputInterval: NodeJS.Timeout | null = null;

  constructor(thresholds?: Partial<QualityThresholds>) {
    super();
    
    this.startTime = new Date();
    this.connectionTimestamps = [];
    this.messageLatencies = [];
    this.recentErrors = [];
    this.metricsHistory = [];
    this.activeAlerts = new Map();
    
    // Default quality thresholds
    this.qualityThresholds = {
      maxConnectionFailureRate: 0.05, // 5%
      maxMessageDropRate: 0.01, // 1%
      maxAverageLatency: 100, // 100ms
      maxErrorRate: 0.02, // 2%
      minThroughput: 10, // 10 messages/second minimum
      maxMemoryUsage: 512, // 512MB
      maxResponseTime: 500, // 500ms
      ...thresholds
    };
    
    // Initialize metrics
    this.resetMetrics();
    
    // Start real-time monitoring
    this.startThroughputMonitoring();
    this.startPerformanceMonitoring();
    this.startQualityChecks();
  }

  private resetMetrics() {
    this.connectionMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      reconnectionAttempts: 0,
      averageConnectionTime: 0,
      connectionFailureRate: 0
    };

    this.messageMetrics = {
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      messageDropRate: 0,
      averageMessageLatency: 0,
      maxMessageLatency: 0,
      messageProcessingErrors: 0,
      throughputPerSecond: 0
    };

    this.performanceMetrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      activeWebSocketConnections: 0,
      messageQueueLength: 0,
      averageResponseTime: 0,
      uptime: 0
    };

    this.errorMetrics = {
      totalErrors: 0,
      connectionErrors: 0,
      messageErrors: 0,
      timeoutErrors: 0,
      protocolErrors: 0,
      errorRate: 0,
      criticalErrors: 0,
      errorsByType: new Map()
    };
  }

  // Connection tracking methods
  recordConnectionAttempt(successful: boolean, connectionTime?: number) {
    this.connectionMetrics.totalConnections++;
    
    if (successful) {
      this.connectionMetrics.successfulConnections++;
      this.connectionMetrics.activeConnections++;
      
      if (connectionTime) {
        this.connectionTimestamps.push(connectionTime);
        this.connectionMetrics.averageConnectionTime = 
          this.connectionTimestamps.reduce((a, b) => a + b, 0) / this.connectionTimestamps.length;
      }
    } else {
      this.connectionMetrics.failedConnections++;
    }
    
    this.updateConnectionFailureRate();
    this.checkConnectionQuality();
  }

  recordConnectionClosed() {
    if (this.connectionMetrics.activeConnections > 0) {
      this.connectionMetrics.activeConnections--;
    }
  }

  recordReconnectionAttempt() {
    this.connectionMetrics.reconnectionAttempts++;
  }

  // Message tracking methods
  recordMessageSent() {
    this.messageMetrics.totalMessagesSent++;
    this.messagesSentLastSecond++;
  }

  recordMessageReceived(latency?: number) {
    this.messageMetrics.totalMessagesReceived++;
    this.messagesReceivedLastSecond++;
    
    if (latency !== undefined) {
      this.messageLatencies.push(latency);
      this.updateMessageLatencyMetrics();
    }
  }

  recordMessageError(errorType: string) {
    this.messageMetrics.messageProcessingErrors++;
    this.recordError('message', errorType);
  }

  recordMessageDrop() {
    this.updateMessageDropRate();
  }

  // Error tracking methods
  recordError(type: string, details: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    this.errorMetrics.totalErrors++;
    
    switch (type) {
      case 'connection':
        this.errorMetrics.connectionErrors++;
        break;
      case 'message':
        this.errorMetrics.messageErrors++;
        break;
      case 'timeout':
        this.errorMetrics.timeoutErrors++;
        break;
      case 'protocol':
        this.errorMetrics.protocolErrors++;
        break;
    }
    
    if (severity === 'critical') {
      this.errorMetrics.criticalErrors++;
    }
    
    // Track error by type
    const currentCount = this.errorMetrics.errorsByType.get(type) || 0;
    this.errorMetrics.errorsByType.set(type, currentCount + 1);
    
    // Store recent error
    this.recentErrors.push({
      timestamp: new Date(),
      type,
      details
    });
    
    // Keep only last 100 errors
    if (this.recentErrors.length > 100) {
      this.recentErrors = this.recentErrors.slice(-100);
    }
    
    this.updateErrorRate();
    this.checkErrorQuality(type, severity);
  }

  // Performance tracking methods
  updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>) {
    Object.assign(this.performanceMetrics, metrics);
    this.performanceMetrics.uptime = Date.now() - this.startTime.getTime();
    
    this.checkPerformanceQuality();
  }

  // Private utility methods
  private updateConnectionFailureRate() {
    if (this.connectionMetrics.totalConnections > 0) {
      this.connectionMetrics.connectionFailureRate = 
        this.connectionMetrics.failedConnections / this.connectionMetrics.totalConnections;
    }
  }

  private updateMessageLatencyMetrics() {
    if (this.messageLatencies.length > 0) {
      this.messageMetrics.averageMessageLatency = 
        this.messageLatencies.reduce((a, b) => a + b, 0) / this.messageLatencies.length;
      this.messageMetrics.maxMessageLatency = Math.max(...this.messageLatencies);
    }
    
    // Keep only last 1000 latency measurements
    if (this.messageLatencies.length > 1000) {
      this.messageLatencies = this.messageLatencies.slice(-1000);
    }
  }

  private updateMessageDropRate() {
    const totalMessages = this.messageMetrics.totalMessagesSent;
    const receivedMessages = this.messageMetrics.totalMessagesReceived;
    
    if (totalMessages > 0) {
      this.messageMetrics.messageDropRate = (totalMessages - receivedMessages) / totalMessages;
    }
  }

  private updateErrorRate() {
    const totalOperations = this.connectionMetrics.totalConnections + this.messageMetrics.totalMessagesSent;
    
    if (totalOperations > 0) {
      this.errorMetrics.errorRate = this.errorMetrics.totalErrors / totalOperations;
    }
  }

  // Quality checking methods
  private checkConnectionQuality() {
    if (this.connectionMetrics.connectionFailureRate > this.qualityThresholds.maxConnectionFailureRate) {
      this.createAlert('connection-failure-rate', 'high', 
        'Connection failure rate exceeds threshold',
        this.connectionMetrics.connectionFailureRate,
        this.qualityThresholds.maxConnectionFailureRate
      );
    }
  }

  private checkMessageQuality() {
    if (this.messageMetrics.messageDropRate > this.qualityThresholds.maxMessageDropRate) {
      this.createAlert('message-drop-rate', 'high',
        'Message drop rate exceeds threshold',
        this.messageMetrics.messageDropRate,
        this.qualityThresholds.maxMessageDropRate
      );
    }

    if (this.messageMetrics.averageMessageLatency > this.qualityThresholds.maxAverageLatency) {
      this.createAlert('message-latency', 'medium',
        'Average message latency exceeds threshold',
        this.messageMetrics.averageMessageLatency,
        this.qualityThresholds.maxAverageLatency
      );
    }

    if (this.messageMetrics.throughputPerSecond < this.qualityThresholds.minThroughput) {
      this.createAlert('low-throughput', 'medium',
        'Message throughput below minimum threshold',
        this.messageMetrics.throughputPerSecond,
        this.qualityThresholds.minThroughput
      );
    }
  }

  private checkPerformanceQuality() {
    if (this.performanceMetrics.memoryUsage > this.qualityThresholds.maxMemoryUsage) {
      this.createAlert('high-memory-usage', 'high',
        'Memory usage exceeds threshold',
        this.performanceMetrics.memoryUsage,
        this.qualityThresholds.maxMemoryUsage
      );
    }

    if (this.performanceMetrics.averageResponseTime > this.qualityThresholds.maxResponseTime) {
      this.createAlert('high-response-time', 'medium',
        'Average response time exceeds threshold',
        this.performanceMetrics.averageResponseTime,
        this.qualityThresholds.maxResponseTime
      );
    }
  }

  private checkErrorQuality(type: string, severity: string) {
    if (this.errorMetrics.errorRate > this.qualityThresholds.maxErrorRate) {
      this.createAlert('high-error-rate', 'high',
        'Overall error rate exceeds threshold',
        this.errorMetrics.errorRate,
        this.qualityThresholds.maxErrorRate
      );
    }

    if (severity === 'critical') {
      this.createAlert(`critical-error-${type}`, 'critical',
        `Critical error occurred: ${type}`,
        1,
        0
      );
    }
  }

  private createAlert(metricName: string, severity: QualityAlert['severity'], message: string, currentValue: number, threshold: number) {
    const alertId = `${metricName}-${Date.now()}`;
    
    const alert: QualityAlert = {
      id: alertId,
      timestamp: new Date(),
      severity,
      metric: metricName,
      currentValue,
      threshold,
      message,
      resolved: false
    };
    
    this.activeAlerts.set(alertId, alert);
    this.emit('qualityAlert', alert);
    
    console.warn(`Quality Alert [${severity.toUpperCase()}]: ${message}`, {
      metric: metricName,
      current: currentValue,
      threshold,
      timestamp: alert.timestamp
    });
  }

  // Monitoring intervals
  private startThroughputMonitoring() {
    this.throughputInterval = setInterval(() => {
      this.messageMetrics.throughputPerSecond = 
        (this.messagesSentLastSecond + this.messagesReceivedLastSecond) / 2;
      
      this.messagesSentLastSecond = 0;
      this.messagesReceivedLastSecond = 0;
      
      this.checkMessageQuality();
    }, 1000);
  }

  private startPerformanceMonitoring() {
    setInterval(() => {
      // Update memory usage
      if (process.memoryUsage) {
        const memUsage = process.memoryUsage();
        this.performanceMetrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
      }
      
      // Update uptime
      this.performanceMetrics.uptime = Date.now() - this.startTime.getTime();
      
      this.checkPerformanceQuality();
    }, 5000); // Every 5 seconds
  }

  private startQualityChecks() {
    setInterval(() => {
      this.takeSnapshot();
      this.cleanupOldData();
    }, 60000); // Every minute
  }

  private takeSnapshot() {
    const snapshot = {
      timestamp: new Date(),
      connectionMetrics: { ...this.connectionMetrics },
      messageMetrics: { ...this.messageMetrics },
      performanceMetrics: { ...this.performanceMetrics },
      errorMetrics: { 
        ...this.errorMetrics,
        errorsByType: new Map(this.errorMetrics.errorsByType)
      }
    };
    
    this.metricsHistory.push(snapshot);
    
    // Keep only last 24 hours of snapshots
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(
      snapshot => snapshot.timestamp.getTime() > twentyFourHoursAgo
    );
  }

  private cleanupOldData() {
    // Clean up old connection timestamps
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.recentErrors = this.recentErrors.filter(
      error => error.timestamp.getTime() > oneHourAgo
    );
  }

  // Public API methods
  getMetrics() {
    return {
      connection: { ...this.connectionMetrics },
      message: { ...this.messageMetrics },
      performance: { ...this.performanceMetrics },
      error: { 
        ...this.errorMetrics,
        errorsByType: new Map(this.errorMetrics.errorsByType)
      }
    };
  }

  getQualityScore(): number {
    // Calculate overall quality score (0-100)
    let score = 100;
    
    // Deduct points for poor metrics
    score -= (this.connectionMetrics.connectionFailureRate * 100) * 20; // 20x weight
    score -= (this.messageMetrics.messageDropRate * 100) * 15; // 15x weight
    score -= (this.errorMetrics.errorRate * 100) * 25; // 25x weight
    
    // Deduct for high latency
    if (this.messageMetrics.averageMessageLatency > this.qualityThresholds.maxAverageLatency) {
      score -= 10;
    }
    
    // Deduct for low throughput
    if (this.messageMetrics.throughputPerSecond < this.qualityThresholds.minThroughput) {
      score -= 15;
    }
    
    // Deduct for critical errors
    score -= this.errorMetrics.criticalErrors * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  getActiveAlerts(): QualityAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  resolveAlert(alertId: string) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alertResolved', alert);
    }
  }

  getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const qualityScore = this.getQualityScore();
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
    
    if (criticalAlerts.length > 0 || qualityScore < 50) {
      return 'critical';
    } else if (qualityScore < 80 || activeAlerts.length > 3) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  generateReport(): string {
    const metrics = this.getMetrics();
    const qualityScore = this.getQualityScore();
    const healthStatus = this.getHealthStatus();
    const activeAlerts = this.getActiveAlerts();
    
    return `
=== WebSocket Quality Metrics Report ===
Generated: ${new Date().toISOString()}
Overall Quality Score: ${qualityScore.toFixed(1)}/100
Health Status: ${healthStatus.toUpperCase()}

CONNECTION METRICS:
- Total Connections: ${metrics.connection.totalConnections}
- Active Connections: ${metrics.connection.activeConnections}
- Success Rate: ${((1 - metrics.connection.connectionFailureRate) * 100).toFixed(1)}%
- Average Connection Time: ${metrics.connection.averageConnectionTime.toFixed(1)}ms
- Reconnection Attempts: ${metrics.connection.reconnectionAttempts}

MESSAGE METRICS:
- Messages Sent: ${metrics.message.totalMessagesSent}
- Messages Received: ${metrics.message.totalMessagesReceived}
- Drop Rate: ${(metrics.message.messageDropRate * 100).toFixed(2)}%
- Average Latency: ${metrics.message.averageMessageLatency.toFixed(1)}ms
- Max Latency: ${metrics.message.maxMessageLatency}ms
- Throughput: ${metrics.message.throughputPerSecond.toFixed(1)} msg/sec

PERFORMANCE METRICS:
- Memory Usage: ${metrics.performance.memoryUsage.toFixed(1)}MB
- Uptime: ${(metrics.performance.uptime / 1000 / 60).toFixed(1)} minutes
- Active WebSocket Connections: ${metrics.performance.activeWebSocketConnections}

ERROR METRICS:
- Total Errors: ${metrics.error.totalErrors}
- Error Rate: ${(metrics.error.errorRate * 100).toFixed(2)}%
- Critical Errors: ${metrics.error.criticalErrors}

ACTIVE ALERTS: ${activeAlerts.length}
${activeAlerts.map(alert => 
  `- [${alert.severity.toUpperCase()}] ${alert.message} (${alert.currentValue} vs ${alert.threshold})`
).join('\n')}

=== End Report ===
    `.trim();
  }

  destroy() {
    if (this.throughputInterval) {
      clearInterval(this.throughputInterval);
    }
    this.removeAllListeners();
  }
}

// Singleton instance
let qualityMetricsService: QualityMetricsService | null = null;

export const initializeQualityMetrics = (thresholds?: Partial<QualityThresholds>): QualityMetricsService => {
  if (!qualityMetricsService) {
    qualityMetricsService = new QualityMetricsService(thresholds);
    console.log('🔍 Quality Metrics Service initialized');
  }
  return qualityMetricsService;
};

export const getQualityMetrics = (): QualityMetricsService => {
  if (!qualityMetricsService) {
    throw new Error('Quality Metrics Service not initialized');
  }
  return qualityMetricsService;
};