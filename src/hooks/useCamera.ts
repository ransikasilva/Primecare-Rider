import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export interface CameraState {
  hasPermission: boolean;
  isReady: boolean;
  isRecording: boolean;
  flashMode: boolean;
  type: CameraType;
  loading: boolean;
  error: string | null;
}

export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
  base64?: string;
  fileSize: number;
}

export const useCamera = () => {
  const [cameraState, setCameraState] = useState<CameraState>({
    hasPermission: false,
    isReady: false,
    isRecording: false,
    flashMode: false,
    type: CameraType.back,
    loading: false,
    error: null,
  });

  const cameraRef = useRef<Camera>(null);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      setCameraState(prev => ({ ...prev, loading: true, error: null }));

      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      const hasPermissions = 
        cameraPermission.status === 'granted' && 
        mediaLibraryPermission.status === 'granted';

      setCameraState(prev => ({
        ...prev,
        hasPermission: hasPermissions,
        loading: false,
      }));

      if (!hasPermissions) {
        Alert.alert(
          'Camera Permissions Required',
          'TransFleet Rider needs camera and photo library access to take and save package photos for delivery confirmation.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => requestPermissions() },
          ]
        );
      }

      return hasPermissions;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      setCameraState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to request camera permissions',
      }));
      return false;
    }
  };

  const takePicture = async (options?: {
    quality?: number;
    base64?: boolean;
    skipProcessing?: boolean;
    maxWidth?: number;
    maxHeight?: number;
  }): Promise<PhotoResult | null> => {
    try {
      if (!cameraRef.current || !cameraState.hasPermission) {
        Alert.alert('Error', 'Camera is not ready or permission not granted');
        return null;
      }

      setCameraState(prev => ({ ...prev, loading: true, error: null }));

      const photo = await cameraRef.current.takePictureAsync({
        quality: options?.quality || 0.8,
        base64: options?.base64 || false,
        skipProcessing: options?.skipProcessing || false,
        ...options,
      });

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(photo.uri);
      
      const result: PhotoResult = {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        base64: photo.base64,
        fileSize: fileInfo.exists ? fileInfo.size || 0 : 0,
      };

      setCameraState(prev => ({ ...prev, loading: false }));

      // Log photo info in development
      if (__DEV__) {
        console.log('📸 Photo taken:', {
          size: `${result.width}x${result.height}`,
          fileSize: `${(result.fileSize / 1024).toFixed(1)}KB`,
        });
      }

      return result;
    } catch (error) {
      console.error('Error taking picture:', error);
      setCameraState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to take picture',
      }));
      
      Alert.alert(
        'Camera Error',
        'Failed to take picture. Please try again.',
        [{ text: 'OK' }]
      );
      
      return null;
    }
  };

  const pickImageFromGallery = async (options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
    base64?: boolean;
  }): Promise<PhotoResult | null> => {
    try {
      setCameraState(prev => ({ ...prev, loading: true, error: null }));

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options?.allowsEditing ?? true,
        aspect: options?.aspect || [4, 3],
        quality: options?.quality || 0.8,
        base64: options?.base64 || false,
      });

      setCameraState(prev => ({ ...prev, loading: false }));

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      
      const photoResult: PhotoResult = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        base64: asset.base64,
        fileSize: fileInfo.exists ? fileInfo.size || 0 : 0,
      };

      if (__DEV__) {
        console.log('🖼️ Image picked from gallery:', {
          size: `${photoResult.width}x${photoResult.height}`,
          fileSize: `${(photoResult.fileSize / 1024).toFixed(1)}KB`,
        });
      }

      return photoResult;
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      setCameraState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to pick image from gallery',
      }));
      
      Alert.alert(
        'Gallery Error',
        'Failed to pick image from gallery. Please try again.',
        [{ text: 'OK' }]
      );
      
      return null;
    }
  };

  const compressImage = async (
    uri: string,
    options?: {
      compress?: number;
      width?: number;
      height?: number;
    }
  ): Promise<string | null> => {
    try {
      const manipulateOptions: any[] = [];
      
      if (options?.width || options?.height) {
        manipulateOptions.push({
          resize: {
            width: options.width,
            height: options.height,
          },
        });
      }

      const result = await ImagePicker.manipulateAsync(
        uri,
        manipulateOptions,
        {
          compress: options?.compress || 0.7,
          format: ImagePicker.SaveFormat.JPEG,
        }
      );

      if (__DEV__) {
        const originalInfo = await FileSystem.getInfoAsync(uri);
        const compressedInfo = await FileSystem.getInfoAsync(result.uri);
        
        console.log('🗜️ Image compressed:', {
          original: `${((originalInfo.size || 0) / 1024).toFixed(1)}KB`,
          compressed: `${((compressedInfo.size || 0) / 1024).toFixed(1)}KB`,
          savings: `${(((originalInfo.size || 0) - (compressedInfo.size || 0)) / (originalInfo.size || 1) * 100).toFixed(1)}%`,
        });
      }

      return result.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return null;
    }
  };

  const toggleFlash = () => {
    setCameraState(prev => ({ ...prev, flashMode: !prev.flashMode }));
  };

  const toggleCameraType = () => {
    setCameraState(prev => ({
      ...prev,
      type: prev.type === CameraType.back ? CameraType.front : CameraType.back,
    }));
  };

  const onCameraReady = () => {
    setCameraState(prev => ({ ...prev, isReady: true }));
  };

  const showImagePickerOptions = (): Promise<PhotoResult | null> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Photo',
        'Choose how you want to add a photo',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
          {
            text: 'Take Photo',
            onPress: async () => {
              const photo = await takePicture();
              resolve(photo);
            },
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              const photo = await pickImageFromGallery();
              resolve(photo);
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve(null) }
      );
    });
  };

  return {
    cameraState,
    cameraRef,
    requestPermissions,
    takePicture,
    pickImageFromGallery,
    compressImage,
    toggleFlash,
    toggleCameraType,
    onCameraReady,
    showImagePickerOptions,
  };
};