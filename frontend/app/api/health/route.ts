import { NextResponse } from 'next/server';

export async function GET() {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || 'unknown',
    checks: {
      backend: 'pending',
      memory: 'pending'
    }
  };

  // バックエンド接続チェック
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/health/live`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      healthCheck.checks.backend = 'healthy';
    } else {
      healthCheck.checks.backend = 'unhealthy';
      healthCheck.status = 'DEGRADED';
    }
  } catch {
    healthCheck.checks.backend = 'unreachable';
    healthCheck.status = 'DEGRADED';
  }

  // メモリ使用率チェック
  const memoryUsage = process.memoryUsage();
  const memoryThreshold = 512 * 1024 * 1024; // 512MB
  if (memoryUsage.heapUsed < memoryThreshold) {
    healthCheck.checks.memory = 'healthy';
  } else {
    healthCheck.checks.memory = 'warning';
    if (healthCheck.status === 'OK') {
      healthCheck.status = 'DEGRADED';
    }
  }

  const statusCode = healthCheck.status === 'OK' ? 200 : 503;
  return NextResponse.json(healthCheck, { status: statusCode });
}

// 簡易ヘルスチェック
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}