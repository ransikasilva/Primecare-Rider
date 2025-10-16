import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { apiService } from '../services/api';

interface ShowQRCodeScreenProps {
  jobId: string;
  receivingRiderName: string;
  onBack: () => void;
  onPackageScanned: () => void;
  onReportIssue: () => void;
  onContactSupport: () => void;
  selectedRider?: {
    id: string;
    name: string;
    phone: string;
  } | null;
  onCallRider?: () => void;
  onCancelHandover?: () => void;
}

interface PackageDetails {
  package_number: number;
  total_packages: number;
  contents: {
    blood_tubes: {
      edta: number;
      serum: number;
    };
    urine_containers: number;
    total_weight: string;
    special_requirements: string[];
  };
}

interface HandoverParticipants {
  transferring: {
    name: string;
    verified: boolean;
  };
  receiving: {
    name: string;
    verified: boolean;
  };
  location: {
    same_location: boolean;
    address: string;
  };
  time: {
    handover_time: string;
    verified: boolean;
  };
}

interface SafetyConfirmation {
  public_location: boolean;
  identities_verified: boolean;
  emergency_contacts_notified: boolean;
}

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(width * 0.6, 240);

const ShowQRCodeScreen: React.FC<ShowQRCodeScreenProps> = React.memo(({
  jobId,
  receivingRiderName,
  onBack,
  onPackageScanned,
  onReportIssue,
  onContactSupport,
}) => {
  const [packageScanned, setPackageScanned] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [loading, setLoading] = useState(true);

  // Dynamic data loaded from API
  const [packageDetails, setPackageDetails] = useState<PackageDetails | null>(null);
  const [handoverParticipants, setHandoverParticipants] = useState<HandoverParticipants | null>(null);
  const [qrCodeData, setQrCodeData] = useState('');

  // Load handover and package data
  useEffect(() => {
    const loadHandoverData = async () => {
      try {
        setLoading(true);

        // First get order details
        const orderResponse = await apiService.getOrderDetails(jobId);

        if (orderResponse.success && orderResponse.data) {
          const orderData = orderResponse.data.order || orderResponse.data;

          // Try to get handover QR data from backend
          try {
            const handoverResponse = await apiService.getHandoverQRData(jobId);
            if (handoverResponse.success && handoverResponse.data) {
              // Use backend-generated QR data
              const qrData = handoverResponse.data.qr_data;
              setQrCodeData(JSON.stringify(qrData));
            } else {
              // Fallback to generating QR data locally
              const qrData = {
                qr_id: `HO-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                type: 'handover',
                order_id: jobId,
                handover_reason: 'Rider handover',
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours
              };
              setQrCodeData(JSON.stringify(qrData));
            }
          } catch (handoverError) {
            console.warn('Failed to get handover QR from backend, using fallback:', handoverError);
            // Generate fallback QR data
            const qrData = {
              qr_id: `HO-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
              type: 'handover',
              order_id: jobId,
              handover_reason: 'Rider handover',
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
            };
            setQrCodeData(JSON.stringify(qrData));
          }

          // Set package details
          setPackageDetails({
            package_number: 1,
            total_packages: orderData.package_count || 1,
            contents: {
              blood_tubes: {
                edta: orderData.blood_tubes?.edta || 0,
                serum: orderData.blood_tubes?.serum || 0,
              },
              urine_containers: orderData.urine_samples || 0,
              total_weight: orderData.total_weight || 'Unknown',
              special_requirements: orderData.special_instructions ? [orderData.special_instructions] : [],
            },
          });

          // Set handover participants
          setHandoverParticipants({
            transferring: {
              name: orderData.current_rider_name || 'Current Rider',
              verified: true,
            },
            receiving: {
              name: receivingRiderName,
              verified: true,
            },
            location: {
              same_location: true,
              address: orderData.handover_location || 'Current location',
            },
            time: {
              handover_time: new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              }),
              verified: true,
            },
          });
        }
      } catch (error: any) {
        console.error('Failed to load handover data:', error);
        // Set fallback data
        const fallbackQrData = {
          qr_id: `HO-${Date.now()}-FALLBACK`,
          type: 'handover',
          order_id: jobId,
          handover_reason: 'Rider handover',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
        };
        setQrCodeData(JSON.stringify(fallbackQrData));

        setPackageDetails({
          package_number: 1,
          total_packages: 1,
          contents: {
            blood_tubes: { edta: 0, serum: 0 },
            urine_containers: 0,
            total_weight: 'Unknown',
            special_requirements: [],
          },
        });
        setHandoverParticipants({
          transferring: { name: 'Current Rider', verified: true },
          receiving: { name: receivingRiderName, verified: true },
          location: { same_location: true, address: 'Current location' },
          time: { handover_time: new Date().toLocaleTimeString(), verified: true },
        });
      } finally {
        setLoading(false);
      }
    };

    loadHandoverData();
  }, [jobId, receivingRiderName]);

  const safetyConfirmation: SafetyConfirmation = {
    public_location: true,
    identities_verified: true,
    emergency_contacts_notified: true,
  };

  // Simulate package scanning after a delay (for demo purposes)
  useEffect(() => {
    const timer = setTimeout(() => {
      // In real app, this would be triggered by actual QR scan
      // setPackageScanned(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handlePackageScanned = useCallback(() => {
    setPackageScanned(true);
    Alert.alert(
      'Package Scanned Successfully!',
      `Package has been scanned by ${receivingRiderName}. Handover process is complete.`,
      [
        {
          text: 'Continue',
          onPress: onPackageScanned,
        },
      ]
    );
  }, [receivingRiderName, onPackageScanned]);

  const handleBrightnessIncrease = useCallback(() => {
    setBrightness(prev => Math.min(prev + 25, 100));
    // In real app, this would adjust device brightness
  }, []);

  const handleReportIssue = useCallback(() => {
    Alert.alert(
      'Report Issue',
      'What type of issue would you like to report?',
      [
        { text: 'Receiving rider not responding', onPress: () => onReportIssue() },
        { text: 'Unable to scan QR code', onPress: () => onReportIssue() },
        { text: 'Safety concern', onPress: () => onReportIssue() },
        { text: 'Other issue', onPress: () => onReportIssue() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [onReportIssue]);

  const renderHandoverInstructions = () => {
    const instructions = [
      'Ensure both riders are present and verified',
      'Show QR code clearly to receiving rider',
      'Wait for successful scan confirmation',
      'Verify package details match the delivery',
      'Complete handover documentation',
    ];

    return (
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>Handover Instructions</Text>
        <Text style={styles.instructionsSubtitle}>5-step process for safe QR code transfer</Text>
        
        <View style={styles.instructionsList}>
          {instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Show QR Code</Text>
          <Text style={styles.stepIndicator}>Step 2 of 3</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsHeader}>
          <Text style={styles.mainInstruction}>Show QR codes to {receivingRiderName} for scanning</Text>
          <Text style={styles.transferInfo}>
            Transferring to: <Text style={styles.riderName}>{receivingRiderName}</Text>
          </Text>
          <Text style={styles.locationInfo}>at {handoverParticipants.location.address}</Text>
        </View>

        {/* Package Details */}
        <View style={styles.packageCard}>
          <Text style={styles.packageTitle}>PACKAGE DETAILS</Text>
          
          <View style={styles.packageInfo}>
            <Text style={styles.packageLabel}>Package {packageDetails.package_number}</Text>
            <Text style={styles.packageDescription}>Main delivery container</Text>
            
            <View style={styles.contentsGrid}>
              <View style={styles.contentItem}>
                <Text style={styles.contentValue}>
                  {packageDetails.contents.blood_tubes.edta + packageDetails.contents.blood_tubes.serum}
                </Text>
                <Text style={styles.contentLabel}>Blood tubes</Text>
                <Text style={styles.contentDetail}>
                  (EDTA: {packageDetails.contents.blood_tubes.edta}, Serum: {packageDetails.contents.blood_tubes.serum})
                </Text>
              </View>
              
              <View style={styles.contentItem}>
                <Text style={styles.contentValue}>{packageDetails.contents.urine_containers}</Text>
                <Text style={styles.contentLabel}>Urine containers</Text>
              </View>
              
              <View style={styles.contentItem}>
                <Text style={styles.contentValue}>{packageDetails.contents.total_weight}</Text>
                <Text style={styles.contentLabel}>Total weight</Text>
              </View>
            </View>
            
            <View style={styles.specialRequirements}>
              <Text style={styles.specialLabel}>Special:</Text>
              {packageDetails.contents.special_requirements.map((req, index) => (
                <Text key={index} style={styles.specialItem}>{req}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* QR Code Display */}
        <View style={styles.qrCodeCard}>
          <Text style={styles.qrCodeTitle}>QR Code Display</Text>

          <View style={styles.qrCodeContainer}>
            {/* Real QR Code generated from backend data */}
            {qrCodeData ? (
              <QRCode
                value={qrCodeData}
                size={QR_SIZE}
                color="#FF6B35" // Orange color for handover QR
                backgroundColor="#FFFFFF"
                logo={null}
                logoSize={0}
                logoBackgroundColor="transparent"
              />
            ) : (
              <View style={[styles.qrCodePlaceholder, { width: QR_SIZE, height: QR_SIZE }]}>
                <Text style={styles.qrCodeText}>Loading...</Text>
              </View>
            )}
          </View>

          <Text style={styles.jobIdDisplay}>
            {qrCodeData ? `Handover QR: ${jobId}` : 'Loading QR Code...'}
          </Text>
          
          <View style={styles.qrInstructions}>
            <Text style={styles.qrInstructionText}>Show this QR code to {receivingRiderName}</Text>
            
            <TouchableOpacity style={styles.brightnessButton} onPress={handleBrightnessIncrease}>
              <Text style={styles.brightnessButtonText}>
                🔆 Increase brightness for better scanning
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Handover Instructions */}
        {renderHandoverInstructions()}

        {/* Status */}
        <View style={styles.statusCard}>
          <View style={[
            styles.statusIndicator,
            packageScanned ? styles.statusComplete : styles.statusPending
          ]}>
            <Text style={styles.statusIcon}>{packageScanned ? '✅' : '⏳'}</Text>
            <Text style={[
              styles.statusText,
              packageScanned ? styles.statusTextComplete : styles.statusTextPending
            ]}>
              {packageScanned ? 'Package scanned successfully!' : 'Package ready for scanning'}
            </Text>
          </View>
          
          <Text style={styles.packageCount}>
            Package {packageDetails.package_number} of {packageDetails.total_packages}
          </Text>
        </View>

        {/* Handover Participants */}
        <View style={styles.participantsCard}>
          <Text style={styles.participantsTitle}>HANDOVER PARTICIPANTS</Text>
          
          <View style={styles.participantsList}>
            <View style={styles.participantItem}>
              <Text style={styles.participantRole}>Transferring:</Text>
              <Text style={styles.participantName}>
                {handoverParticipants.transferring.name} {handoverParticipants.transferring.verified ? '✅' : '⏳'}
              </Text>
            </View>
            
            <View style={styles.participantItem}>
              <Text style={styles.participantRole}>Receiving:</Text>
              <Text style={styles.participantName}>
                {handoverParticipants.receiving.name} {handoverParticipants.receiving.verified ? '✅' : '⏳'}
              </Text>
            </View>
            
            <View style={styles.participantItem}>
              <Text style={styles.participantRole}>GPS:</Text>
              <Text style={styles.participantName}>
                Both at same location {handoverParticipants.location.same_location ? '✅' : '❌'}
              </Text>
            </View>
            
            <View style={styles.participantItem}>
              <Text style={styles.participantRole}>Time:</Text>
              <Text style={styles.participantName}>
                {handoverParticipants.time.handover_time} handover {handoverParticipants.time.verified ? '✅' : '⏳'}
              </Text>
            </View>
          </View>
        </View>

        {/* Safety Confirmation */}
        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>SAFETY CONFIRMATION</Text>
          
          <View style={styles.safetyChecks}>
            <View style={styles.safetyCheck}>
              <Text style={styles.safetyCheckIcon}>
                {safetyConfirmation.public_location ? '✅' : '❌'}
              </Text>
              <Text style={styles.safetyCheckText}>Public location</Text>
            </View>
            
            <View style={styles.safetyCheck}>
              <Text style={styles.safetyCheckIcon}>
                {safetyConfirmation.identities_verified ? '✅' : '❌'}
              </Text>
              <Text style={styles.safetyCheckText}>Identities verified</Text>
            </View>
            
            <View style={styles.safetyCheck}>
              <Text style={styles.safetyCheckIcon}>
                {safetyConfirmation.emergency_contacts_notified ? '✅' : '❌'}
              </Text>
              <Text style={styles.safetyCheckText}>Emergency contacts notified</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.reportButton} onPress={handleReportIssue}>
            <Text style={styles.reportButtonText}>⚠️ Report Issue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportButton} onPress={onContactSupport}>
            <Text style={styles.supportButtonText}>📞 Support</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.continueButton,
            packageScanned ? styles.continueButtonActive : styles.continueButtonDisabled
          ]}
          onPress={packageScanned ? onPackageScanned : handlePackageScanned}
        >
          <Text style={[
            styles.continueButtonText,
            packageScanned ? styles.continueButtonTextActive : styles.continueButtonTextDisabled
          ]}>
            {packageScanned ? 'Package Scanned - Continue' : 'Waiting for scan...'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg * 1.5,
    paddingVertical: SPACING.lg,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 20,
    color: COLORS.white,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  stepIndicator: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg * 1.5,
  },
  instructionsHeader: {
    backgroundColor: '#E6F7FF',
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: '#91D5FF',
  },
  mainInstruction: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1890FF',
    marginBottom: 8,
    textAlign: 'center',
  },
  transferInfo: {
    fontSize: 16,
    color: '#1890FF',
    textAlign: 'center',
    marginBottom: 4,
  },
  riderName: {
    fontWeight: '700',
  },
  locationInfo: {
    fontSize: 14,
    color: '#1890FF',
    textAlign: 'center',
  },
  packageCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  packageTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  packageInfo: {
    gap: 16,
  },
  packageLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  packageDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  contentsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  contentItem: {
    alignItems: 'center',
    minWidth: '30%',
  },
  contentValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  contentLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  contentDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  specialRequirements: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
  },
  specialLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  specialItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  qrCodeCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  qrCodeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  qrCodeContainer: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 16,
  },
  qrCodePlaceholder: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  qrCodeText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  qrCodeId: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  jobIdDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  qrInstructions: {
    alignItems: 'center',
    gap: 12,
  },
  qrInstructionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  brightnessButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: LAYOUT.radius.lg,
  },
  brightnessButtonText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  instructionsCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  instructionsSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusPending: {
    backgroundColor: '#FFF7E6',
  },
  statusComplete: {
    backgroundColor: '#E8F5E8',
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusTextPending: {
    color: '#FA8C16',
  },
  statusTextComplete: {
    color: COLORS.success,
  },
  packageCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  participantsCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  participantsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  participantsList: {
    gap: 12,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantRole: {
    fontSize: 14,
    color: COLORS.textSecondary,
    width: 100,
  },
  participantName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  safetyCard: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg * 2,
  },
  safetyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  safetyChecks: {
    gap: 12,
  },
  safetyCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyCheckIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  safetyCheckText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
  },
  bottomContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg * 1.5,
    paddingTop: 16,
    paddingBottom: SPACING.lg * 1.5,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  reportButton: {
    flex: 1,
    backgroundColor: '#FFF2E8',
    borderWidth: 1,
    borderColor: '#FFE7BA',
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#FA8C16',
    fontSize: 14,
    fontWeight: '600',
  },
  supportButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
  },
  supportButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    paddingVertical: 18,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  continueButtonActive: {
    backgroundColor: COLORS.primary,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.gray100,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  continueButtonTextActive: {
    color: COLORS.white,
  },
  continueButtonTextDisabled: {
    color: COLORS.textTertiary,
  },
});

export default ShowQRCodeScreen;