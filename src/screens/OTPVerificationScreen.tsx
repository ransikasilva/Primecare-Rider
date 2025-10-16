import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { ArrowLeft, Check, Timer, TimerOff, Shield, ShieldCheck, Clock, Hospital, CheckCircle, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated } from 'react-native';
import { apiService } from '../services/api';

interface OTPVerificationScreenProps {
  phoneNumber: string;
  otpId: string;
  onNext: () => void;
  onBack: () => void;
  onResend: () => void;
  onLoginSuccess: () => void; // For existing users
}

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  phoneNumber,
  otpId,
  onNext,
  onBack,
  onResend,
  onLoginSuccess,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [isResendEnabled, setIsResendEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setIsResendEnabled(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      
      // Focus on the next empty field or last field
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (index === 5 && value && newOtp.every(digit => digit !== '')) {
      setTimeout(() => handleVerify(newOtp.join('')), 100);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    
    // Skip OTP validation for dev-bypass tokens
    if (!otpId.startsWith('dev-bypass-') && code.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit code.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Handle dev-bypass flow
      if (otpId.startsWith('dev-bypass-')) {
        // Already authenticated with dev bypass, just continue
        onNext();
        return;
      }

      // Call backend API to verify OTP
      const response = await apiService.verifyOTP(otpId, code, phoneNumber);
      
      if (response.success && response.data) {
        // Check user status and determine next screen
        const { user } = response.data;

        if (!user || !user.profile_complete) {
          // New user or incomplete profile - start registration
          onNext();
        } else if (user.user_type === 'rider' && user.status === 'approved') {
          // Approved rider - go to dashboard
          onLoginSuccess();
        } else if (user.user_type === 'rider' && user.status === 'pending_hospital_approval') {
          // Registration complete but pending hospital approval
          // Will be handled by navigation to show "Under Review" screen
          onLoginSuccess();
        } else {
          // Other statuses (rejected, suspended, etc.) or wrong user type
          onNext();
        }
      } else {
        // Shake animation for wrong OTP
        Animated.sequence([
          Animated.timing(shakeAnimation, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start();
        
        // Clear OTP inputs
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        
        Alert.alert(
          'Verification Failed',
          response.error?.message || 'Invalid verification code. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Network Error',
        error.message || 'Unable to verify code. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setIsResendEnabled(false);
    setTimer(600);
    setOtp(['', '', '', '', '', '']);
    onResend();
    
    // Focus first input
    inputRefs.current[0]?.focus();
  };

  const isComplete = otp.every(digit => digit !== '');
  const maskedPhone = phoneNumber.replace(/(\+94)(\d{2})(\d{3})(\d{4})/, '$1 $2 *** $4');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
            {/* Professional Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <ArrowLeft size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>Step 1 of 3</Text>
                <View style={styles.progressTrack}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={[styles.progressFill, { width: '33.33%' }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.title}>Verify Mobile Number</Text>
              <Text style={styles.subtitle}>
                {otpId.startsWith('dev-bypass-') ? (
                  `🚀 Dev Mode Active for ${maskedPhone}\nPress verify to continue without OTP`
                ) : (
                  `Code sent to ${maskedPhone}\nEnter the 6-digit verification code`
                )}
              </Text>

              {/* Professional OTP Input */}
              <Animated.View 
                style={[
                  styles.otpContainer,
                  {
                    transform: [{
                      translateX: shakeAnimation.interpolate({
                        inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                        outputRange: [0, -10, 10, -10, 10, -10, 10, -10, 10, -10, 0],
                      }),
                    }],
                  },
                ]}
              >
                {otp.map((digit, index) => (
                  <View key={index} style={styles.otpInputWrapper}>
                    <TextInput
                      ref={(ref) => { inputRefs.current[index] = ref; }}
                      style={[
                        styles.otpInput,
                        digit ? styles.otpInputFilled : styles.otpInputEmpty,
                        focusedIndex === index && styles.otpInputFocused
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex(-1)}
                      keyboardType="numeric"
                      maxLength={1}
                      textContentType="oneTimeCode"
                      autoFocus={index === 0}
                      selectTextOnFocus
                    />
                    {digit && (
                      <View style={styles.otpCheckmark}>
                        <Check size={12} color={COLORS.success} />
                      </View>
                    )}
                  </View>
                ))}
              </Animated.View>

              {/* Professional Timer */}
              <View style={styles.timerContainer}>
                <View style={styles.timerCard}>
                  {timer > 60 ? (
                    <Timer size={20} color={COLORS.primary} />
                  ) : (
                    <TimerOff size={20} color={COLORS.warning} />
                  )}
                  <Text style={[
                    styles.timerText,
                    timer <= 60 && styles.timerTextWarning
                  ]}>
                    {timer > 0 ? formatTime(timer) : 'Expired'}
                  </Text>
                </View>
              </View>

              {/* Professional Security Features */}
              <View style={styles.featuresContainer}>
                <View style={styles.featureItem}>
                  <Shield size={20} color={COLORS.success} />
                  <Text style={styles.featureText}>Secure SMS verification</Text>
                </View>
                <View style={styles.featureItem}>
                  <ShieldCheck size={20} color={COLORS.success} />
                  <Text style={styles.featureText}>Hospital partnership ready</Text>
                </View>
                <View style={styles.featureItem}>
                  <Clock size={20} color={COLORS.warning} />
                  <Text style={styles.featureText}>10-minute secure expiry</Text>
                </View>
              </View>

              {/* Professional CTA */}
              <View style={styles.ctaContainer}>
                <Hospital size={24} color={COLORS.primary} />
                <Text style={styles.ctaText}>
                  Join Sri Lanka's trusted medical delivery network
                </Text>
              </View>
            </View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              {/* Professional Verify Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !isComplete || isLoading ? styles.primaryButtonDisabled : null
                ]}
                onPress={() => handleVerify()}
                disabled={!isComplete || isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={!isComplete || isLoading ? 
                    [COLORS.disabled, COLORS.disabled] : 
                    [COLORS.primary, COLORS.primaryDark]
                  }
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <Clock size={20} color={COLORS.white} />
                      <Text style={styles.buttonText}>Verifying...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Verify & Continue</Text>
                      <CheckCircle size={20} color={COLORS.white} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Professional Resend Section */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                <TouchableOpacity
                  style={[
                    styles.resendButton,
                    !isResendEnabled && styles.resendButtonDisabled
                  ]}
                  onPress={handleResend}
                  disabled={!isResendEnabled}
                >
                  <RefreshCw 
                    size={16} 
                    color={isResendEnabled ? COLORS.primary : COLORS.textTertiary} 
                  />
                  <Text style={[
                    styles.resendButtonText,
                    isResendEnabled ? styles.resendButtonTextEnabled : styles.resendButtonTextDisabled
                  ]}>
                    Resend Code
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    minHeight: '100%',
    paddingHorizontal: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.huge,
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
  mainContent: {
    flex: 1,
    paddingTop: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.styles.h1,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.massive,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.sm,
  },
  otpInputWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  otpInput: {
    width: 52,
    height: 64,
    borderWidth: LAYOUT.borderWidth.thick,
    borderRadius: LAYOUT.radius.xl,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  otpInputEmpty: {
    borderColor: COLORS.gray300,
  },
  otpInputFilled: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.primaryUltraLight,
  },
  otpInputFocused: {
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  otpCheckmark: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    backgroundColor: COLORS.success,
    borderRadius: LAYOUT.radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.xl,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  timerText: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  timerTextWarning: {
    color: COLORS.warning,
  },
  featuresContainer: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    ...SHADOWS.card,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  featureText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryUltraLight,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.massive,
    gap: SPACING.sm,
  },
  ctaText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  bottomSection: {
    paddingBottom: SPACING.xxl,
  },
  primaryButton: {
    height: 56,
    borderRadius: LAYOUT.radius.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  primaryButtonDisabled: {
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  buttonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  resendText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.primary,
    borderRadius: LAYOUT.radius.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  resendButtonDisabled: {
    backgroundColor: COLORS.gray100,
    borderColor: COLORS.gray300,
  },
  resendButtonText: {
    ...TYPOGRAPHY.styles.body,
    fontWeight: '600',
  },
  resendButtonTextEnabled: {
    color: COLORS.primary,
  },
  resendButtonTextDisabled: {
    color: COLORS.textTertiary,
  },
});

export default OTPVerificationScreen;