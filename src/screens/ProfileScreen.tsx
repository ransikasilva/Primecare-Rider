import React, { useState, useCallback, useEffect } from 'react';
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
import { ArrowLeft, User, Settings, LogOut, TrendingUp, Package, CheckCircle, Phone, Mail, Car, Shield, Edit, Camera, Hospital, UserCheck, FileText } from 'lucide-react-native';
import { apiService } from '../services/api';
import BottomNavigation from '../components/BottomNavigation';

interface ProfileScreenProps {
  onBack: () => void;
  onEditProfile: () => void;
  onSettings: () => void;
  onSignOut: () => void;
  onViewDelivery: (deliveryId: string) => void;
  onEdit?: () => void;
  onViewPerformance?: () => void;
  onSupport?: () => void;
  onLogout?: () => void;
  onHomePress: () => void;
  onJobsPress: () => void;
  onReportsPress: () => void;
}

interface RiderProfile {
  personal_info: {
    name: string;
    initials: string;
    rider_id: string;
    status: 'Active' | 'Inactive';
    full_name: string;
    nic: string;
    phone: string;
    email: string;
  };
  hospital_partnership: {
    hospital_name: string;
    affiliation_date: string;
    status: 'Active' | 'Pending';
  };
  vehicle_details: {
    type: string;
    make_model: string;
    registration: string;
    insurance_valid_until: string;
    insurance_status: 'Valid' | 'Expired';
  };
  performance_overview: {
    total_deliveries: number;
    success_rate: number;
    on_time_rate: number;
    avg_delivery_time: number;
  };
  recent_deliveries: Array<{
    job_id: string;
    distance: string;
    date: string;
    time: string;
    status: string;
  }>;
}

