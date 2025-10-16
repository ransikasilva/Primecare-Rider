import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { ArrowLeft, Hospital as HospitalIcon, MapPin, Check, Info, ChevronDown, ChevronUp, CheckCircle, Truck, Navigation, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Hospital, RegistrationFormData } from '../types';
import { apiService } from '../services/api';

interface HospitalSelectionScreenProps {
  formData: RegistrationFormData;
  onNext: (selectedHospitals: { main?: string; regional: string[] }) => void;
  onBack: () => void;
}

// Mock hospital data - in real app this would come from API
const MOCK_HOSPITALS: Hospital[] = [
  {
    id: '1',
    network_id: 'net1',
    hospital_type: 'main',
    name: 'National Hospital of Sri Lanka',
    address: 'Regent Street, Colombo 08',
    city: 'Colombo',
    province: 'Western Province',
    contact_phone: '+94112691111',
    email: 'info@nhsl.health.gov.lk',
    coordinates_lat: 6.9271,
    coordinates_lng: 79.8612,
    hospital_code: 'NHSL001',
    main_hospital_id: undefined,
    is_main_hospital: true,
    status: 'active',
    distance: 2.5,
    delivery_count: 1250,
  },
  {
    id: '2',
    network_id: 'net2',
    hospital_type: 'main',
    name: 'Apollo Hospital Colombo',
    address: '578 Elvitigala Mawatha, Narahenpita',
    city: 'Colombo',
    province: 'Western Province',
    contact_phone: '+94115304444',
    email: 'info@apollohospitals.com',
    coordinates_lat: 6.9147,
    coordinates_lng: 79.8881,
    hospital_code: 'APL001',
    main_hospital_id: undefined,
    is_main_hospital: true,
    status: 'active',
    distance: 3.1,
    delivery_count: 890,
  },
  {
    id: '3',
    network_id: 'net3',
    hospital_type: 'main',
    name: 'Teaching Hospital Kandy',
    address: 'William Gopallawa Mawatha, Kandy',
    city: 'Kandy',
    province: 'Central Province',
    contact_phone: '+94812233337',
    email: 'info@kth.health.gov.lk',
    coordinates_lat: 7.2906,
    coordinates_lng: 80.6337,
    hospital_code: 'TKY001',
    main_hospital_id: undefined,
    is_main_hospital: true,
    status: 'active',
    distance: 115.2,
    delivery_count: 675,
  },
  {
    id: '4',
    network_id: 'net4',
    hospital_type: 'main',
    name: 'Teaching Hospital Karapitiya',
    address: 'Karapitiya, Galle',
    city: 'Galle',
    province: 'Southern Province',
    contact_phone: '+94912232261',
    email: 'info@kth.health.gov.lk',
    coordinates_lat: 6.0535,
    coordinates_lng: 80.2210,
    hospital_code: 'TGK001',
    main_hospital_id: undefined,
    is_main_hospital: true,
    status: 'active',
    distance: 118.7,
    delivery_count: 543,
  },
  {
    id: '5',
    network_id: 'net5',
    hospital_type: 'main',
    name: 'Kandy General Hospital',
    address: 'Kandy-Mahiyangana Road, Kandy',
    city: 'Kandy',
    province: 'Central Province',
    contact_phone: '+94812223261',
    email: 'info@kgh.health.gov.lk',
    coordinates_lat: 7.2984,
    coordinates_lng: 80.6350,
    hospital_code: 'KGH001',
    main_hospital_id: undefined,
    is_main_hospital: true,
    status: 'active',
    distance: 116.8,
    delivery_count: 432,
  },
];

