import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  ScrollView,
  Share,
  Clipboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';

interface ApplicationSubmittedScreenProps {
  applicationId: string;
  hospitalName: string;
  onTrackStatus: () => void;
  onGoHome: () => void;
}

const ApplicationSubmittedScreen: React.FC<ApplicationSubmittedScreenProps> = ({
  applicationId,
  hospitalName,
  onTrackStatus,
  onGoHome,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyReference = async () => {
    try {
      await Clipboard.setString(applicationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy reference number');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My TransFleet Rider application has been submitted! Reference: ${applicationId}. You can track the status at any time.`,
        title: 'TransFleet Rider Application Submitted',
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.title}>Application Submitted!</Text>
          <Text style={styles.subtitle}>
            Your rider application has been successfully submitted to {hospitalName}
          </Text>

          {/* Reference Number */}
          <View style={styles.referenceContainer}>
            <Text style={styles.referenceLabel}>Application Reference</Text>
            <View style={styles.referenceBox}>
              <Text style={styles.referenceNumber}>{applicationId}</Text>
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

          {/* Process Timeline */}
          <View style={styles.timelineContainer}>
            <Text style={styles.timelineTitle}>What happens next?</Text>
            
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
                <View style={[styles.stepDot, styles.stepPending]} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Hospital Review & Approval</Text>
                <Text style={styles.stepDescription}>2-3 business days</Text>
                <Text style={styles.stepSubtext}>
                  {hospitalName} will verify your documents and approve your application
                </Text>
              </View>
            </View>
          </View>

          {/* What's Next */}
          <View style={styles.nextStepsContainer}>
            <Text style={styles.nextStepsTitle}>What's Next?</Text>
            <View style={styles.nextStepsList}>
              <View style={styles.nextStepItem}>
                <Text style={styles.nextStepIcon}>⏰</Text>
                <Text style={styles.nextStepText}>
                  Complete process typically takes 2-3 business days
                </Text>
              </View>
              <View style={styles.nextStepItem}>
                <Text style={styles.nextStepIcon}>📋</Text>
                <Text style={styles.nextStepText}>
                  Track your application status anytime
                </Text>
              </View>
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.supportContainer}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportDescription}>
              Our support team is here to assist you during the approval process
            </Text>
            
            <View style={styles.supportOptions}>
              <TouchableOpacity style={styles.supportOption}>
                <Text style={styles.supportIcon}>📞</Text>
                <View style={styles.supportOptionContent}>
                  <Text style={styles.supportOptionTitle}>Call Support</Text>
                  <Text style={styles.supportOptionText}>+94 77 788 4049</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.supportOption}>
                <Text style={styles.supportIcon}>💬</Text>
                <View style={styles.supportOptionContent}>
                  <Text style={styles.supportOptionTitle}>WhatsApp</Text>
                  <Text style={styles.supportOptionText}>+94 77 788 4049</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.supportOption}>
                <Text style={styles.supportIcon}>✉️</Text>
                <View style={styles.supportOptionContent}>
                  <Text style={styles.supportOptionTitle}>Email Support</Text>
                  <Text style={styles.supportOptionText}>transfleet.primecare@gmail.com</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onTrackStatus}
        >
          <Text style={styles.secondaryButtonText}>Track Application Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={onGoHome}>
          <Text style={styles.primaryButtonText}>Continue</Text>
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
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    fontSize: 40,
    color: COLORS.white,
    fontWeight: 'bold',
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
  nextStepsContainer: {
    marginBottom: 32,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  nextStepsList: {
    gap: 12,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextStepIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  nextStepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  supportContainer: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.xl,
    padding: 20,
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  supportDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  supportOptions: {
    gap: 12,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  supportIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  supportOptionContent: {
    flex: 1,
  },
  supportOptionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  supportOptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  bottomSection: {
    paddingHorizontal: SPACING.lg * 1.5,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    gap: 12,
  },
  secondaryButton: {
    height: 48,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  primaryButton: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default ApplicationSubmittedScreen;