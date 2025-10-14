import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocation } from '../hooks/useLocation';
import { queueAvailabilityUpdate } from '../services/offline';

interface AvailabilityToggleProps {
  isAvailable: boolean;
  onToggle: (available: boolean) => void;
  riderName: string;
}

export const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({
  isAvailable,
  onToggle,
  riderName,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { locationState, startTracking, stopTracking } = useLocation();

  const handleToggle = useCallback(async () => {
    const newStatus = !isAvailable;
    
    // Show confirmation for going offline
    if (isAvailable && !newStatus) {
      Alert.alert(
        'Go Offline?',
        'You will stop receiving new delivery requests. You can go back online anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go Offline', 
            style: 'destructive',
            onPress: () => performToggle(newStatus)
          },
        ]
      );
    } else {
      performToggle(newStatus);
    }
  }, [isAvailable]);

  const performToggle = async (newStatus: boolean) => {
    setIsLoading(true);
    Vibration.vibrate(50); // Haptic feedback

    try {
      if (newStatus) {
        // Going online - start location tracking
        const locationStarted = await startTracking({ 
          accuracy: 'high', 
          interval: 10000, // 10 seconds
          distanceInterval: 20 // 20 meters
        });
        
        if (!locationStarted) {
          Alert.alert(
            'Location Required',
            'Location access is required to receive delivery requests. Please enable location permissions.',
            [{ text: 'OK' }]
          );
          setIsLoading(false);
          return;
        }
      } else {
        // Going offline - stop location tracking
        await stopTracking();
      }

      // Queue the availability update (handles offline scenarios)
      await queueAvailabilityUpdate(newStatus);
      
      // Update UI
      onToggle(newStatus);
      
      // Show confirmation
      const statusMessage = newStatus 
        ? `Welcome back ${riderName}! You're now online and will receive delivery requests.`
        : 'You\'re now offline. You won\'t receive new delivery requests.';
        
      Alert.alert(
        newStatus ? 'You\'re Online!' : 'You\'re Offline',
        statusMessage,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error toggling availability:', error);
      Alert.alert(
        'Error',
        'Failed to update your status. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.compactToggle,
        isAvailable ? styles.onlineToggle : styles.offlineToggle,
        isLoading && styles.loadingToggle,
      ]}
      onPress={handleToggle}
      disabled={isLoading}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={isLoading ? 
          [COLORS.primary, COLORS.primaryDark] :
          isAvailable ? 
            [COLORS.success, '#4CAF50'] : 
            [COLORS.textSecondary, COLORS.gray400]
        }
        style={styles.toggleGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.white} />
            <Text style={styles.loadingText}>Updating...</Text>
          </View>
        ) : (
          <View style={styles.statusContainer}>
            {/* Status Icon */}
            <MaterialIcons 
              name={isAvailable ? 'radio-button-checked' : 'radio-button-unchecked'} 
              size={20} 
              color={COLORS.white} 
            />
            
            {/* Status Text */}
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                {isAvailable ? 'Online' : 'Offline'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isAvailable ? 'Receiving jobs' : 'Tap to go online'}
              </Text>
            </View>

            {/* Toggle Switch Visual */}
            <View style={[
              styles.switchContainer,
              isAvailable ? styles.switchOn : styles.switchOff
            ]}>
              <View style={[
                styles.switchThumb,
                isAvailable ? styles.thumbOn : styles.thumbOff
              ]} />
            </View>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  compactToggle: {
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  onlineToggle: {
    // Styling handled by gradient
  },
  offlineToggle: {
    // Styling handled by gradient  
  },
  loadingToggle: {
    // Styling handled by gradient
  },
  toggleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  statusTitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.white,
    fontWeight: '700',
  },
  statusSubtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  switchContainer: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    marginLeft: SPACING.md,
  },
  switchOn: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  switchOff: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  thumbOn: {
    backgroundColor: COLORS.white,
  },
  thumbOff: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});

export default AvailabilityToggle;