const ProfileScreen: React.FC<ProfileScreenProps> = React.memo(({
  onBack,
  onEditProfile,
  onSettings,
  onSignOut,
  onViewDelivery,
  onHomePress,
  onJobsPress,
  onReportsPress,
}) => {
  const [profileData, setProfileData] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load profile data from API
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), 10000)
        );
        
        const apiPromise = apiService.getRiderProfile();
        const response = await Promise.race([apiPromise, timeoutPromise]);
        
        console.log('📡 Profile API response:', response);
        
        if (response && (response as any).success && (response as any).data) {
          // Transform API response to match RiderProfile interface
          const apiProfile = (response as any).data;
          setProfileData({
            personal_info: {
              name: apiProfile.rider_name || 'Rider',
              initials: apiProfile.rider_name?.split(' ').map((n: string) => n[0]).join('') || 'R',
              rider_id: apiProfile.id || 'N/A',
              status: apiProfile.status || 'Active',
              full_name: apiProfile.rider_name || 'N/A',
              nic: apiProfile.nic || 'N/A',
              phone: apiProfile.phone || 'N/A',
              email: apiProfile.email || 'N/A',
            },
            hospital_partnership: {
              hospital_name: apiProfile.hospital_name || 'Hospital',
              affiliation_date: 'TBD',
              status: apiProfile.hospital_status || 'Active',
            },
            vehicle_details: {
              type: apiProfile.vehicle_type || 'Vehicle',
              make_model: apiProfile.vehicle_model || 'N/A',
              registration: apiProfile.vehicle_registration || 'N/A',
              insurance_valid_until: 'TBD',
              insurance_status: 'Valid',
            },
            performance_overview: {
              total_deliveries: apiProfile.total_deliveries || 0,
              success_rate: apiProfile.success_rate || 0,
              on_time_rate: apiProfile.on_time_rate || 0,
              avg_delivery_time: apiProfile.avg_delivery_time || 0,
            },
            recent_deliveries: [],
          });
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        Alert.alert('Error', 'Failed to load profile data. Please try again later.');
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleEditProfile = useCallback(() => {
    Alert.alert(
      'Edit Profile',
      'This will open the profile editing interface where you can update your personal information.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit Profile', onPress: onEditProfile },
      ]
    );
  }, [onEditProfile]);

  const handleSettings = useCallback(() => {
    Alert.alert(
      'Settings',
      'Open advanced settings and preferences.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: onSettings },
      ]
    );
  }, [onSettings]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to log in again to access the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: onSignOut,
        },
      ]
    );
  }, [onSignOut]);

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 16, color: COLORS.textSecondary }}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if no profile data
  if (!profileData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }]}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' }}>Failed to Load Profile</Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 }}>Unable to load your profile data. Please check your connection and try again.</Text>
          <TouchableOpacity
            style={{ backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
            onPress={onBack}
          >
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header - White like CC app */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rider Profile</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <LogOut size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header - Centered like CC app */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={40} color={COLORS.primary} />
            </View>
          </View>

          <Text style={styles.profileName}>{profileData.personal_info.name}</Text>
          <Text style={styles.profileId}>{profileData.personal_info.rider_id}</Text>

          <View style={[
            styles.statusBadge,
            { backgroundColor: profileData.personal_info.status === 'Active' ? COLORS.success + '20' : COLORS.gray200 }
          ]}>
            <Text style={[
              styles.statusText,
              { color: profileData.personal_info.status === 'Active' ? COLORS.success : COLORS.textSecondary }
            ]}>
              {profileData.personal_info.status}
            </Text>
          </View>
        </View>

        {/* Hospital Partnership */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleContainer}>
            <Hospital size={16} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>HOSPITAL PARTNERSHIP</Text>
          </View>

          <View style={styles.partnershipInfo}>
            <View style={styles.partnershipItem}>
              <Text style={styles.partnershipLabel}>Hospital:</Text>
              <Text style={styles.partnershipValue}>{profileData.hospital_partnership.hospital_name}</Text>
            </View>
            <View style={styles.partnershipStatus}>
              <Text style={styles.partnershipLabel}>Status:</Text>
              <View style={styles.partnershipActiveContainer}>
                <Text style={styles.partnershipActiveValue}>
                  {profileData.hospital_partnership.status}
                </Text>
                <CheckCircle size={16} color={COLORS.success} />
              </View>
            </View>
          </View>
        </View>

        {/* Personal Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleContainer}>
            <User size={16} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>
          </View>
          
          <View style={styles.detailsInfo}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Full Name:</Text>
              <Text style={styles.detailValue}>{profileData.personal_info.full_name}</Text>
            </View>
            {profileData.personal_info.nic && profileData.personal_info.nic !== 'N/A' && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>NIC:</Text>
                <Text style={styles.detailValue}>{profileData.personal_info.nic}</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <View style={styles.detailValueContainer}>
                <Text style={styles.detailValue}>{profileData.personal_info.phone}</Text>
                <CheckCircle size={16} color={COLORS.success} />
              </View>
            </View>
          </View>
        </View>

        {/* Vehicle Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleContainer}>
            <Car size={16} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
          </View>
          
          <View style={styles.vehicleInfo}>
            {profileData.vehicle_details.type && profileData.vehicle_details.type !== 'N/A' && (
              <View style={styles.vehicleItem}>
                <Text style={styles.vehicleLabel}>Type:</Text>
                <Text style={styles.vehicleValue}>{profileData.vehicle_details.type}</Text>
              </View>
            )}
            {profileData.vehicle_details.registration && profileData.vehicle_details.registration !== 'N/A' && (
              <View style={styles.vehicleItem}>
                <Text style={styles.vehicleLabel}>Registration:</Text>
                <Text style={styles.vehicleValue}>{profileData.vehicle_details.registration}</Text>
              </View>
            )}
            {profileData.vehicle_details.insurance_valid_until && profileData.vehicle_details.insurance_valid_until !== 'TBD' && (
              <View style={styles.vehicleItem}>
                <Text style={styles.vehicleLabel}>Insurance:</Text>
                <View style={styles.vehicleValueContainer}>
                  <Text style={styles.vehicleValue}>Valid until {profileData.vehicle_details.insurance_valid_until}</Text>
                  <CheckCircle size={16} color={COLORS.success} />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Performance Overview */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleContainer}>
            <TrendingUp size={16} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>DELIVERY STATISTICS</Text>
          </View>
          
          <View style={styles.performanceHeader}>
            <Text style={styles.deliveryStatsText}>
              Professional Medical Delivery Service
            </Text>
            <Text style={styles.ratingSubtext}>
              ({profileData.performance_overview.total_deliveries} completed deliveries)
            </Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileData.performance_overview.total_deliveries}</Text>
              <Text style={styles.statLabel}>Total Deliveries</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileData.performance_overview.success_rate}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileData.performance_overview.on_time_rate}%</Text>
              <Text style={styles.statLabel}>On-time Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileData.performance_overview.avg_delivery_time} min</Text>
              <Text style={styles.statLabel}>Avg. Delivery Time</Text>
            </View>
          </View>
        </View>

        {/* Recent Deliveries */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleContainer}>
            <Package size={16} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>RECENT DELIVERIES</Text>
          </View>
          
          <View style={styles.deliveriesList}>
            {profileData.recent_deliveries.map((delivery, index) => (
              <TouchableOpacity
                key={index}
                style={styles.deliveryItem}
                onPress={() => onViewDelivery(delivery.job_id)}
              >
                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryJobId}>{delivery.job_id}</Text>
                  <Text style={styles.deliveryDetails}>
                    {delivery.distance}, {delivery.date} {delivery.time}
                  </Text>
                </View>
                <View style={styles.deliveryStatus}>
                  <CheckCircle size={16} color={COLORS.success} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Bottom Sign Out */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      
      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="profile"
        onHomePress={onHomePress}
        onJobsPress={onJobsPress}
        onReportsPress={onReportsPress}
        onProfilePress={() => {}}
      />
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
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  logoutButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  avatarContainer: {
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  profileId: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  partnershipInfo: {
    gap: 12,
  },
  partnershipItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  partnershipLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  partnershipValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  partnershipStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  partnershipActiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  partnershipActiveValue: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
  },
  detailsInfo: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedIcon: {
    fontSize: 16,
  },
  vehicleInfo: {
    gap: 12,
  },
  vehicleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  vehicleValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  vehicleValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  performanceHeader: {
    marginBottom: 16,
  },
  deliveryStatsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  ratingSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: '48%',
    backgroundColor: COLORS.gray50,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  deliveriesList: {
    gap: 12,
  },
  deliveryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    padding: 12,
    borderRadius: 8,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryJobId: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  deliveryDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  deliveryStatus: {
    marginLeft: 16,
  },
  bottomContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingTop: 16,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  signOutButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;