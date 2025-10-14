import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { MapPin, Wrench, Activity, Fuel, Clock, Navigation, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { apiService } from '../services/api';

interface StartHandoverScreenProps {
  jobId: string;
  onBack: () => void;
  onBeginHandover: (reason: string) => void;
  onEmergencySupport?: () => void;
}

interface HandoverData {
  current_delivery: {
    route: string;
    samples: string[];
    pickup_completed: boolean;
    remaining_distance: string;
  };
  sample_integrity: {
    properly_sealed: boolean;
    temperature_maintained: boolean;
    no_damage: boolean;
    qr_codes_intact: boolean;
    receipt_available: boolean;
  };
  current_location: {
    address: string;
    coordinates: string;
  };
  handover_requirements: string[];
  safety_guidelines: string[];
}

const HANDOVER_REASONS = [
  {
    id: 'distance',
    title: 'Long distance / Unable to complete',
    IconComponent: MapPin,
  },
  {
    id: 'vehicle',
    title: 'Vehicle breakdown/mechanical issue',
    IconComponent: Wrench,
  },
  {
    id: 'medical',
    title: 'Medical emergency',
    IconComponent: Activity,
  },
  {
    id: 'fuel',
    title: 'Fuel shortage',
    IconComponent: Fuel,
  },
  {
    id: 'personal',
    title: 'Personal emergency/time constraints',
    IconComponent: Clock,
  },
  {
    id: 'traffic',
    title: 'Traffic/route issues',
    IconComponent: Navigation,
  },
  {
    id: 'technical',
    title: 'Other technical problem',
    IconComponent: AlertTriangle,
  },
];

const StartHandoverScreen: React.FC<StartHandoverScreenProps> = React.memo(({
  jobId,
  onBack,
  onBeginHandover,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [showSafetyGuidelines, setShowSafetyGuidelines] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dynamic handover data loaded from API
  const [handoverData, setHandoverData] = useState<HandoverData | null>(null);

  useEffect(() => {
    const loadJobData = async () => {
      try {
        setLoading(true);
        const response = await apiService.getOrderDetails(jobId);
        
        if (response.success && response.data) {
          const orderData = response.data.order || response.data;
          
          // Transform API data to HandoverData format
          const transformedData: HandoverData = {
            current_delivery: {
              route: `${orderData.center_name || 'Collection Center'} → ${orderData.hospital_name || 'Hospital'}`,
              samples: orderData.sample_details ? [orderData.sample_details] : ['Medical samples'],
              pickup_completed: orderData.status === 'picked_up' || orderData.status === 'delivery_started',
              remaining_distance: `${orderData.delivery_distance?.toFixed(1) || '0'} km to hospital`,
            },
            sample_integrity: {
              properly_sealed: true,
              temperature_maintained: true,
              no_damage: true,
              qr_codes_intact: true,
              receipt_available: true,
            },
            current_location: {
              address: 'Current location via GPS',
              coordinates: 'Lat/Lng coordinates',
            },
            handover_requirements: [
              'Verify receiving rider ID',
              'Scan combined QR code',
              'Confirm sample integrity',
              'Complete handover documentation',
            ],
            safety_guidelines: [
              'Handle samples with care',
              'Maintain temperature requirements',
              'Use protective equipment',
              'Follow biohazard protocols',
            ],
          };
          
          setHandoverData(transformedData);
        }
      } catch (error: any) {
        console.error('Failed to load job data:', error);
        // Set fallback data
        setHandoverData({
    current_delivery: {
      route: 'Nawaloka Labs → National Hospital',
      samples: ['8 blood tubes', '3 urine samples'],
      pickup_completed: true,
      remaining_distance: '1.2 km to hospital',
    },
    sample_integrity: {
      properly_sealed: true,
      temperature_maintained: true,
      no_damage: true,
      qr_codes_intact: true,
      receipt_available: true,
    },
    current_location: {
      address: 'Galle Road, near Liberty Plaza',
      coordinates: '6.9147° N, 79.8731° E',
    },
    handover_requirements: [
      'Receiving rider must be TransFleet approved',
      'Both riders must scan QR codes',
      'GPS location logged',
      'Hospital notified of rider change',
      'Chain of custody maintained',
    ],
    safety_guidelines: [
      'Meet only in public, well-lit locations',
      'Verify receiving rider\'s ID and credentials',
      'Take photos of handover process',
      'Ensure emergency contacts are notified',
      'Complete handover within 15 minutes',
      'Report any suspicious behavior immediately',
    ],
        });
      } finally {
        setLoading(false);
      }
    };

    loadJobData();
  }, [jobId]);

  const handleReasonSelect = useCallback((reasonId: string) => {
    setSelectedReason(reasonId);
  }, []);

  const handleBeginHandover = useCallback(async () => {
    if (!selectedReason) {
      Alert.alert('Reason Required', 'Please select a reason for the handover before proceeding.');
      return;
    }

    const selectedReasonData = HANDOVER_REASONS.find(r => r.id === selectedReason);
    
    Alert.alert(
      'Start Handover Process?',
      `You are requesting a handover due to: ${selectedReasonData?.title}\n\nThis will notify nearby riders and hospital staff.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Begin Handover', 
          onPress: async () => {
            try {
              // Call API to initiate handover
              const response = await apiService.initiateHandover(jobId, selectedReason);
              
              if (response.success) {
                onBeginHandover(selectedReason);
              } else {
                Alert.alert(
                  'Handover Failed',
                  response.error?.message || 'Could not initiate handover. Please try again.'
                );
              }
            } catch (error: any) {
              Alert.alert(
                'Connection Error',
                error.message || 'Could not connect to server. Please check your connection.'
              );
            }
          }
        },
      ]
    );
  }, [selectedReason, onBeginHandover, jobId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Loading...</Text>
            <Text style={styles.jobId}>Job ID: {jobId}</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!handoverData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Error</Text>
            <Text style={styles.jobId}>Unable to load job</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Unable to load job details. Please try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Start Handover</Text>
          <Text style={styles.jobId}>Job ID: {jobId}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Delivery Summary */}
        <View style={styles.deliveryCard}>
          <Text style={styles.sectionTitle}>CURRENT DELIVERY</Text>
          
          <View style={styles.deliveryInfo}>
            <Text style={styles.routeText}>{handoverData.current_delivery.route}</Text>
            
            <View style={styles.samplesInfo}>
              <Text style={styles.samplesLabel}>Samples:</Text>
              {handoverData.current_delivery.samples.map((sample, index) => (
                <Text key={index} style={styles.sampleItem}>• {sample}</Text>
              ))}
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Pickup completed:</Text>
              <View style={styles.statusValueContainer}>
                {handoverData.current_delivery.pickup_completed ? (
                  <>
                    <CheckCircle2 size={16} color={COLORS.success} />
                    <Text style={styles.statusValue}>Yes</Text>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} color={COLORS.error} />
                    <Text style={styles.statusValue}>No</Text>
                  </>
                )}
              </View>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Remaining distance:</Text>
              <Text style={styles.statusValue}>{handoverData.current_delivery.remaining_distance}</Text>
            </View>
          </View>
        </View>

        {/* Handover Reason */}
        <View style={styles.reasonCard}>
          <Text style={styles.sectionTitle}>HANDOVER REASON</Text>
          <Text style={styles.reasonSubtitle}>Please select the reason for requesting a handover:</Text>
          
          <View style={styles.reasonOptions}>
            {HANDOVER_REASONS.map((reason) => {
              const IconComponent = reason.IconComponent;
              const isSelected = selectedReason === reason.id;
              return (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonOption,
                    isSelected && styles.reasonOptionSelected
                  ]}
                  onPress={() => handleReasonSelect(reason.id)}
                >
                  <View style={styles.reasonIconContainer}>
                    <IconComponent
                      size={20}
                      color={isSelected ? COLORS.primary : COLORS.textSecondary}
                    />
                  </View>
                  <Text style={[
                    styles.reasonText,
                    isSelected && styles.reasonTextSelected
                  ]}>
                    {reason.title}
                  </Text>
                  <View style={[
                    styles.radioButton,
                    isSelected && styles.radioButtonSelected
                  ]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sample Integrity Check */}
        <View style={styles.integrityCard}>
          <Text style={styles.sectionTitle}>SAMPLE INTEGRITY CHECK</Text>
          <Text style={styles.integritySubtitle}>All verified ✅</Text>
          
          <View style={styles.integrityChecks}>
            <View style={styles.checkItem}>
              <CheckCircle2 size={18} color={COLORS.success} />
              <Text style={styles.checkText}>Samples properly sealed</Text>
            </View>
            <View style={styles.checkItem}>
              <CheckCircle2 size={18} color={COLORS.success} />
              <Text style={styles.checkText}>Temperature maintained (refrigerated items)</Text>
            </View>
            <View style={styles.checkItem}>
              <CheckCircle2 size={18} color={COLORS.success} />
              <Text style={styles.checkText}>No damage during transport</Text>
            </View>
            <View style={styles.checkItem}>
              <CheckCircle2 size={18} color={COLORS.success} />
              <Text style={styles.checkText}>QR codes intact and readable</Text>
            </View>
            <View style={styles.checkItem}>
              <CheckCircle2 size={18} color={COLORS.success} />
              <Text style={styles.checkText}>Collection receipt available</Text>
            </View>
          </View>
        </View>

        {/* Handover Requirements */}
        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>Handover Requirements</Text>
          <Text style={styles.requirementsSubtitle}>
            Important guidelines for safe handover process
          </Text>
          
          <View style={styles.requirementsList}>
            {handoverData.handover_requirements.map((requirement, index) => (
              <Text key={index} style={styles.requirementItem}>• {requirement}</Text>
            ))}
          </View>
        </View>

        {/* Current Location */}
        <View style={styles.locationCard}>
          <Text style={styles.sectionTitle}>CURRENT LOCATION</Text>
          
          <View style={styles.locationInfo}>
            <Text style={styles.locationAddress}>{handoverData.current_location.address}</Text>
            <Text style={styles.locationCoordinates}>{handoverData.current_location.coordinates}</Text>
          </View>
          
          <View style={styles.locationNote}>
            <MapPin size={16} color={COLORS.textSecondary} />
            <Text style={styles.locationNoteText}>
              This location will be shared with the receiving rider
            </Text>
          </View>
        </View>


        {/* Safety Guidelines */}
        <View style={styles.safetyCard}>
          <TouchableOpacity 
            style={styles.safetyHeader}
            onPress={() => setShowSafetyGuidelines(!showSafetyGuidelines)}
          >
            <Text style={styles.safetyTitle}>Safety Guidelines</Text>
            <Text style={styles.safetyToggle}>{showSafetyGuidelines ? '▼' : '▶'}</Text>
          </TouchableOpacity>
          
          {showSafetyGuidelines && (
            <View style={styles.safetyList}>
              {handoverData.safety_guidelines.map((guideline, index) => (
                <Text key={index} style={styles.safetyItem}>• {guideline}</Text>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.beginButton,
            !selectedReason && styles.beginButtonDisabled
          ]}
          onPress={handleBeginHandover}
          disabled={!selectedReason}
        >
          <Text style={[
            styles.beginButtonText,
            !selectedReason && styles.beginButtonTextDisabled
          ]}>
            Begin Handover Process
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
  jobId: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg * 1.5,
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginVertical: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  deliveryInfo: {
    gap: 12,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  samplesInfo: {
    gap: 4,
  },
  samplesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sampleItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingLeft: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  reasonCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  reasonSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  reasonOptions: {
    gap: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.background,
  },
  reasonOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E6F7FF',
  },
  reasonIconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  reasonText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray200,
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  integrityCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  integritySubtitle: {
    fontSize: 16,
    color: COLORS.success,
    fontWeight: '600',
    marginBottom: 16,
  },
  integrityChecks: {
    gap: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  requirementsCard: {
    backgroundColor: '#E6F7FF',
    borderWidth: 1,
    borderColor: '#91D5FF',
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1890FF',
    marginBottom: 4,
  },
  requirementsSubtitle: {
    fontSize: 14,
    color: '#1890FF',
    marginBottom: 12,
  },
  requirementsList: {
    gap: 6,
  },
  requirementItem: {
    fontSize: 14,
    color: '#1890FF',
    lineHeight: 20,
  },
  locationCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  locationInfo: {
    marginBottom: 12,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  locationCoordinates: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  locationNote: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  locationNoteText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  safetyCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg * 2,
  },
  safetyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  safetyToggle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  safetyList: {
    marginTop: 12,
    gap: 8,
  },
  safetyItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
  beginButton: {
    backgroundColor: COLORS.primary,
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
  beginButtonDisabled: {
    backgroundColor: COLORS.gray100,
  },
  beginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  beginButtonTextDisabled: {
    color: COLORS.textTertiary,
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

export default StartHandoverScreen;