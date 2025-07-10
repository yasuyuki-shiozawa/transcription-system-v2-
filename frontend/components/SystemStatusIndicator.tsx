'use client';

import React from 'react';

interface SystemStatus {
  backend: 'healthy' | 'slow' | 'down';
  frontend: 'healthy' | 'slow' | 'degraded';
  openai: 'available' | 'limited' | 'unavailable';
  lastChecked: Date;
}

interface SystemStatusProps {
  status: SystemStatus;
  isMinimized?: boolean;
  onToggle?: () => void;
}

const SystemStatusIndicator: React.FC<SystemStatusProps> = ({
  status,
  isMinimized = false,
  onToggle
}) => {

  const getStatusLabel = (service: string, state: string): string => {
    const labels: Record<string, Record<string, string>> = {
      backend: {
        healthy: 'サーバー正常',
        slow: 'サーバー低速',
        down: 'サーバー停止'
      },
      frontend: {
        healthy: '画面正常',
        slow: '画面低速',
        degraded: '画面問題'
      },
      openai: {
        available: '音声認識利用可',
        limited: '音声認識制限',
        unavailable: '音声認識停止'
      }
    };
    return labels[service]?.[state] || '状態不明';
  };

  const getOverallStatus = (): 'healthy' | 'warning' | 'critical' => {
    const statuses = [status.backend, status.frontend, status.openai];
    if (statuses.some(s => s === 'down' || s === 'unavailable' || s === 'degraded')) {
      return 'critical';
    }
    if (statuses.some(s => s === 'slow' || s === 'limited')) {
      return 'warning';
    }
    return 'healthy';
  };

  if (isMinimized) {
    const overall = getOverallStatus();
    const statusColors = {
      healthy: 'bg-green-400',
      warning: 'bg-yellow-400',
      critical: 'bg-red-400'
    };

    const statusIcons = {
      healthy: '✓',
      warning: '!',
      critical: '×'
    };

    return (
      <div 
        className="fixed top-4 right-4 z-50 cursor-pointer transition-all duration-200 hover:scale-105"
        onClick={onToggle}
      >
        <div className={`${statusColors[overall]} text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg`}>
          <span className="text-sm font-bold">{statusIcons[overall]}</span>
        </div>
        {overall !== 'healthy' && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">システム状態</h4>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2">
          <StatusItem 
            label="サーバー" 
            status={status.backend}
            description={getStatusLabel('backend', status.backend)}
          />
          <StatusItem 
            label="画面表示" 
            status={status.frontend}
            description={getStatusLabel('frontend', status.frontend)}
          />
          <StatusItem 
            label="音声認識" 
            status={status.openai}
            description={getStatusLabel('openai', status.openai)}
          />
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            最終確認: {status.lastChecked.toLocaleTimeString('ja-JP')}
          </p>
        </div>
      </div>
    </div>
  );
};

const StatusItem: React.FC<{
  label: string;
  status: string;
  description: string;
}> = ({ label, status, description }) => {
  const getStatusColor = (state: string): string => {
    switch (state) {
      case 'healthy':
      case 'available':
        return 'bg-green-400';
      case 'slow':
      case 'limited':
        return 'bg-yellow-400';
      case 'down':
      case 'degraded':
      case 'unavailable':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="text-xs text-gray-500">{description}</span>
    </div>
  );
};

export default SystemStatusIndicator;