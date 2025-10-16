import React, { useCallback, useState, useEffect } from 'react';
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
import { apiService } from '../services/api';

interface JobCompletedScreenProps {
  jobId: string;
  onBackToHome: () => void;
  onViewEarnings: () => void;
  onStartNewJob: () => void;
  onGoHome?: () => void;
  onNewJob?: () => void;
  onViewSummary?: () => void;
}

interface JobCompletionData {
  job_id: string;
  performance_summary: {
    total_distance: string;
    pickup_distance: string;
    delivery_distance: string;
    total_time: string;
    time_ahead_of_schedule: string;
    schedule_status: 'ahead' | 'on_time' | 'behind';
  };
  monthly_progress: {
    this_job_km: string;
    today_total_km: string;
    monthly_total_km: string;
    goal_status: string;
  };
  delivery_info: {
    route_from: string;
    route_to: string;
    start_time: string;
    end_time: string;
    samples_status: string;
  };
  chain_of_custody: {
    pickup_time: string;
    pickup_verified: boolean;
    gps_tracking: boolean;
    delivery_time: string;
    delivery_confirmed: boolean;
  };
}

const JobCompletedScreen: React.FC<JobCompletedScreenProps> = React.memo(({
  jobId,
  onBackToHome,
  onViewEarnings,
  onStartNewJob,
}) => {
  const [loading, setLoading] = useState(true);
  const [completionData, setCompletionData] = useState<JobCompletionData>({
    job_id: jobId,
    performance_summary: {
      total_distance: '0 km',
      pickup_distance: '0 km',
      delivery_distance: '0 km',
      total_time: '0 minutes',
      time_ahead_of_schedule: 'Loading...',
      schedule_status: 'on_time',
    },
    monthly_progress: {
      this_job_km: '0 km',
      today_total_km: '0 km',
      monthly_total_km: '0 km',
      goal_status: 'Loading...',
    },
    delivery_info: {
      route_from: 'Loading...',
      route_to: 'Loading...',
      start_time: '--',
      end_time: '--',
      samples_status: 'Loading...',
    },
    chain_of_custody: {
      pickup_time: '--',
      pickup_verified: false,
      gps_tracking: false,
      delivery_time: '--',
      delivery_confirmed: false,
    },
  });

  useEffect(() => {
    loadJobCompletionData();
  }, [jobId]);

  const loadJobCompletionData = async () => {
    try {
      setLoading(true);

      const [jobDetailsResponse, performanceResponse] = await Promise.all([
        apiService.getOrderDetails(jobId),
        apiService.getRiderPerformance()
      ]);

      if (jobDetailsResponse.success && performanceResponse.success) {
        const jobData = jobDetailsResponse.data;
        const performanceData = performanceResponse.data;

        const completionInfo: JobCompletionData = {
          job_id: jobId,
          performance_summary: {
            total_distance: `${jobData.total_distance || '0'} km`,
            pickup_distance: `${jobData.pickup_distance || '0'} km`,
            delivery_distance: `${jobData.delivery_distance || '0'} km`,
            total_time: jobData.completion_time || '0 minutes',
            time_ahead_of_schedule: jobData.schedule_status === 'ahead'
              ? `${jobData.time_difference} ahead of schedule!`
              : jobData.schedule_status === 'behind'
              ? `${jobData.time_difference} behind schedule`
              : 'On time',
            schedule_status: jobData.schedule_status || 'on_time',
          },
          monthly_progress: {
            this_job_km: `+${jobData.total_distance || '0'} km`,
            today_total_km: `${performanceData.today_distance || '0'} km`,
            monthly_total_km: `${performanceData.monthly_distance || '0'} km`,
            goal_status: performanceData.goal_status || 'On track for monthly goal',
          },
          delivery_info: {
            route_from: jobData.collection_center?.name || 'Unknown Center',
            route_to: jobData.hospital?.name || 'Unknown Hospital',
            start_time: jobData.pickup_time ? new Date(jobData.pickup_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : '--',
            end_time: jobData.delivery_time ? new Date(jobData.delivery_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : '--',
            samples_status: jobData.status === 'delivered'
              ? 'All samples delivered intact'
              : 'Delivery status unknown',
          },
          chain_of_custody: {
            pickup_time: jobData.pickup_time ? new Date(jobData.pickup_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : '--',
            pickup_verified: jobData.pickup_verified || false,
            gps_tracking: jobData.gps_tracked || false,
            delivery_time: jobData.delivery_time ? new Date(jobData.delivery_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : '--',
            delivery_confirmed: jobData.delivery_confirmed || false,
          },
        };

        setCompletionData(completionInfo);
      } else {
        Alert.alert('Error', 'Failed to load job completion data');
      }
    } catch (error: any) {
      console.error('Error loading job completion data:', error);
      Alert.alert('Error', error.message || 'Failed to load completion data');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = useCallback(() => {
    onBackToHome();
  }, [onBackToHome]);

  const handleViewEarnings = useCallback(() => {
    onViewEarnings();
  }, [onViewEarnings]);

  const handleStartNewJob = useCallback(() => {
    onStartNewJob();
  }, [onStartNewJob]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Job Completed!</Text>
          <Text style={styles.successMessage}>Excellent work! Samples delivered safely</Text>
          <Text style={styles.jobIdText}>Job ID: {completionData.job_id}</Text>
        </View>

        {/* Performance Summary */}
        <View style={styles.performanceCard}>
          <Text style={styles.sectionTitle}>PERFORMANCE SUMMARY</Text>
          
          <View style={styles.distanceRow}>
            <View style={styles.distanceItem}>
              <Text style={styles.distanceValue}>{completionData.performance_summary.total_distance}</Text>
              <Text style={styles.distanceLabel}>total</Text>
            </View>
            <View style={styles.distanceDivider} />
            <View style={styles.distanceBreakdown}>
              <Text style={styles.distanceDetail}>
                Pickup: {completionData.performance_summary.pickup_distance}
              </Text>
              <Text style={styles.distanceDetail}>
                Delivery: {completionData.performance_summary.delivery_distance}
              </Text>
            </View>
          </View>
          
          <View style={styles.timePerformance}>
            <Text style={styles.totalTime}>{completionData.performance_summary.total_time}</Text>
            <Text style={[
              styles.scheduleStatus,
              completionData.performance_summary.schedule_status === 'ahead' ? styles.aheadSchedule : styles.onTimeSchedule
            ]}>
              {completionData.performance_summary.time_ahead_of_schedule}
            </Text>
          </View>
        </View>

        {/* Monthly Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.sectionTitle}>MONTHLY PROGRESS</Text>
          
          <View style={styles.progressGrid}>
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{completionData.monthly_progress.this_job_km}</Text>
              <Text style={styles.progressLabel}>This job</Text>
            </View>
            
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{completionData.monthly_progress.today_total_km}</Text>
              <Text style={styles.progressLabel}>Today's total</Text>
            </View>
            
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{completionData.monthly_progress.monthly_total_km}</Text>
              <Text style={styles.progressLabel}>Monthly total</Text>
            </View>
          </View>
          
          <View style={styles.paymentInfo}>
            <Text style={styles.goalStatus}>{completionData.monthly_progress.goal_status}</Text>
          </View>
        </View>

        {/* Delivery Information */}
        <View style={styles.deliveryCard}>
          <Text style={styles.sectionTitle}>DELIVERY INFORMATION</Text>
          
          <View style={styles.routeInfo}>
            <Text style={styles.routeText}>
              Route: {completionData.delivery_info.route_from} → {completionData.delivery_info.route_to}
            </Text>
            <Text style={styles.timeText}>
              Time: {completionData.delivery_info.start_time} - {completionData.delivery_info.end_time}
            </Text>
          </View>
          
          <View style={styles.statusInfo}>
            <Text style={styles.statusText}>✅ {completionData.delivery_info.samples_status}</Text>
          </View>
        </View>

        {/* Chain of Custody */}
        <View style={styles.custodyCard}>
          <Text style={styles.sectionTitle}>CHAIN OF CUSTODY COMPLETE</Text>
          
          <View style={styles.custodyTimeline}>
            <View style={styles.custodyStep}>
              <View style={styles.custodyIcon}>
                <Text style={styles.custodyCheckmark}>✓</Text>
              </View>
              <View style={styles.custodyDetails}>
                <Text style={styles.custodyTime}>{completionData.chain_of_custody.pickup_time}</Text>
                <Text style={styles.custodyAction}>QR scanned, pickup verified</Text>
              </View>
            </View>
            
            <View style={styles.custodyStep}>
              <View style={styles.custodyIcon}>
                <Text style={styles.custodyCheckmark}>✓</Text>
              </View>
              <View style={styles.custodyDetails}>
                <Text style={styles.custodyTime}>GPS monitoring</Text>
                <Text style={styles.custodyAction}>Transport tracked</Text>
              </View>
            </View>
            
            <View style={styles.custodyStep}>
              <View style={styles.custodyIcon}>
                <Text style={styles.custodyCheckmark}>✓</Text>
              </View>
              <View style={styles.custodyDetails}>
                <Text style={styles.custodyTime}>{completionData.chain_of_custody.delivery_time}</Text>
                <Text style={styles.custodyAction}>Hospital received, delivery confirmed</Text>
              </View>
            </View>
          </View>
        </View>


        {/* Achievement Badge */}
        <View style={styles.achievementCard}>
          <Text style={styles.achievementIcon}>🏆</Text>
          <Text style={styles.achievementTitle}>Perfect Delivery!</Text>
          <Text style={styles.achievementText}>
            All quality metrics met • On-time delivery • Professional service
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleViewEarnings}>
            <Text style={styles.secondaryButtonText}>📊 View Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleStartNewJob}>
            <Text style={styles.secondaryButtonText}>🚚 New Job</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleBackToHome}>
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #E6F7FF 0%, #F0F9FF 100%)',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg * 1.5,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg * 2,
    marginBottom: SPACING.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.primary,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg * 1.5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  checkmark: {
    fontSize: 36,
    color: COLORS.white,
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  jobIdText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  performanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  distanceItem: {
    alignItems: 'center',
  },
  distanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  distanceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  distanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.gray200,
    marginHorizontal: SPACING.lg * 1.5,
  },
  distanceBreakdown: {
    flex: 1,
  },
  distanceDetail: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  timePerformance: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  totalTime: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  scheduleStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  aheadSchedule: {
    color: COLORS.success,
  },
  onTimeSchedule: {
    color: COLORS.primary,
  },
  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  paymentInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    alignItems: 'center',
  },
  goalStatus: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  routeInfo: {
    marginBottom: 16,
  },
  routeText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusInfo: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  custodyCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  custodyTimeline: {
    gap: 16,
  },
  custodyStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  custodyIcon: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.success,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  custodyCheckmark: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '700',
  },
  custodyDetails: {
    flex: 1,
  },
  custodyTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  custodyAction: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  achievementCard: {
    backgroundColor: '#FFF7E6',
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg * 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE7BA',
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FA8C16',
    marginBottom: 8,
  },
  achievementText: {
    fontSize: 14,
    color: '#AD4E00',
    textAlign: 'center',
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
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
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
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default JobCompletedScreen;