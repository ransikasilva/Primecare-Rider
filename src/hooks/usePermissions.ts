import { useState, useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';

export interface PermissionStatus {
  camera: boolean;
  location: boolean;
  backgroundLocation: boolean;
  loading: boolean;
  error: string | null;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: false,
    location: false,
    backgroundLocation: false,
    loading: true,
    error: null,
  });

  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
        setPermissions(prev => ({ ...prev, camera: true }));
        return true;
      } else if (status === 'denied') {
        Alert.alert(
          'Camera Permission Required',
          'TransFleet Rider needs camera access to scan QR codes and take package photos. Please enable camera permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
      return false;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setPermissions(prev => ({ ...prev, error: 'Failed to request camera permission' }));
      return false;
    }
  };

  const checkLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === Location.PermissionStatus.GRANTED;
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === Location.PermissionStatus.GRANTED) {
        setPermissions(prev => ({ ...prev, location: true }));
        return true;
      } else {
        Alert.alert(
          'Location Permission Required',
          'TransFleet Rider needs location access for navigation and delivery tracking. Please enable location permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
      return false;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setPermissions(prev => ({ ...prev, error: 'Failed to request location permission' }));
      return false;
    }
  };

  const checkBackgroundLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      return status === Location.PermissionStatus.GRANTED;
    } catch (error) {
      console.error('Error checking background location permission:', error);
      return false;
    }
  };

  const requestBackgroundLocationPermission = async (): Promise<boolean> => {
    try {
      // First ensure foreground permission is granted
      const foregroundStatus = await checkLocationPermission();
      if (!foregroundStatus) {
        const granted = await requestLocationPermission();
        if (!granted) return false;
      }

      const { status } = await Location.requestBackgroundPermissionsAsync();
      
      if (status === Location.PermissionStatus.GRANTED) {
        setPermissions(prev => ({ ...prev, backgroundLocation: true }));
        return true;
      } else {
        Alert.alert(
          'Background Location Permission',
          'For accurate delivery tracking, TransFleet Rider needs background location access. This helps hospitals track delivery progress even when the app is minimized.',
          [
            { text: 'Skip for Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
      return false;
    } catch (error) {
      console.error('Error requesting background location permission:', error);
      setPermissions(prev => ({ ...prev, error: 'Failed to request background location permission' }));
      return false;
    }
  };

  const checkAllPermissions = async () => {
    setPermissions(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [cameraStatus, locationStatus, backgroundLocationStatus] = await Promise.all([
        checkCameraPermission(),
        checkLocationPermission(),
        checkBackgroundLocationPermission(),
      ]);

      setPermissions({
        camera: cameraStatus,
        location: locationStatus,
        backgroundLocation: backgroundLocationStatus,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissions(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to check permissions',
      }));
    }
  };

  const requestAllPermissions = async () => {
    setPermissions(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Request camera permission
      await requestCameraPermission();
      
      // Request location permissions
      await requestLocationPermission();
      
      // Request background location (optional)
      await requestBackgroundLocationPermission();

      // Re-check all permissions
      await checkAllPermissions();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissions(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to request permissions',
      }));
    }
  };

  useEffect(() => {
    checkAllPermissions();
  }, []);

  return {
    permissions,
    checkCameraPermission,
    requestCameraPermission,
    checkLocationPermission,
    requestLocationPermission,
    checkBackgroundLocationPermission,
    requestBackgroundLocationPermission,
    checkAllPermissions,
    requestAllPermissions,
  };
};