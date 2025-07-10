import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

// 環境変数から設定を読み込み
const isVPNOptimizationEnabled = process.env.NEXT_PUBLIC_VPN_OPTIMIZATION === 'true';
const defaultTimeout = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000');
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// axiosインスタンスを作成
const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: defaultTimeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// VPN最適化が有効な場合のみリトライ機能を追加
if (isVPNOptimizationEnabled) {
  axiosRetry(apiClient, {
    retries: 3,
    retryDelay: (retryCount) => {
      return retryCount * 2000; // 指数バックオフ: 2秒、4秒、6秒
    },
    retryCondition: (error) => {
      return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
             error.code === 'ECONNABORTED';
    },
  });

  // VPN用のリクエストインターセプター
  apiClient.interceptors.request.use(
    (config) => {
      // 大容量データ用の個別タイムアウト設定
      if (config.url?.includes('/sessions/') && config.url?.includes('/transcript') && config.method === 'get') {
        config.timeout = 60000; // 文字起こしデータは60秒
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // VPN用のレスポンスインターセプター
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.code === 'ECONNABORTED') {
        throw new Error('接続がタイムアウトしました。VPN接続を確認してください。');
      }
      // fetchとの互換性のため、エラーレスポンスを整形
      if (error.response) {
        throw {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          ok: false,
          json: async () => error.response.data,
          text: async () => JSON.stringify(error.response.data),
        };
      }
      throw error;
    }
  );
}

// fetchラッパー関数（既存コードとの互換性のため）
export const fetchWithRetry = async (url: string, options?: RequestInit) => {
  try {
    const config: any = {
      url,
      method: (options?.method || 'GET') as any,
      headers: options?.headers,
    };

    if (options?.body) {
      config.data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    }

    const response = await apiClient.request(config);
    
    // fetchのレスポンス形式に合わせる
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers: {
        get: (name: string) => response.headers[name.toLowerCase()],
      },
      json: async () => response.data,
      text: async () => JSON.stringify(response.data),
    };
  } catch (error: any) {
    // エラーがすでに整形されている場合はそのまま返す
    if (error.status !== undefined) {
      return error;
    }
    
    // ネットワークエラーの場合
    throw error;
  }
};

export default apiClient;