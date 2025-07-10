# UX委員会 コンポーネント最適化戦略

## 🎨 技術指導: Prometheus (Chief System Architect)
**対象**: UX委員会 (Aphrodite)  
**現状**: AudioFileUploadコンポーネント改善済み  
**目標**: 包括的コンポーネント最適化・デザインシステム統一

---

## 🎯 現在の改善状況分析

### AudioFileUploadコンポーネントの評価

**✅ 優れている実装点**:
```typescript
// 1. 包括的エラーハンドリング
const determineErrorType = (error: Error): ErrorType => {
  // API Key不足、クォータ超過、タイムアウトなど
  // 詳細なエラー分類による適切なUI表示
};

// 2. システム状態監視統合
const [systemStatus, setSystemStatus] = useState({
  backend: 'healthy' | 'slow' | 'down',
  frontend: 'healthy' | 'slow' | 'degraded', 
  openai: 'available' | 'limited' | 'unavailable'
});

// 3. 先進的エラーUI実装
{showErrorUI && (
  <OpenAIErrorHandler
    errorType={showErrorUI.type}
    onRetry={handleErrorRetry}
    onFallback={handleErrorFallback}
    onContactSupport={handleContactSupport}
  />
)}
```

**⚠️ 最適化が必要な領域**:
1. **状態管理の複雑化** - 8つの状態変数による複雑性
2. **コンポーネントサイズ** - 単一コンポーネントが500行超
3. **再利用性** - 特定用途に特化、汎用性不足
4. **テスタビリティ** - 複雑な内部状態による困難性

---

## 🏗️ コンポーネント最適化戦略

### 1. Atomic Design適用による分割

```typescript
// atoms/FileInput.tsx - 基本的なファイル入力
interface FileInputProps {
  accept: string[];
  maxSize: number;
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export const FileInput: React.FC<FileInputProps> = ({
  accept,
  maxSize,
  onFileSelect,
  onError,
  disabled = false,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const validateFile = useCallback((file: File): boolean => {
    if (file.size > maxSize) {
      onError(`ファイルサイズが上限（${maxSize / 1024 / 1024}MB）を超えています`);
      return false;
    }
    
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!accept.some(type => file.type === type || fileExtension === type)) {
      onError(`対応していないファイル形式です（対応形式: ${accept.join(', ')}）`);
      return false;
    }
    
    return true;
  }, [accept, maxSize, onError]);
  
  // ドラッグ&ドロップ・ファイル選択の統合処理
  return (
    <div 
      className={`file-input-zone ${className}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(',')}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />
      {/* UI implementation */}
    </div>
  );
};

// molecules/AudioUploadWidget.tsx - 音声アップロード特化
interface AudioUploadWidgetProps {
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
  progress?: number;
  error?: string | null;
  onError: (error: string) => void;
}

export const AudioUploadWidget: React.FC<AudioUploadWidgetProps> = ({
  onUpload,
  uploading,
  progress = 0,
  error,
  onError
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    const audioUrl = URL.createObjectURL(file);
    setAudioPreview(audioUrl);
  }, []);
  
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      await onUpload(selectedFile);
      // リセット処理
      setSelectedFile(null);
      setAudioPreview(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'アップロードエラー');
    }
  }, [selectedFile, onUpload, onError]);
  
  return (
    <div className="audio-upload-widget">
      <FileInput
        accept={['audio/mp3', 'audio/wav', '.mp3', '.wav']}
        maxSize={100 * 1024 * 1024} // 100MB
        onFileSelect={handleFileSelect}
        onError={onError}
        disabled={uploading}
      />
      
      {selectedFile && (
        <AudioPreview
          file={selectedFile}
          audioUrl={audioPreview}
          onRemove={() => {
            setSelectedFile(null);
            setAudioPreview(null);
          }}
        />
      )}
      
      {uploading && (
        <UploadProgress
          progress={progress}
          fileName={selectedFile?.name}
        />
      )}
      
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => onError('')}
        />
      )}
      
      <UploadActions
        canUpload={!!selectedFile && !uploading}
        uploading={uploading}
        onUpload={handleUpload}
      />
    </div>
  );
};

// organisms/AudioFileUploadSection.tsx - セクション全体
interface AudioFileUploadSectionProps {
  sessionId: string;
  source: 'notta' | 'manus';
  onUploadComplete: () => void;
}

