import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  Alert,
  Vibration,
  Modal,
  TextInput,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { ArrowLeft, Camera, Flashlight, Package, CheckCircle, X, RefreshCw, QrCode, Info, Briefcase, Shield, Snowflake, Lock, Hand, FileCheck, AlertTriangle, AlertCircle, Lightbulb, Focus, Keyboard, Headphones, Clock, Gauge, TestTube, Wallet, Thermometer } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';
import { locationService } from '../services/locationService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface QRCodeScannerScreenProps {
  jobId: string;
  onBack: () => void;
  onScanSuccess: (qrData: string, packageDetails: any) => void;
  onManualEntry: () => void;
  onCallSupport: () => void;
}

interface QRScanData {
  jobId: string;
  collectionCenterId: string;
  hospitalId: string;
  timestamp: string;
  packageId: string;
  sampleDetails: {
    bloodTubes: number;
    urineSamples: number;
    totalWeight: string;
    packageCount: number;
  };
}

interface SafetyGuideline {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'critical' | 'important' | 'standard';
}

interface PackageInfo {
  packageId: string;
  collectionCenter: string;
  sampleTypes: string[];
  expectedCount: number;
  specialHandling: string[];
  temperature: string;
  priority: 'URGENT' | 'STANDARD';
}

const QRCodeScannerScreen: React.FC<QRCodeScannerScreenProps> = React.memo(({
  jobId,
  onBack,
  onScanSuccess,
  onManualEntry,
  onCallSupport,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [flashMode, setFlashMode] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanningInstructions, setScanningInstructions] = useState('Position QR code within the scanning frame');
  const [scanningStatus, setScanningStatus] = useState<'scanning' | 'processing' | 'success' | 'error'>('scanning');
  const [showPackageInfo, setShowPackageInfo] = useState(false);
  
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const successAnimation = useRef(new Animated.Value(0)).current;

  // Professional package information for client demo
  const [packageInfo] = useState<PackageInfo>({
    packageId: 'PKG-240115-NAW-001',
    collectionCenter: 'Nawaloka Medical Laboratory',
    sampleTypes: ['Blood samples', 'Urine specimens', 'Tissue samples'],
    expectedCount: 11,
    specialHandling: ['Temperature controlled', 'Fragile contents', 'Biohazard materials'],
    temperature: 'Keep at 2-8°C',
    priority: 'URGENT',
  });

  const [safetyGuidelines] = useState<SafetyGuideline[]>([
    {
      id: '1',
      title: 'Wear Protective Gloves',
      description: 'Always use medical-grade gloves when handling samples',
      icon: 'shield',
      type: 'critical',
    },
    {
      id: '2',
      title: 'Maintain Cold Chain',
      description: 'Keep temperature-sensitive samples at 2-8°C',
      icon: 'snowflake',
      type: 'critical',
    },
    {
      id: '3',
      title: 'Preserve Container Seals',
      description: 'Never break or tamper with sample container seals',
      icon: 'lock',
      type: 'important',
    },
    {
      id: '4',
      title: 'Handle with Care',
      description: 'Avoid shaking or dropping sample containers',
      icon: 'hand',
      type: 'important',
    },
    {
      id: '5',
      title: 'Verify Package Labels',
      description: 'Confirm all labels and barcodes are clearly visible',
      icon: 'file-check',
      type: 'standard',
    },
    {
      id: '6',
      title: 'Document Any Issues',
      description: 'Report damaged containers or irregular samples immediately',
      icon: 'alert-triangle',
      type: 'standard',
    },
  ]);

  useEffect(() => {
    // Reset scanning state when component mounts
    setIsScanning(true);
    setScanningInstructions('Position QR code within the scanning frame');
    setScanningStatus('scanning');
    
    // Start scanning line animation
    const scanningAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(scanLineAnimation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    );
    
    const pulsingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    
    scanningAnimation.start();
    pulsingAnimation.start();
    
    return () => {
      scanningAnimation.stop();
      pulsingAnimation.stop();
    };
  }, []);

  const validateQRCode = useCallback((qrData: string): { isValid: boolean; packageData?: any } => {
    try {
      // Try to parse as JSON first
      const data = JSON.parse(qrData);

      // Accept QR with: qr_id, type, order_id (security_hash is optional)
      // Accept 'pickup', 'delivery', and 'handover' types
      if (data.qr_id && (data.type === 'pickup' || data.type === 'delivery' || data.type === 'handover') && data.order_id) {
        // Basic validation passed
        return { isValid: true, packageData: data };
      }

      return { isValid: false };
    } catch {
      // Not valid JSON
      return { isValid: false };
    }
  }, []);

  // Professional QR code handler with enhanced UX
  const handleQRCodeRead = useCallback(async (event: any) => {
    if (!isScanning) return;

    setIsScanning(false);
    setScanningStatus('processing');
    Vibration.vibrate([50, 50, 100]); // Professional haptic feedback

    try {
      const qrData = event.data;
      const validation = validateQRCode(qrData);
      
      if (validation.isValid) {
        setScanningInstructions('Validating package information...');

        try {
          // Get rider's current location
          const currentLocation = await locationService.getCurrentLocation();

          // Parse QR code to determine type
          const parsedQR = JSON.parse(qrData);
          let scanType = 'pickup_confirm';
          let response;

          if (parsedQR.type === 'delivery') {
            scanType = 'delivery_confirm';
            response = await apiService.scanQR(qrData, scanType, {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            });
          } else if (parsedQR.type === 'handover') {
            scanType = 'handover_confirm';
            response = await apiService.scanQR(qrData, scanType, {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            });
          } else if (parsedQR.type === 'multi_parcel_delivery' || parsedQR.type === 'multi_delivery') {
            // Multi-parcel delivery QR - delivers all parcels at once
            console.log('🎁 Scanning multi-parcel delivery QR');
            response = await apiService.scanCombinedQR(qrData, {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            });
          } else {
            // Regular pickup QR
            response = await apiService.scanQR(qrData, scanType, {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            });
          }

          if (response && response.success) {
            setScanningStatus('success');

            // Show appropriate success message
            if (parsedQR.type === 'multi_parcel_delivery' || parsedQR.type === 'multi_delivery') {
              const deliveredCount = response.data?.delivered_count || parsedQR.order_ids?.length || 0;
              setScanningInstructions(`✅ ${deliveredCount} parcels delivered successfully!`);
            } else {
              setScanningInstructions('Package verified successfully!');
            }

            // Success animation
            Animated.spring(successAnimation, {
              toValue: 1,
              useNativeDriver: true,
              tension: 50,
              friction: 5,
            }).start();

            // Proceed after showing success state
            setTimeout(() => {
              onScanSuccess(qrData, validation.packageData);
            }, 2000);
          } else {
            handleScanError('QR Validation Failed', response?.error?.message || 'This package QR code could not be validated with our system.');
          }
        } catch (error: any) {
          console.error('QR scan error:', error);
          handleScanError('Scan Error', error.message || 'Could not validate package. Please check your connection.');
        }
      } else {
        handleScanError('Invalid QR Code', 'This QR code is not valid for this pickup job.');
      }
    } catch (error) {
      handleScanError('Scan Error', 'Failed to read QR code. Please try again.');
    }
  }, [isScanning, validateQRCode, onScanSuccess]);
  
  const handleScanError = (title: string, message: string) => {
    setScanningStatus('error');
    setScanningInstructions('Scan failed - Please try again');
    
    Alert.alert(title, message, [
      {
        text: 'Try Again',
        onPress: () => {
          setIsScanning(true);
          setScanningStatus('scanning');
          setScanningInstructions('Position QR code within the scanning frame');
        },
      },
      {
        text: 'Manual Entry',
        onPress: () => setShowManualEntry(true),
      },
    ]);
  };

  const handleManualEntry = () => {
    if (manualCode.trim().length < 8) {
      Alert.alert(
        'Invalid Code',
        'Please enter a valid QR code or package ID (minimum 8 characters).',
        [{ text: 'OK' }]
      );
      return;
    }

    const validation = validateQRCode(manualCode);
    if (validation.isValid) {
      setShowManualEntry(false);
      onScanSuccess(manualCode, validation.packageData);
    } else {
      Alert.alert(
        'Invalid Code',
        'The entered code is not valid for this pickup job. Please verify and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleFlash = () => {
    setFlashMode(!flashMode);
    Vibration.vibrate(50);
  };
  
  const getScanningStatusColor = () => {
    switch (scanningStatus) {
      case 'processing': return COLORS.warning;
      case 'success': return COLORS.success;
      case 'error': return COLORS.error;
      default: return COLORS.primary;
    }
  };
  
  const getScanningStatusIcon = () => {
    switch (scanningStatus) {
      case 'processing': return 'hourglass-empty';
      case 'success': return 'check-circle';
      case 'error': return 'error';
      default: return 'qr-code-scanner';
    }
  };

  const renderPackageInfoModal = () => (
    <Modal
      visible={showPackageInfo}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowPackageInfo(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.packageInfoModal}>
          <View style={styles.packageInfoHeader}>
            <Package size={24} color={COLORS.primary} />
            <Text style={styles.packageInfoTitle}>Package Information</Text>
            <TouchableOpacity 
              onPress={() => setShowPackageInfo(false)}
              style={styles.modalCloseButton}
            >
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.packageInfoContent} showsVerticalScrollIndicator={false}>
            <View style={styles.packageDetailCard}>
              <Text style={styles.packageDetailLabel}>Package ID</Text>
              <Text style={styles.packageDetailValue}>{packageInfo.packageId}</Text>
            </View>
            
            <View style={styles.packageDetailCard}>
              <Text style={styles.packageDetailLabel}>Collection Center</Text>
              <Text style={styles.packageDetailValue}>{packageInfo.collectionCenter}</Text>
            </View>
            
            <View style={styles.packageDetailCard}>
              <Text style={styles.packageDetailLabel}>Sample Types</Text>
              <View style={styles.sampleTypesContainer}>
                {packageInfo.sampleTypes.map((type, index) => (
                  <View key={index} style={styles.sampleTypeBadge}>
                    <Text style={styles.sampleTypeBadgeText}>{type}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.packageDetailCard}>
              <Text style={styles.packageDetailLabel}>Expected Sample Count</Text>
              <Text style={styles.packageDetailValue}>{packageInfo.expectedCount} samples</Text>
            </View>
            
            <View style={styles.packageDetailCard}>
              <Text style={styles.packageDetailLabel}>Special Handling</Text>
              {packageInfo.specialHandling.map((instruction, index) => (
                <View key={index} style={styles.specialHandlingItem}>
                  <Info size={16} color={COLORS.warning} />
                  <Text style={styles.specialHandlingText}>{instruction}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
  
  const renderManualEntryModal = () => (
    <Modal
      visible={showManualEntry}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowManualEntry(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Keyboard size={24} color={COLORS.primary} />
            <Text style={styles.modalTitle}>Manual Package Entry</Text>
          </View>
          
          <Text style={styles.modalDescription}>
            Enter the package QR code manually if it's damaged or cannot be scanned properly.
          </Text>
          
          <View style={styles.inputContainer}>
            <QrCode size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.manualInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Enter QR code or package ID"
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus={true}
            />
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowManualEntry(false);
                setManualCode('');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalConfirmButton,
                manualCode.length < 8 && styles.modalConfirmButtonDisabled
              ]}
              onPress={handleManualEntry}
              disabled={manualCode.length < 8}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={manualCode.length >= 8 ? [COLORS.primary, COLORS.primaryDark] : [COLORS.gray300, COLORS.gray400]}
                style={styles.modalConfirmGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <CheckCircle size={16} color={COLORS.white} />
                <Text style={styles.modalConfirmText}>Confirm Package</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent />
      
      {/* Professional Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>QR Code Scanner</Text>
            <View style={styles.jobIdContainer}>
              <Briefcase size={16} color={COLORS.textSecondary} />
              <Text style={styles.jobIdText}>{jobId}</Text>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => setShowPackageInfo(true)} 
              style={styles.headerActionButton}
              activeOpacity={0.8}
            >
              <Info size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={toggleFlash} 
              style={[styles.headerActionButton, flashMode && styles.flashActiveButton]}
              activeOpacity={0.8}
            >
              <Flashlight size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Simple Scanner Instructions */}
        <View style={styles.instructionsContainer}>
        <View style={styles.instructionCard}>
          <QrCode size={20} color={getScanningStatusColor()} />
          <Text style={[styles.instructionsTitle, { color: getScanningStatusColor() }]}>
            {scanningInstructions}
          </Text>
        </View>
      </View>

      {/* Professional Camera View */}
      <View style={styles.cameraContainer}>
        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <LinearGradient
              colors={['rgba(78, 205, 196, 0.1)', 'rgba(78, 205, 196, 0.05)']}
              style={styles.permissionCard}
            >
              <Camera size={64} color={COLORS.primary} />
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionText}>
                We need camera permission to scan package QR codes for verification
              </Text>
              <TouchableOpacity 
                style={styles.permissionButton} 
                onPress={requestPermission}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.permissionButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Camera size={18} color={COLORS.white} />
                  <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              enableTorch={flashMode}
              onBarcodeScanned={isScanning ? handleQRCodeRead : undefined}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            
            {/* Professional Scanning Overlay - Positioned absolutely over camera */}
            <View style={styles.scanOverlay}>
              {/* Scanning Frame */}
              <View style={styles.scanFrame}>
                <Animated.View style={[styles.scanCorners, { transform: [{ scale: pulseAnimation }] }]}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </Animated.View>
                
                {/* Animated Scanning Line */}
                {scanningStatus === 'scanning' && (
                  <Animated.View style={[
                    styles.scanLine,
                    {
                      transform: [{
                        translateY: scanLineAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-160, 160],
                        }),
                      }],
                    },
                  ]} />
                )}
                
                {/* Success Animation */}
                {scanningStatus === 'success' && (
                  <Animated.View style={[
                    styles.successOverlay,
                    {
                      opacity: successAnimation,
                      transform: [{ scale: successAnimation }],
                    },
                  ]}>
                    <CheckCircle size={60} color={COLORS.success} />
                  </Animated.View>
                )}
                
                {/* Center QR Icon */}
                <View style={styles.scanCenterIcon}>
                  <QrCode size={32} color={getScanningStatusColor()} />
                </View>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Professional Status Bar */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.statusBarGradient}
      >
        <View style={styles.scanStatusContainer}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: getScanningStatusColor() }]} />
            <Text style={styles.scanStatus}>{scanningInstructions}</Text>
          </View>
          
          {scanningStatus === 'processing' && (
            <View style={styles.processingIndicator}>
              <Clock size={16} color={COLORS.warning} />
            </View>
          )}
        </View>
      </LinearGradient>


      {/* Professional Action Buttons */}
      <View style={styles.bottomActions}>
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => setShowManualEntry(true)}
            activeOpacity={0.8}
          >
            <Keyboard size={18} color={COLORS.textSecondary} />
            <Text style={styles.secondaryActionText}>Manual Entry</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.supportActionButton} 
            onPress={onCallSupport}
            activeOpacity={0.8}
          >
            <Headphones size={18} color={COLORS.primary} />
            <Text style={styles.supportActionText}>Get Help</Text>
          </TouchableOpacity>
        </View>
        
        {/* Simple Tip */}
        <Text style={styles.simpleTip}>
          Position QR code within the frame and hold steady
        </Text>
      </View>
      </ScrollView>

      {renderManualEntryModal()}
      {renderPackageInfoModal()}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  headerContainer: {
    backgroundColor: COLORS.white,
    paddingTop: 25,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
  },
  headerTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  jobIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
  },
  jobIdText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  flashActiveButton: {
    backgroundColor: COLORS.warning + '80',
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.sm,
    ...SHADOWS.card,
  },
  instructionsTitle: {
    ...TYPOGRAPHY.styles.body,
    fontWeight: '600',
  },
  instructionsSubtitle: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  cameraContainer: {
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    ...SHADOWS.xl,
    height: screenHeight * 0.45,
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    paddingHorizontal: SPACING.xl,
  },
  permissionCard: {
    alignItems: 'center',
    padding: SPACING.xxl,
    borderRadius: LAYOUT.radius.xl,
    width: '100%',
  },
  permissionTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  permissionText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  permissionButton: {
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  permissionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  permissionButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '700',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 320,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanCorners: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: LAYOUT.radius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: LAYOUT.radius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: LAYOUT.radius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: LAYOUT.radius.md,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  successOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: LAYOUT.radius.round,
    width: 120,
    height: 120,
  },
  scanCenterIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: LAYOUT.radius.round,
    width: 60,
    height: 60,
    ...SHADOWS.md,
  },
  statusBarGradient: {
    paddingVertical: SPACING.sm,
  },
  scanStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scanStatus: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  processingIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: SPACING.sm,
    borderRadius: LAYOUT.radius.round,
    ...SHADOWS.sm,
  },
  packageSummaryContainer: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
  },
  packageSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  packageSummaryTitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '700',
    flex: 1,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
    gap: SPACING.xs,
  },
  priorityText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.error,
    fontWeight: '700',
  },
  packageQuickInfo: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  packageInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  packageInfoText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  safetyContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  safetyHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  safetyTitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  safetySubtitle: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  safetyGuidelinesContainer: {
    paddingHorizontal: SPACING.sm,
    gap: SPACING.md,
  },
  safetyGuidelineCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    width: 140,
    alignItems: 'center',
    borderWidth: LAYOUT.borderWidth.thin,
    borderColor: COLORS.gray200,
  },
  criticalGuideline: {
    borderColor: COLORS.error + '40',
    backgroundColor: COLORS.error + '05',
  },
  importantGuideline: {
    borderColor: COLORS.warning + '40',
    backgroundColor: COLORS.warning + '05',
  },
  guidelineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  guidelineTitle: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  guidelineDescription: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.sm,
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  criticalBadgeText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.error,
    fontWeight: '700',
    fontSize: 10,
  },
  bottomActions: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopLeftRadius: LAYOUT.radius.xl,
    borderTopRightRadius: LAYOUT.radius.xl,
    ...SHADOWS.xl,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.xs,
  },
  secondaryActionText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  supportActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryUltraLight,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.xs,
  },
  supportActionText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  scanningTips: {
    gap: SPACING.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tipText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textTertiary,
    flex: 1,
  },
  simpleTip: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  packageInfoModal: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    width: '100%',
    maxHeight: screenHeight * 0.7,
    ...SHADOWS.xl,
  },
  packageInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: LAYOUT.borderWidth.thin,
    borderBottomColor: COLORS.gray200,
    gap: SPACING.sm,
  },
  packageInfoTitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageInfoContent: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  packageDetailCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  packageDetailLabel: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  packageDetailValue: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  sampleTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  sampleTypeBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
  },
  sampleTypeBadgeText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },
  specialHandlingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  specialHandlingText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  modalTitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  modalDescription: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.gray300,
    borderRadius: LAYOUT.radius.lg,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.gray50,
    gap: SPACING.sm,
  },
  manualInput: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    flex: 1,
    paddingVertical: SPACING.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
  },
  modalCancelText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 2,
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
    ...SHADOWS.none,
  },
  modalConfirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  modalConfirmText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default QRCodeScannerScreen;