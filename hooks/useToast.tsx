import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastType } from '../components/ToastNotification';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  subtitle?: string;
  duration?: number;
  action?: {
    text: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  showProgress?: boolean;
  progress?: number;
  icon?: React.ReactNode;
  sound?: string;
  haptic?: boolean;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, options?: Partial<ToastMessage>) => void;
  success: (message: string, options?: Partial<Omit<ToastMessage, 'type' | 'message'>>) => void;
  error: (message: string, options?: Partial<Omit<ToastMessage, 'type' | 'message'>>) => void;
  warning: (message: string, options?: Partial<Omit<ToastMessage, 'type' | 'message'>>) => void;
  info: (message: string, options?: Partial<Omit<ToastMessage, 'type' | 'message'>>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, message: string, options?: Partial<ToastMessage>) => {
    const id = Date.now().toString();
    const newToast: ToastMessage = { 
      id, 
      type, 
      message, 
      ...options 
    };
    
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message: string, options?: Partial<Omit<ToastMessage, 'type' | 'message'>>) => {
    showToast('success', message, options);
  }, [showToast]);

  const error = useCallback((message: string, options?: Partial<Omit<ToastMessage, 'type' | 'message'>>) => {
    showToast('error', message, options);
  }, [showToast]);

  const warning = useCallback((message: string, options?: Partial<Omit<ToastMessage, 'type' | 'message'>>) => {
    showToast('warning', message, options);
  }, [showToast]);

  const info = useCallback((message: string, options?: Partial<Omit<ToastMessage, 'type' | 'message'>>) => {
    showToast('info', message, options);
  }, [showToast]);

  const value: ToastContextType = {
    showToast,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
};
