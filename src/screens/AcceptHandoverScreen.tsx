import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { ArrowLeft, QrCode, Phone, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';

interface AcceptHandoverScreenProps {
  orderId: string;
  handoverId: string;
  fromRiderName: string;
  fromRiderPhone: string;
  meetupLocation: string;
  onBack: () => void;
  onScanQR: () => void;
  onCompleteHandover: () => void;
  onContactRider: () => void;
}

const AcceptHandoverScreen: React.FC<AcceptHandoverScreenProps> = ({
  orderId,
  handoverId,
  fromRiderName,
  fromRiderPhone,
  meetupLocation,
  onBack,
  onScanQR,
  onCompleteHandover,
  onContactRider,
}) => {
  const [qrScanned, setQrScanned] = useState(false);

  const handleQRScan = () => {
    setQrScanned(true);
    onScanQR();
    Alert.alert(
      'QR Code Scanned',
      'Package verified successfully. You can now complete the handover.',
      [{ text: 'OK' }]
    );
  };

  const handleCompleteHandover = () => {
    if (!qrScanned) {
      Alert.alert(
        'QR Scan Required',
        'Please scan the handover QR code before completing the handover.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Complete Handover?',
      'Confirm that you have received the package from the transferring rider.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const response = await apiService.confirmHandover(orderId, 'handover_qr_data');

              if (response.success) {
                onCompleteHandover();
              } else {
                Alert.alert('Error', response.message || 'Failed to complete handover');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to complete handover');
            }
          },
          style: 'default'
        }
      ]
    );
  };

  const handleContactRider = () => {
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
        <Text style={styles.headerTitle}>Accept Handover</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <View style={styles.content}>
        {/* Order Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Handover Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID:</Text>
            <Text style={styles.infoValue}>{orderId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>From Rider:</Text>
            <Text style={styles.infoValue}>{fromRiderName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{meetupLocation}</Text>
          </View>
        </View>

        {/* QR Scan Section */}
        <View style={styles.qrCard}>
          <Text style={styles.cardTitle}>Package Verification</Text>
          <Text style={styles.qrInstruction}>
            Scan the QR code shown by the transferring rider to verify the package
          </Text>
          
          <TouchableOpacity 
            onPress={handleQRScan} 
            style={[styles.qrButton, qrScanned && styles.qrButtonScanned]}
          >
            <QrCode size={24} color={qrScanned ? COLORS.success : COLORS.white} />
            <Text style={[styles.qrButtonText, qrScanned && styles.qrButtonTextScanned]}>
              {qrScanned ? 'QR Code Scanned ✓' : 'Scan Handover QR'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contact Section */}
        <View style={styles.contactCard}>
          <Text style={styles.cardTitle}>Contact Rider</Text>
          <TouchableOpacity onPress={handleContactRider} style={styles.contactButton}>
            <Phone size={20} color={COLORS.primary} />
            <Text style={styles.contactButtonText}>Call {fromRiderName}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Complete Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          onPress={handleCompleteHandover} 
          style={[styles.completeButton, !qrScanned && styles.completeButtonDisabled]}
        >
          <LinearGradient
            colors={qrScanned ? [COLORS.success, '#2d8f47'] : [COLORS.gray400, COLORS.gray500]}
            style={styles.completeButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.completeButtonText}>Complete Handover</Text>
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
  infoCard: {
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  infoLabel: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  qrCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  qrInstruction: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.sm,
  },
  qrButtonScanned: {
    backgroundColor: COLORS.success + '20',
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  qrButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '600',
  },
  qrButtonTextScanned: {
    color: COLORS.success,
  },
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.sm,
  },
  contactButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.primary,
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    ...SHADOWS.lg,
  },
  completeButton: {
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 18,
  },
});

export default AcceptHandoverScreen;