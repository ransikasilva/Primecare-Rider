import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { CheckCircle, Package, MapPin, Clock, Phone, ArrowRight, Camera, ArrowLeft, QrCode, Droplets, TestTube, Scale, Shield, AlertTriangle, Hospital, Gauge, Route, Lock, Headphones, CheckSquare, Square, Truck, Timer } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

interface PickupConfirmationScreenProps {
  jobId: string;
  onBack: () => void;
  onStartDelivery: () => void;
  onCallSupport: () => void;
  onReportIssue: () => void;
}

interface PickupDetails {
  qrCode: string;
  timestamp: string;
  priority: 'URGENT' | 'STANDARD';
  collectionCenter: {
    name: string;
    address: string;
    contactPerson: string;
    phone: string;
  };
  hospital: {
    name: string;
    address: string;
    department: string;
    floor: string;
  };
  samples: {
    types: string[];
    bloodTubes: number;
    urineSamples: number;
    totalWeight: string;
    packageCount: number;
    totalCount: number;
    specialHandling: string[];
    description: string;
  };
  delivery: {
    distance: string;
    estimatedTime: string;
    route: string;
  };
  photoRequired: boolean;
  confirmationSteps: {
    qrScanned: boolean;
    detailsVerified: boolean;
    photoTaken: boolean;
    safetyChecked: boolean;
  };
}

