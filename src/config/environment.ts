import { Platform } from 'react-native';

// Environment configuration for TransFleet Rider App
interface EnvironmentConfig {
  apiBaseUrl: string;
  apiTimeout: number;
  enableMockData: boolean;
  enableOfflineMode: boolean;
  syncInterval: number;
  otpResendCooldown: number;
  maxOtpAttempts: number;
  enablePerformanceMonitoring: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  features: {
    qrScanning: boolean;
    gpsTracking: boolean;
    pushNotifications: boolean;
    biometricAuth: boolean;
  };
}

// Development environment (local backend)
const developmentConfig: EnvironmentConfig = {
  apiBaseUrl: 'http://192.168.1.4:8000/api',
  apiTimeout: 30000,
  enableMockData: true,
  enableOfflineMode: true,
  syncInterval: 30000,
  otpResendCooldown: 60000,
  maxOtpAttempts: 3,
  enablePerformanceMonitoring: true,
  logLevel: 'debug',
  features: {
    qrScanning: true,
    gpsTracking: true,
    pushNotifications: true,
    biometricAuth: false,
  },
};

// Production environment
const productionConfig: EnvironmentConfig = {
  apiBaseUrl: 'https://muxxr5mptd.ap-south-1.awsapprunner.com/api',
  apiTimeout: 15000,
  enableMockData: false,
  enableOfflineMode: true,
  syncInterval: 60000,
  otpResendCooldown: 90000,
  maxOtpAttempts: 5,
  enablePerformanceMonitoring: false,
  logLevel: 'error',
  features: {
    qrScanning: true,
    gpsTracking: true,
    pushNotifications: true,
    biometricAuth: true,
  },
};

// Staging environment  
const stagingConfig: EnvironmentConfig = {
  apiBaseUrl: 'https://staging-api.primecare.lk/api',
  apiTimeout: 20000,
  enableMockData: false,
  enableOfflineMode: true,
  syncInterval: 45000,
  otpResendCooldown: 60000,
  maxOtpAttempts: 3,
  enablePerformanceMonitoring: true,
  logLevel: 'info',
  features: {
    qrScanning: true,
    gpsTracking: true,
    pushNotifications: true,
    biometricAuth: true,
  },
};

// Determine current environment
const getCurrentEnvironment = (): 'development' | 'staging' | 'production' => {
  // Check if we're in development mode
  if (__DEV__) {
    return 'development';
  }
  
  // Check build configuration or environment variables
  // This would typically be set during build process
  const buildEnv = process.env.NODE_ENV || 'production';
  
  switch (buildEnv) {
    case 'staging':
      return 'staging';
    case 'development':
      return 'development';
    default:
      return 'production';
  }
};

// Get configuration based on environment
const getConfig = (): EnvironmentConfig => {
  const environment = getCurrentEnvironment();
  
  switch (environment) {
    case 'development':
      return developmentConfig;
    case 'staging':  
      return stagingConfig;
    case 'production':
      return productionConfig;
    default:
      return developmentConfig;
  }
};

// Platform-specific adjustments
const adjustForPlatform = (config: EnvironmentConfig): EnvironmentConfig => {
  // Android emulator localhost adjustment
  if (Platform.OS === 'android' && config.apiBaseUrl.includes('localhost')) {
    return {
      ...config,
      apiBaseUrl: config.apiBaseUrl.replace('localhost', '10.0.2.2'),
    };
  }
  
  return config;
};

// Export the final configuration
export const CONFIG = adjustForPlatform(getConfig());

// Helper functions
export const isProduction = () => getCurrentEnvironment() === 'production';
export const isDevelopment = () => getCurrentEnvironment() === 'development';
export const isStaging = () => getCurrentEnvironment() === 'staging';

// Feature flags
export const FEATURES = CONFIG.features;

// API Configuration
export const API_CONFIG = {
  baseUrl: CONFIG.apiBaseUrl,
  timeout: CONFIG.apiTimeout,
};

// App Settings
export const APP_SETTINGS = {
  enableMockData: CONFIG.enableMockData,
  enableOfflineMode: CONFIG.enableOfflineMode,
  syncInterval: CONFIG.syncInterval,
  otpResendCooldown: CONFIG.otpResendCooldown,
  maxOtpAttempts: CONFIG.maxOtpAttempts,
  enablePerformanceMonitoring: CONFIG.enablePerformanceMonitoring,
  logLevel: CONFIG.logLevel,
};

// Environment info for debugging
export const ENV_INFO = {
  environment: getCurrentEnvironment(),
  platform: Platform.OS,
  version: Platform.Version,
  isDebug: __DEV__,
};

console.log('🚀 TransFleet Environment:', ENV_INFO);
console.log('🔧 API Configuration:', API_CONFIG);
console.log('⚙️ Features Enabled:', FEATURES);