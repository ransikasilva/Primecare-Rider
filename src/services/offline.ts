import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Offline storage keys
const OFFLINE_KEYS = {
  PENDING_ACTIONS: '@primecare_pending_actions',
  CACHED_DATA: '@primecare_cached_data',
  LAST_SYNC: '@primecare_last_sync',
  OFFLINE_MODE: '@primecare_offline_mode',
} as const;

export interface PendingAction {
  id: string;
  type: 'location_update' | 'job_status' | 'qr_scan' | 'photo_upload' | 'availability_update';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
}

export interface OfflineState {
  isOnline: boolean;
  isOfflineModeEnabled: boolean;
  pendingActionsCount: number;
  lastSyncTime: number | null;
}

class OfflineService {
  private static instance: OfflineService;
  private listeners: Set<(state: OfflineState) => void> = new Set();
  private currentState: OfflineState = {
    isOnline: true,
    isOfflineModeEnabled: false,
    pendingActionsCount: 0,
    lastSyncTime: null,
  };
  private syncInProgress = false;

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Listen for network state changes
    NetInfo.addEventListener(state => {
      const wasOnline = this.currentState.isOnline;
      this.currentState.isOnline = !!state.isConnected;

      if (!wasOnline && this.currentState.isOnline) {
        // Just came back online, attempt to sync
        this.syncPendingActions();
      }

      this.notifyListeners();
    });

