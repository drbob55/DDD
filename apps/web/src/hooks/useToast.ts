// src/hooks/useToast.ts
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = {
    success: (message: string) => {
      toast.success(message);
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, message, type: 'success' }]);
      return id;
    },
    error: (message: string) => {
      toast.error(message);
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, message, type: 'error' }]);
      return id;
    },
    info: (message: string) => {
      toast(message);
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, message, type: 'info' }]);
      return id;
    },
  };

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
};