const HospitalSelectionScreen: React.FC<HospitalSelectionScreenProps> = ({
  formData,
  onNext,
  onBack,
}) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    loadHospitals();
  }, []);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      // Call real API to get available hospitals
      const response = await apiService.getAvailableHospitals();

      console.log('API Response:', response);

      if (response.success && response.data) {
        // Backend returns: { data: { hospitals: { main_hospitals: [...], all_hospitals: [...] } } }
        // Riders can select from ALL hospitals (both main and regional)
        const hospitalsData = response.data.hospitals || {};
        const allHospitals = hospitalsData.all_hospitals || [];

        console.log('🏥 All hospitals loaded:', allHospitals.length);

        if (allHospitals.length > 0) {
          setHospitals(allHospitals);
        } else {
          console.warn('⚠️ No hospitals found in response');
          setHospitals([]);
        }
      } else {
        console.warn('⚠️ API failed:', response.error?.message);
        setHospitals([]);
      }
    } catch (error: any) {
      console.warn('Network error, using mock data:', error.message);
      // Fallback to mock data on network error
      setHospitals(MOCK_HOSPITALS);
    } finally {
      setLoading(false);
    }
  };

  const getDistanceText = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    }
    return `${distance.toFixed(1)}km away`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return COLORS.success;
      case 'inactive':
        return COLORS.error;
      default:
        return COLORS.warning;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      default:
        return 'Maintenance';
    }
  };


  const renderHospitalCard = (hospital: Hospital) => {
    const isSelected = selectedHospital === hospital.id;

    return (
      <TouchableOpacity
        key={hospital.id}
        style={[
          styles.hospitalCard,
          isSelected && styles.hospitalCardSelected,
        ]}
        onPress={() => setSelectedHospital(hospital.id)}
        activeOpacity={0.8}
      >
        <View style={styles.hospitalHeader}>
          <View style={styles.hospitalMainInfo}>
            <View style={styles.hospitalTitleRow}>
              <HospitalIcon size={20} color={COLORS.primary} />
              <Text style={styles.hospitalName}>{hospital.name}</Text>
            </View>
            <View style={styles.hospitalLocationRow}>
              <MapPin size={16} color={COLORS.textSecondary} />
              <Text style={styles.hospitalLocation}>
                {hospital.address}
              </Text>
            </View>
          </View>

          <View style={styles.selectionIndicator}>
            {isSelected ? (
              <View style={styles.selectedCircle}>
                <Check size={16} color={COLORS.white} />
              </View>
            ) : (
              <View style={styles.unselectedCircle} />
            )}
          </View>
        </View>

        <View style={styles.hospitalMetrics}>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: COLORS.success + '20' }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: COLORS.success }
              ]} />
              <Text style={[
                styles.statusText,
                { color: COLORS.success }
              ]}>
                Active
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleContinue = () => {
    if (!selectedHospital) {
      Alert.alert('Selection Required', 'Please select a hospital to continue.');
      return;
    }

    onNext({
      main: selectedHospital,
      regional: [], // For now, we're only selecting main hospital
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <HospitalIcon size={48} color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading hospitals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Professional Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Step 3 of 3</Text>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={[styles.progressFill, { width: '100%' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Professional Title Section */}
        <View style={styles.titleContainer}>
          <View style={styles.titleHeader}>
            <HospitalIcon size={32} color={COLORS.primary} />
            <View style={styles.titleTextContainer}>
              <Text style={styles.title}>Choose Your Hospital</Text>
              <Text style={styles.subtitle}>
                Select your preferred medical delivery partner
              </Text>
            </View>
          </View>
        </View>

        {/* Professional Partnership Rules */}
        <TouchableOpacity
          style={styles.rulesCard}
          onPress={() => setShowRules(!showRules)}
          activeOpacity={0.8}
        >
          <View style={styles.rulesHeader}>
            <Info size={20} color={COLORS.primary} />
            <Text style={styles.rulesTitle}>Partnership Guidelines</Text>
            {showRules ? (
              <ChevronUp size={20} color={COLORS.primary} />
            ) : (
              <ChevronDown size={20} color={COLORS.primary} />
            )}
          </View>
          {showRules && (
            <View style={styles.rulesContent}>
              <View style={styles.ruleItem}>
                <CheckCircle size={16} color={COLORS.success} />
                <Text style={styles.ruleText}>Receive assignments from your selected hospital</Text>
              </View>
              <View style={styles.ruleItem}>
                <CheckCircle size={16} color={COLORS.success} />
                <Text style={styles.ruleText}>Two-step approval: Hospital → TransFleet HQ</Text>
              </View>
              <View style={styles.ruleItem}>
                <CheckCircle size={16} color={COLORS.success} />
                <Text style={styles.ruleText}>Access to regional hospitals in network</Text>
              </View>
              <View style={styles.ruleItem}>
                <CheckCircle size={16} color={COLORS.success} />
                <Text style={styles.ruleText}>Professional medical delivery partnership</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Professional Hospitals List */}
        <View style={styles.hospitalsContainer}>
          <View style={styles.hospitalsHeader}>
            <Text style={styles.hospitalsTitle}>Available Partners</Text>
            <Text style={styles.hospitalsCount}>{hospitals?.length || 0} hospitals</Text>
          </View>
          {hospitals && hospitals.length > 0 ? (
            hospitals.map(renderHospitalCard)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No hospitals available</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Professional Bottom Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedHospital && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!selectedHospital}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={!selectedHospital ? 
              [COLORS.disabled, COLORS.disabled] : 
              [COLORS.primary, COLORS.primaryDark]
            }
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.buttonContent}>
              <Text style={[
                styles.continueButtonText,
                selectedHospital ? styles.continueButtonTextActive : styles.continueButtonTextInactive
              ]}>
                Complete Registration
              </Text>
              <ArrowRight 
                size={20} 
                color={selectedHospital ? COLORS.white : COLORS.textTertiary} 
              />
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  loadingText: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    ...SHADOWS.sm,
  },
  progressContainer: {
    flex: 1,
  },
  progressText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: LAYOUT.radius.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  titleContainer: {
    marginBottom: SPACING.xxl,
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.styles.h1,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textSecondary,
  },
  rulesCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOWS.card,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rulesTitle: {
    flex: 1,
    ...TYPOGRAPHY.styles.label,
    fontWeight: '600',
    color: COLORS.primary,
  },
  rulesContent: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: LAYOUT.borderWidth.thin,
    borderTopColor: COLORS.primary + '20',
    gap: SPACING.md,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  ruleText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    flex: 1,
  },
  hospitalsContainer: {
    marginBottom: SPACING.xl,
  },
  hospitalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  hospitalsTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.textPrimary,
  },
  hospitalsCount: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  hospitalCard: {
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.gray300,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
  },
  hospitalCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: LAYOUT.borderWidth.thick,
    backgroundColor: COLORS.primaryUltraLight,
    ...SHADOWS.lg,
  },
  hospitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  hospitalMainInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  hospitalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  hospitalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  hospitalName: {
    ...TYPOGRAPHY.styles.bodyLarge,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  hospitalLocation: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  selectionIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCircle: {
    width: 24,
    height: 24,
    borderRadius: LAYOUT.radius.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  unselectedCircle: {
    width: 24,
    height: 24,
    borderRadius: LAYOUT.radius.round,
    borderWidth: LAYOUT.borderWidth.thick,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
  },
  hospitalMetrics: {
    gap: SPACING.md,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliverySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  deliveryText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  distanceText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
    gap: SPACING.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: LAYOUT.radius.round,
  },
  statusText: {
    ...TYPOGRAPHY.styles.bodySmall,
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: LAYOUT.borderWidth.thin,
    borderTopColor: COLORS.gray200,
  },
  continueButton: {
    height: 56,
    borderRadius: LAYOUT.radius.xl,
    ...SHADOWS.md,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LAYOUT.radius.xl,
    paddingHorizontal: SPACING.xl,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  continueButtonText: {
    ...TYPOGRAPHY.styles.button,
    fontWeight: '600',
  },
  continueButtonTextActive: {
    color: COLORS.white,
  },
  continueButtonTextInactive: {
    color: COLORS.textTertiary,
  },
  emptyState: {
    padding: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default HospitalSelectionScreen;