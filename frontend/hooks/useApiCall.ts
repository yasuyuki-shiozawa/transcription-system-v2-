import { useState, useEffect } from 'react';
import { fetchWithRetry } from '../utils/apiClient';

interface UseApiCallOptions {
  // fetchと同じオプション
  method?: string;
  headers?: HeadersInit;
  body?: any;
}

export const useApiCall = <T = any>(url: string | null, options?: UseApiCallOptions) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // VPN最適化が有効な場合はfetchWithRetry、無効な場合は通常のfetchを使用
        const fetchFunction = process.env.NEXT_PUBLIC_VPN_OPTIMIZATION === 'true' 
          ? fetchWithRetry 
          : fetch;

        const response = await fetchFunction(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const jsonData = await response.json();
          setData(jsonData);
        } else {
          setData(null);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, JSON.stringify(options)]);

  return { data, loading, error };
};