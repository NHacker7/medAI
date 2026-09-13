'use client';

import { useCallback, useEffect, useState } from 'react';

interface UseQueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useQuery<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
): UseQueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    try {
      setError(null);

      const result = await fn();

      setData(result);
    } catch (err) {
      console.error('useQuery error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [fn, ...deps]);

  useEffect(() => {
    run();
  }, [run]);

  return {
    data,
    loading,
    error,
    refetch: run,
  };
}