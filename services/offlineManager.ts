// Advanced Offline Manager for Al-Mizan Law Office Manager
// Handles local storage, caching, and synchronization

import { Case, Client, Hearing, Task, ActivityLog } from '../types';

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'case' | 'client' | 'hearing' | 'task' | 'appointment' | 'lawyerDocument' | 'lawyer';
  data: any;
  timestamp: string;
  retryCount: number;
}

export interface OfflineStatus {
  online: boolean;
  pendingActions: number;
  lastSync: string | null;
  cachedData: {
    cases: number;
    clients: number;
    hearings: number;
    tasks: number;
  };
}

class OfflineManager {
  private db: IDBDatabase | null = null;
  private cacheName = 'al-mizan-offline-data';
  private syncInProgress = false;
  private listeners: ((status: OfflineStatus) => void)[] = [];
  private tempIdMap: Map<string, string> = new Map(); // tempId -> realId mapping

  constructor() {
    this.initDB();
    this.setupNetworkListeners();
  }

  // Initialize IndexedDB for offline storage
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AlMizanOfflineDB', 1);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionStore = db.createObjectStore('pendingActions', { keyPath: 'id' });
          actionStore.createIndex('timestamp', 'timestamp');
          actionStore.createIndex('entity', 'entity');
        }

        if (!db.objectStoreNames.contains('cachedData')) {
          const dataStore = db.createObjectStore('cachedData', { keyPath: 'id' });
          dataStore.createIndex('type', 'type');
          dataStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('syncLog')) {
          const logStore = db.createObjectStore('syncLog', { keyPath: 'id' });
          logStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  // Setup network status listeners
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      this.notifyStatusChange();
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.notifyStatusChange();
    });
  }

  // Cache data for offline use
  async cacheData(type: string, data: any[]): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['cachedData'], 'readwrite');
    const store = transaction.objectStore('cachedData');

    // Clear existing cached data of this type
    const clearRequest = store.index('type').openCursor(IDBKeyRange.only(type));
    await new Promise<void>((resolve) => {
      clearRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };
    });

    // Add new data
    for (const item of data) {
      const cacheItem = {
        id: `${type}_${item.id}`,
        type,
        data: item,
        timestamp: new Date().toISOString()
      };
      store.add(cacheItem);
    }

    console.log(`Cached ${data.length} ${type} for offline use`);
    this.notifyStatusChange();
  }

  // Get cached data
  async getCachedData(type: string): Promise<any[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readonly');
      const store = transaction.objectStore('cachedData');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => {
        const cachedItems = request.result.map(item => item.data);
        resolve(cachedItems);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Add action to pending queue
  async addPendingAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (!this.db) await this.initDB();

    const pendingAction: OfflineAction = {
      ...action,
      id: `${action.entity}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    const transaction = this.db!.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    store.add(pendingAction);

    console.log('Added pending action:', pendingAction);
    this.notifyStatusChange();
  }

  // Get all pending actions
  async getPendingActions(): Promise<OfflineAction[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingActions'], 'readonly');
      const store = transaction.objectStore('pendingActions');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Remove pending action
  async removePendingAction(actionId: string): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    store.delete(actionId);

    console.log('Removed pending action:', actionId);
    this.notifyStatusChange();
  }

  // Force refresh data from Firebase
  async refreshFromFirebase(): Promise<void> {
    if (!navigator.onLine) {
      console.warn('📱 Cannot refresh from Firebase while offline');
      return;
    }

    console.log('🔄 Refreshing data from Firebase...');
    try {
      // Import dbService functions to get fresh data
      const { getHearings } = await import('./dbService');
      
      // Get fresh data from Firebase
      const freshHearings = await getHearings();
      console.log('📥 Retrieved fresh hearings from Firebase:', freshHearings.length);
      
      // Update local cache with fresh data
      await this.cacheData('hearings', freshHearings);
      console.log('✅ Updated local cache with fresh Firebase data');
      
      // Trigger sync completion notification to update UI
      this.notifySyncCompleted();
    } catch (error) {
      console.error('❌ Failed to refresh from Firebase:', error);
    }
  }

  // Manual sync function for users to force sync
  async forceSyncNow(): Promise<boolean> {
    if (!navigator.onLine) {
      console.warn('📱 Cannot sync while offline');
      return false;
    }

    console.log('🔄 Force syncing all pending actions...');
    try {
      await this.syncPendingActions();
      // After syncing, refresh data from Firebase to ensure latest state
      await this.refreshFromFirebase();
      return true;
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      return false;
    }
  }

  // Sync pending actions when online
  async syncPendingActions(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return;

    this.syncInProgress = true;
    console.log('Starting sync of pending actions...');

    try {
      const actions = await this.getPendingActions();
      console.log(`Found ${actions.length} pending actions to sync`);

      for (const action of actions) {
        try {
          await this.executeAction(action);
          await this.removePendingAction(action.id);
          await this.logSyncAction(action, 'success');
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          action.retryCount = (action.retryCount || 0) + 1;
          
          // For document not found errors, don't retry - just remove the action
          if (error.message?.includes('No document to update') || 
              error.message?.includes('No document to create') ||
              error.code === 'not-found' ||
              error.code === 'permission-denied') {
            console.log(`🗑️ Removing failed action ${action.id} due to unrecoverable error`);
            await this.removePendingAction(action.id);
            await this.logSyncAction(action, 'failed');
          } else if (action.retryCount < 3) {
            console.log(`🔄 Retrying action ${action.id} (attempt ${action.retryCount}/3)`);
            await this.updatePendingAction(action);
          } else {
            console.log(`🗑️ Max retries reached for action ${action.id}, removing...`);
            await this.removePendingAction(action.id);
            await this.logSyncAction(action, 'failed');
          }
        }
      }

      // Notify about sync completion
      this.notifySyncCompleted();
      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyStatusChange();
    }
  }

  // Notify about sync completion
  private notifySyncCompleted(): void {
    // Dispatch custom event for sync completion
    window.dispatchEvent(new CustomEvent('offlineSyncCompleted', {
      detail: {
        timestamp: new Date().toISOString(),
        entity: 'hearings'
      }
    }));
  }

  // Get real ID from temp ID
  getRealId(tempId: string): string {
    const realId = this.tempIdMap.get(tempId);
    console.log(`🔍 Looking up real ID for ${tempId}: ${realId || 'not found'}`);
    console.log(`🔍 Current tempIdMap entries:`, Array.from(this.tempIdMap.entries()));
    
    // If we found a mapping, return the real ID
    if (realId) {
      return realId;
    }
    
    // If no mapping found, check if this is already a real ID
    // (by checking if it exists as a value in the map)
    const allRealIds = Array.from(this.tempIdMap.values());
    if (allRealIds.includes(tempId)) {
      console.log(`🔍 ${tempId} is already a real ID`);
      return tempId;
    }
    
    // Otherwise, return the original ID (might be a temp ID with no mapping)
    return tempId;
  }

  // Execute a pending action
  private async executeAction(action: OfflineAction): Promise<void> {
    const { type, entity, data } = action;

    switch (entity) {
      case 'case':
        await this.executeCaseAction(type, data);
        break;
      case 'client':
        await this.executeClientAction(type, data);
        break;
      case 'hearing':
        await this.executeHearingAction(type, data);
        break;
      case 'task':
        await this.executeTaskAction(type, data);
        break;
      case 'lawyer':
        await this.executeLawyerAction(type, data);
        break;
      case 'lawyerDocument':
        await this.executeLawyerDocumentAction(type, data);
        break;
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  // Execute case actions
  private async executeCaseAction(type: string, data: any): Promise<void> {
    // Import dbService functions dynamically to avoid circular dependencies
    const { addCase, updateCase } = await import('./dbService');
    
    console.log(`Executing case ${type}:`, data);
    
    switch (type) {
      case 'create':
        await addCase(data);
        break;
      case 'update':
        if (!data.id) {
          throw new Error('Case ID is required for update');
        }
        // Get real ID if this is a temp ID
        const realCaseId = this.getRealId(data.id);
        console.log(`🔄 Updating case with ID: ${data.id} (real: ${realCaseId})`);
        
        // Update in Firestore using real ID
        await updateCase(realCaseId, data);
        break;
      case 'delete':
        if (!data.id) {
          throw new Error('Case ID is required for delete');
        }
        // Get real ID if this is a temp ID
        const realDeleteCaseId = this.getRealId(data.id);
        console.log(`🗑️ Deleting case with ID: ${data.id} (real: ${realDeleteCaseId})`);
        
        // Delete functionality not available in dbService, skip for now
        console.warn('Delete case action not implemented in dbService');
        break;
      default:
        throw new Error(`Unknown case action type: ${type}`);
    }
  }

  // Execute client actions
  private async executeClientAction(type: string, data: any): Promise<void> {
    // Import dbService functions dynamically to avoid circular dependencies
    const { addClient, updateClient } = await import('./dbService');
    
    console.log(`Executing client ${type}:`, data);
    
    switch (type) {
      case 'create':
        await addClient(data);
        break;
      case 'update':
        if (!data.id) {
          throw new Error('Client ID is required for update');
        }
        // Get real ID if this is a temp ID
        const realClientId = this.getRealId(data.id);
        console.log(`🔄 Updating client with ID: ${data.id} (real: ${realClientId})`);
        
        // Update in Firestore using real ID
        await updateClient(realClientId, data);
        break;
      case 'delete':
        if (!data.id) {
          throw new Error('Client ID is required for delete');
        }
        // Get real ID if this is a temp ID
        const realDeleteClientId = this.getRealId(data.id);
        console.log(`🗑️ Deleting client with ID: ${data.id} (real: ${realDeleteClientId})`);
        
        // Delete functionality not available in dbService, skip for now
        console.warn('Delete client action not implemented in dbService');
        break;
      default:
        throw new Error(`Unknown client action type: ${type}`);
    }
  }

  // Execute hearing actions
  private async executeHearingAction(type: string, data: any): Promise<void> {
    // Import dbService functions dynamically to avoid circular dependencies
    const { addHearing, updateHearing, deleteHearing } = await import('./dbService');
    
    console.log(`Executing hearing ${type}:`, data);
    
    switch (type) {
      case 'create':
        // Create hearing in Firebase and get the real ID
        const hearingId = await addHearing(data);
        console.log(`✅ Hearing created with Firebase ID: ${hearingId}`);
        
        // Find and update the temp ID in cache
        try {
          const cachedData = await this.getCachedData('hearings');
          console.log(`🔍 Cached hearings data:`, cachedData);
          console.log(`🔍 Looking for hearing with data:`, data);
          
          let tempIdToReplace: string | null = null;
          
          const updatedCache = cachedData.map((hearing: any) => {
            // Find the hearing with matching data (check both temp_hearing_ and any other ID)
            if (hearing.id) {
              const isMatchingHearing = (
                hearing.caseId === data.caseId &&
                hearing.date === data.date &&
                hearing.time === data.time &&
                hearing.type === data.type &&
                hearing.location === data.location
              );
              
              console.log(`🔍 Checking hearing ${hearing.id}:`, {
                caseId: hearing.caseId,
                date: hearing.date,
                time: hearing.time,
                type: hearing.type,
                location: hearing.location,
                isMatch: isMatchingHearing
              });
              
              if (isMatchingHearing) {
                tempIdToReplace = hearing.id;
                console.log(`🔄 Found matching temp ID: ${tempIdToReplace}`);
                console.log(`🔄 Hearing ID type check: ${hearing.id.startsWith('temp_hearing_') ? 'temp' : 'other'}`);
                return { ...hearing, id: hearingId, _synced: true };
              }
            }
            return hearing;
          });
          
          // Store the mapping
          if (tempIdToReplace) {
            this.tempIdMap.set(tempIdToReplace, hearingId);
            console.log(`📍 Stored ID mapping: ${tempIdToReplace} -> ${hearingId}`);
            console.log(`📍 Current tempIdMap size: ${this.tempIdMap.size}`);
          } else {
            console.warn(`⚠️ No matching hearing found in cache for data:`, data);
          }
          
          await this.cacheData('hearings', updatedCache);
          console.log('✅ Updated local cache with real Firebase ID');
        } catch (cacheError) {
          console.warn('⚠️ Failed to update local cache:', cacheError);
        }
        break;
      case 'update':
        if (!data.id) {
          throw new Error('Hearing ID is required for update');
        }
        // Get real ID if this is a temp ID
        const realUpdateId = this.getRealId(data.id);
        console.log(`🔄 Updating hearing with ID: ${data.id} (real: ${realUpdateId})`);
        
        try {
          // Try to update in Firestore using real ID
          await updateHearing(realUpdateId, data);
        } catch (error: any) {
          // If document doesn't exist, create it instead with the specific ID
          if (error.message?.includes('No document to update') || error.code === 'not-found') {
            console.log(`📝 Document ${realUpdateId} not found, creating instead...`);
            
            // Import doc function to create with specific ID
            const { doc, setDoc } = await import('firebase/firestore');
            const { db } = await import('./firebaseConfig');
            
            // Create document with specific ID (without the id field in the data)
            const { id, ...hearingData } = data;
            await setDoc(doc(db, "hearings", realUpdateId), hearingData);
            console.log(`✅ Created hearing document with ID: ${realUpdateId}`);
            
            // Update local cache to include the newly created document
            try {
              const cachedHearings = await this.getCachedData('hearings') || [];
              const updatedHearing = { id: realUpdateId, ...hearingData };
              const updatedCache = cachedHearings.map(h => 
                h.id === data.id ? updatedHearing : h
              );
              await this.cacheData('hearings', updatedCache);
              console.log('✅ Updated local cache with newly created hearing');
              
              // Trigger sync completion notification to update UI
              this.notifySyncCompleted();
            } catch (cacheError) {
              console.warn('⚠️ Failed to update local cache:', cacheError);
            }
          } else {
            // Re-throw other errors
            throw error;
          }
        }
        break;
      case 'delete':
        if (!data.id) {
          throw new Error('Hearing ID is required for delete');
        }
        // Get real ID if this is a temp ID
        const realId = this.getRealId(data.id);
        console.log(`🗑️ Deleting hearing with ID: ${data.id} (real: ${realId})`);
        
        // Delete from Firestore using real ID
        await deleteHearing(realId);
        break;
      default:
        throw new Error(`Unknown hearing action type: ${type}`);
    }
  }

  // Execute task actions
  private async executeTaskAction(type: string, data: any): Promise<void> {
    // Import dbService functions dynamically to avoid circular dependencies
    const { addTask, updateTask, deleteTask } = await import('./dbService');
    
    console.log(`Executing task ${type}:`, data);
    
    switch (type) {
      case 'create':
        await addTask(data);
        break;
      case 'update':
        if (!data.id) {
          throw new Error('Task ID is required for update');
        }
        // Get real ID if this is a temp ID
        const realTaskId = this.getRealId(data.id);
        console.log(`🔄 Updating task with ID: ${data.id} (real: ${realTaskId})`);
        
        // Safety check: verify task exists before updating
        try {
          const { db } = await import('./firebaseConfig');
          const { doc, getDoc } = await import('firebase/firestore');
          const taskDoc = await getDoc(doc(db, "tasks", realTaskId));
          if (!taskDoc.exists()) {
            console.warn(`⚠️ Task ${realTaskId} not found in Firebase, skipping update`);
            throw new Error(`Task ${realTaskId} not found`);
          }
        } catch (error) {
          if (error.message.includes('not found')) {
            throw error;
          }
          // If we can't verify, proceed with update (might be permission issue)
          console.warn(`⚠️ Could not verify task existence, proceeding with update:`, error);
        }
        
        // Update in Firestore using real ID
        await updateTask(realTaskId, data);
        break;
      case 'delete':
        if (!data.id) {
          throw new Error('Task ID is required for delete');
        }
        // Get real ID if this is a temp ID
        const realDeleteTaskId = this.getRealId(data.id);
        console.log(`🗑️ Deleting task with ID: ${data.id} (real: ${realDeleteTaskId})`);
        
        // Delete from Firestore using real ID
        await deleteTask(realDeleteTaskId);
        break;
      default:
        throw new Error(`Unknown task action type: ${type}`);
    }
  }

  // Execute lawyer actions
  private async executeLawyerAction(type: string, data: any): Promise<void> {
    // Import dbService functions dynamically to avoid circular dependencies
    const { createLawyer, updateLawyer, deleteLawyer } = await import('./dbService');
    
    console.log(`Executing lawyer ${type}:`, data);
    
    switch (type) {
      case 'create':
        const lawyerId = await createLawyer(data);
        
        // Update tempIdMap if this was a temp ID
        const tempId = data.tempId;
        if (tempId && tempId.startsWith('temp_lawyer_')) {
          this.tempIdMap.set(tempId, lawyerId);
          console.log(`📍 Stored lawyer ID mapping: ${tempId} -> ${lawyerId}`);
          console.log(`📍 Current tempIdMap size: ${this.tempIdMap.size}`);
        }
        break;
      case 'update':
        if (!data.id) {
          throw new Error('Lawyer ID is required for update');
        }
        // Get real ID if this is a temp ID
        const realLawyerId = this.getRealId(data.id);
        console.log(`🔄 Updating lawyer with ID: ${data.id} (real: ${realLawyerId})`);
        
        // Update in Firestore using real ID
        await updateLawyer(realLawyerId, data);
        break;
      case 'delete':
        if (!data.id) {
          throw new Error('Lawyer ID is required for delete');
        }
        // Get real ID if this is a temp ID
        const realDeleteLawyerId = this.getRealId(data.id);
        console.log(`🗑️ Deleting lawyer with ID: ${data.id} (real: ${realDeleteLawyerId})`);
        
        // Delete from Firestore using real ID
        await deleteLawyer(realDeleteLawyerId);
        break;
      default:
        throw new Error(`Unknown lawyer action type: ${type}`);
    }
  }

  // Execute lawyer document actions
  private async executeLawyerDocumentAction(type: string, data: any): Promise<void> {
    console.log(`Executing lawyer document ${type}:`, data);
    
    // For lawyer documents, we need to handle the special data structure
    if (type === 'create' && data.lawyerId && data.document) {
      // This is a lawyer document creation
      // We need to update the lawyer's documents array
      const { updateLawyer } = await import('./dbService');
      
      // Get the current lawyer data
      const realLawyerId = this.getRealId(data.lawyerId);
      console.log(`🔄 Adding document to lawyer with ID: ${data.lawyerId} (real: ${realLawyerId})`);
      
      // Update lawyer with new document
      await updateLawyer(realLawyerId, {
        documents: [data.document]
      });
    } else {
      throw new Error(`Invalid lawyer document action data: ${JSON.stringify(data)}`);
    }
  }

  // Update pending action
  private async updatePendingAction(action: OfflineAction): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    store.put(action);
  }

  // Log sync action
  private async logSyncAction(action: OfflineAction, status: 'success' | 'failed', error?: any): Promise<void> {
    if (!this.db) await this.initDB();

    const logEntry = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actionId: action.id,
      status,
      error: error?.message || null,
      timestamp: new Date().toISOString()
    };

    const transaction = this.db!.transaction(['syncLog'], 'readwrite');
    const store = transaction.objectStore('syncLog');
    store.add(logEntry);
  }

  // Get current offline status
  async getOfflineStatus(): Promise<OfflineStatus> {
    const pendingActions = await this.getPendingActions();
    
    const cachedData = {
      cases: (await this.getCachedData('cases')).length,
      clients: (await this.getCachedData('clients')).length,
      hearings: (await this.getCachedData('hearings')).length,
      tasks: (await this.getCachedData('tasks')).length
    };

    return {
      online: navigator.onLine,
      pendingActions: pendingActions.length,
      lastSync: await this.getLastSyncTime(),
      cachedData
    };
  }

  // Get last sync time
  private async getLastSyncTime(): Promise<string | null> {
    if (!this.db) await this.initDB();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['syncLog'], 'readonly');
      const store = transaction.objectStore('syncLog');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && cursor.value.status === 'success') {
          resolve(cursor.value.timestamp);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  // Subscribe to status changes
  onStatusChange(callback: (status: OfflineStatus) => void): void {
    this.listeners.push(callback);
  }

  // Notify all listeners of status change
  private notifyStatusChange(): void {
    this.getOfflineStatus().then(status => {
      this.listeners.forEach(callback => callback(status));
    });
  }

  // Clear all cached data
  async clearCache(): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['cachedData'], 'readwrite');
    const store = transaction.objectStore('cachedData');
    store.clear();

    console.log('Cleared all cached data');
    this.notifyStatusChange();
  }

  // Clear all pending actions
  async clearPendingActions(): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    store.clear();

    console.log('Cleared all pending actions');
    this.notifyStatusChange();
  }

  // Clear all cached data and pending actions
  async clearAllData(): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['cachedData', 'pendingActions'], 'readwrite');
    const cachedStore = transaction.objectStore('cachedData');
    const pendingStore = transaction.objectStore('pendingActions');
    
    cachedStore.clear();
    pendingStore.clear();

    console.log('Cleared all cached data and pending actions');
    this.notifyStatusChange();
  }

  // Export data for backup
  async exportData(): Promise<any> {
    const cachedData = {
      cases: await this.getCachedData('cases'),
      clients: await this.getCachedData('clients'),
      hearings: await this.getCachedData('hearings'),
      tasks: await this.getCachedData('tasks')
    };

    const pendingActions = await this.getPendingActions();

    return {
      cachedData,
      pendingActions,
      exportDate: new Date().toISOString()
    };
  }

  // Import data from backup
  async importData(data: any): Promise<void> {
    const { cachedData, pendingActions } = data;

    // Import cached data
    for (const [type, items] of Object.entries(cachedData)) {
      await this.cacheData(type, items as any[]);
    }

    // Import pending actions
    for (const action of pendingActions) {
      await this.addPendingAction(action);
    }

    console.log('Data imported successfully');
    this.notifyStatusChange();
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();

// React hook for offline status (to be used in React components)
export function createOfflineStatusHook() {
  const { useState, useEffect } = require('react');
  
  return () => {
    const [status, setStatus] = useState(null);

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
}
