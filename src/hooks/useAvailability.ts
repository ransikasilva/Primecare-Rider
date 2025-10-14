import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useLocation } from './useLocation';
import { queueAvailabilityUpdate } from '../services/offline';

interface AvailabilityState {
  isAvailable: boolean;
  isLoading: boolean;
  lastUpdated: number | null;
  jobsReceived: number;
  onlineTime: number; // minutes online today
  error: string | null;
}

const STORAGE_KEY = '@primecare_rider_availability';

export const useAvailability = () => {
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>({
    isAvailable: false,
    isLoading: false,
    lastUpdated: null,
    jobsReceived: 0,
    onlineTime: 0,
    error: null,
  });

  const { startTracking, stopTracking, locationState } = useLocation();

  // Load saved availability state on app start
  useEffect(() => {
    loadAvailabilityState();
  }, []);

  // Track online time when available
  useEffect(() => {
    if (!availabilityState.isAvailable) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      setAvailabilityState(prev => ({
        ...prev,
        onlineTime: prev.onlineTime + 1, // Add 1 minute
      }));
    }, 60000); // Every minute

    return () => {
      clearInterval(interval);
      // Save the session time
      const sessionTime = Math.floor((Date.now() - startTime) / 60000);
      saveOnlineSession(sessionTime);
    };
  }, [availabilityState.isAvailable]);

  const loadAvailabilityState = async () => {
    try {
      const savedState = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setAvailabilityState(prev => ({
          ...prev,
          ...parsed,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error loading availability state:', error);
    }
  };

  const saveAvailabilityState = async (state: Partial<AvailabilityState>) => {
    try {
      const currentState = { ...availabilityState, ...state };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch (error) {
      console.error('Error saving availability state:', error);
    }
  };

  const saveOnlineSession = async (minutes: number) => {
    try {
      const sessionsKey = '@primecare_online_sessions';
      const today = new Date().toDateString();
      const sessions = await AsyncStorage.getItem(sessionsKey);
      const parsedSessions = sessions ? JSON.parse(sessions) : {};
      
      parsedSessions[today] = (parsedSessions[today] || 0) + minutes;
      await AsyncStorage.setItem(sessionsKey, JSON.stringify(parsedSessions));
    } catch (error) {
      console.error('Error saving online session:', error);
    }
  };

  const toggleAvailability = useCallback(async (riderName?: string): Promise<boolean> => {
    const newStatus = !availabilityState.isAvailable;
    
    setAvailabilityState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (newStatus) {
        // Going online
        const locationStarted = await startTracking({ 
          accuracy: 'high', 
          interval: 10000,
          distanceInterval: 20 
        });
        
        if (!locationStarted) {
          Alert.alert(
            'Location Required',
            'Location access is required to receive delivery requests. Please enable location permissions.',
            [{ text: 'OK' }]
          );
          setAvailabilityState(prev => ({ ...prev, isLoading: false }));
          return false;
        }

        // Show welcome message
        if (riderName) {
          Alert.alert(
            'You\'re Online!',
            `Welcome back ${riderName}! You're now online and will receive delivery requests.`,
            [{ text: 'Great!' }]
          );
        }
      } else {
        // Going offline
        await stopTracking();
        
        Alert.alert(
          'You\'re Offline',
          'You won\'t receive new delivery requests. You can go back online anytime.',
          [{ text: 'OK' }]
        );
      }

      // Queue the availability update
      await queueAvailabilityUpdate(newStatus);
      
      const updatedState = {
        isAvailable: newStatus,
        isLoading: false,
        lastUpdated: Date.now(),
      };

      setAvailabilityState(prev => ({ ...prev, ...updatedState }));
      await saveAvailabilityState(updatedState);

      return true;
    } catch (error) {
      console.error('Error toggling availability:', error);
      
      const errorMessage = 'Failed to update your status. Please try again.';
      setAvailabilityState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      return false;
    }
  }, [availabilityState.isAvailable, startTracking, stopTracking]);

  const goOnline = useCallback(async (riderName?: string) => {
    if (!availabilityState.isAvailable) {
      return await toggleAvailability(riderName);
    }
    return true;
  }, [availabilityState.isAvailable, toggleAvailability]);

  const goOffline = useCallback(async () => {
    if (availabilityState.isAvailable) {
      return await toggleAvailability();
    }
    return true;
  }, [availabilityState.isAvailable, toggleAvailability]);

  const incrementJobsReceived = useCallback(() => {
    setAvailabilityState(prev => {
      const newState = { ...prev, jobsReceived: prev.jobsReceived + 1 };
      saveAvailabilityState(newState);
      return newState;
    });
  }, []);

  const resetDailyStats = useCallback(() => {
    setAvailabilityState(prev => {
      const newState = { ...prev, jobsReceived: 0, onlineTime: 0 };
      saveAvailabilityState(newState);
      return newState;
    });
  }, []);

  const getAvailabilityMessage = useCallback(() => {
    if (availabilityState.isLoading) {
      return 'Updating status...';
    }
    
    if (availabilityState.isAvailable) {
      return locationState.isTracking 
        ? 'Online - Receiving requests' 
        : 'Online - Getting location...';
    }
    
    return 'Offline - Tap to go online';
  }, [availabilityState.isAvailable, availabilityState.isLoading, locationState.isTracking]);

  const getOnlineTime = useCallback(async (): Promise<number> => {
    try {
      const sessionsKey = '@primecare_online_sessions';
      const today = new Date().toDateString();
      const sessions = await AsyncStorage.getItem(sessionsKey);
      const parsedSessions = sessions ? JSON.parse(sessions) : {};
      
      return parsedSessions[today] || 0;
    } catch (error) {
      console.error('Error getting online time:', error);
      return 0;
    }
  }, []);

  return {
    availabilityState,
    toggleAvailability,
    goOnline,
    goOffline,
    incrementJobsReceived,
    resetDailyStats,
    getAvailabilityMessage,
    getOnlineTime,
    isOnline: availabilityState.isAvailable,
    isLoading: availabilityState.isLoading,
    hasLocationAccess: locationState.isTracking,
  };
};