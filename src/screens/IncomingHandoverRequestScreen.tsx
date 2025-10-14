import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { ArrowLeft, Phone, MapPin, Clock, Package } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';

interface IncomingHandoverRequestScreenProps {
  orderId: string;
  fromRiderName: string;
  fromRiderPhone: string;
  handoverReason: string;
  meetupLocation: string;
  requestedTime: string;
  onBack: () => void;
  onAcceptHandover: () => void;
  onDeclineRequest: () => void;
  onCallRider: () => void;
}

const IncomingHandoverRequestScreen: React.FC<IncomingHandoverRequestScreenProps> = ({
  orderId,
  fromRiderName,
  fromRiderPhone,
  handoverReason,
  meetupLocation,
  requestedTime,
  onBack,
  onAcceptHandover,
  onDeclineRequest,
  onCallRider,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = () => {
    Alert.alert(
      'Accept Handover?',
      `Accept the handover request from ${fromRiderName}? You will need to meet them at the specified location.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setIsProcessing(true);
              const response = await apiService.acceptHandover(orderId);

              if (response.success) {
                onAcceptHandover();
              } else {
                Alert.alert('Error', response.message || 'Failed to accept handover');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to accept handover');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Handover?',
      'Are you sure you want to decline this handover request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          onPress: onDeclineRequest,
          style: 'destructive'
        }
      ]
    );
  };

  const handleCallRider = () => {
    Alert.alert(
      `Call ${fromRiderName}?`,
      `Contact: ${fromRiderPhone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const url = `tel:${fromRiderPhone}`;
            Linking.openURL(url).catch(() => {
              Alert.alert('Error', 'Unable to make phone call');
            });
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Handover Request</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <View style={styles.content}>
        {/* Request Alert */}
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>🔔 New Handover Request</Text>
          <Text style={styles.alertMessage}>
            {fromRiderName} needs you to take over their delivery
          </Text>
        </View>

        {/* Order Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Order Information</Text>
          
          <View style={styles.detailRow}>
            <Package size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailLabel}>Order ID:</Text>
            <Text style={styles.detailValue}>{orderId}</Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailLabel}>Requested:</Text>
            <Text style={styles.detailValue}>{requestedTime}</Text>
          </View>

          <View style={styles.detailRow}>
            <MapPin size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailLabel}>Meetup Location:</Text>
            <Text style={styles.detailValue}>{meetupLocation}</Text>
          </View>
        </View>

        {/* Handover Reason */}
        <View style={styles.reasonCard}>
          <Text style={styles.cardTitle}>Handover Reason</Text>
          <Text style={styles.reasonText}>{handoverReason}</Text>
        </View>

        {/* Rider Info */}
        <View style={styles.riderCard}>
          <Text style={styles.cardTitle}>Requesting Rider</Text>
          <View style={styles.riderInfo}>
            <Text style={styles.riderName}>{fromRiderName}</Text>
            <TouchableOpacity onPress={handleCallRider} style={styles.callButton}>
              <Phone size={16} color={COLORS.primary} />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          onPress={handleDecline} 
          style={styles.declineButton}
          disabled={isProcessing}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleAccept} 
          style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={[COLORS.success, '#2d8f47']}
            style={styles.acceptButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.acceptButtonText}>
              {isProcessing ? 'Processing...' : 'Accept Handover'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    ...SHADOWS.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.white,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  alertCard: {
    backgroundColor: COLORS.warning + '10',
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  alertTitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: SPACING.xs,
  },
  alertMessage: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  cardTitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  detailLabel: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  reasonCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  reasonText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  riderCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  riderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riderName: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.md,
    gap: SPACING.xs,
  },
  callButtonText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionSection: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    gap: SPACING.md,
    ...SHADOWS.lg,
  },
  declineButton: {
    flex: 1,
    backgroundColor: COLORS.gray200,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  acceptButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default IncomingHandoverRequestScreen;