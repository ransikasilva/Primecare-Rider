import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { VALIDATION } from '../utils/constants';
import { CheckCircle, Info, Shield, ArrowRight, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';
import { isDevelopment } from '../config/environment';

interface PhoneEntryScreenProps {
  onNext: (phoneNumber: string, otpId: string) => void;
  onLoginSuccess?: () => void; // For dev bypass direct login
  onBack?: () => void;
}

const PhoneEntryScreen: React.FC<PhoneEntryScreenProps> = ({ onNext, onLoginSuccess, onBack }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const phoneInputRef = useRef<TextInput>(null);

  const formatPhoneNumber = (text: string): string => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    
    // If starts with 94, remove it (we'll add +94 prefix)
    let cleanDigits = digits;
    if (digits.startsWith('94')) {
      cleanDigits = digits.substring(2);
    }
    
    // If starts with 0, remove it
    if (cleanDigits.startsWith('0')) {
      cleanDigits = cleanDigits.substring(1);
    }
    
    // Format as XX XXX XXXX
    if (cleanDigits.length <= 2) {
      return cleanDigits;
    } else if (cleanDigits.length <= 5) {
      return `${cleanDigits.slice(0, 2)} ${cleanDigits.slice(2)}`;
    } else {
      return `${cleanDigits.slice(0, 2)} ${cleanDigits.slice(2, 5)} ${cleanDigits.slice(5, 9)}`;
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const fullNumber = `+94${phone.replace(/\s/g, '')}`;
    return VALIDATION.PHONE_REGEX.test(fullNumber) || VALIDATION.PHONE_REGEX.test(`0${phone.replace(/\s/g, '')}`);
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    if (formatted.replace(/\s/g, '').length <= 9) {
      setPhoneNumber(formatted);
    }
  };

  const handleContinue = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid Sri Lankan mobile number (e.g., 77 123 4567)',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    
    // Format phone number for API
    const cleanNumber = phoneNumber.replace(/\s/g, '');
    const fullNumber = `+94${cleanNumber}`;
    
    try {
      // Call backend API to send OTP
      const response = await apiService.sendOTP(fullNumber);
      
      if (response.success && response.data) {
        // Move to next screen with phone number and OTP ID
        onNext(fullNumber, response.data.otp_id);
      } else {
        Alert.alert(
          'Error',
          response.error?.message || 'Failed to send verification code. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.warn('API Error:', error.message);
      
      // For development: Show options
      const buttons = [
        { text: 'Cancel', style: 'cancel' as const },
        { 
          text: 'Demo Mode', 
          onPress: () => {
            // Use mock OTP ID for demo
            onNext(fullNumber, 'mock-otp-id-' + Date.now());
          }
        }
      ];
      
      // Add dev bypass option in development mode
      if (isDevelopment()) {
        buttons.splice(1, 0, {
          text: 'Dev Login',
          onPress: () => handleDevBypass(fullNumber)
        });
      }
      
      Alert.alert(
        'Connection Issue',
        'Unable to connect to backend server. Choose how to continue:',
        buttons
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevBypass = async (fullNumber: string) => {
    console.log('🔥 handleDevBypass called with:', fullNumber);
    setIsLoading(true);
    
    try {
      console.log('📡 Calling apiService.devBypassLogin...');
      const response = await apiService.devBypassLogin(fullNumber);
      console.log('📡 Dev bypass response:', response);
      
      if (response.success && response.data) {
        const { user } = response.data;
        console.log('✅ Dev bypass successful, user:', user);
        
        if (user && user.user_type === 'rider' && user.profile_complete) {
          // Existing rider - go to dashboard
          console.log('🏠 Going to dashboard for existing rider');
          onLoginSuccess?.();
        } else {
          // New or incomplete profile - continue registration
          console.log('📝 Going to registration for new/incomplete rider');
          onNext(fullNumber, 'dev-bypass-' + Date.now());
        }
      } else {
        console.log('❌ Dev bypass failed:', response.error);
        Alert.alert(
          'Dev Login Failed',
          response.error?.message || 'Unable to bypass authentication',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.log('💥 Dev bypass error:', error);
      Alert.alert(
        'Dev Login Error',
        error.message || 'Dev bypass authentication failed',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = validatePhoneNumber(phoneNumber);

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
            {/* Header */}
            <View style={styles.header}>
              {onBack && (
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.headerTitle}>Join as Rider</Text>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.title}>Enter your mobile number</Text>
              <Text style={styles.subtitle}>
                We'll send a verification code to confirm your number
              </Text>

              {/* Professional Phone Input Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={[
                  styles.phoneInputContainer,
                  phoneInputRef.current?.isFocused() && styles.phoneInputContainerFocused
                ]}>
                  <View style={styles.countryCodeContainer}>
                    <Text style={styles.flagEmoji}>🇱🇰</Text>
                    <Text style={styles.countryCode}>+94</Text>
                  </View>
                  
                  <TextInput
                    ref={phoneInputRef}
                    style={styles.phoneInput}
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    placeholder="77 123 4567"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="numeric"
                    maxLength={11}
                    autoFocus
                    textContentType="telephoneNumber"
                    returnKeyType="done"
                    onFocus={() => setPhoneNumber(phoneNumber)} // Trigger re-render for focus state
                  />
                  
                  {isValid && (
                    <CheckCircle 
                      size={20} 
                      color={COLORS.success} 
                      style={styles.validationIcon}
                    />
                  )}
                </View>
              </View>

              {/* Professional Info Card */}
              <View style={styles.infoCard}>
                <Info size={24} color={COLORS.primary} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Quick Verification</Text>
                  <Text style={styles.infoText}>
                    SMS code • Hospital partnership • 10 min expiry
                  </Text>
                </View>
              </View>

              {/* Trust Indicator */}
              <View style={styles.trustIndicator}>
                <Shield size={16} color={COLORS.success} />
                <Text style={styles.trustText}>
                  Join 500+ verified riders nationwide
                </Text>
              </View>
            </View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              {/* Professional Primary Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !isValid || isLoading ? styles.primaryButtonDisabled : null
                ]}
                onPress={handleContinue}
                disabled={!isValid || isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={!isValid || isLoading ? 
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
                      <Text style={styles.buttonText}>Sending...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Send Verification Code</Text>
                      <ArrowRight size={20} color={COLORS.white} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Legal Links */}
              <View style={styles.legalContainer}>
                <Text style={styles.legalText}>
                  By continuing, you agree to our{' '}
                </Text>
                <TouchableOpacity>
                  <Text style={styles.legalLink}>Terms & Conditions</Text>
                </TouchableOpacity>
                <Text style={styles.legalText}> and </Text>
                <TouchableOpacity>
                  <Text style={styles.legalLink}>Privacy Policy</Text>
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
    marginRight: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    ...SHADOWS.sm,
  },
  backButtonText: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  headerTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.textPrimary,
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
  },
  inputSection: {
    marginBottom: SPACING.xxl,
  },
  inputLabel: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.gray300,
    borderRadius: LAYOUT.radius.xl,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    height: 64,
    ...SHADOWS.sm,
  },
  phoneInputContainerFocused: {
    borderColor: COLORS.primary,
    borderWidth: LAYOUT.borderWidth.thick,
    ...SHADOWS.md,
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SPACING.md,
    borderRightWidth: LAYOUT.borderWidth.thin,
    borderRightColor: COLORS.gray300,
    marginRight: SPACING.md,
    gap: SPACING.xs,
  },
  flagEmoji: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    includeFontPadding: false,
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: '500',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  validationIcon: {
    marginLeft: SPACING.sm,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryUltraLight,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoIcon: {
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  infoText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.primary,
    opacity: 0.8,
  },
  trustIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.huge,
    gap: SPACING.xs,
  },
  trustText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  bottomSection: {
    paddingBottom: SPACING.xxl,
  },
  primaryButton: {
    height: 56,
    borderRadius: LAYOUT.radius.xl,
    marginBottom: SPACING.lg,
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
  legalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  legalText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textTertiary,
  },
  legalLink: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  devButton: {
    height: 48,
    borderRadius: LAYOUT.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.warning,
    marginBottom: SPACING.lg,
  },
  devButtonDisabled: {
    backgroundColor: COLORS.disabled + '15',
    borderColor: COLORS.disabled,
  },
  devButtonText: {
    ...TYPOGRAPHY.styles.body,
    fontWeight: '600',
    color: COLORS.warning,
  },
  devButtonTextDisabled: {
    color: COLORS.textTertiary,
  },
});

export default PhoneEntryScreen;