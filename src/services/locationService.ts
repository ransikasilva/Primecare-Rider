import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { apiService } from './api';

const LOCATION_TASK_NAME = 'background-location-task';
const ORDER_TRACKING_TASK_NAME = 'order-location-tracking';

// Store current order ID for background tracking
let currentOrderId: string | null = null;

// Define background task for order location tracking
TaskManager.defineTask(ORDER_TRACKING_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (currentOrderId && location) {
      try {
        await apiService.trackLocation(
          currentOrderId,
          location.coords.latitude,
          location.coords.longitude
        );
        console.log('📍 Background location tracked for order:', currentOrderId);
      } catch (err) {
        console.error('Failed to track background location:', err);
      }
    }
  }
});

class LocationService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private isTracking = false;
  private lastKnownLocation: Location.LocationObject | null = null;
  private isBackgroundTracking = false;
  private trackingOrderId: string | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied');
        return false;
      }

      // Request background permissions
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.log('Background location permission denied, foreground only');
        // Still allow foreground tracking
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('❌ No location permissions');
        return null;
      }

      console.log('📍 Getting current location...');

      // Implement timeout with fallback - best practice for expo-location
      const TIMEOUT = 8000; // 8 seconds timeout

      const location = await Promise.race([
        // Try to get current position
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        // Fallback to last known position after timeout
        new Promise<Location.LocationObject>((resolve, reject) => {
          setTimeout(async () => {
            console.log('⏱️ getCurrentPosition timeout, using last known position');
            try {
              const lastKnown = await Location.getLastKnownPositionAsync({
                maxAge: 60000, // Accept location up to 1 minute old
                requiredAccuracy: 100, // 100 meters accuracy
              });
              if (lastKnown) {
                resolve(lastKnown);
              } else {
                reject(new Error('No last known position available'));
              }
            } catch (err) {
              reject(err);
            }
          }, TIMEOUT);
        }),
      ]);

      console.log('✅ Got location:', location.coords);
      this.lastKnownLocation = location;
      return location;
    } catch (error) {
      console.error('❌ Error getting current location:', error);

      // Final fallback to cached last known location
      if (this.lastKnownLocation) {
        console.log('📍 Using cached last known location');
        return this.lastKnownLocation;
      }

      // Try one more time with getLastKnownPositionAsync without timeout
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          console.log('📍 Using last known position from device (final fallback)');
          this.lastKnownLocation = lastKnown;
          return lastKnown;
        }
      } catch (fallbackError) {
        console.error('❌ Could not get last known position:', fallbackError);
      }

      return null;
    }
  }

  async startTracking(): Promise<boolean> {
    try {
      if (this.isTracking) {
        console.log('Location tracking already started');
        return true;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      // Get initial location
      const currentLocation = await this.getCurrentLocation();
      if (currentLocation) {
        // Update rider status with initial location
        await apiService.updateRiderStatus('available', {
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude
        });
      }

      // Start watching location changes
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 50, // Update when moved 50 meters
        },
        (location) => {
          this.lastKnownLocation = location;
          this.updateLocationOnServer(location);
        }
      );

      this.isTracking = true;
      console.log('Location tracking started');
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  async stopTracking(): Promise<void> {
    try {
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      this.isTracking = false;
      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  private async updateLocationOnServer(location: Location.LocationObject): Promise<void> {
    try {
      // Update rider status with current location
      await apiService.updateRiderStatus('available', {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });

      console.log('Location updated on server:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date(location.timestamp)
      });

      // Also track for order if we're tracking an order
      if (this.trackingOrderId) {
        await this.trackLocationForOrder(this.trackingOrderId);
      }
    } catch (error) {
      console.error('Error updating location on server:', error);
    }
  }

  async trackLocationForOrder(orderId: string): Promise<void> {
    try {
      if (!this.lastKnownLocation) {
        this.lastKnownLocation = await this.getCurrentLocation();
      }

      if (this.lastKnownLocation) {
        await apiService.trackLocation(
          orderId,
          this.lastKnownLocation.coords.latitude,
          this.lastKnownLocation.coords.longitude
        );
        console.log('📍 Order location tracked:', orderId);
      }
    } catch (error) {
      console.error('Error tracking location for order:', error);
    }
  }

  /**
   * Start background GPS tracking for an order
   * This continues even when app is closed/backgrounded
   */
  async startBackgroundOrderTracking(orderId: string): Promise<boolean> {
    try {
      console.log('🎯 Starting background tracking for order:', orderId);

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('❌ No location permissions for background tracking');
        return false;
      }

      // Set current order for background task
      currentOrderId = orderId;
      this.trackingOrderId = orderId;

      // Check if background location is already running
      const isRegistered = await TaskManager.isTaskRegisteredAsync(ORDER_TRACKING_TASK_NAME);

      if (isRegistered) {
        console.log('⚠️ Background task already registered, updating order ID');
        return true;
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(ORDER_TRACKING_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // Update every 30 seconds
        distanceInterval: 50, // Update when moved 50 meters
        foregroundService: {
          notificationTitle: 'TransFleet Delivery',
          notificationBody: 'Tracking your delivery route',
          notificationColor: '#4ECDC4',
        },
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.AutomotiveNavigation,
        showsBackgroundLocationIndicator: true,
      });

      this.isBackgroundTracking = true;
      console.log('✅ Background order tracking started');
      return true;
    } catch (error) {
      console.error('❌ Error starting background tracking:', error);
      return false;
    }
  }

  /**
   * Stop background GPS tracking for current order
   */
  async stopBackgroundOrderTracking(): Promise<void> {
    try {
      console.log('🛑 Stopping background order tracking');

      const isRegistered = await TaskManager.isTaskRegisteredAsync(ORDER_TRACKING_TASK_NAME);

      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(ORDER_TRACKING_TASK_NAME);
        console.log('✅ Background tracking stopped');
      }

      currentOrderId = null;
      this.trackingOrderId = null;
      this.isBackgroundTracking = false;
    } catch (error) {
      console.error('Error stopping background tracking:', error);
    }
  }

  /**
   * Check if currently tracking an order in background
   */
  isTrackingOrder(): boolean {
    return this.isBackgroundTracking && this.trackingOrderId !== null;
  }

  /**
   * Get current tracking order ID
   */
  getTrackingOrderId(): string | null {
    return this.trackingOrderId;
  }

  getLastKnownLocation(): Location.LocationObject | null {
    return this.lastKnownLocation;
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}

export const locationService = new LocationService();
export default locationService;