export const AudioFileUploadSection: React.FC<AudioFileUploadSectionProps> = ({
  sessionId,
  source,
  onUploadComplete
}) => {
  const { uploadAudio, uploading, progress, error } = useAudioUpload(sessionId, source);
  const [systemStatus, setSystemStatus] = useSystemStatus();
  
  return (
    <section className="audio-upload-section">
      <SectionHeader
        title={`${source === 'notta' ? 'NOTTA' : 'Manus'}音声アップロード`}
        systemStatus={systemStatus}
      />
      
      <AudioUploadWidget
        onUpload={uploadAudio}
        uploading={uploading}
        progress={progress}
        error={error}
        onError={setError}
      />
      
      <SystemStatusIndicator
        status={systemStatus}
        onStatusChange={setSystemStatus}
      />
      
      {error && (
        <OpenAIErrorHandler
          errorType={determineErrorType(error)}
          onRetry={() => uploadAudio}
          onFallback={handleFallback}
          onContactSupport={handleContactSupport}
        />
      )}
    </section>
  );
};
```

### 2. カスタムフック活用

```typescript
// hooks/useAudioUpload.ts - 音声アップロードロジック分離
export const useAudioUpload = (sessionId: string, source: 'notta' | 'manus') => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  
  const uploadAudio = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', source);
      
      // アップロード進捗監視
      const response = await uploadWithProgress(
        `/api/sessions/${sessionId}/upload/audio/${source}`,
        formData,
        (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      );
      
      if (response.success) {
        setTranscriptionId(response.data.transcriptionId);
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'アップロードエラー';
      setError(errorMessage);
      throw error;
    } finally {
      setUploading(false);
    }
  }, [sessionId, source]);
  
  return {
    uploadAudio,
    uploading,
    progress,
    error,
    setError,
    transcriptionId
  };
};

// hooks/useSystemStatus.ts - システム状態監視
export const useSystemStatus = () => {
  const [status, setStatus] = useState<SystemStatus>({
    backend: 'healthy',
    frontend: 'healthy',
    openai: 'available',
    lastChecked: new Date()
  });
  
  const checkSystemHealth = useCallback(async () => {
    try {
      // バックエンドヘルスチェック
      const backendHealth = await fetch('/health');
      const frontendPerformance = await measureFrontendPerformance();
      const openaiStatus = await checkOpenAIStatus();
      
      setStatus({
        backend: backendHealth.ok ? 'healthy' : 'down',
        frontend: frontendPerformance < 100 ? 'healthy' : 'slow',
        openai: openaiStatus,
        lastChecked: new Date()
      });
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        backend: 'down',
        lastChecked: new Date()
      }));
    }
  }, []);
  
  // 定期的なヘルスチェック
  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // 30秒間隔
    return () => clearInterval(interval);
  }, [checkSystemHealth]);
  
  return [status, setStatus] as const;
};

// hooks/useOptimizedRendering.ts - レンダリング最適化
export const useOptimizedRendering = <T>(
  data: T[],
  renderItem: (item: T, index: number) => React.ReactNode,
  options: {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  }
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const { itemHeight, containerHeight, overscan = 5 } = options;
  
  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(data.length - 1, startIndex + visibleCount + overscan * 2);
    
    return { startIndex, endIndex, visibleCount };
  }, [scrollTop, itemHeight, containerHeight, overscan, data.length]);
  
  const visibleItems = useMemo(() => {
    return data.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
      .map((item, index) => ({
        item,
        index: visibleRange.startIndex + index,
        top: (visibleRange.startIndex + index) * itemHeight
      }));
  }, [data, visibleRange, itemHeight]);
  
  return {
    visibleItems,
    totalHeight: data.length * itemHeight,
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
};
```

---

## 🎨 デザインシステム統一

### 1. デザイントークン定義

```typescript
// design-system/tokens.ts
export const designTokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a8a'
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d'
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309'
    }
  },
  
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem'    // 64px
  },
  
  typography: {
    fontSizes: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      base: '1rem',    // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem',   // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem' // 30px
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75
    }
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
  },
  
  borderRadius: {
    sm: '0.125rem',  // 2px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    full: '9999px'
  },
  
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out'
  }
};
```

### 2. 共通コンポーネントライブラリ

```typescript
// components/ui/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    error: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  const disabledClasses = 'opacity-50 cursor-not-allowed';
  const loadingClasses = 'cursor-wait';
  const fullWidthClasses = fullWidth ? 'w-full' : '';
  
  const finalClassName = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    (disabled || loading) && disabledClasses,
    loading && loadingClasses,
    fullWidthClasses,
    className
  );
  
  return (
    <button
      className={finalClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

// components/ui/ProgressBar.tsx
interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  label,
  animated = false
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  const variantClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };
  
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-700 mb-1">
          <span>{label || 'Progress'}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            variantClasses[variant],
            animated && 'bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// components/ui/ErrorBoundary.tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }
  
  retry = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }
    
    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="mb-4 text-red-600">
      <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    </div>
    <h2 className="text-lg font-semibold text-gray-900 mb-2">エラーが発生しました</h2>
    <p className="text-gray-600 mb-4">{error.message}</p>
    <Button onClick={retry} variant="primary">
      再試行
    </Button>
  </div>
);
```

---

## ♿ アクセシビリティ強化

### 1. 包括的アクセシビリティ実装

```typescript
// hooks/useAccessibility.ts
export const useAccessibility = () => {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, message]);
    
    // スクリーンリーダー用の音声通知
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
      setAnnouncements(prev => prev.filter(a => a !== message));
    }, 1000);
  }, []);
  
  return { announce, announcements };
};

