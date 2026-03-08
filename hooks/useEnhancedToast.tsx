import { useToast } from './useToast';
import { ExternalLink, Eye, Download, Share2, Check } from 'lucide-react';

interface EnhancedToastOptions {
  subtitle?: string;
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
  duration?: number;
}

export const useEnhancedToast = () => {
  const { success, error, warning, info } = useToast();

  const contextualMessages = {
    // Success messages with better structure
    saveSuccess: (entity: string) => ({
      primary: `تم حفظ ${entity} بنجاح`,
      secondary: 'البيانات آمنة ومزامنة',
      icon: '✅',
      duration: 3000
    }),
    
    deleteSuccess: (entity: string) => ({
      primary: `تم حذف ${entity} بنجاح`,
      secondary: 'تم الحذف نهائياً',
      icon: '🗑️',
      duration: 3000
    }),
    
    updateSuccess: (entity: string) => ({
      primary: `تم تحديث ${entity} بنجاح`,
      secondary: 'التغييرات مطبقة',
      icon: '🔄',
      duration: 3000
    }),

    // Error messages with context
    networkError: (operation: string) => ({
      primary: `فشل ${operation}`,
      secondary: 'تحقق من اتصالك بالإنترنت',
      icon: '🌐',
      duration: 5000
    }),
    
    validationError: (field: string) => ({
      primary: `خطأ في ${field}`,
      secondary: 'يرجى التحقق من البيانات المدخلة',
      icon: '⚠️',
      duration: 4000
    }),

    // Warning messages
    unsavedChanges: () => ({
      primary: 'توجد تغييرات غير محفوظة',
      secondary: 'حفظ التغييرات قبل المغادرة',
      icon: '💾',
      duration: 4000,
      action: {
        text: 'حفظ الآن',
        icon: <Check className="w-4 h-4" />,
        onClick: () => {} // Placeholder for actual save action
      }
    }),

    // Progress messages
    uploadProgress: (filename: string, progress: number) => ({
      primary: `رفع ${filename}`,
      secondary: `${progress}% مكتمل`,
      icon: '📤',
      duration: 0,
      showProgress: true,
      progress
    }),

    // Info messages
    newItem: (entity: string) => ({
      primary: `تمت إضافة ${entity} جديدة`,
      secondary: 'متاحة الآن في القائمة',
      icon: '✨',
      duration: 3000,
      action: {
        text: 'عرض',
        icon: <Eye className="w-4 h-4" />,
        onClick: () => {} // Placeholder for actual view action
      }
    })
  };

  return {
    // Enhanced success with context
    success: (message: string, options?: EnhancedToastOptions) => {
      // Auto-detect message type and enhance
      if (message.includes('حفظ') && message.includes('بنجاح')) {
        const entity = message.replace('تم حفظ', '').replace('بنجاح', '').trim();
        const enhanced = contextualMessages.saveSuccess(entity);
        return success(enhanced.primary, {
          subtitle: enhanced.secondary,
          icon: enhanced.icon,
          duration: enhanced.duration,
          ...options
        });
      }
      
      if (message.includes('حذف') && message.includes('بنجاح')) {
        const entity = message.replace('تم حذف', '').replace('بنجاح', '').trim();
        const enhanced = contextualMessages.deleteSuccess(entity);
        return success(enhanced.primary, {
          subtitle: enhanced.secondary,
          icon: enhanced.icon,
          duration: enhanced.duration,
          ...options
        });
      }

      return success(message, options);
    },

    // Enhanced error with context
    error: (message: string, options?: EnhancedToastOptions) => {
      if (message.includes('اتصال') || message.includes('شبكة')) {
        const enhanced = contextualMessages.networkError('العملية');
        return error(enhanced.primary, {
          subtitle: enhanced.secondary,
          icon: enhanced.icon,
          duration: enhanced.duration,
          ...options
        });
      }

      return error(message, options);
    },

    // Enhanced warning with context
    warning: (message: string, options?: EnhancedToastOptions) => {
      if (message.includes('غير محفوظة')) {
        const enhanced = contextualMessages.unsavedChanges();
        return warning(enhanced.primary, {
          subtitle: enhanced.secondary,
          icon: enhanced.icon,
          duration: enhanced.duration,
          action: enhanced.action,
          ...options
        });
      }

      return warning(message, options);
    },

    // Enhanced info with context
    info: (message: string, options?: EnhancedToastOptions) => {
      if (message.includes('جديدة') || message.includes('إضافة')) {
        const entity = message.replace('تمت إضافة', '').replace('جديدة', '').trim();
        const enhanced = contextualMessages.newItem(entity);
        return info(enhanced.primary, {
          subtitle: enhanced.secondary,
          icon: enhanced.icon,
          duration: enhanced.duration,
          action: enhanced.action,
          ...options
        });
      }

      return info(message, options);
    }
  };
};
