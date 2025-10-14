import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { apiService } from '../services/api';

interface ApplicationUnderReviewScreenProps {
  onGoHome: () => void;
  onRefreshStatus?: () => Promise<void>;
}

interface RegistrationStatusData {
  applicationId: string;
  hospitalName: string;
  currentStage: 'pending_hospital_approval';
  riderName: string;
  phone: string;
  status: string;
  submittedAt: string;
}

const ApplicationUnderReviewScreen: React.FC<ApplicationUnderReviewScreenProps> = ({
  onGoHome,
  onRefreshStatus,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registrationData, setRegistrationData] = useState<RegistrationStatusData>({
    applicationId: '',
    hospitalName: '',
    currentStage: 'pending_hospital_approval',
    riderName: '',
    phone: '',
    status: 'pending_hospital_approval',
    submittedAt: '',
  });

  useEffect(() => {
    loadRegistrationStatus();
  }, []);

  const loadRegistrationStatus = async () => {
    try {
      setLoading(true);
      const response = await apiService.getRegistrationStatus();

      if (response.success && response.data) {
        const riderData = response.data;

        const statusData: RegistrationStatusData = {
          applicationId: riderData.id || 'APP-' + Date.now(),
          hospitalName: riderData.hospital_name || 'Hospital',
          currentStage: 'pending_hospital_approval', // Riders only have hospital approval stage
          riderName: riderData.rider_name || '',
          phone: riderData.phone || '',
          status: riderData.status || 'pending_hospital_approval',
          submittedAt: riderData.created_at || new Date().toISOString(),
        };

        setRegistrationData(statusData);
      }
    } catch (error: any) {
      console.error('Error loading registration status:', error);
      Alert.alert('Error', 'Failed to load application status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Call the parent's refresh function which checks API and navigates if approved
      if (onRefreshStatus) {
        await onRefreshStatus();
      } else {
        // Fallback to loading registration status if prop not provided
        await loadRegistrationStatus();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyReference = async () => {
    try {
      // In React Native, we'd use Clipboard from @react-native-clipboard/clipboard
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.log('Error copying:', error);
    }
  };

  const getStageTitle = () => {
    return 'Hospital Verification';
  };

  const getStageDescription = () => {
    return `Documents under ${registrationData.hospitalName} HR review`;
  };

  const getProgressPercentage = () => {
    // For riders: only hospital approval stage, so show 50% progress
    return 50;
  };

  const handleContactSupport = (type: 'call' | 'whatsapp') => {
    const phoneNumber = '+94112345678';
    const url = type === 'call'
      ? `tel:${phoneNumber}`
      : `whatsapp://send?phone=${phoneNumber.replace('+', '')}&text=Hi, I need help with my rider application ${registrationData.applicationId}`;

    Linking.openURL(url).catch(() => {
      console.log('Failed to open URL');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.statusIcon}>
            <Text style={styles.clockIcon}>⏰</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.title}>Application Under Review</Text>
          <Text style={styles.subtitle}>
            Your application is being carefully reviewed by our team
          </Text>

          {/* Reference Number */}
          <View style={styles.referenceContainer}>
            <Text style={styles.referenceLabel}>Application Reference</Text>
            <View style={styles.referenceBox}>
              <Text style={styles.referenceNumber}>{registrationData.applicationId}</Text>
              <TouchableOpacity 
                style={styles.copyButton} 
                onPress={handleCopyReference}
              >
                <Text style={styles.copyButtonText}>
                  {copied ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Review Progress</Text>
              <Text style={styles.progressPercentage}>
                {Math.round(getProgressPercentage())}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { width: `${getProgressPercentage()}%` }
              ]} />
            </View>
            <Text style={styles.progressDescription}>
              {getStageTitle()} • Under review
            </Text>
          </View>

          {/* Current Status */}
          <View style={styles.statusContainer}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Current Status</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{getStageTitle()}</Text>
              </View>
            </View>
            <Text style={styles.statusDescription}>
              {getStageDescription()}
            </Text>
          </View>

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            <Text style={styles.timelineTitle}>Review Timeline</Text>
            
            <View style={styles.timelineStep}>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepCompleted]} />
                <View style={styles.stepLine} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Application Submitted</Text>
                <Text style={styles.stepDescription}>✓ Completed</Text>
              </View>
            </View>

            <View style={styles.timelineStep}>
              <View style={styles.stepIndicator}>
                <View style={[
                  styles.stepDot, 
                  registrationData.currentStage === 'pending_hospital_approval' ? styles.stepActive : styles.stepCompleted
                ]} />
                <View style={styles.stepLine} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Hospital Review</Text>
                <Text style={styles.stepDescription}>
                  {registrationData.currentStage === 'pending_hospital_approval'
                    ? 'In Progress'
                    : '✓ Completed'
                  }
                </Text>
                <Text style={styles.stepSubtext}>
                  Document verification by {registrationData.hospitalName}
                </Text>
              </View>
            </View>

            <View style={styles.timelineStep}>
              <View style={styles.stepIndicator}>
                <View style={[
                  styles.stepDot,
                  styles.stepPending
                ]} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Account Activation</Text>
                <Text style={styles.stepDescription}>
                  Pending Hospital Approval
                </Text>
                <Text style={styles.stepSubtext}>
                  Your account will be activated after hospital approval
                </Text>
              </View>
            </View>
          </View>

          {/* Preparation Section */}
          <View style={styles.preparationContainer}>
            <Text style={styles.preparationTitle}>Prepare for Success</Text>
            <Text style={styles.preparationSubtitle}>
              Get ready while we review your application
            </Text>

            <View style={styles.preparationSections}>
              <View style={styles.preparationSection}>
                <Text style={styles.preparationSectionTitle}>
                  🏍️ Vehicle Preparation
                </Text>
                <View style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>✓</Text>
                  <Text style={styles.checklistText}>Ensure vehicle is roadworthy</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>✓</Text>
                  <Text style={styles.checklistText}>Check insurance validity</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>✓</Text>
                  <Text style={styles.checklistText}>Fuel tank ready for deliveries</Text>
                </View>
              </View>

              <View style={styles.preparationSection}>
                <Text style={styles.preparationSectionTitle}>
                  📱 Equipment Setup
                </Text>
                <View style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>✓</Text>
                  <Text style={styles.checklistText}>Phone charged and ready</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>✓</Text>
                  <Text style={styles.checklistText}>GPS location services enabled</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>✓</Text>
                  <Text style={styles.checklistText}>Mobile data connection stable</Text>
                </View>
              </View>

              <View style={styles.preparationSection}>
                <Text style={styles.preparationSectionTitle}>
                  🗺️ Route Knowledge
                </Text>
                <View style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>✓</Text>
                  <Text style={styles.checklistText}>Study local area maps</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>✓</Text>
                  <Text style={styles.checklistText}>Identify hospital locations</Text>
                </View>
                <View style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>✓</Text>
                  <Text style={styles.checklistText}>Note traffic patterns and shortcuts</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.supportContainer}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportDescription}>
              Our support team is available to assist you
            </Text>
            
            <View style={styles.supportButtons}>
              <TouchableOpacity 
                style={styles.supportButton}
                onPress={() => handleContactSupport('call')}
              >
                <Text style={styles.supportIcon}>📞</Text>
                <Text style={styles.supportButtonText}>Call Support</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.supportButton}
                onPress={() => handleContactSupport('whatsapp')}
              >
                <Text style={styles.supportIcon}>💬</Text>
                <Text style={styles.supportButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Local Notice */}
          <View style={styles.noticeContainer}>
            <Text style={styles.noticeIcon}>📅</Text>
            <Text style={styles.noticeText}>
              <Text style={styles.noticeTextBold}>Note:</Text> Reviews may take longer during Poya days and public holidays. We appreciate your patience.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Text style={styles.refreshButtonText}>
            {refreshing ? 'Refreshing...' : 'Refresh Status'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeButton} onPress={onGoHome}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg * 1.5,
    paddingTop: 40,
    paddingBottom: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.warning + '20',
    borderWidth: 2,
    borderColor: COLORS.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockIcon: {
    fontSize: 36,
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
    marginBottom: 32,
  },
  referenceContainer: {
    marginBottom: 32,
  },
  referenceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  referenceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: 16,
  },
  referenceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginRight: 12,
  },
  copyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.white,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.gray200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.xl,
    padding: 20,
    marginBottom: 32,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.warning,
  },
  statusDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  timelineContainer: {
    marginBottom: 32,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  stepCompleted: {
    backgroundColor: COLORS.primary,
  },
  stepActive: {
    backgroundColor: COLORS.warning,
  },
  stepPending: {
    backgroundColor: COLORS.gray200,
  },
  stepLine: {
    width: 2,
    height: 40,
    backgroundColor: COLORS.gray200,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  stepSubtext: {
    fontSize: 13,
    color: COLORS.textTertiary,
    lineHeight: 18,
  },
  preparationContainer: {
    marginBottom: 32,
  },
  preparationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  preparationSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  preparationSections: {
    gap: 20,
  },
  preparationSection: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.lg,
    padding: 16,
  },
  preparationSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checklistIcon: {
    fontSize: 14,
    color: COLORS.success,
    marginRight: 8,
    width: 16,
  },
  checklistText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  supportContainer: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: LAYOUT.radius.xl,
    padding: 20,
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  supportDescription: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 16,
    lineHeight: 20,
  },
  supportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  supportIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.warning + '10',
    borderRadius: LAYOUT.radius.lg,
    padding: 16,
  },
  noticeIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
    lineHeight: 18,
  },
  noticeTextBold: {
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: SPACING.lg * 1.5,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    gap: 12,
  },
  refreshButton: {
    height: 48,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  homeButton: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default ApplicationUnderReviewScreen;