// components/ui/VisuallyHidden.tsx
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only">{children}</span>
);

// components/AudioFileUpload/AccessibleAudioUpload.tsx
export const AccessibleAudioUpload: React.FC<AudioUploadProps> = (props) => {
  const { announce } = useAccessibility();
  
  const handleFileSelect = useCallback((file: File) => {
    announce(`音声ファイル「${file.name}」が選択されました。ファイルサイズ: ${formatFileSize(file.size)}`);
    props.onFileSelect(file);
  }, [announce, props.onFileSelect]);
  
  const handleUploadStart = useCallback(() => {
    announce('音声ファイルのアップロードを開始しました', 'assertive');
  }, [announce]);
  
  const handleUploadProgress = useCallback((progress: number) => {
    // 25%刻みでのみ通知（通知頻度を抑制）
    if (progress % 25 === 0 && progress > 0) {
      announce(`アップロード進捗: ${progress}%完了`);
    }
  }, [announce]);
  
  const handleUploadComplete = useCallback(() => {
    announce('音声ファイルのアップロードが完了しました', 'assertive');
  }, [announce]);
  
  const handleUploadError = useCallback((error: string) => {
    announce(`エラーが発生しました: ${error}`, 'assertive');
  }, [announce]);
  
  return (
    <div 
      role="region" 
      aria-labelledby="audio-upload-heading"
      aria-describedby="audio-upload-description"
    >
      <h2 id="audio-upload-heading" className="text-lg font-semibold mb-2">
        音声ファイルアップロード
      </h2>
      <p id="audio-upload-description" className="text-sm text-gray-600 mb-4">
        MP3またはWAVファイル（最大100MB）をアップロードしてください。
        ドラッグ&ドロップまたはファイル選択ボタンを使用できます。
      </p>
      
      {/* キーボードナビゲーション対応のファイル入力 */}
      <div
        role="button"
        tabIndex={0}
        aria-label="音声ファイルを選択またはドロップ"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {/* ファイル入力UI */}
      </div>
      
      {/* 進捗状況のライブリージョン */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {uploading && `アップロード中: ${progress}%完了`}
      </div>
      
      {/* エラーメッセージのライブリージョン */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {error && `エラー: ${error}`}
      </div>
    </div>
  );
};
```

### 2. キーボードナビゲーション強化

```typescript
// hooks/useKeyboardNavigation.ts
export const useKeyboardNavigation = (
  items: Array<{ id: string; element: HTMLElement | null }>,
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical';
    onActivate?: (id: string) => void;
  } = {}
) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const { loop = true, orientation = 'vertical', onActivate } = options;
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const navigationKeys = orientation === 'horizontal' 
      ? ['ArrowLeft', 'ArrowRight'] 
      : ['ArrowUp', 'ArrowDown'];
    
    if (!navigationKeys.includes(e.key) && e.key !== 'Enter' && e.key !== ' ') {
      return;
    }
    
    e.preventDefault();
    
    let newIndex = focusedIndex;
    
    if (e.key === navigationKeys[0]) { // Previous
      newIndex = focusedIndex <= 0 
        ? (loop ? items.length - 1 : 0)
        : focusedIndex - 1;
    } else if (e.key === navigationKeys[1]) { // Next
      newIndex = focusedIndex >= items.length - 1
        ? (loop ? 0 : items.length - 1)
        : focusedIndex + 1;
    } else if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0) {
      onActivate?.(items[focusedIndex].id);
      return;
    }
    
    setFocusedIndex(newIndex);
    items[newIndex]?.element?.focus();
  }, [focusedIndex, items, loop, orientation, onActivate]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return { focusedIndex, setFocusedIndex };
};
```

---

## 📱 レスポンシブデザイン戦略

### 1. モバイルファースト実装

```typescript
// hooks/useResponsive.ts
export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('sm');
      else if (width < 768) setScreenSize('md');
      else if (width < 1024) setScreenSize('lg');
      else setScreenSize('xl');
    };
    
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);
  
  return {
    screenSize,
    isMobile: screenSize === 'sm',
    isTablet: screenSize === 'md',
    isDesktop: screenSize === 'lg' || screenSize === 'xl'
  };
};

