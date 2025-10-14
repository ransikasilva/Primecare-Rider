import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { VEHICLE_TYPES, EXPERIENCE_LEVELS, AREAS_KNOWN, VALIDATION } from '../utils/constants';
import { ArrowLeft, User, Info, CheckCircle, Camera, ChevronDown, ChevronUp, Check, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RegistrationFormData } from '../types';
import { apiService } from '../services/api';

interface RiderInfoFormScreenProps {
  phoneNumber: string;
  onNext: (formData: RegistrationFormData) => void;
  onBack: () => void;
}

const RiderInfoFormScreen: React.FC<RiderInfoFormScreenProps> = ({
  phoneNumber,
  onNext,
  onBack,
}) => {
  const [formData, setFormData] = useState<RegistrationFormData>({
    full_name: '',
    phone: phoneNumber,
    nic: '',
    date_of_birth: '',
    address: '',
    emergency_contact: '',
    vehicle_type: '',
    vehicle_number: '',
    license_number: '',
    insurance_valid_until: '',
    delivery_experience: '',
    areas_known: [],
    main_hospital_id: undefined,
    regional_hospital_ids: [],
  });

  const [images, setImages] = useState({
    profile_image: null as string | null,
    license_image_front: null as string | null,
    license_image_back: null as string | null,
    nic_image_front: null as string | null,
    nic_image_back: null as string | null,
  });

  const [showDropdowns, setShowDropdowns] = useState({
    vehicle_type: false,
    experience: false,
  });

  const scrollViewRef = useRef<ScrollView>(null);

  const updateFormData = (field: keyof RegistrationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateNIC = (nic: string): boolean => {
    return VALIDATION.NIC_OLD_REGEX.test(nic) || VALIDATION.NIC_NEW_REGEX.test(nic);
  };

  const validateVehicleNumber = (number: string): boolean => {
    return VALIDATION.VEHICLE_NUMBER_REGEX.test(number);
  };

  const validatePhone = (phone: string): boolean => {
    return VALIDATION.PHONE_REGEX.test(phone);
  };

  const formatDate = (text: string): string => {
    const digits = text.replace(/\D/g, '');
    
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
  };

  const formatVehicleNumber = (text: string): string => {
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    if (cleaned.length <= 3) {
      return cleaned;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
    }
  };

  const pickImage = (imageType: keyof typeof images) => {
    Alert.alert(
      'Select Image',
      'Choose how you want to select the image',
      [
        { text: 'Camera', onPress: () => openCamera(imageType) },
        { text: 'Gallery', onPress: () => openGallery(imageType) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = async (imageType: keyof typeof images) => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setImages(prev => ({
          ...prev,
          [imageType]: result.assets[0].uri,
        }));
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const openGallery = async (imageType: keyof typeof images) => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setImages(prev => ({
          ...prev,
          [imageType]: result.assets[0].uri,
        }));
      }
    } catch (error) {
      console.error('Error opening gallery:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const toggleAreaKnown = (area: string) => {
    const currentAreas = formData.areas_known;
    if (currentAreas.includes(area)) {
      updateFormData('areas_known', currentAreas.filter(a => a !== area));
    } else {
      updateFormData('areas_known', [...currentAreas, area]);
    }
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      'full_name', 'nic', 'date_of_birth', 'address', 'emergency_contact',
      'vehicle_type', 'vehicle_number', 'license_number', 'insurance_valid_until'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof RegistrationFormData]) {
        Alert.alert('Missing Information', `Please fill in the ${field.replace(/_/g, ' ')} field.`);
        return false;
      }
    }

    if (!validateNIC(formData.nic)) {
      Alert.alert('Invalid NIC', 'Please enter a valid NIC number.');
      return false;
    }

    if (!validateVehicleNumber(formData.vehicle_number)) {
      Alert.alert('Invalid Vehicle Number', 'Please enter a valid vehicle number (e.g., ABC-1234).');
      return false;
    }

    if (!validatePhone(formData.emergency_contact)) {
      Alert.alert('Invalid Emergency Contact', 'Please enter a valid phone number.');
      return false;
    }

    const requiredImages = ['profile_image', 'license_image_front', 'license_image_back', 'nic_image_front', 'nic_image_back'];
    for (const imageType of requiredImages) {
      if (!images[imageType as keyof typeof images]) {
        Alert.alert('Missing Images', `Please upload ${imageType.replace(/_/g, ' ')}.`);
        return false;
      }
    }

    return true;
  };

  const handleContinue = () => {
    if (!validateForm()) {
      return;
    }

    // Don't submit to API yet - just pass data to next screen (Hospital Selection)
    // API submission happens after hospital is selected in Step 3
    const completeFormData = {
      ...formData,
      profile_image: images.profile_image || '',
      license_image_front: images.license_image_front || '',
      license_image_back: images.license_image_back || '',
      nic_image_front: images.nic_image_front || '',
      nic_image_back: images.nic_image_back || '',
    };

    onNext(completeFormData);
  };

  const renderImagePicker = (label: string, imageType: keyof typeof images, required: boolean = true) => (
    <View style={styles.imagePickerContainer}>
      <Text style={styles.imageLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity
        style={[
          styles.imagePicker,
          images[imageType] && styles.imagePickerFilled
        ]}
        onPress={() => pickImage(imageType)}
        activeOpacity={0.8}
      >
        {images[imageType] ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: images[imageType]! }} style={styles.imagePreview} />
            <View style={styles.imageOverlay}>
              <CheckCircle size={24} color={COLORS.success} />
            </View>
          </View>
        ) : (
          <View style={styles.imagePickerPlaceholder}>
            <View style={styles.uploadIconContainer}>
              <Camera size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.imagePickerText}>Tap to upload</Text>
            <Text style={styles.imagePickerHint}>JPG, PNG up to 5MB</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderDropdown = (
    label: string,
    value: string,
    options: Array<{ label: string; value: string }>,
    onSelect: (value: string) => void,
    dropdownKey: keyof typeof showDropdowns
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      <TouchableOpacity
        style={[
          styles.dropdown,
          showDropdowns[dropdownKey] && styles.dropdownActive,
          value && styles.dropdownSelected
        ]}
        onPress={() => setShowDropdowns(prev => ({ ...prev, [dropdownKey]: !prev[dropdownKey] }))}
        activeOpacity={0.8}
      >
        <Text style={[styles.dropdownText, !value && styles.placeholder]}>
          {value ? options.find(opt => opt.value === value)?.label : `Select ${label}`}
        </Text>
        {showDropdowns[dropdownKey] ? (
          <ChevronUp size={20} color={value ? COLORS.primary : COLORS.textTertiary} />
        ) : (
          <ChevronDown size={20} color={value ? COLORS.primary : COLORS.textTertiary} />
        )}
      </TouchableOpacity>
      {showDropdowns[dropdownKey] && (
        <View style={styles.dropdownOptions}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.dropdownOption,
                value === option.value && styles.dropdownOptionSelected
              ]}
              onPress={() => {
                onSelect(option.value);
                setShowDropdowns(prev => ({ ...prev, [dropdownKey]: false }));
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dropdownOptionText,
                value === option.value && styles.dropdownOptionTextSelected
              ]}>
                {option.label}
              </Text>
              {value === option.value && (
                <Check size={18} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Professional Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Step 2 of 3</Text>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={[styles.progressFill, { width: '66.66%' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Professional Title Section */}
        <View style={styles.titleContainer}>
          <View style={styles.titleHeader}>
            <User size={32} color={COLORS.primary} />
            <View style={styles.titleTextContainer}>
              <Text style={styles.title}>Rider Information</Text>
              <Text style={styles.subtitle}>Complete your profile to get started</Text>
            </View>
          </View>
          <View style={styles.requiredNotice}>
            <Info size={16} color={COLORS.warning} />
            <Text style={styles.requiredNote}>All fields marked * are required</Text>
          </View>
        </View>

        {/* Personal Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.full_name}
              onChangeText={(text) => updateFormData('full_name', text)}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Mobile Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={phoneNumber}
              editable={false}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              NIC Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.nic}
              onChangeText={(text) => updateFormData('nic', text.toUpperCase())}
              placeholder="XXXXXXXXV or XXXXXXXXXXXX"
              placeholderTextColor={COLORS.textTertiary}
              maxLength={12}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Date of Birth <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.date_of_birth}
              onChangeText={(text) => updateFormData('date_of_birth', formatDate(text))}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Address <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={(text) => updateFormData('address', text)}
              placeholder="Enter your complete address"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Emergency Contact <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.emergency_contact}
              onChangeText={(text) => updateFormData('emergency_contact', text)}
              placeholder="+94 XX XXX XXXX"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Photo Uploads Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Uploads</Text>
          <Text style={styles.sectionNote}>Ensure images are clear and readable</Text>
          
          {renderImagePicker('Profile Picture', 'profile_image')}
          {renderImagePicker('Driver\'s License (Front)', 'license_image_front')}
          {renderImagePicker('Driver\'s License (Back)', 'license_image_back')}
          {renderImagePicker('NIC (Front)', 'nic_image_front')}
          {renderImagePicker('NIC (Back)', 'nic_image_back')}
        </View>

        {/* Vehicle Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          
          {renderDropdown(
            'Vehicle Type',
            formData.vehicle_type,
            VEHICLE_TYPES,
            (value) => updateFormData('vehicle_type', value),
            'vehicle_type'
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Vehicle Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.vehicle_number}
              onChangeText={(text) => updateFormData('vehicle_number', formatVehicleNumber(text))}
              placeholder="ABC-1234"
              placeholderTextColor={COLORS.textTertiary}
              maxLength={8}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              License Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.license_number}
              onChangeText={(text) => updateFormData('license_number', text)}
              placeholder="Enter license number"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Insurance Valid Until <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.insurance_valid_until}
              onChangeText={(text) => updateFormData('insurance_valid_until', formatDate(text))}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
        </View>

        {/* Experience Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          
          {renderDropdown(
            'Delivery Experience',
            formData.delivery_experience,
            EXPERIENCE_LEVELS,
            (value) => updateFormData('delivery_experience', value),
            'experience'
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Areas Known</Text>
            <Text style={styles.inputNote}>Select areas you're familiar with</Text>
            <View style={styles.checkboxContainer}>
              {AREAS_KNOWN.map((area) => (
                <TouchableOpacity
                  key={area.value}
                  style={styles.checkboxItem}
                  onPress={() => toggleAreaKnown(area.value)}
                >
                  <View style={[
                    styles.checkbox,
                    formData.areas_known.includes(area.value) && styles.checkboxSelected
                  ]}>
                    {formData.areas_known.includes(area.value) && (
                      <Check size={14} color={COLORS.white} />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>{area.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Hospital Affiliation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hospital Affiliation</Text>
          <Text style={styles.sectionNote}>
            You'll select your hospital partner in the next step
          </Text>
        </View>
      </ScrollView>

      {/* Professional Bottom Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Continue to Hospital Selection</Text>
              <ArrowRight size={20} color={COLORS.white} />
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
  requiredNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.xs,
  },
  requiredNote: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.warning,
    fontWeight: '500',
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  sectionTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  sectionNote: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  required: {
    color: COLORS.error,
  },
  input: {
    height: 56,
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.gray300,
    borderRadius: LAYOUT.radius.xl,
    paddingHorizontal: SPACING.lg,
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  inputDisabled: {
    backgroundColor: COLORS.gray100,
    color: COLORS.textTertiary,
  },
  textArea: {
    height: 80,
    paddingTop: SPACING.md,
    textAlignVertical: 'top',
  },
  inputNote: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
  },
  dropdown: {
    height: 56,
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.gray300,
    borderRadius: LAYOUT.radius.xl,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  dropdownActive: {
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  dropdownSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryUltraLight,
  },
  dropdownText: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
  },
  placeholder: {
    color: COLORS.textTertiary,
  },
  dropdownOptions: {
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.gray300,
    borderRadius: LAYOUT.radius.xl,
    backgroundColor: COLORS.white,
    marginTop: SPACING.xs,
    maxHeight: 200,
    ...SHADOWS.lg,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: LAYOUT.borderWidth.thin,
    borderBottomColor: COLORS.gray200,
  },
  dropdownOptionSelected: {
    backgroundColor: COLORS.primaryUltraLight,
  },
  dropdownOptionText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
  },
  dropdownOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    minWidth: '45%',
    gap: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: LAYOUT.borderWidth.thick,
    borderColor: COLORS.gray300,
    borderRadius: LAYOUT.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
  },
  imagePickerContainer: {
    marginBottom: SPACING.lg,
  },
  imageLabel: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  imagePicker: {
    height: 120,
    borderWidth: LAYOUT.borderWidth.thick,
    borderColor: COLORS.gray300,
    borderRadius: LAYOUT.radius.xl,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  imagePickerFilled: {
    borderColor: COLORS.success,
    borderStyle: 'solid',
    backgroundColor: COLORS.white,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: LAYOUT.radius.xl - 2,
  },
  imageOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.round,
    padding: SPACING.xs,
    ...SHADOWS.sm,
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  uploadIconContainer: {
    padding: SPACING.sm,
  },
  imagePickerText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  imagePickerHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textTertiary,
  },
  bottomSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: LAYOUT.borderWidth.thin,
    borderTopColor: COLORS.gray200,
  },
  primaryButton: {
    height: 56,
    borderRadius: LAYOUT.radius.xl,
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
});

export default RiderInfoFormScreen;