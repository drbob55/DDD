import { useState, useCallback, useRef, useEffect } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export const useAsync = <T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {}
) => {
  const { immediate = false, onSuccess, onError } = options;
  
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: false
  });

  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (...args: Parameters<typeof asyncFunction>) => {
      // Cancel any ongoing request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setState({ data: null, error: null, loading: true });

      try {
        const result = await asyncFunction(...args);
        
        if (mountedRef.current) {
          setState({ data: result, error: null, loading: false });
          onSuccess?.(result);
        }
        
        return result;
      } catch (error) {
        if (mountedRef.current) {
          const errorObj = error as Error;
          setState({ data: null, error: errorObj, loading: false });
          onError?.(errorObj);
        }
        throw error;
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isIdle: !state.loading && !state.data && !state.error
  };
};

// Hook for handling multiple async operations
export const useAsyncQueue = <T = any>() => {
  const [queue, setQueue] = useState<Array<() => Promise<T>>>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<T[]>([]);
  const [errors, setErrors] = useState<Error[]>([]);

  const addToQueue = useCallback((asyncFunction: () => Promise<T>) => {
    setQueue(prev => [...prev, asyncFunction]);
  }, []);

  const processQueue = useCallback(async () => {
    if (processing || queue.length === 0) return;

    setProcessing(true);
    const newResults: T[] = [];
    const newErrors: Error[] = [];

    for (const asyncFunction of queue) {
      try {
        const result = await asyncFunction();
        newResults.push(result);
      } catch (error) {
        newErrors.push(error as Error);
      }
    }

    setResults(prev => [...prev, ...newResults]);
    setErrors(prev => [...prev, ...newErrors]);
    setQueue([]);
    setProcessing(false);
  }, [queue, processing]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setResults([]);
    setErrors([]);
  }, []);

  return {
    queue,
    processing,
    results,
    errors,
    addToQueue,
    processQueue,
    clearQueue,
    queueLength: queue.length
  };
};

// Specialized hook for API retry logic
export const useRetryableAsync = <T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
) => {
  const async = useAsync(asyncFunction);
  
  const executeWithRetry = useCallback(
    async (...args: Parameters<typeof asyncFunction>) => {
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await async.execute(...args);
          return result;
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < maxRetries) {
            // Exponential backoff
            await new Promise(resolve => 
              setTimeout(resolve, retryDelay * Math.pow(2, attempt))
            );
          }
        }
      }
      
      throw lastError;
    },
    [async, maxRetries, retryDelay]
  );

  return {
    ...async,
    executeWithRetry
  };
};