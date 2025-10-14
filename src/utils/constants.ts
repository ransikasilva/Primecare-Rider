// Import professional design system
import { COLORS as DESIGN_COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';

// Professional color palette
export const COLORS = {
  // Use the professional design system colors
  ...DESIGN_COLORS,
  
  // Legacy aliases for backward compatibility (will be phased out)
  primary: DESIGN_COLORS.primary,
  secondary: DESIGN_COLORS.gray600,
  light_gray: DESIGN_COLORS.gray400,
  white: DESIGN_COLORS.white,
  black: DESIGN_COLORS.black,
  success: DESIGN_COLORS.success,
  warning: DESIGN_COLORS.warning,
  error: DESIGN_COLORS.error,
  background: DESIGN_COLORS.background,
  border: DESIGN_COLORS.gray300,
  disabled: DESIGN_COLORS.disabled,
  text_primary: DESIGN_COLORS.textPrimary,
  text_secondary: DESIGN_COLORS.textSecondary,
  text_muted: DESIGN_COLORS.textTertiary,
};

// Professional typography system
export const FONTS = TYPOGRAPHY.fontFamily;

// Professional spacing and sizing system
export const SIZES = {
  // Font sizes (from professional typography system)
  ...TYPOGRAPHY.fontSize,
  
  // Spacing (from professional spacing system)  
  padding: SPACING.padding,
  paddingSmall: SPACING.paddingSmall,
  paddingLarge: SPACING.paddingLarge,
  margin: SPACING.margin,
  marginSmall: SPACING.marginSmall,
  marginLarge: SPACING.marginLarge,
  
  // Border radius (from professional layout system)
  radius: LAYOUT.radius.md,
  button_radius: LAYOUT.radius.lg,
  card_radius: LAYOUT.radius.xl,
  
  // Legacy aliases for backward compatibility
  xs: TYPOGRAPHY.fontSize.xs,
  sm: TYPOGRAPHY.fontSize.sm,
  base: TYPOGRAPHY.fontSize.base,
  lg: TYPOGRAPHY.fontSize.lg,
  xl: TYPOGRAPHY.fontSize.xl,
  xxl: TYPOGRAPHY.fontSize.xxl,
  xxxl: TYPOGRAPHY.fontSize.xxxl,
};

// Professional shadows
export const SHADOW_STYLES = SHADOWS;

export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

export const ENDPOINTS = {
  // Authentication
  SEND_OTP: '/api/auth/mobile/send-otp',
  VERIFY_OTP: '/api/auth/mobile/verify-otp',
  REFRESH_TOKEN: '/api/auth/refresh-token',
  LOGOUT: '/api/auth/logout',
  
  // Profile
  PROFILE: '/api/profile',
  UPDATE_RIDER_PROFILE: '/api/riders/profile',
  UPDATE_RIDER_STATUS: '/api/riders/status',
  
  // Hospitals
  AVAILABLE_HOSPITALS: '/api/riders/hospitals',
  HOSPITALS_BY_CODE: '/api/riders/hospitals/by-code',
  
  // Orders
  MY_ORDERS: '/api/orders/my',
  ORDER_DETAILS: '/api/orders',
  UPDATE_ORDER_STATUS: '/api/orders',
  TRACK_LOCATION: '/api/orders',
  
  // QR Codes
  SCAN_QR: '/api/qr/scan',
  VALIDATE_QR: '/api/qr/validate',
  
  // Handovers
  INITIATE_HANDOVER: '/api/orders',
  ACCEPT_HANDOVER: '/api/orders',
  CONFIRM_HANDOVER: '/api/orders',
  PENDING_HANDOVERS: '/api/orders/handovers/pending',
};

export const VALIDATION = {
  PHONE_REGEX: /^(\+94|0)[1-9]\d{8}$/,
  NIC_OLD_REGEX: /^\d{9}[vVxX]$/,
  NIC_NEW_REGEX: /^\d{12}$/,
  VEHICLE_NUMBER_REGEX: /^[A-Z]{1,3}-\d{4}$/,
  LICENSE_REGEX: /^[A-Z0-9]{6,12}$/,
};

export const REGISTRATION_STEPS = {
  PHONE_ENTRY: 0,
  OTP_VERIFICATION: 1,
  RIDER_INFO: 2,
  HOSPITAL_SELECTION: 3,
  SUBMITTED: 4,
  UNDER_REVIEW: 5,
  APPROVED: 6,
};

export const VEHICLE_TYPES = [
  { label: 'Motorcycle', value: 'motorcycle' },
  { label: 'Three-wheeler', value: 'three_wheeler' },
  { label: 'Car', value: 'car' },
  { label: 'Van', value: 'van' },
];

export const EXPERIENCE_LEVELS = [
  { label: 'New Rider', value: 'new' },
  { label: '1-2 years', value: '1-2' },
  { label: '3-5 years', value: '3-5' },
  { label: '5+ years', value: '5+' },
];

export const AREAS_KNOWN = [
  { label: 'Colombo', value: 'colombo' },
  { label: 'Kandy', value: 'kandy' },
  { label: 'Galle', value: 'galle' },
  { label: 'Jaffna', value: 'jaffna' },
  { label: 'Negombo', value: 'negombo' },
  { label: 'Anuradhapura', value: 'anuradhapura' },
  { label: 'Batticaloa', value: 'batticaloa' },
  { label: 'Kurunegala', value: 'kurunegala' },
  { label: 'Other', value: 'other' },
];

export const ORDER_STATUS = {
  PENDING_ASSIGNMENT: 'pending_rider_assignment',
  ASSIGNED: 'assigned',
  PICKUP_STARTED: 'pickup_started',
  PICKED_UP: 'picked_up',
  DELIVERY_STARTED: 'delivery_started',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  HANDOVER_PENDING: 'handover_pending',
  HANDOVER_ACCEPTED: 'handover_accepted',
  HANDOVER_CONFIRMED: 'handover_confirmed',
};

export const SAMPLE_TYPES = [
  { label: 'Blood', value: 'blood' },
  { label: 'Urine', value: 'urine' },
  { label: 'Tissue', value: 'tissue' },
  { label: 'Saliva', value: 'saliva' },
  { label: 'Stool', value: 'stool' },
  { label: 'Other', value: 'other' },
];

export const URGENCY_LEVELS = [
  { label: 'Routine', value: 'routine', color: COLORS.primary },
  { label: 'Urgent', value: 'urgent', color: COLORS.warning },
  { label: 'Emergency', value: 'emergency', color: COLORS.error },
];

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@primecare_auth_token',
  REFRESH_TOKEN: '@primecare_refresh_token',
  USER_DATA: '@primecare_user_data',
  REGISTRATION_DATA: '@primecare_registration_data',
  LOCATION_PERMISSION: '@primecare_location_permission',
  FIRST_LAUNCH: '@primecare_first_launch',
};

export const LOCATION_CONFIG = {
  UPDATE_INTERVAL: 5000, // 5 seconds
  ACCURACY: 'high',
  TIMEOUT: 15000,
  MAX_AGE: 10000,
  DISTANCE_FILTER: 10, // meters
};

export const IMAGE_CONFIG = {
  MAX_WIDTH: 1024,
  MAX_HEIGHT: 1024,
  QUALITY: 0.8,
  ALLOWED_TYPES: ['image/jpeg', 'image/png'],
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
};

export const NOTIFICATIONS = {
  NEW_ORDER: 'new_order',
  ORDER_CANCELLED: 'order_cancelled',
  HANDOVER_REQUEST: 'handover_request',
  HANDOVER_ACCEPTED: 'handover_accepted',
  STATUS_UPDATE: 'status_update',
  EMERGENCY_ALERT: 'emergency_alert',
};

export const QR_SCANNER_CONFIG = {
  SCAN_TIMEOUT: 30000, // 30 seconds
  TORCH_MODE: 'off',
  CAMERA_TYPE: 'back',
  MARKER_BORDER_COLOR: COLORS.primary,
  MARKER_BORDER_WIDTH: 2,
};