// components/ResponsiveAudioUpload.tsx
export const ResponsiveAudioUpload: React.FC<AudioUploadProps> = (props) => {
  const { isMobile, isTablet } = useResponsive();
  
  // モバイル向けの縦方向レイアウト
  if (isMobile) {
    return (
      <div className="space-y-4">
        <MobileFileInput {...props} />
        <MobileProgressIndicator {...props} />
        <MobileErrorDisplay {...props} />
      </div>
    );
  }
  
  // タブレット向けの調整されたレイアウト
  if (isTablet) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <TabletFileInput {...props} />
        <div className="grid grid-cols-2 gap-4">
          <TabletProgressIndicator {...props} />
          <TabletPreview {...props} />
        </div>
      </div>
    );
  }
  
  // デスクトップ向けの横並びレイアウト
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="col-span-1">
        <DesktopFileInput {...props} />
      </div>
      <div className="col-span-1 lg:col-span-2">
        <DesktopProgressAndPreview {...props} />
      </div>
    </div>
  );
};
```

---

## 🎯 UX委員会への実装ロードマップ

### Week 1: コンポーネント分割・基盤構築
```typescript
const week1Tasks = {
  atomicDesign: 'AudioFileUploadの原子・分子レベル分割',
  designSystem: 'デザイントークン・基本コンポーネント作成',
  customHooks: '状態管理・ロジック分離カスタムフック実装',
  accessibility: '基本的なアクセシビリティ対応実装'
};
```

### Week 2: デザイン統一・最適化
```typescript
const week2Tasks = {
  responsiveDesign: 'モバイル・タブレット・デスクトップ対応',
  performanceOptimization: 'レンダリング最適化・仮想化実装',
  errorHandling: '包括的エラーハンドリングUI',
  testing: 'コンポーネント単体・統合テスト実装'
};
```

### Week 3-4: 高度機能・仕上げ
```typescript
const week3_4Tasks = {
  advancedUX: 'プログレッシブ開示・マイクロインタラクション',
  keyboardNavigation: '完全キーボードナビゲーション対応',
  documentation: 'Storybook・デザインガイド作成',
  qualityAssurance: 'ユーザビリティテスト・最終調整'
};
```

---

## 🤝 他委員会との連携

### 技術委員会(Hephaestus)との協働
```typescript
const techCollaboration = {
  frontendRefactoring: 'Context/Reducer実装時のUI最適化',
  apiIntegration: 'API呼び出し時のUX改善',
  performanceOptimization: 'レンダリング最適化共同実装'
};
```

### 品質委員会(Athena)との協働
```typescript
const qualityCollaboration = {
  componentTesting: 'UI コンポーネントテスト戦略',
  accessibilityTesting: '自動アクセシビリティテスト実装',
  usabilityTesting: 'ユーザビリティテスト自動化'
};
```

---

**設計支援責任者**: Prometheus (Chief System Architect)  
**実装責任者**: Aphrodite (UX委員会委員長)  
**品質保証**: Athena (品質委員会), Hephaestus (技術委員会)

**ユーザー体験の革新により、転写システムを使いやすさの頂点へ導きましょう！** 🎨✨