import { useState, useEffect } from 'react';
import { offlineManager, OfflineStatus } from '../services/offlineManager';

// React hook for offline status
export const useOfflineStatus = (): OfflineStatus | null => {
  const [status, setStatus] = useState<OfflineStatus | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      const currentStatus = await offlineManager.getOfflineStatus();
      setStatus(currentStatus);
    };

    updateStatus();
    offlineManager.onStatusChange(setStatus);

    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  return status;
};

// React hook for offline actions
export const useOfflineActions = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network connection restored');
      setIsOnline(true);
    };
    const handleOffline = () => {
      console.log('📱 Network connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // More reliable connection check
    const checkConnection = async () => {
      try {
        // Try to fetch a small resource to check real connectivity
        const response = await fetch('https://www.google.com/images/cleardot.gif', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(2000) // 2 second timeout
        });
        
        // If we get here, we have some form of connectivity
        const online = navigator.onLine;
        console.log('🔍 Connection check:', online ? 'Online' : 'Offline');
        setIsOnline(online);
      } catch (error) {
        // Network error - definitely offline
        console.log('🔍 Connection check: Offline (network error)');
        setIsOnline(false);
      }
    };

    // Check every 5 seconds to avoid too frequent checks
    const interval = setInterval(checkConnection, 5000);

    // Initial check
    checkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const syncNow = async () => {
    try {
      await offlineManager.syncPendingActions();
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    }
  };

  const clearCache = async () => {
    try {
      await offlineManager.clearCache();
      return true;
    } catch (error) {
      console.error('Clear cache failed:', error);
      return false;
    }
  };

  const exportData = async () => {
    try {
      return await offlineManager.exportData();
    } catch (error) {
      console.error('Export failed:', error);
      return null;
    }
  };

  const importData = async (data: any) => {
    try {
      await offlineManager.importData(data);
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  };

  return {
    isOnline,
    syncNow,
    clearCache,
    exportData,
    importData
  };
};