const PickupConfirmationScreen: React.FC<PickupConfirmationScreenProps> = ({
  jobId,
  onBack,
  onStartDelivery,
  onCallSupport,
  onReportIssue,
}) => {
  const [photoTaken, setPhotoTaken] = useState(false);
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [confirmationComplete, setConfirmationComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime] = useState(new Date());
  
  const successPulse = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;

  // Dynamic pickup details loaded from API
  const [pickupDetails, setPickupDetails] = useState<PickupDetails | null>(null);

  useEffect(() => {
    const loadPickupDetails = async () => {
      try {
        setLoading(true);
        const response = await apiService.getOrderDetails(jobId);
        
        if (response.success && response.data) {
          const orderData = response.data.order || response.data;
          
          // Transform API data to PickupDetails format
          const transformedData: PickupDetails = {
            qrCode: orderData.qr_code?.qr_id || orderData.qr_code || `QR-${jobId}`,
            timestamp: new Date().toLocaleString(),
            priority: (orderData.urgency?.toUpperCase() === 'URGENT' || orderData.urgency?.toUpperCase() === 'EMERGENCY') ? 'URGENT' : 'STANDARD',
            collectionCenter: {
              name: orderData.pickup_location?.name || orderData.center_name || 'Collection Center',
              address: orderData.pickup_location?.address || orderData.center_address || 'Address not available',
              contactPerson: 'Center Staff',
              phone: orderData.pickup_location?.phone || orderData.center_phone || 'N/A',
            },
            hospital: {
              name: orderData.delivery_location?.name || orderData.hospital_name || 'Hospital',
              address: orderData.delivery_location?.address || orderData.hospital_address || 'Hospital address',
              department: 'Laboratory',
              floor: 'Ground Floor',
            },
            samples: {
              types: orderData.sample_type ? [orderData.sample_type] : ['Blood'],
              bloodTubes: 0,
              urineSamples: 0,
              totalWeight: '0g',
              packageCount: 1,
              totalCount: 1,
              specialHandling: orderData.urgency?.toUpperCase() === 'URGENT' ? ['Urgent delivery required'] : ['Handle with care'],
              description: orderData.sample_type ? `${orderData.sample_type} sample` : 'Medical sample',
            },
            delivery: {
              distance: orderData.estimated_distance_km ? `${orderData.estimated_distance_km} km` : 'N/A',
              estimatedTime: orderData.estimated_delivery_time || 'N/A',
              route: 'Direct route',
            },
            photoRequired: false,
            confirmationSteps: {
              qrScanned: true,
              detailsVerified: false,
              photoTaken: false,
              safetyChecked: false,
            },
          };
          
          setPickupDetails(transformedData);
        }
      } catch (error: any) {
        console.error('Failed to load pickup details:', error);
        // Set fallback data
        setPickupDetails({
          qrCode: `QR-${jobId}`,
          timestamp: new Date().toLocaleString(),
          priority: 'STANDARD',
          collectionCenter: {
            name: 'Collection Center',
            address: 'Address loading...',
            contactPerson: 'Center Staff',
            phone: '+94 11 XXX XXXX',
          },
          hospital: {
            name: 'Hospital',
            address: 'Hospital address',
            department: 'Laboratory',
            floor: 'Ground Floor',
          },
          samples: {
            types: ['Medical samples'],
            bloodTubes: 0,
            urineSamples: 0,
            totalWeight: '0g',
            packageCount: 1,
            totalCount: 1,
            description: 'Medical samples for delivery',
            specialHandling: ['Handle with care'],
          },
          delivery: {
            distance: '0 km',
            estimatedTime: '30 minutes',
            route: 'Direct route',
          },
          photoRequired: true,
          confirmationSteps: {
            qrScanned: true,
            detailsVerified: false,
            photoTaken: false,
            safetyChecked: false,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    loadPickupDetails();
  }, [jobId]);

  useEffect(() => {
    // Success pulse animation
    const successAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(successPulse, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(successPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    successAnimation.start();

    // Progress bar animation
    Animated.timing(progressAnimation, {
      toValue: 0.5, // 50% complete initially
      duration: 1000,
      useNativeDriver: false,
    }).start();

    return () => {
      successAnimation.stop();
    };
  }, [successPulse, progressAnimation]);

  useEffect(() => {
    if (!pickupDetails) return;
    
    // Check completion status
    const allRequired = pickupDetails.photoRequired ? (photoTaken && safetyChecked) : safetyChecked;
    setConfirmationComplete(allRequired);

    // Update progress animation
    let progress = 0.5; // Base 50% for QR scan + details
    if (photoTaken || !pickupDetails.photoRequired) progress += 0.25;
    if (safetyChecked) progress += 0.25;

    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [photoTaken, safetyChecked, pickupDetails, progressAnimation]);

  const handleTakePhoto = () => {
    Alert.alert(
      'Package Photo Required',
      'Take a clear photo of the sealed package for verification.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Take Photo', 
          onPress: () => {
            // TODO: Implement camera functionality
            setPhotoTaken(true);
          }
        },
      ]
    );
  };

  const handleSafetyCheck = () => {
    setSafetyChecked(!safetyChecked);
  };

  const handleStartDelivery = () => {
    if (!pickupDetails) return;
    
    if (!confirmationComplete) {
      Alert.alert(
        'Confirmation Incomplete', 
        'Please complete all required steps before starting delivery.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Start Hospital Delivery',
      `Ready to deliver ${pickupDetails.samples.totalCount} samples to ${pickupDetails.hospital.name}?`,
      [
        { text: 'Not Ready', style: 'cancel' },
        { 
          text: 'Start Delivery', 
          onPress: onStartDelivery
        },
      ]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStepIcon = (completed: boolean, pending: boolean = false) => {
    if (completed) return 'check-circle';
    if (pending) return 'radio-button-unchecked';
    return 'schedule';
  };

  const getStepColor = (completed: boolean, pending: boolean = false) => {
    if (completed) return COLORS.success;
    if (pending) return COLORS.warning;
    return COLORS.textTertiary;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading pickup details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!pickupDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Unable to load pickup details. Please try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Professional Header with Success Theme */}
      <LinearGradient
        colors={[COLORS.success, '#4CAF50']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Pickup Confirmed</Text>
            <Text style={styles.headerSubtitle}>{jobId}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>{pickupDetails.priority}</Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  width: progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(confirmationComplete ? 100 : (photoTaken || !pickupDetails.photoRequired) && safetyChecked ? 100 : 75)}% Complete
          </Text>
        </View>
      </LinearGradient>

      {/* Success Banner */}
      <View style={styles.successBanner}>
        <Animated.View style={[styles.successIconContainer, { transform: [{ scale: successPulse }] }]}>
          <CheckCircle size={32} color={COLORS.success} />
        </Animated.View>
        <View style={styles.successContent}>
          <Text style={styles.successTitle}>Package Successfully Collected!</Text>
          <Text style={styles.successSubtitle}>QR verified • All samples secured</Text>
        </View>
        <View style={styles.distanceDisplay}>
          <Text style={styles.distanceAmount}>{pickupDetails.delivery.distance}</Text>
          <Text style={styles.distanceLabel}>Distance</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* QR Confirmation Card */}
        <View style={styles.confirmationCard}>
          <View style={styles.cardHeader}>
            <QrCode size={20} color={COLORS.success} />
            <Text style={styles.cardTitle}>QR CODE VERIFICATION</Text>
            <CheckCircle size={20} color={COLORS.success} />
          </View>
          <View style={styles.qrDetails}>
            <Text style={styles.qrCode}>{pickupDetails.qrCode}</Text>
            <Text style={styles.timestamp}>Scanned at {pickupDetails.timestamp}</Text>
          </View>
        </View>

        {/* Collection Center Info */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MapPin size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>PICKUP LOCATION</Text>
          </View>
          <Text style={styles.facilityName}>{pickupDetails.collectionCenter.name}</Text>
          <Text style={styles.facilityAddress}>{pickupDetails.collectionCenter.address}</Text>
          
          <View style={styles.contactCard}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{pickupDetails.collectionCenter.contactPerson}</Text>
              <Text style={styles.contactPhone}>{pickupDetails.collectionCenter.phone}</Text>
            </View>
            <TouchableOpacity style={styles.callButton} activeOpacity={0.8}>
              <Phone size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Package Details */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Package size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>PACKAGE DETAILS</Text>
            <View style={styles.sampleCount}>
              <Text style={styles.sampleCountText}>{pickupDetails.samples.totalCount}</Text>
            </View>
          </View>

          <Text style={styles.samplesDescription}>{pickupDetails.samples.description}</Text>

          {/* Sample Types */}
          <View style={styles.sampleTypes}>
            {pickupDetails.samples.types.map((type, index) => (
              <View key={index} style={styles.sampleType}>
                <TestTube size={16} color={COLORS.primary} />
                <Text style={styles.sampleTypeText}>{type}</Text>
              </View>
            ))}
          </View>

          {/* Special Handling */}
          <View style={styles.specialHandling}>
            {pickupDetails.samples.specialHandling.map((instruction, index) => (
              <View key={index} style={styles.handlingItem}>
                <Shield size={16} color={pickupDetails.priority === 'URGENT' ? COLORS.error : COLORS.success} />
                <Text style={styles.handlingText}>{instruction}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Photo Confirmation */}
        {pickupDetails.photoRequired && (
          <View style={[styles.photoCard, photoTaken && styles.photoCardComplete]}>
            <View style={styles.cardHeader}>
              <Camera size={20} color={photoTaken ? COLORS.success : COLORS.warning} />
              <Text style={styles.cardTitle}>PACKAGE PHOTO</Text>
              {photoTaken && <CheckCircle size={20} color={COLORS.success} />}
            </View>
            
            {!photoTaken ? (
              <View style={styles.photoRequirement}>
                <Camera size={48} color={COLORS.warning} />
                <Text style={styles.photoText}>Photo verification required</Text>
                <Text style={styles.photoSubtext}>Take a clear photo of the sealed package</Text>
                <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto} activeOpacity={0.8}>
                  <LinearGradient
                    colors={[COLORS.warning, '#f57c00']}
                    style={styles.photoButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Camera size={20} color={COLORS.white} />
                    <Text style={styles.photoButtonText}>Take Package Photo</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoSuccess}>
                <CheckCircle size={48} color={COLORS.success} />
                <Text style={styles.photoSuccessText}>Package photo captured successfully</Text>
                <Text style={styles.photoTimestamp}>Captured at {formatTime(currentTime)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Delivery Destination */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Hospital size={20} color={COLORS.success} />
            <Text style={styles.cardTitle}>DELIVERY DESTINATION</Text>
          </View>
          <Text style={styles.facilityName}>{pickupDetails.hospital.name}</Text>
          <Text style={styles.facilityAddress}>{pickupDetails.hospital.address}</Text>
          <Text style={styles.department}>{pickupDetails.hospital.department} • {pickupDetails.hospital.floor}</Text>
          
          <View style={styles.deliveryMetrics}>
            <View style={styles.deliveryMetric}>
              <Gauge size={16} color={COLORS.textSecondary} />
              <Text style={styles.metricLabel}>Distance</Text>
              <Text style={styles.metricValue}>{pickupDetails.delivery.distance}</Text>
            </View>
            <View style={styles.deliveryMetric}>
              <Clock size={16} color={COLORS.textSecondary} />
              <Text style={styles.metricLabel}>Est. Time</Text>
              <Text style={styles.metricValue}>{pickupDetails.delivery.estimatedTime}</Text>
            </View>
            <View style={styles.deliveryMetric}>
              <Route size={16} color={COLORS.textSecondary} />
              <Text style={styles.metricLabel}>Route</Text>
              <Text style={styles.metricValue}>{pickupDetails.delivery.route}</Text>
            </View>
          </View>
        </View>

        {/* Safety Checklist */}
        <View style={styles.safetyCard}>
          <View style={styles.cardHeader}>
            <Shield size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>SAFETY CHECKLIST</Text>
            {safetyChecked && <CheckCircle size={20} color={COLORS.success} />}
          </View>
          
          <View style={styles.safetyItems}>
            <View style={styles.safetyItem}>
              <Shield size={16} color={COLORS.primary} />
              <Text style={styles.safetyText}>Wear protective gloves during handling</Text>
            </View>
            <View style={styles.safetyItem}>
              <TestTube size={16} color={COLORS.primary} />
              <Text style={styles.safetyText}>Maintain temperature control for samples</Text>
            </View>
            <View style={styles.safetyItem}>
              <Lock size={16} color={COLORS.primary} />
              <Text style={styles.safetyText}>Do not tamper with container seals</Text>
            </View>
            <View style={styles.safetyItem}>
              <Shield size={16} color={COLORS.primary} />
              <Text style={styles.safetyText}>Keep package secure at all times</Text>
            </View>
            <View style={styles.safetyItem}>
              <Hospital size={16} color={COLORS.primary} />
              <Text style={styles.safetyText}>Deliver to specified department only</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.safetyCheckbox, safetyChecked && styles.safetyCheckboxChecked]}
            onPress={handleSafetyCheck}
            activeOpacity={0.8}
          >
            {safetyChecked ? (
              <CheckSquare size={20} color={COLORS.white} />
            ) : (
              <Square size={20} color={COLORS.textSecondary} />
            )}
            <Text style={[styles.safetyCheckboxText, safetyChecked && styles.safetyCheckboxTextChecked]}>
              I confirm I have read and understand all safety requirements
            </Text>
          </TouchableOpacity>
        </View>

        {/* Confirmation Progress */}
        <View style={styles.progressCard}>
          <View style={styles.cardHeader}>
            <CheckCircle size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>CONFIRMATION PROGRESS</Text>
          </View>
          
          <View style={styles.confirmationSteps}>
            <View style={styles.confirmationStep}>
              <CheckCircle size={20} color={getStepColor(true)} />
              <Text style={[styles.stepText, { color: getStepColor(true) }]}>
                QR code scanned and verified
              </Text>
            </View>
            <View style={styles.confirmationStep}>
              <CheckCircle size={20} color={getStepColor(true)} />
              <Text style={[styles.stepText, { color: getStepColor(true) }]}>
                Package details confirmed
              </Text>
            </View>
            <View style={styles.confirmationStep}>
              {photoTaken || !pickupDetails.photoRequired ? (
                <CheckCircle size={20} color={getStepColor(photoTaken || !pickupDetails.photoRequired, !photoTaken && pickupDetails.photoRequired)} />
              ) : (
                <Timer size={20} color={getStepColor(photoTaken || !pickupDetails.photoRequired, !photoTaken && pickupDetails.photoRequired)} />
              )}
              <Text style={[styles.stepText, { 
                color: getStepColor(photoTaken || !pickupDetails.photoRequired, !photoTaken && pickupDetails.photoRequired) 
              }]}>
                Package photo {photoTaken ? 'captured' : pickupDetails.photoRequired ? 'required' : 'not required'}
              </Text>
            </View>
            <View style={styles.confirmationStep}>
              {safetyChecked ? (
                <CheckCircle size={20} color={getStepColor(safetyChecked, !safetyChecked)} />
              ) : (
                <Timer size={20} color={getStepColor(safetyChecked, !safetyChecked)} />
              )}
              <Text style={[styles.stepText, { color: getStepColor(safetyChecked, !safetyChecked) }]}>
                Safety requirements acknowledged
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Support Actions */}
      <View style={styles.supportActions}>
        <TouchableOpacity style={styles.supportButton} onPress={onCallSupport} activeOpacity={0.8}>
          <Headphones size={18} color={COLORS.primary} />
          <Text style={styles.supportButtonText}>Call Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.issueButton} onPress={onReportIssue} activeOpacity={0.8}>
          <AlertTriangle size={18} color={COLORS.warning} />
          <Text style={styles.issueButtonText}>Report Issue</Text>
        </TouchableOpacity>
      </View>

      {/* Professional Start Delivery Button */}
      <View style={styles.deliveryContainer}>
        <TouchableOpacity
          style={[
            styles.deliveryButton,
            !confirmationComplete && styles.deliveryButtonDisabled
          ]}
          onPress={handleStartDelivery}
          disabled={!confirmationComplete}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={confirmationComplete ? 
              [COLORS.success, '#4CAF50'] : 
              [COLORS.disabled, COLORS.disabled]
            }
            style={styles.deliveryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {confirmationComplete ? (
              <Truck size={20} color={COLORS.white} />
            ) : (
              <Timer size={20} color={COLORS.white} />
            )}
            <Text style={styles.deliveryButtonText}>
              {confirmationComplete ? 'Start Hospital Delivery' : 'Complete Required Steps First'}
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
  headerGradient: {
    paddingTop: 50,
    paddingBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
  },
  headerTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.white,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: SPACING.xs,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
  },
  priorityText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  progressContainer: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 3,
  },
  progressText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: LAYOUT.borderWidth.thin,
    borderBottomColor: COLORS.gray200,
    ...SHADOWS.sm,
  },
  successIconContainer: {
    marginRight: SPACING.md,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  successSubtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  distanceDisplay: {
    alignItems: 'flex-end',
  },
  distanceAmount: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.primary,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  distanceLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  confirmationCard: {
    backgroundColor: COLORS.success + '10',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  cardTitle: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  qrDetails: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
  },
  qrCode: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.success,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    letterSpacing: 1,
  },
  timestamp: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  facilityName: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  facilityAddress: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  department: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  contactPhone: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  samplesDescription: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  sampleCount: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.round,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sampleCountText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  packageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  packageItem: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  packageValue: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginVertical: SPACING.xs,
  },
  packageLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  sampleTypes: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sampleType: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
  },
  sampleTypeText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },
  specialHandling: {
    backgroundColor: COLORS.warning + '10',
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  specialHandlingTitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.warning,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  handlingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  handlingText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.warning,
    flex: 1,
    lineHeight: 18,
  },
  photoCard: {
    backgroundColor: COLORS.warning + '10',
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.warning + '40',
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  photoCardComplete: {
    backgroundColor: COLORS.success + '10',
    borderColor: COLORS.success + '40',
  },
  photoRequirement: {
    alignItems: 'center',
  },
  photoText: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.warning,
    fontWeight: '600',
    marginVertical: SPACING.md,
  },
  photoSubtext: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  photoButton: {
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  photoButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  photoButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '600',
  },
  photoSuccess: {
    alignItems: 'center',
  },
  photoSuccessText: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.success,
    fontWeight: '600',
    marginVertical: SPACING.md,
    textAlign: 'center',
  },
  photoTimestamp: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  deliveryMetrics: {
    gap: SPACING.md,
  },
  deliveryMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  metricLabel: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  metricValue: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  safetyCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  safetyItems: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  safetyText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  safetyCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  safetyCheckboxChecked: {
    backgroundColor: COLORS.primary,
  },
  safetyCheckboxText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    flex: 1,
    fontWeight: '500',
  },
  safetyCheckboxTextChecked: {
    color: COLORS.white,
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  confirmationSteps: {
    gap: SPACING.md,
  },
  confirmationStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stepText: {
    ...TYPOGRAPHY.styles.body,
    flex: 1,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: SPACING.xl,
  },
  supportActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.primary,
    borderRadius: LAYOUT.radius.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  supportButtonText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  issueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.warning,
    borderRadius: LAYOUT.radius.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  issueButtonText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.warning,
    fontWeight: '600',
  },
  deliveryContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  deliveryButton: {
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  deliveryButtonDisabled: {
    opacity: 0.6,
  },
  deliveryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  deliveryButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.error,
    textAlign: 'center',
  },
});

export default PickupConfirmationScreen;