    // Load offline state from storage
    await this.loadOfflineState();
  }

  private async loadOfflineState() {
    try {
      const [pendingActions, lastSync, offlineMode] = await Promise.all([
        this.getPendingActions(),
        AsyncStorage.getItem(OFFLINE_KEYS.LAST_SYNC),
        AsyncStorage.getItem(OFFLINE_KEYS.OFFLINE_MODE),
      ]);

      this.currentState.pendingActionsCount = pendingActions.length;
      this.currentState.lastSyncTime = lastSync ? parseInt(lastSync, 10) : null;
      this.currentState.isOfflineModeEnabled = offlineMode === 'true';

      this.notifyListeners();
    } catch (error) {
      console.error('Error loading offline state:', error);
    }
  }

  // Subscribe to offline state changes
  subscribe(listener: (state: OfflineState) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    listener(this.currentState);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        console.error('Error notifying offline state listener:', error);
      }
    });
  }

  // Queue action for offline execution
  async queueAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const pendingAction: PendingAction = {
        ...action,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const existingActions = await this.getPendingActions();
      existingActions.push(pendingAction);

      await AsyncStorage.setItem(
        OFFLINE_KEYS.PENDING_ACTIONS,
        JSON.stringify(existingActions)
      );

      this.currentState.pendingActionsCount = existingActions.length;
      this.notifyListeners();

      if (__DEV__) {
        console.log('📱 Action queued for offline sync:', pendingAction.type);
      }

      // If online, try to sync immediately
      if (this.currentState.isOnline) {
        this.syncPendingActions();
      }
    } catch (error) {
      console.error('Error queuing offline action:', error);
    }
  }

  // Get all pending actions
  private async getPendingActions(): Promise<PendingAction[]> {
    try {
      const actionsStr = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_ACTIONS);
      return actionsStr ? JSON.parse(actionsStr) : [];
    } catch (error) {
      console.error('Error getting pending actions:', error);
      return [];
    }
  }

  // Sync pending actions when online
  async syncPendingActions(): Promise<void> {
    if (this.syncInProgress || !this.currentState.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      const pendingActions = await this.getPendingActions();
      
      if (pendingActions.length === 0) {
        this.syncInProgress = false;
        return;
      }

      if (__DEV__) {
        console.log(`📡 Syncing ${pendingActions.length} pending actions...`);
      }

      const successfulActions: string[] = [];
      const failedActions: PendingAction[] = [];

      // Process actions sequentially to maintain order
      for (const action of pendingActions) {
        try {
          await this.executeAction(action);
          successfulActions.push(action.id);
          
          if (__DEV__) {
            console.log(`✅ Action synced: ${action.type}`);
          }
        } catch (error) {
          console.error(`❌ Action failed: ${action.type}`, error);
          
          action.retryCount++;
          
          if (action.retryCount < action.maxRetries) {
            failedActions.push(action);
          } else {
            if (__DEV__) {
              console.log(`🗑️ Action discarded after ${action.maxRetries} retries: ${action.type}`);
            }
          }
        }
      }

      // Update pending actions list
      await AsyncStorage.setItem(
        OFFLINE_KEYS.PENDING_ACTIONS,
        JSON.stringify(failedActions)
      );

      // Update sync time
      await AsyncStorage.setItem(
        OFFLINE_KEYS.LAST_SYNC,
        Date.now().toString()
      );

      this.currentState.pendingActionsCount = failedActions.length;
      this.currentState.lastSyncTime = Date.now();
      this.notifyListeners();

      if (__DEV__) {
        console.log(`📊 Sync complete: ${successfulActions.length} succeeded, ${failedActions.length} failed`);
      }
    } catch (error) {
      console.error('Error syncing pending actions:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Execute a single action
  private async executeAction(action: PendingAction): Promise<void> {
    // This would integrate with your API service
    // For now, we'll simulate the API call
    
    const { apiService } = await import('./api');
    
    switch (action.type) {
      case 'location_update':
        await apiService.updateLocation(action.data.latitude, action.data.longitude);
        break;
        
      case 'job_status':
        await apiService.updateJobStatus(action.data.jobId, action.data.status, action.data.data);
        break;
        
      case 'qr_scan':
        await apiService.scanQRCode(action.data.jobId, action.data.qrData);
        break;
        
      case 'photo_upload':
        await apiService.uploadPackagePhoto(action.data.jobId, action.data.photoUri);
        break;
        
      case 'availability_update':
        await apiService.updateAvailability(action.data.isAvailable);
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Cache data for offline access
  async cacheData(key: string, data: any, expirationMinutes: number = 60): Promise<void> {
    try {
      const cachedItem: CachedData = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (expirationMinutes * 60 * 1000),
      };

      const existingCache = await this.getCachedData();
      const filteredCache = existingCache.filter(item => item.key !== key);
      filteredCache.push(cachedItem);

      await AsyncStorage.setItem(
        OFFLINE_KEYS.CACHED_DATA,
        JSON.stringify(filteredCache)
      );

      if (__DEV__) {
        console.log(`💾 Data cached: ${key} (expires in ${expirationMinutes} minutes)`);
      }
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  // Get cached data
  async getCachedData(key?: string): Promise<CachedData[]> {
    try {
      const cacheStr = await AsyncStorage.getItem(OFFLINE_KEYS.CACHED_DATA);
      const cache: CachedData[] = cacheStr ? JSON.parse(cacheStr) : [];
      
      // Filter out expired items
      const now = Date.now();
      const validCache = cache.filter(item => item.expiresAt > now);
      
      // Update cache if we removed expired items
      if (validCache.length !== cache.length) {
        await AsyncStorage.setItem(
          OFFLINE_KEYS.CACHED_DATA,
          JSON.stringify(validCache)
        );
      }

      return key ? validCache.filter(item => item.key === key) : validCache;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return [];
    }
  }

  // Clear cached data
  async clearCache(key?: string): Promise<void> {
    try {
      if (key) {
        const cache = await this.getCachedData();
        const filteredCache = cache.filter(item => item.key !== key);
        await AsyncStorage.setItem(
          OFFLINE_KEYS.CACHED_DATA,
          JSON.stringify(filteredCache)
        );
      } else {
        await AsyncStorage.removeItem(OFFLINE_KEYS.CACHED_DATA);
      }

      if (__DEV__) {
        console.log(`🗑️ Cache cleared: ${key || 'all'}`);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Enable/disable offline mode
  async setOfflineMode(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_KEYS.OFFLINE_MODE, enabled.toString());
      this.currentState.isOfflineModeEnabled = enabled;
      this.notifyListeners();

      if (__DEV__) {
        console.log(`📴 Offline mode ${enabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      console.error('Error setting offline mode:', error);
    }
  }

  // Check if data is available (online or cached)
  async isDataAvailable(key: string): Promise<boolean> {
    if (this.currentState.isOnline) {
      return true;
    }

    const cachedData = await this.getCachedData(key);
    return cachedData.length > 0;
  }

  // Get current offline state
  getState(): OfflineState {
    return { ...this.currentState };
  }

  // Clear all offline data
  async clearAllOfflineData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        OFFLINE_KEYS.PENDING_ACTIONS,
        OFFLINE_KEYS.CACHED_DATA,
        OFFLINE_KEYS.LAST_SYNC,
        OFFLINE_KEYS.OFFLINE_MODE,
      ]);

      this.currentState.pendingActionsCount = 0;
      this.currentState.lastSyncTime = null;
      this.currentState.isOfflineModeEnabled = false;
      this.notifyListeners();

      if (__DEV__) {
        console.log('🗑️ All offline data cleared');
      }
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }
}

// Export singleton instance
export const offlineService = OfflineService.getInstance();

// Helper functions for common offline operations
export const queueLocationUpdate = (latitude: number, longitude: number) => {
  return offlineService.queueAction({
    type: 'location_update',
    data: { latitude, longitude },
    maxRetries: 3,
    endpoint: '/rider/location',
    method: 'POST',
  });
};

export const queueJobStatusUpdate = (jobId: string, status: string, data?: any) => {
  return offlineService.queueAction({
    type: 'job_status',
    data: { jobId, status, data },
    maxRetries: 5,
    endpoint: `/rider/jobs/${jobId}/status`,
    method: 'PUT',
  });
};

export const queueQRScan = (jobId: string, qrData: string) => {
  return offlineService.queueAction({
    type: 'qr_scan',
    data: { jobId, qrData },
    maxRetries: 3,
    endpoint: `/rider/jobs/${jobId}/scan-qr`,
    method: 'POST',
  });
};

export const queuePhotoUpload = (jobId: string, photoUri: string) => {
  return offlineService.queueAction({
    type: 'photo_upload',
    data: { jobId, photoUri },
    maxRetries: 3,
    endpoint: `/rider/jobs/${jobId}/photo`,
    method: 'POST',
  });
};

export const queueAvailabilityUpdate = (isAvailable: boolean) => {
  return offlineService.queueAction({
    type: 'availability_update',
    data: { isAvailable },
    maxRetries: 3,
    endpoint: '/rider/availability',
    method: 'PUT',
  });
};