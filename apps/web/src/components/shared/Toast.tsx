import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-amber-600'
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  return (
    <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${
      bgColors[type]
    } transform transition-all duration-300 ease-in-out animate-slide-in-right`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icons[type]}</span>
        <p>{message}</p>
        <button
          onClick={onClose}
          className="ml-4 text-white/80 hover:text-white"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
};