import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Database, Download, Upload, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useOfflineStatus, useOfflineActions } from '../hooks/useOfflineStatus';

interface OfflineStatusProps {
  className?: string;
}

const OfflineStatus: React.FC<OfflineStatusProps> = ({ className = '' }) => {
  const status = useOfflineStatus();
  const { isOnline, syncNow, clearCache, exportData, importData } = useOfflineActions();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!status) {
    return null;
  }

  const handleSync = async () => {
    setIsSyncing(true);
    const success = await syncNow();
    setIsSyncing(false);
    
    if (success) {
      // Show success message
      alert('تمت المزامنة بنجاح!');
    } else {
      alert('فشلت المزامنة. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleExport = async () => {
    const data = await exportData();
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `al-mizan-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const success = await importData(data);
          
          if (success) {
            alert('تم استيراد البيانات بنجاح!');
          } else {
            alert('فشلت استيراد البيانات. يرجى التحقق من الملف.');
          }
        } catch (error) {
          alert('ملف غير صالح. يرجى اختيار ملف نسخة احتياطي صحيح.');
        }
      }
    };
    input.click();
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (status.pendingActions > 0) return 'text-amber-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'غير متصل';
    if (status.pendingActions > 0) return `بانتظار المزامنة (${status.pendingActions})`;
    return 'متصل';
  };

  const formatLastSync = () => {
    if (!status.lastSync) return 'لم تتم مزامنة بعد';
    
    const syncDate = new Date(status.lastSync);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffMins < 1440) return `منذ ${Math.floor(diffMins / 60)} ساعة`;
    return `منذ ${Math.floor(diffMins / 1440)} يوم`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Status Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors`}
        title="انقر للتفاصيل"
      >
        {isOnline ? (
          <Wifi className={`w-4 h-4 ${getStatusColor()}`} />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {status.pendingActions > 0 && (
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white">حالة الاتصال</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ×
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  الاتصال بالإنترنت
                </span>
              </div>
              <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'متصل' : 'غير متصل'}
              </span>
            </div>

            {/* Last Sync */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  آخر مزامنة
                </span>
              </div>
              <span className="text-sm font-medium text-slate-800 dark:text-white">
                {formatLastSync()}
              </span>
            </div>

            {/* Pending Actions */}
            {status.pendingActions > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    إجراءات معلقة
                </span>
                </div>
                <span className="text-sm font-medium text-amber-600">
                  {status.pendingActions}
                </span>
              </div>
            )}

            {/* Cached Data */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  البيانات المخزنة محلياً
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">القضايا:</span>
                  <span className="font-medium">{status.cachedData.cases}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">العملاء:</span>
                  <span className="font-medium">{status.cachedData.clients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الجلسات:</span>
                  <span className="font-medium">{status.cachedData.hearings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المهام:</span>
                  <span className="font-medium">{status.cachedData.tasks}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <button
              onClick={handleSync}
              disabled={!isOnline || isSyncing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">
                {isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Download className="w-3 h-3" />
                <span className="text-xs">تصدير</span>
              </button>
              <button
                onClick={handleImport}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Upload className="w-3 h-3" />
                <span className="text-xs">استيراد</span>
              </button>
            </div>

            <button
              onClick={clearCache}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
            >
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">مسح التخزين المؤقت</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineStatus;
