import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { User, MapPin, Clock, ArrowRight, Flag, TrendingUp, Package, Package2, RotateCcw, AlertTriangle, Home, Briefcase, BarChart3, Settings, ChevronRight, Phone, Activity } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import AvailabilityToggle from '../components/AvailabilityToggle';
import BottomNavigation from '../components/BottomNavigation';
import { apiService } from '../services/api';
import { useLocation } from '../hooks/useLocation';
import notificationService from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface DashboardHomeScreenProps {
  riderName: string;
  onViewAllJobs: () => void;
  onKMReport: () => void;
  onProfile: () => void;
  onEmergency: () => void;
  onSupport: () => void;
  onReportIssue: () => void;
}

interface StatsData {
  todayDistance: string;
  todayDeliveries: number;
  pendingJobs: number;
  monthlyDistance: string;
  monthlyDeliveries: number;
  kmTarget: string;
  completionRate: number;
}

interface JobItem {
  id: string;
  hospital: string;
  sampleType: string;
  priority: 'URGENT' | 'STANDARD';
  distance: string;
  pickupTime: string;
  totalKM: string;
}

const DashboardHomeScreen: React.FC<DashboardHomeScreenProps> = ({
  riderName,
  onViewAllJobs,
  onKMReport,
  onProfile,
  onEmergency,
  onSupport,
  onReportIssue,
}) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // GPS tracking hook
  const { updateTrackingInterval } = useLocation();

  // Real stats data from backend
  const [stats, setStats] = useState<StatsData>({
    todayDistance: '0',
    todayDeliveries: 0,
    pendingJobs: 0,
    monthlyDistance: '0',
    monthlyDeliveries: 0,
    kmTarget: '0 km target',
    completionRate: 0,
  });

  const [nearbyJobs, setNearbyJobs] = useState<JobItem[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadDashboardData();
    // Register for push notifications automatically on dashboard load
    registerPushNotifications();
  }, []);

  const registerPushNotifications = async () => {
    try {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        const userProfileData = await AsyncStorage.getItem('user_profile');
        const userProfile = userProfileData ? JSON.parse(userProfileData) : null;
        const riderId = userProfile?.rider_id || userProfile?.id;

        if (riderId) {
          await apiService.updateExpoPushToken(riderId, token);
          console.log('✅ Push notifications registered automatically');
        }
      }
    } catch (error) {
      console.log('⚠️ Could not register push notifications:', error);
    }
  };

  // Update GPS tracking interval based on active orders
  useEffect(() => {
    const hasActiveOrders = stats.pendingJobs > 0;
    updateTrackingInterval(hasActiveOrders);
  }, [stats.pendingJobs]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats
      const [dashboardResponse, nearbyJobsResponse] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getNearbyJobs()
      ]);

      if (dashboardResponse.success && dashboardResponse.data) {
        const dashboardData = dashboardResponse.data;
        setStats({
          todayDistance: dashboardData.todayDistance?.toString() || '0',
          todayDeliveries: dashboardData.todayDeliveries || 0,
          pendingJobs: dashboardData.pendingJobs || 0,
          monthlyDistance: dashboardData.monthlyDistance?.toString() || '0',
          monthlyDeliveries: dashboardData.monthlyDeliveries || 0,
          kmTarget: `${dashboardData.kmTarget || 0} km target`,
          completionRate: dashboardData.completionRate || 0,
        });
      }

      if (nearbyJobsResponse.success && nearbyJobsResponse.data) {
        const jobsData = nearbyJobsResponse.data.jobs || [];
        const formattedJobs: JobItem[] = jobsData.slice(0, 3).map((job: any) => ({
          id: job.id,
          hospital: job.hospital_name || job.hospital?.name || 'Unknown Hospital',
          sampleType: job.sample_type || 'Samples',
          priority: job.urgency === 'urgent' ? 'URGENT' : 'STANDARD',
          distance: `${job.distance?.toFixed(1) || '0'}km`,
          pickupTime: `${job.estimated_pickup_time || '15'} min`,
          totalKM: `${job.total_distance?.toFixed(1) || '0'}km total`,
        }));
        setNearbyJobs(formattedJobs);
      }
    } catch (error: any) {
      console.warn('Dashboard data loading error:', error.message);
      // Keep existing mock data or show error message
      Alert.alert(
        'Data Loading Issue',
        'Unable to load latest data. Using cached information.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleAvailabilityChange = useCallback((newAvailability: boolean) => {
    setIsAvailable(newAvailability);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);


  const renderJobCard = (job: JobItem, index: number) => (
    <View
      key={job.id} 
      style={[styles.jobCard, index === 0 && styles.featuredJobCard]}
    >
      {index === 0 && (
        <View style={styles.featuredBadge}>
          <Flag size={12} color={COLORS.warning} />
          <Text style={styles.featuredBadgeText}>Featured</Text>
        </View>
      )}
      
      <View style={styles.jobCardContent}>
        <View style={styles.jobCardHeader}>
          <View style={styles.jobCardLeft}>
            <Text style={styles.jobHospitalName} numberOfLines={1}>{job.hospital}</Text>
            <Text style={styles.jobSampleType} numberOfLines={1}>{job.sampleType}</Text>
          </View>
          <View style={styles.jobCardRight}>
            <View style={[
              styles.priorityPill,
              {
                backgroundColor: job.priority === 'URGENT' 
                  ? COLORS.error + '15' 
                  : COLORS.success + '15'
              }
            ]}>
              <Text style={[
                styles.priorityPillText,
                {
                  color: job.priority === 'URGENT' 
                    ? COLORS.error 
                    : COLORS.success
                }
              ]}>
                {job.priority}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.jobCardDetails}>
          <View style={styles.jobDetailItem}>
            <MapPin size={14} color={COLORS.textSecondary} />
            <Text style={styles.jobDetailText} numberOfLines={1}>{job.distance} away</Text>
          </View>
          <View style={styles.jobDetailItem}>
            <Clock size={14} color={COLORS.textSecondary} />
            <Text style={styles.jobDetailText} numberOfLines={1}>{job.pickupTime} pickup</Text>
          </View>
          <View style={styles.jobDetailItem}>
            <Activity size={14} color={COLORS.primary} />
            <Text style={[styles.jobDetailText, styles.jobDetailKmText]} numberOfLines={1}>
              {job.totalKM}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.acceptJobButton} activeOpacity={0.8}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.acceptJobGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.acceptJobButtonText}>Accept Job</Text>
            <ArrowRight size={16} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActionTile = (
    IconComponent: React.ComponentType<{ size: number; color: string }>,
    title: string,
    subtitle: string,
    onPress: () => void,
    color: string
  ) => (
    <TouchableOpacity 
      style={styles.actionTile} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.actionTileText, { backgroundColor: color + '15' }]}>
        <IconComponent size={20} color={color} />
      </View>
      <View style={styles.actionTileContent}>
        <Text style={styles.actionTileTitle}>{title}</Text>
        <Text style={styles.actionTileSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Professional White Header - like Collection Center App */}
      <View style={styles.headerBackground} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {getGreeting()}, {riderName || 'Rider'}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot,
              { backgroundColor: isAvailable ? COLORS.success : COLORS.gray400 }
            ]} />
            <Text style={styles.statusText}>
              {isAvailable ? 'Available for pickups' : 'Offline'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={onSupport}>
            <Phone size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarButton} onPress={onProfile}>
            <User size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Availability Toggle Card */}
      <View style={styles.availabilitySection}>
        <AvailabilityToggle
          isAvailable={isAvailable}
          onToggle={handleAvailabilityChange}
          riderName={riderName}
        />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Professional Performance Dashboard */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          
          {/* World-Class Performance Cards */}
          <View style={styles.mainStatsGrid}>
            <View style={styles.worldClassCard}>
              <View style={styles.cardIconContainer}>
                <Flag size={18} color={COLORS.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardValue}>{stats.todayDeliveries}</Text>
                <Text style={styles.cardLabel}>Deliveries</Text>
                <Text style={styles.cardSubtext}>{stats.completionRate}% rate</Text>
              </View>
            </View>

            <View style={styles.worldClassCard}>
              <View style={styles.cardIconContainer}>
                <RotateCcw size={18} color={COLORS.success} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardValue}>{stats.monthlyDistance}</Text>
                <Text style={styles.cardLabel}>KM Month</Text>
                <Text style={styles.cardSubtext}>528 target</Text>
              </View>
            </View>
          </View>

          {/* World-Class Quick Stats */}
          <View style={styles.quickStatsGrid}>
            <View style={styles.quickStatCard}>
              <View style={styles.quickStatIcon}>
                <Package size={16} color={COLORS.primary} />
              </View>
              <View style={styles.quickStatContent}>
                <Text style={styles.quickStatValue}>{stats.todayDistance}</Text>
                <Text style={styles.quickStatLabel}>km today</Text>
              </View>
            </View>
            
            <View style={styles.quickStatCard}>
              <View style={styles.quickStatIcon}>
                <Clock size={16} color={COLORS.warning} />
              </View>
              <View style={styles.quickStatContent}>
                <Text style={styles.quickStatValue}>{stats.pendingJobs}</Text>
                <Text style={styles.quickStatLabel}>pending</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Available Jobs - Premium Design */}
        <View style={styles.jobsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Package2 size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Available Jobs</Text>
            </View>
            <TouchableOpacity onPress={onViewAllJobs} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jobsScrollView}>
            {nearbyJobs.map((job, index) => renderJobCard(job, index))}
          </ScrollView>
        </View>

        {/* Quick Actions - Professional Grid */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {renderActionTile(
              BarChart3,
              'Performance',
              'View detailed reports',
              onKMReport,
              COLORS.success
            )}
            {renderActionTile(
              Settings,
              'Support',
              '24/7 assistance available',
              onSupport,
              COLORS.primary
            )}
          </View>
        </View>

        {/* Emergency & Support - Premium Design */}
        <View style={styles.emergencySection}>
          <TouchableOpacity style={styles.emergencyButton} onPress={onEmergency} activeOpacity={0.8}>
            <LinearGradient
              colors={[COLORS.error, '#d32f2f']}
              style={styles.emergencyGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <AlertTriangle size={20} color={COLORS.white} />
              <Text style={styles.emergencyButtonText}>Emergency Assistance</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reportIssueButton} onPress={onReportIssue} activeOpacity={0.8}>
            <AlertTriangle size={20} color={COLORS.warning} />
            <Text style={styles.reportIssueText}>Report an Issue</Text>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Professional Bottom Navigation */}
      <BottomNavigation
        activeTab="home"
        onHomePress={() => {}}
        onJobsPress={onViewAllJobs}
        onReportsPress={onKMReport}
        onProfilePress={onProfile}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: COLORS.white,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...TYPOGRAPHY.styles.h3,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilitySection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  content: {
    flex: 1,
  },
  performanceSection: {
    backgroundColor: COLORS.white,
    margin: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  sectionTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  mainStatsGrid: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  worldClassCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.xl,
    ...SHADOWS.card,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryUltraLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 32,
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.success,
    opacity: 0.8,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    minHeight: 80,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  quickStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  quickStatContent: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobsSection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryUltraLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.lg,
  },
  viewAllText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  jobsScrollView: {
    paddingLeft: SPACING.md,
  },
  jobCard: {
    width: screenWidth * 0.75,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    marginRight: SPACING.md,
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.gray200,
    minHeight: 200,
    ...SHADOWS.card,
  },
  jobCardContent: {
    flex: 1,
    padding: SPACING.lg,
    paddingBottom: 0,
  },
  featuredJobCard: {
    borderColor: COLORS.primary,
    borderWidth: LAYOUT.borderWidth.thick,
    ...SHADOWS.lg,
  },
  featuredBadge: {
    position: 'absolute',
    top: -8,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  featuredBadgeText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.white,
    fontWeight: '600',
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  jobCardLeft: {
    flex: 1,
    marginRight: SPACING.md,
    minWidth: 0, // Allow text to shrink
  },
  jobCardRight: {
    alignItems: 'flex-end',
    flexShrink: 0, // Prevent pill from shrinking
  },
  jobHospitalName: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  jobSampleType: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  priorityPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
  },
  priorityPillText: {
    ...TYPOGRAPHY.styles.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  jobCardDetails: {
    flexDirection: 'column',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  jobDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minWidth: 0,
  },
  jobDetailText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
    minWidth: 0,
  },
  jobDetailKmText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  acceptJobButton: {
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    marginTop: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  acceptJobGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  acceptJobButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '600',
  },
  actionsSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  actionsGrid: {
    gap: SPACING.md,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  actionTileText: {
    width: 44,
    height: 44,
    borderRadius: LAYOUT.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTileContent: {
    flex: 1,
  },
  actionTileTitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  actionTileSubtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  emergencySection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  emergencyButton: {
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  emergencyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  emergencyButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '700',
  },
  reportIssueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  reportIssueText: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
    marginLeft: SPACING.sm,
  },
  bottomSpacing: {
    height: SPACING.xl,
  },
  textIcon: {
    fontSize: 20,
    textAlign: 'center',
  },
  smallTextIcon: {
    fontSize: 18,
    textAlign: 'center',
  },
  miniTextIcon: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DashboardHomeScreen;