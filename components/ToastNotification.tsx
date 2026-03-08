import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X, ExternalLink, Eye } from 'lucide-react';
import '../styles/toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastAction {
  text: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface ToastProps {
  type: ToastType;
  message: string;
  subtitle?: string;
  duration?: number;
  onClose?: () => void;
  action?: ToastAction;
  showProgress?: boolean;
  progress?: number;
  icon?: React.ReactNode;
  sound?: string;
  haptic?: boolean;
}

const Toast: React.FC<ToastProps> = ({ 
  type, 
  message, 
  subtitle, 
  duration = 4000, 
  onClose, 
  action, 
  showProgress = false, 
  progress = 0, 
  icon: customIcon, 
  sound, 
  haptic 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Play sound if provided
    if (sound && typeof window !== 'undefined') {
      const audio = new Audio(`/sounds/${sound}`);
      audio.play().catch(() => {}); // Ignore errors
    }

    // Trigger haptic feedback if supported
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(100);
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose, sound, haptic]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
          border: 'border-green-200 dark:border-green-800 shadow-green-100/50',
          icon: 'text-emerald-600 dark:text-emerald-400',
          text: 'text-green-800 dark:text-green-200',
          progress: 'bg-emerald-500'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
          border: 'border-red-200 dark:border-red-800 shadow-red-100/50',
          icon: 'text-red-600 dark:text-red-400',
          text: 'text-red-800 dark:text-red-200',
          progress: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
          border: 'border-amber-200 dark:border-amber-800 shadow-amber-100/50',
          icon: 'text-amber-600 dark:text-amber-400',
          text: 'text-amber-800 dark:text-amber-200',
          progress: 'bg-amber-500'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
          border: 'border-blue-200 dark:border-blue-800 shadow-blue-100/50',
          icon: 'text-blue-600 dark:text-blue-400',
          text: 'text-blue-800 dark:text-blue-200',
          progress: 'bg-blue-500'
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      default: return Info;
    }
  };

  const styles = getStyles();
  const Icon = customIcon || getIcon();

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg border shadow-lg toast-enhanced
        transition-all duration-300 animate-slide-in-right
        ${styles.bg} ${styles.border}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{
        '--progress-width': `${progress}%`,
        '--progress-duration': showProgress ? '2s' : '0s'
      } as React.CSSProperties}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-start gap-3">
          {React.isValidElement(Icon) ? (
            React.cloneElement(Icon as React.ReactElement<any>, {
              className: `w-5 h-5 mt-0.5 ${styles.icon} flex-shrink-0 animate-pulse`
            })
          ) : (
            <Icon className={`w-5 h-5 mt-0.5 ${styles.icon} flex-shrink-0 animate-pulse`} />
          )}
        </div>
        <div className={`flex-1 text-sm ${styles.text}`}>
          <div className="font-medium">{message}</div>
          {subtitle && (
            <div className="text-xs opacity-75 mt-1">{subtitle}</div>
          )}
          {showProgress && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                <div 
                  className={`${styles.progress} h-1 rounded-full transition-all duration-300 progress-animated`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          title="إغلاق"
          className={`flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors ${styles.text}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {action && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={action.onClick}
            className={`
              w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md
              text-sm font-medium transition-colors
              bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
              hover:bg-gray-50 dark:hover:bg-gray-700
              ${styles.text}
            `}
          >
            {action.icon && <span className="w-4 h-4">{action.icon}</span>}
            {action.text}
            <ExternalLink className="w-3 h-3 mr-1" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Toast;
