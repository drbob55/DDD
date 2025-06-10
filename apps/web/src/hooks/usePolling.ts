import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  enabled?: boolean;
  immediate?: boolean;
  onError?: (error: Error) => void;
}

export const usePolling = (
  callback: () => void | Promise<void>,
  interval: number,
  options: UsePollingOptions = {}
) => {
  const { enabled = true, immediate = false, onError } = options;
  
  const savedCallback = useRef(callback);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Update callback ref when it changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const executeCallback = useCallback(async () => {
    if (isPollingRef.current) return; // Prevent overlapping executions
    
    isPollingRef.current = true;
    try {
      await savedCallback.current();
    } catch (error) {
      console.error('Polling error:', error);
      onError?.(error as Error);
    } finally {
      isPollingRef.current = false;
    }
  }, [onError]);

  const startPolling = useCallback(() => {
    if (intervalIdRef.current) return; // Already polling
    
    // Execute immediately if requested
    if (immediate) {
      executeCallback();
    }
    
    intervalIdRef.current = setInterval(executeCallback, interval);
  }, [interval, immediate, executeCallback]);

  const stopPolling = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  const restartPolling = useCallback(() => {
    stopPolling();
    startPolling();
  }, [stopPolling, startPolling]);

  // Start/stop polling based on enabled prop
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [enabled, startPolling, stopPolling]);

  return {
    isPolling: !!intervalIdRef.current,
    startPolling,
    stopPolling,
    restartPolling,
    executeNow: executeCallback
  };
};

// Specialized polling hook for API calls
interface UseApiPollingOptions extends UsePollingOptions {
  onSuccess?: (data: any) => void;
  dependencies?: any[];
}

export const useApiPolling = <T = any>(
  apiCall: () => Promise<T>,
  interval: number,
  options: UseApiPollingOptions = {}
) => {
  const { onSuccess, onError, dependencies = [], ...pollingOptions } = options;
  
  const callback = useCallback(async () => {
    try {
      const data = await apiCall();
      onSuccess?.(data);
    } catch (error) {
      throw error; // Let usePolling handle the error
    }
  }, [apiCall, onSuccess, ...dependencies]);

  return usePolling(callback, interval, { ...pollingOptions, onError });
};