import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { ArrowLeft, Hospital, MapPin, Package, CheckCircle, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';
import { locationService } from '../services/locationService';

interface DeliverToHospitalLabScreenProps {
  jobId: string;
  onBack: () => void;
  onCompleteDelivery: () => void;
  onScanQR: () => void;
  onEmergencyContact: () => void;
  onCallLab?: () => void;
  onReportIssue?: () => void;
}

interface OrderData {
  hospital_name: string;
  hospital_address: string;
  center_name: string;
  sample_type: string;
  urgency: string;
  estimated_distance_km: number;
  pickup_distance_km: number;
  delivery_distance_km: number;
  actual_distance_km: number;
  delivery_time: string;
  status: string;
}

const DeliverToHospitalLabScreen: React.FC<DeliverToHospitalLabScreenProps> = ({
  jobId,
  onBack,
  onCompleteDelivery,
}) => {
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setLoading(true);
        const response = await apiService.getOrderDetails(jobId);

        if (response.success && response.data) {
          const order = response.data.order || response.data;

          setOrderData({
            hospital_name: order.hospital_name || 'Hospital',
            hospital_address: order.hospital_address || order.delivery_location?.address || 'Hospital Address',
            center_name: order.center_name || 'Collection Center',
            sample_type: order.sample_type || 'Medical Samples',
            urgency: order.urgency || 'routine',
            estimated_distance_km: order.estimated_distance_km || 0,
            pickup_distance_km: order.pickup_distance_km || 0,
            delivery_distance_km: order.delivery_distance_km || 0,
            actual_distance_km: order.actual_distance_km || 0,
            delivery_time: new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }),
            status: order.status || 'picked_up',
          });
        }
      } catch (error) {
        console.error('Failed to load order data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrderData();
  }, [jobId]);

  const handleConfirmDelivery = async () => {
    Alert.alert(
      'Confirm Delivery',
      'Have you successfully delivered the samples to the hospital staff?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Delivery',
          onPress: async () => {
            // Stop background GPS tracking - delivery is complete
            await locationService.stopBackgroundOrderTracking();
            console.log('✅ Background GPS tracking stopped - delivery complete');

            // Complete delivery
            onCompleteDelivery();
          }
        },
      ]
    );
  };

  if (loading || !orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Confirmation</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: COLORS.textSecondary }}>Loading delivery information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Confirmation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Badge */}
        <View style={styles.successBadge}>
          <CheckCircle size={48} color={COLORS.success} />
          <Text style={styles.successTitle}>QR Code Scanned Successfully</Text>
          <Text style={styles.successSubtitle}>Ready to confirm delivery</Text>
        </View>

        {/* Hospital Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Hospital size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>DELIVERY LOCATION</Text>
          </View>

          <Text style={styles.hospitalName}>{orderData.hospital_name}</Text>
          <View style={styles.addressRow}>
            <MapPin size={16} color={COLORS.textSecondary} />
            <Text style={styles.address}>{orderData.hospital_address}</Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Arrival time: {orderData.delivery_time}</Text>
          </View>
        </View>

        {/* Delivery Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>DELIVERY SUMMARY</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Collection Center:</Text>
            <Text style={styles.summaryValue}>{orderData.center_name}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sample Type:</Text>
            <Text style={styles.summaryValue}>{orderData.sample_type}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Priority:</Text>
            <View style={[
              styles.priorityBadge,
              orderData.urgency === 'urgent' ? styles.urgentBadge : styles.routineBadge
            ]}>
              <Text style={[
                styles.priorityText,
                orderData.urgency === 'urgent' ? styles.urgentText : styles.routineText
              ]}>
                {orderData.urgency === 'urgent' ? 'URGENT' : 'ROUTINE'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pickup Distance:</Text>
            <Text style={styles.summaryValue}>
              {orderData.pickup_distance_km > 0 ? `${orderData.pickup_distance_km.toFixed(1)} km` : 'Calculating...'}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Distance:</Text>
            <Text style={styles.summaryValue}>
              {orderData.delivery_distance_km > 0 ? `${orderData.delivery_distance_km.toFixed(1)} km` : 'Calculating...'}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Distance:</Text>
            <Text style={[styles.summaryValue, { fontWeight: '700', color: COLORS.primary }]}>
              {orderData.actual_distance_km > 0 ? `${orderData.actual_distance_km.toFixed(1)} km` : `${orderData.estimated_distance_km.toFixed(1)} km (est.)`}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <CheckCircle size={14} color={COLORS.success} />
              <Text style={styles.statusText}>QR Code Verified</Text>
            </View>
          </View>
        </View>

        {/* Instructions Card */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Delivery Instructions</Text>
          <Text style={styles.instructionItem}>✓ QR code has been scanned and verified</Text>
          <Text style={styles.instructionItem}>✓ Confirm samples are handed to hospital staff</Text>
          <Text style={styles.instructionItem}>✓ Ensure proper handover documentation</Text>
          <Text style={styles.instructionItem}>✓ Click "Confirm Delivery" to complete</Text>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmDelivery}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.success, '#4CAF50']}
            style={styles.confirmButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <CheckCircle size={20} color={COLORS.white} />
            <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
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
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    ...SHADOWS.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  successBadge: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    marginBottom: SPACING.lg,
  },
  successTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  successSubtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  cardTitle: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.primary,
    fontWeight: '700',
  },
  hospitalName: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  address: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  summaryLabel: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  summaryValue: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
  },
  urgentBadge: {
    backgroundColor: COLORS.error + '15',
  },
  routineBadge: {
    backgroundColor: COLORS.primary + '15',
  },
  priorityText: {
    ...TYPOGRAPHY.styles.caption,
    fontWeight: '700',
  },
  urgentText: {
    color: COLORS.error,
  },
  routineText: {
    color: COLORS.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
    gap: SPACING.xs,
  },
  statusText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.success,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: COLORS.primary + '08',
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl * 2,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  instructionsTitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  instructionItem: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  bottomContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    ...SHADOWS.lg,
  },
  confirmButton: {
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  confirmButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default DeliverToHospitalLabScreen;
