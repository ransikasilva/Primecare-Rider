import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Building2, Calendar, IdCard, ArrowRight } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { apiService } from '../services/api';

interface ApplicationApprovedScreenProps {
  onCompleteSetup: () => void;
}

interface RiderProfileData {
  riderId: string;
  riderName: string;
  hospitalName: string;
  approvalDate: string;
  status: string;
}

const ApplicationApprovedScreen: React.FC<ApplicationApprovedScreenProps> = ({
  onCompleteSetup,
}) => {
  const [riderData, setRiderData] = useState<RiderProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRiderProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiService.getRiderProfile();

        if (response.success && response.data) {
          const profile = response.data;
          setRiderData({
            riderId: profile.id || 'N/A',
            riderName: profile.rider_name || profile.name || 'N/A',
            hospitalName: profile.hospital_name || 'Hospital Partner',
            approvalDate: profile.approved_at || profile.created_at || new Date().toISOString(),
            status: profile.status || 'approved'
          });
        } else {
          setError(response.message || 'Failed to load rider profile');
        }
      } catch (error: any) {
        setError(error.message || 'Failed to load rider profile');
        Alert.alert('Error', 'Failed to load your profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRiderProfile();
  }, []);

  const retryFetch = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getRiderProfile();

      if (response.success && response.data) {
        const profile = response.data;
        setRiderData({
          riderId: profile.id || 'N/A',
          riderName: profile.rider_name || profile.name || 'N/A',
          hospitalName: profile.hospital_name || 'Hospital Partner',
          approvalDate: profile.approved_at || profile.created_at || new Date().toISOString(),
          status: profile.status || 'approved'
        });
      } else {
        setError(response.message || 'Failed to load rider profile');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load rider profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !riderData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryFetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.successIconCircle}>
            <CheckCircle size={64} color={COLORS.success} strokeWidth={2} />
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.title}>Welcome to TransFleet!</Text>
          <Text style={styles.subtitle}>
            Your application has been approved. You're now ready to start delivering medical samples.
          </Text>

          {/* Account Details Card */}
          <View style={styles.accountCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Account Details</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>

            <View style={styles.detailsList}>
              {/* Rider Name */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <IdCard size={20} color={COLORS.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Rider Name</Text>
                  <Text style={styles.detailValue}>{riderData.riderName}</Text>
                </View>
              </View>

              {/* Hospital Partner */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Building2 size={20} color={COLORS.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Hospital Partner</Text>
                  <Text style={styles.detailValue}>{riderData.hospitalName}</Text>
                </View>
              </View>

              {/* Approval Date */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Calendar size={20} color={COLORS.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Approval Date</Text>
                  <Text style={styles.detailValue}>{formatDate(riderData.approvalDate)}</Text>
                </View>
              </View>

              {/* Rider ID */}
              <View style={[styles.detailRow, styles.lastDetailRow]}>
                <View style={styles.detailIconContainer}>
                  <IdCard size={20} color={COLORS.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Rider ID</Text>
                  <Text style={styles.detailValue}>#{riderData.riderId}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.continueButton} onPress={onCompleteSetup}>
          <Text style={styles.continueButtonText}>Go to Dashboard</Text>
          <ArrowRight size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error || COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.success + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: SPACING.md,
  },
  accountCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  detailsList: {
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  lastDetailRow: {
    borderBottomWidth: 0,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bottomSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  continueButton: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default ApplicationApprovedScreen;
