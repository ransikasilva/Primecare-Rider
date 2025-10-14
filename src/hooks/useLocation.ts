import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { apiService } from '../services/api';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

export interface LocationState {
  currentLocation: LocationData | null;
  isTracking: boolean;
  error: string | null;
  accuracy: 'high' | 'balanced' | 'low';
  lastUpdated: number | null;
  updateInterval: number; // Current GPS update interval in ms
}

export const useLocation = () => {
  const [locationState, setLocationState] = useState<LocationState>({
    currentLocation: null,
    isTracking: false,
    error: null,
    accuracy: 'high',
    lastUpdated: null,
    updateInterval: 60000, // Default: 1 minute for normal online
  });

  const watchSubscription = useRef<Location.LocationSubscription | null>(null);
  const backgroundTaskRef = useRef<any>(null);
  const hasActiveOrderRef = useRef<boolean>(false);

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      setLocationState(prev => ({ ...prev, error: null }));

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude || undefined,
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
        timestamp: location.timestamp,
      };

      setLocationState(prev => ({
        ...prev,
        currentLocation: locationData,
        lastUpdated: Date.now(),
        error: null,
      }));

      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      
      setLocationState(prev => ({ ...prev, error: errorMessage }));
      
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please ensure location services are enabled and try again.',
        [{ text: 'OK' }]
      );
      
      return null;
    }
  };

  const startTracking = async (options?: {
    accuracy?: 'high' | 'balanced' | 'low';
    interval?: number;
    distanceInterval?: number;
    hasActiveOrder?: boolean; // NEW: Track if rider has active delivery
  }) => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        throw new Error('Location permission not granted');
      }

      // Stop existing tracking
      await stopTracking();

      const accuracy = options?.accuracy || 'high';
      const hasActiveOrder = options?.hasActiveOrder || false;

      // Smart interval based on rider status:
      // - Active delivery: 30 seconds (high priority)
      // - Normal online: 60 seconds (1 minute, low demand)
      let interval = options?.interval;
      if (!interval) {
        interval = hasActiveOrder ? 30000 : 60000; // 30s or 60s
      }

      const distanceInterval = options?.distanceInterval || 50; // 50 meters default

      // Store active order status
      hasActiveOrderRef.current = hasActiveOrder;

      let locationAccuracy: Location.Accuracy;
      switch (accuracy) {
        case 'high':
          locationAccuracy = Location.Accuracy.High;
          break;
        case 'balanced':
          locationAccuracy = Location.Accuracy.Balanced;
          break;
        case 'low':
          locationAccuracy = Location.Accuracy.Low;
          break;
        default:
          locationAccuracy = Location.Accuracy.High;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: locationAccuracy,
          timeInterval: interval,
          distanceInterval,
          mayShowUserSettingsDialog: true,
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude || undefined,
            speed: location.coords.speed || undefined,
            heading: location.coords.heading || undefined,
            timestamp: location.timestamp,
          };

          setLocationState(prev => ({
            ...prev,
            currentLocation: locationData,
            lastUpdated: Date.now(),
            error: null,
          }));

          // Send location update to backend
          apiService.updateRiderLocation(
            locationData.latitude,
            locationData.longitude,
            true // isAvailable = true when tracking is active
          ).catch(error => {
            console.error('Failed to update rider location:', error);
            // Don't show alert to user - this happens in background
          });

          if (__DEV__) {
            console.log('📍 Location Update Sent:', {
              lat: locationData.latitude.toFixed(6),
              lng: locationData.longitude.toFixed(6),
              accuracy: locationData.accuracy?.toFixed(2),
            });
          }
        }
      );

      watchSubscription.current = subscription;
      setLocationState(prev => ({
        ...prev,
        isTracking: true,
        accuracy,
        error: null,
        updateInterval: interval,
      }));

      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start tracking';
      
      setLocationState(prev => ({ ...prev, error: errorMessage, isTracking: false }));
      
      Alert.alert(
        'Tracking Error',
        'Unable to start location tracking. Please check your location settings.',
        [{ text: 'OK' }]
      );
      
      return false;
    }
  };

  const stopTracking = async () => {
    try {
      if (watchSubscription.current) {
        watchSubscription.current.remove();
        watchSubscription.current = null;
      }

      if (backgroundTaskRef.current) {
        await Location.stopLocationUpdatesAsync(backgroundTaskRef.current);
        backgroundTaskRef.current = null;
      }

      setLocationState(prev => ({ ...prev, isTracking: false }));
      hasActiveOrderRef.current = false;

      if (__DEV__) {
        console.log('📍 Location tracking stopped');
      }
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  };

  // NEW: Update tracking interval when rider accepts/completes order
  const updateTrackingInterval = async (hasActiveOrder: boolean) => {
    if (!locationState.isTracking) {
      return; // Not tracking, nothing to update
    }

    const newInterval = hasActiveOrder ? 30000 : 60000; // 30s or 60s

    if (newInterval === locationState.updateInterval) {
      return; // No change needed
    }

    // Restart tracking with new interval
    await startTracking({
      accuracy: locationState.accuracy,
      hasActiveOrder,
    });

    if (__DEV__) {
      console.log(`📍 GPS interval updated: ${hasActiveOrder ? '30s (active delivery)' : '60s (normal online)'}`);
    }
  };

  const startBackgroundTracking = async (taskName: string = 'RIDER_LOCATION_TRACKING') => {
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          'Background Location Required',
          'To track deliveries accurately, please enable "Always" location access in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.enableNetworkProviderAsync() },
          ]
        );
        return false;
      }

      await Location.startLocationUpdatesAsync(taskName, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // 10 seconds
        distanceInterval: 20, // 20 meters
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'TransFleet Delivery Tracking',
          notificationBody: 'Tracking your delivery location for hospital updates',
          notificationColor: '#4ECDC4',
        },
      });

      backgroundTaskRef.current = taskName;
      
      if (__DEV__) {
        console.log('📍 Background location tracking started');
      }
      
      return true;
    } catch (error) {
      console.error('Error starting background tracking:', error);
      Alert.alert(
        'Background Tracking Error',
        'Unable to start background location tracking. Some delivery features may be limited.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const stopBackgroundTracking = async () => {
    try {
      if (backgroundTaskRef.current) {
        await Location.stopLocationUpdatesAsync(backgroundTaskRef.current);
        backgroundTaskRef.current = null;
        
        if (__DEV__) {
          console.log('📍 Background location tracking stopped');
        }
      }
    } catch (error) {
      console.error('Error stopping background tracking:', error);
    }
  };

  const getDistance = (location1: LocationData, location2: LocationData): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((location2.latitude - location1.latitude) * Math.PI) / 180;
    const dLng = ((location2.longitude - location1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((location1.latitude * Math.PI) / 180) *
        Math.cos((location2.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
      stopBackgroundTracking();
    };
  }, []);

  return {
    locationState,
    getCurrentLocation,
    startTracking,
    stopTracking,
    updateTrackingInterval, // NEW: Allow updating GPS interval
    startBackgroundTracking,
    stopBackgroundTracking,
    getDistance,
    isLocationAvailable: !!locationState.currentLocation,
    locationAccuracy: locationState.currentLocation?.accuracy,
  };
};