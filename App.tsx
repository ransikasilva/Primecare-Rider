import React, { useState, useEffect } from 'react';
import { StatusBar, AppState as RNAppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationService } from './src/services/locationService';
import { apiService } from './src/services/api';

// Import all screens
import SplashScreen from './src/screens/SplashScreen';
import PhoneEntryScreen from './src/screens/PhoneEntryScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import RiderInfoFormScreen from './src/screens/RiderInfoFormScreen';
import HospitalSelectionScreen from './src/screens/HospitalSelectionScreen';
import ApplicationSubmittedScreen from './src/screens/ApplicationSubmittedScreen';
import ApplicationUnderReviewScreen from './src/screens/ApplicationUnderReviewScreen';
import ApplicationApprovedScreen from './src/screens/ApplicationApprovedScreen';
import DashboardHomeScreen from './src/screens/DashboardHomeScreen';
import AvailableJobsScreen from './src/screens/AvailableJobsScreen';
import JobDetailsScreen from './src/screens/JobDetailsScreen';
import NavigationToPickupScreen from './src/screens/NavigationToPickupScreen';
import QRCodeScannerScreen from './src/screens/QRCodeScannerScreen';
import PickupConfirmationScreen from './src/screens/PickupConfirmationScreen';
import NavigateToHospitalScreen from './src/screens/NavigateToHospitalScreen';
import DeliverToHospitalLabScreen from './src/screens/DeliverToHospitalLabScreen';
import JobCompletedScreen from './src/screens/JobCompletedScreen';
import StartHandoverScreen from './src/screens/StartHandoverScreen';
import EnterRiderDetailsScreen from './src/screens/EnterRiderDetailsScreen';
import ShowQRCodeScreen from './src/screens/ShowQRCodeScreen';
import IncomingHandoverRequestScreen from './src/screens/IncomingHandoverRequestScreen';
import AcceptHandoverScreen from './src/screens/AcceptHandoverScreen';
import ConfirmHandoverScreen from './src/screens/ConfirmHandoverScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PerformanceDashboardScreen from './src/screens/PerformanceDashboardScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

import { COLORS, REGISTRATION_STEPS } from './src/utils/constants';
import { RegistrationFormData } from './src/types';

type AppScreen =
  | 'splash'
  | 'phone_entry'
  | 'otp_verification'
  | 'rider_info_form'
  | 'hospital_selection'
  | 'application_submitted'
  | 'application_under_review'
  | 'application_approved'
  | 'dashboard_home'
  | 'available_jobs'
  | 'job_details'
  | 'navigation_to_pickup'
  | 'qr_scanner'
  | 'qr_scanner_delivery'
  | 'qr_scanner_handover'
  | 'pickup_confirmation'
  | 'navigate_to_hospital'
  | 'deliver_to_hospital_lab'
  | 'job_completed'
  | 'start_handover'
  | 'enter_rider_details'
  | 'show_qr_code'
  | 'incoming_handover_request'
  | 'accept_handover'
  | 'confirm_handover'
  | 'profile'
  | 'performance_dashboard';

interface AppState {
  currentScreen: AppScreen;
  phoneNumber: string;
  otpId: string;
  otpCode: string;
  formData: RegistrationFormData | null;
  selectedHospitals: { main?: string; regional: string[] } | null;
  applicationId: string;
  hospitalName: string;
  riderName: string;
  currentJobId: string;
  handoverReason: string;
  handoverLocation: string;
  handoverData: {
    fromRider: string;
    toRider: string;
    riderId: string;
    qrScanned: boolean;
    phone: string;
    reason: string;
    location: string;
    requestedTime: string;
    handoverId: string;
  } | null;
  selectedRider: {
    id: string;
    name: string;
    phone: string;
  } | null;
  isAuthenticated: boolean;
  user: any;
  isInitializing: boolean;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    currentScreen: 'splash',
    phoneNumber: '',
    otpId: '',
    otpCode: '',
    formData: null,
    selectedHospitals: null,
    applicationId: '',
    hospitalName: '',
    riderName: '',
    currentJobId: '',
    handoverReason: '',
    handoverLocation: '',
    handoverData: null,
    selectedRider: null,
    isAuthenticated: false,
    user: null,
    isInitializing: true,
  });

  const updateAppState = (updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  };

  // Initialize authentication state on app startup (like Uber/PickMe)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Ensure splash screen shows for minimum 2 seconds for better UX
        const startTime = Date.now();

        const isAuth = await apiService.isAuthenticated();
        const user = await apiService.getStoredUser();

        console.log('Auth check - isAuth:', isAuth, 'user:', user);

        // Calculate remaining time to show splash
        const elapsedTime = Date.now() - startTime;
        const minSplashTime = 2000; // 2 seconds minimum
        const remainingTime = Math.max(0, minSplashTime - elapsedTime);

        // Wait for remaining time before transitioning
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        if (isAuth && user) {
          // User is authenticated, determine correct screen based on status
          const riderName = user.rider_name || user.phone || 'Rider';

          if (!user.profile_complete) {
            // Incomplete profile - continue registration
            console.log('Auto-login: Incomplete profile, going to registration');
            updateAppState({
              isAuthenticated: true,
              user,
              phoneNumber: user.phone || '',
              currentScreen: 'rider_info_form',
              isInitializing: false
            });
          } else if (user.status === 'approved') {
            // Approved rider - go directly to dashboard (like Uber/PickMe)
            console.log('Auto-login: Approved rider going to dashboard');

            // Start location tracking for approved riders
            try {
              await locationService.startTracking();
              console.log('Location tracking started for logged-in rider');
            } catch (error) {
              console.warn('Failed to start location tracking:', error);
            }

            updateAppState({
              isAuthenticated: true,
              user,
              riderName,
              phoneNumber: user.phone || '',
              currentScreen: 'dashboard_home',
              isInitializing: false
            });
          } else if (user.status === 'pending_hospital_approval') {
            // Pending hospital approval - go to review screen
            console.log('Auto-login: Pending approval rider going to review screen');
            updateAppState({
              isAuthenticated: true,
              user,
              riderName,
              phoneNumber: user.phone || '',
              currentScreen: 'application_under_review',
              isInitializing: false
            });
          } else {
            // Other statuses (rejected, suspended) - restart registration
            console.log('Auto-login: Invalid status, going to phone entry');
            await apiService.logout();
            updateAppState({
              isAuthenticated: false,
              user: null,
              currentScreen: 'phone_entry',
              isInitializing: false
            });
          }
        } else {
          // No auth - go directly to phone entry (skip extra splash)
          console.log('No auth found - starting fresh login flow');
          updateAppState({
            isAuthenticated: false,
            user: null,
            currentScreen: 'phone_entry',
            isInitializing: false
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        updateAppState({
          isAuthenticated: false,
          user: null,
          currentScreen: 'phone_entry',
          isInitializing: false
        });
      }
    };

    initializeAuth();
  }, []);

  // App lifecycle management for location tracking
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background, but keep tracking for riders
        console.log('App backgrounded - keeping location tracking active');
      } else if (nextAppState === 'active') {
        // App is coming to foreground
        console.log('App foregrounded');
        // Restart tracking if user is on dashboard and not currently tracking
        if (appState.currentScreen === 'dashboard_home' && !locationService.isCurrentlyTracking()) {
          locationService.startTracking().catch(console.error);
        }
      }
    };

    const subscription = RNAppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      // Stop location tracking when app is closed
      locationService.stopTracking().catch(console.error);
    };
  }, [appState.currentScreen]);

  // Splash Screen Handler
  const handleSplashFinish = () => {
    // Only proceed to phone entry if not initializing auth
    console.log('📱 handleSplashFinish called, isInitializing:', appState.isInitializing);
    if (!appState.isInitializing) {
      console.log('✅ Moving to phone_entry screen');
      updateAppState({ currentScreen: 'phone_entry' });
    } else {
      console.log('⏳ Still initializing, staying on splash');
    }
  };

  // Phone Entry Handler
  const handlePhoneNext = (phoneNumber: string, otpId: string) => {
    console.log('Phone number entered:', phoneNumber);
    updateAppState({ 
      phoneNumber,
      otpId,
      currentScreen: 'otp_verification' 
    });
  };

  // OTP Verification Handlers
  const handleOTPNext = () => {
    console.log('OTP verified successfully - new user');
    updateAppState({ 
      currentScreen: 'rider_info_form' 
    });
  };

  const handleOTPLoginSuccess = async () => {
    console.log('OTP verified successfully - existing rider');

    try {
      // Get the logged-in user data
      const user = await apiService.getStoredUser();
      const riderName = user?.rider_name || user?.phone || 'Rider';

      // Start location tracking for the rider
      try {
        const trackingStarted = await locationService.startTracking();
        if (trackingStarted) {
          console.log('Location tracking started for rider');
        } else {
          console.warn('Failed to start location tracking');
        }
      } catch (error) {
        console.error('Error starting location tracking:', error);
      }

      updateAppState({
        isAuthenticated: true,
        user,
        riderName,
        currentScreen: 'dashboard_home'
      });
    } catch (error) {
      console.error('Error getting user data after login:', error);
      updateAppState({
        currentScreen: 'dashboard_home'
      });
    }
  };

  const handleOTPBack = () => {
    updateAppState({ currentScreen: 'phone_entry' });
  };

  const handleOTPResend = () => {
    console.log('Resending OTP to:', appState.phoneNumber);
    // In real app, this would call the API to resend OTP
  };

  // Rider Info Form Handlers
  const handleRiderInfoNext = (formData: RegistrationFormData) => {
    console.log('Rider info submitted:', formData);
    updateAppState({ 
      formData,
      currentScreen: 'hospital_selection' 
    });
  };

  const handleRiderInfoBack = () => {
    updateAppState({ currentScreen: 'otp_verification' });
  };

  // Hospital Selection Handlers
  const handleHospitalSelectionNext = async (selectedHospitals: { main?: string; regional: string[] }) => {
    try {
      console.log('Hospital selected:', selectedHospitals);

      if (!appState.formData) {
        alert('Form data is missing. Please go back and fill the form again.');
        return;
      }

      // Create FormData with ALL rider data + hospital_id
      const formData = new FormData();

      // Add all rider information from previous step
      formData.append('rider_name', appState.formData.full_name);
      formData.append('email', appState.formData.phone + '@primecare.lk'); // Temporary email
      formData.append('phone', appState.formData.phone);
      formData.append('nic', appState.formData.nic);
      formData.append('address', appState.formData.address);
      formData.append('vehicle_type', appState.formData.vehicle_type);
      formData.append('vehicle_registration', appState.formData.vehicle_number);
      formData.append('license_number', appState.formData.license_number);

      // Add hospital_id from selected main hospital
      if (selectedHospitals.main) {
        formData.append('hospital_id', selectedHospitals.main);
      }

      // Add optional fields if available
      if (appState.formData.emergency_contact) {
        formData.append('emergency_contact_phone', appState.formData.emergency_contact);
      }
      if (appState.formData.insurance_valid_until) {
        // Convert DD/MM/YYYY to YYYY-MM-DD for PostgreSQL
        const dateStr = appState.formData.insurance_valid_until;
        const [day, month, year] = dateStr.split('/');
        const formattedDate = `${year}-${month}-${day}`;
        formData.append('insurance_expiry', formattedDate);
      }

      // Add all 5 image files
      if (appState.formData.profile_image) {
        formData.append('profile_image', {
          uri: appState.formData.profile_image,
          type: 'image/jpeg',
          name: 'profile.jpg',
        } as any);
      }

      if (appState.formData.license_image_front) {
        formData.append('license_image', {
          uri: appState.formData.license_image_front,
          type: 'image/jpeg',
          name: 'license_front.jpg',
        } as any);
      }

      if (appState.formData.license_image_back) {
        formData.append('license_image_back', {
          uri: appState.formData.license_image_back,
          type: 'image/jpeg',
          name: 'license_back.jpg',
        } as any);
      }

      if (appState.formData.nic_image_front) {
        formData.append('nic_image', {
          uri: appState.formData.nic_image_front,
          type: 'image/jpeg',
          name: 'nic_front.jpg',
        } as any);
      }

      if (appState.formData.nic_image_back) {
        formData.append('nic_image_back', {
          uri: appState.formData.nic_image_back,
          type: 'image/jpeg',
          name: 'nic_back.jpg',
        } as any);
      }

      console.log('Submitting rider registration to API...');

      // Call API to complete rider registration
      const response = await apiService.updateRiderProfile(formData);

      if (response.success) {
        // Get rider info from response
        const riderData = response.data?.rider || response.data;
        const applicationId = riderData.id || `PC-${Date.now().toString().slice(-6)}`;
        const hospitalName = riderData.hospital_name || 'Hospital';

        // Update user status in local storage
        const user = await apiService.getStoredUser();
        if (user) {
          user.profile_complete = true;
          user.status = 'pending_hospital_approval';
          await AsyncStorage.setItem('user_profile', JSON.stringify(user));
        }

        console.log('✅ Rider registration completed successfully');

        updateAppState({
          selectedHospitals,
          applicationId,
          hospitalName,
          currentScreen: 'application_under_review' // Go directly to pending screen
        });
      } else {
        console.error('Failed to complete registration:', response.error);
        alert(`Failed to submit application: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Registration submission error:', error);
      alert(`Failed to submit application: ${error.message || 'Unknown error'}`);
    }
  };

  const handleHospitalSelectionBack = () => {
    updateAppState({ currentScreen: 'rider_info_form' });
  };

  // Application Status Handlers
  const handleTrackStatus = () => {
    console.log('Tracking application status for:', appState.applicationId);
    updateAppState({ currentScreen: 'application_under_review' });
  };

  const handleDownloadCopy = () => {
    console.log('Downloading application copy for:', appState.applicationId);
    // In real app, this would generate and download PDF
  };

  const handleRefreshStatus = async (): Promise<void> => {
    console.log('Refreshing application status...');

    try {
      // Call API to get latest user profile
      const response = await apiService.getProfile();

      if (response.success && response.data) {
        const updatedUser = response.data.user || response.data;

        // Update local storage
        await AsyncStorage.setItem('user_profile', JSON.stringify(updatedUser));

        // Check if status changed to approved
        if (updatedUser.status === 'approved') {
          console.log('🎉 Rider has been approved!');
          updateAppState({
            user: updatedUser,
            currentScreen: 'application_approved'
          });
        } else {
          console.log('Status still pending:', updatedUser.status);
          updateAppState({ user: updatedUser });
        }
      }
    } catch (error) {
      console.error('Failed to refresh status:', error);
    }
  };

  const handleCompleteSetup = () => {
    console.log('Setup completed for rider:', appState.applicationId);
    const riderName = appState.formData?.full_name || 'Rider';
    updateAppState({ 
      riderName,
      currentScreen: 'dashboard_home' 
    });
  };

  const handleGoHome = async () => {
    console.log('Going to home screen');

    // Check rider approval status before allowing access to dashboard
    const user = await apiService.getStoredUser();

    if (user && user.status === 'approved') {
      updateAppState({ currentScreen: 'dashboard_home' });
    } else if (user && user.status === 'pending_hospital_approval') {
      // Rider is still pending - keep them on review screen
      updateAppState({ currentScreen: 'application_under_review' });
    } else {
      // Invalid status - logout and restart
      await apiService.logout();
      updateAppState({
        currentScreen: 'phone_entry',
        isAuthenticated: false,
        user: null
      });
    }
  };

  // Dashboard and Job Management Handlers
  const handleViewAllJobs = () => {
    updateAppState({ currentScreen: 'available_jobs' });
  };

  const handleJobSelect = (jobId: string) => {
    updateAppState({
      currentJobId: jobId,
      currentScreen: 'job_details'
    });
  };

  const handleActiveJobSelect = (jobId: string, status: string) => {
    // Route to appropriate screen based on order status
    let targetScreen: AppScreen;

    switch (status) {
      case 'assigned':
        targetScreen = 'navigation_to_pickup';
        break;
      case 'pickup_started':
        targetScreen = 'qr_scanner';
        break;
      case 'picked_up':
        targetScreen = 'navigate_to_hospital';
        break;
      case 'delivery_started':
        targetScreen = 'navigate_to_hospital';
        break;
      default:
        targetScreen = 'navigation_to_pickup';
    }

    updateAppState({
      currentJobId: jobId,
      currentScreen: targetScreen
    });
  };

  const handleAcceptJob = (jobId: string) => {
    console.log('Job accepted:', jobId);
    updateAppState({ 
      currentJobId: jobId,
      currentScreen: 'navigation_to_pickup' 
    });
  };

  const handleArrivedAtCenter = () => {
    // Check if this is a handover scenario
    if (appState.handoverData) {
      // Rider B arrived at handover location, ready to scan Rider A's QR
      updateAppState({ currentScreen: 'qr_scanner' });
    } else {
      // Normal pickup scenario
      updateAppState({ currentScreen: 'qr_scanner' });
    }
  };

  const handleQRScanSuccess = (qrData: string) => {
    console.log('QR scan successful:', qrData);

    // Check if this is a handover QR scan
    if (appState.handoverData) {
      // Rider B scanned Rider A's handover QR code
      updateAppState({
        handoverData: { ...appState.handoverData, qrScanned: true },
        currentScreen: 'confirm_handover'
      });
    } else {
      // Normal pickup QR scan
      updateAppState({ currentScreen: 'pickup_confirmation' });
    }
  };

  const handleStartDelivery = () => {
    console.log('Starting delivery for job:', appState.currentJobId);
    updateAppState({ currentScreen: 'navigate_to_hospital' });
  };

  const handleBackToHome = () => {
    updateAppState({ currentScreen: 'dashboard_home' });
  };

  const handleBackToJobs = () => {
    updateAppState({ currentScreen: 'available_jobs' });
  };

  const handleBackToJobDetails = () => {
    updateAppState({ currentScreen: 'job_details' });
  };

  const handleBackToNavigation = () => {
    updateAppState({ currentScreen: 'navigation_to_pickup' });
  };

  // New screen handlers for delivery and handover flow
  const handleArrivedAtHospital = () => {
    // Navigate to QR scanner to scan hospital QR code for delivery confirmation
    updateAppState({ currentScreen: 'qr_scanner_delivery' });
  };

  const handleDeliveryQRScanSuccess = (qrData: string) => {
    console.log('Hospital QR scan successful:', qrData);
    // After scanning hospital QR, show delivery confirmation screen
    updateAppState({ currentScreen: 'deliver_to_hospital_lab' });
  };

  const handleCompleteDelivery = () => {
    // Go directly back to home/dashboard after delivery confirmation
    updateAppState({ currentScreen: 'dashboard_home', currentJobId: null });
  };

  const handleStartHandover = () => {
    updateAppState({ currentScreen: 'start_handover' });
  };

  const handleBeginHandoverProcess = () => {
    updateAppState({ currentScreen: 'enter_rider_details' });
  };

  const handleSendHandoverRequest = (riderId: string) => {
    updateAppState({ 
      selectedRider: { id: riderId, name: 'Priya Silva', phone: '+94 71 456 7890' },
      currentScreen: 'show_qr_code' 
    });
  };

  const handlePackageScanned = () => {
    updateAppState({ currentScreen: 'confirm_handover' });
  };

  const handleCompleteHandover = () => {
    updateAppState({ currentScreen: 'job_completed' });
  };

  const handleAcceptHandoverRequest = () => {
    updateAppState({ 
      handoverData: {
        fromRider: appState.riderName || '',
        toRider: 'You',
        riderId: appState.currentJobId,
        qrScanned: false,
        phone: appState.phoneNumber,
        reason: appState.handoverReason || '',
        location: appState.handoverLocation || '',
        requestedTime: new Date().toISOString(),
        handoverId: appState.currentJobId + '_handover'
      },
      currentScreen: 'accept_handover' 
    });
  };

  const handleScanQRCode = () => {
    updateAppState({ currentScreen: 'qr_scanner' });
  };

  const handleQRScanForHandover = () => {
    if (appState.handoverData) {
      updateAppState({
        handoverData: { ...appState.handoverData, qrScanned: true },
        currentScreen: 'confirm_handover'
      });
    }
  };


  const handleViewProfile = () => {
    updateAppState({ currentScreen: 'profile' });
  };

  const handleViewPerformance = () => {
    updateAppState({ currentScreen: 'performance_dashboard' });
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      console.log('Logging out rider...');
      await apiService.logout();
      await locationService.stopTracking();

      updateAppState({
        isAuthenticated: false,
        user: null,
        riderName: '',
        phoneNumber: '',
        currentScreen: 'splash'
      });

      console.log('Logout successful');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still update state even if API call fails
      updateAppState({
        isAuthenticated: false,
        user: null,
        riderName: '',
        phoneNumber: '',
        currentScreen: 'splash'
      });
    }
  };

  // Remove auto-approval simulation - rider must wait for real hospital approval
  // The app will check status on refresh and update automatically when approved

  const renderCurrentScreen = () => {
    // Show splash screen during auth initialization OR when explicitly on splash screen
    if (appState.isInitializing || appState.currentScreen === 'splash') {
      return <SplashScreen onFinish={handleSplashFinish} />;
    }

    switch (appState.currentScreen) {

      case 'phone_entry':
        return (
          <PhoneEntryScreen 
            onNext={handlePhoneNext}
            onLoginSuccess={handleOTPLoginSuccess}
            onBack={() => updateAppState({ currentScreen: 'splash' })}
          />
        );

      case 'otp_verification':
        return (
          <OTPVerificationScreen
            phoneNumber={appState.phoneNumber}
            otpId={appState.otpId}
            onNext={handleOTPNext}
            onBack={handleOTPBack}
            onResend={handleOTPResend}
            onLoginSuccess={handleOTPLoginSuccess}
          />
        );

      case 'rider_info_form':
        return (
          <RiderInfoFormScreen
            phoneNumber={appState.phoneNumber}
            onNext={handleRiderInfoNext}
            onBack={handleRiderInfoBack}
          />
        );

      case 'hospital_selection':
        return (
          <HospitalSelectionScreen
            formData={appState.formData!}
            onNext={handleHospitalSelectionNext}
            onBack={handleHospitalSelectionBack}
          />
        );

      case 'application_submitted':
        return (
          <ApplicationSubmittedScreen
            applicationId={appState.applicationId}
            hospitalName={appState.hospitalName}
            onTrackStatus={handleTrackStatus}
           
            onGoHome={handleGoHome}
          />
        );

      case 'application_under_review':
        return (
          <ApplicationUnderReviewScreen
            onGoHome={handleGoHome}
            onRefreshStatus={handleRefreshStatus}
          />
        );

      case 'application_approved':
        return (
          <ApplicationApprovedScreen
            onCompleteSetup={handleCompleteSetup}
          />
        );

      case 'dashboard_home':
        return (
          <DashboardHomeScreen
            riderName={appState.riderName}
            onViewAllJobs={handleViewAllJobs}
            onKMReport={handleViewPerformance}
            onProfile={handleViewProfile}
            onEmergency={() => console.log('Emergency')}
            onSupport={() => console.log('Support')}
            onReportIssue={() => console.log('Report Issue')}
          />
        );

      case 'available_jobs':
        return (
          <AvailableJobsScreen
            onBack={handleBackToHome}
            onJobSelect={handleJobSelect}
            onActiveJobSelect={handleActiveJobSelect}
            onHandoverSelect={(handoverId: string) => {
              console.log('Handover selected:', handoverId);
              updateAppState({ currentScreen: 'incoming_handover_request' });
            }}
            onRefresh={() => console.log('Refresh jobs')}
            onHomePress={handleBackToHome}
            onReportsPress={handleViewPerformance}
            onProfilePress={handleViewProfile}
          />
        );

      case 'job_details':
        return (
          <JobDetailsScreen
            jobId={appState.currentJobId}
            onBack={handleBackToJobs}
            onAcceptJob={handleAcceptJob}
            onShare={() => console.log('Share job')}
            onBookmark={() => console.log('Bookmark job')}
          />
        );

      case 'navigation_to_pickup':
        return (
          <NavigationToPickupScreen
            jobId={appState.handoverData ?
              `HANDOVER-${appState.handoverData.handoverId}` :
              appState.currentJobId
            }
            onBack={appState.handoverData ?
              () => updateAppState({ currentScreen: 'accept_handover' }) :
              handleBackToJobDetails
            }
            onArrivedAtCenter={handleArrivedAtCenter}
            onCallCenter={appState.handoverData ?
              () => console.log('Call rider:', appState.handoverData?.phone) :
              () => console.log('Call center')
            }
            onShareLocation={() => console.log('Share location')}
            onMoreOptions={() => console.log('More options')}
          />
        );

      case 'qr_scanner':
        return (
          <QRCodeScannerScreen
            jobId={appState.currentJobId}
            onBack={handleBackToNavigation}
            onScanSuccess={handleQRScanSuccess}
            onManualEntry={() => console.log('Manual entry')}
            onCallSupport={() => console.log('Call support')}
          />
        );

      case 'qr_scanner_delivery':
        return (
          <QRCodeScannerScreen
            jobId={appState.currentJobId}
            onBack={() => updateAppState({ currentScreen: 'navigate_to_hospital' })}
            onScanSuccess={handleDeliveryQRScanSuccess}
            onManualEntry={() => console.log('Manual entry')}
            onCallSupport={() => console.log('Call support')}
          />
        );

      case 'qr_scanner_handover':
        return (
          <QRCodeScannerScreen
            jobId={appState.currentJobId}
            onBack={() => updateAppState({ currentScreen: 'accept_handover' })}
            onScanSuccess={(qrData: string) => {
              console.log('Handover QR scanned:', qrData);
              // After scanning Rider A's QR, complete handover and start navigation to hospital
              updateAppState({ currentScreen: 'navigate_to_hospital' });
            }}
            onManualEntry={() => console.log('Manual entry')}
            onCallSupport={() => console.log('Call support')}
          />
        );

      case 'pickup_confirmation':
        return (
          <PickupConfirmationScreen
            jobId={appState.currentJobId}
            onBack={handleBackToNavigation}
            onStartDelivery={handleStartDelivery}
            onCallSupport={() => console.log('Call support')}
            onReportIssue={() => console.log('Report issue')}
          />
        );

      case 'navigate_to_hospital':
        return (
          <NavigateToHospitalScreen
            jobId={appState.currentJobId}
            onBack={handleBackToNavigation}
            onArrivedAtHospital={handleArrivedAtHospital}
            onCallHospital={() => console.log('Call hospital')}
            onHandoverRequest={handleStartHandover}
            onShareLocation={() => console.log('Share location')}
          />
        );

      case 'deliver_to_hospital_lab':
        return (
          <DeliverToHospitalLabScreen
            jobId={appState.currentJobId}
            onBack={handleArrivedAtHospital}
            onCompleteDelivery={handleCompleteDelivery}
            onScanQR={() => console.log('Scan QR')}
            onEmergencyContact={() => console.log('Emergency contact')}
            onCallLab={() => console.log('Call lab')}
            onReportIssue={() => console.log('Report issue')}
          />
        );

      case 'job_completed':
        return (
          <JobCompletedScreen
            jobId={appState.currentJobId}
            onBackToHome={handleGoHome}
            onViewEarnings={() => console.log('View earnings')}
            onStartNewJob={handleViewAllJobs}
            onGoHome={handleGoHome}
            onNewJob={handleViewAllJobs}
            onViewSummary={() => console.log('View summary')}
          />
        );

      case 'start_handover':
        return (
          <StartHandoverScreen
            jobId={appState.currentJobId}
            onBack={handleBackToHome}
            onBeginHandover={(reason: string) => {
              console.log('Handover reason:', reason);
              handleBeginHandoverProcess();
            }}
            onEmergencySupport={() => console.log('Emergency support')}
          />
        );

      case 'enter_rider_details':
        return (
          <EnterRiderDetailsScreen
            onBack={() => updateAppState({ currentScreen: 'start_handover' })}
            onSendHandoverRequest={handleSendHandoverRequest}
            onCallRider={(phone: string) => console.log('Call rider:', phone)}
            onSendLocation={(riderId: string) => console.log('Send location to:', riderId)}
            onSendRequest={handleSendHandoverRequest}
            onScanRiderQR={() => console.log('Scan rider QR')}
          />
        );

      case 'show_qr_code':
        return (
          <ShowQRCodeScreen
            jobId={appState.currentJobId}
            receivingRiderName={appState.selectedRider?.name || 'Unknown Rider'}
            onBack={() => updateAppState({ currentScreen: 'enter_rider_details' })}
            onPackageScanned={handlePackageScanned}
            onReportIssue={() => console.log('Report issue')}
            onContactSupport={() => console.log('Contact support')}
            selectedRider={appState.selectedRider}
            onCallRider={() => console.log('Call rider')}
            onCancelHandover={() => updateAppState({ currentScreen: 'start_handover' })}
          />
        );

      case 'incoming_handover_request':
        return (
          <IncomingHandoverRequestScreen
            orderId={appState.currentJobId}
            fromRiderName={appState.handoverData?.fromRider}
            fromRiderPhone={appState.handoverData?.phone}
            handoverReason={appState.handoverData?.reason}
            meetupLocation={appState.handoverData?.location}
            requestedTime={appState.handoverData?.requestedTime}
            onBack={handleBackToHome}
            onAcceptHandover={handleAcceptHandoverRequest}
            onDeclineRequest={() => console.log('Decline handover')}
            onCallRider={() => console.log('Call rider')}
          />
        );

      case 'accept_handover':
        // Use NavigationToPickupScreen for navigating to handover point
        return (
          <NavigationToPickupScreen
            jobId={appState.currentJobId}
            onBack={() => updateAppState({ currentScreen: 'incoming_handover_request' })}
            onArrivedAtCenter={() => {
              console.log('Arrived at handover point');
              // After arriving, scan Rider A's QR code
              updateAppState({ currentScreen: 'qr_scanner_handover' });
            }}
            onCallCenter={() => {
              const phone = appState.handoverData?.phone || '';
              Linking.openURL(`tel:${phone}`);
            }}
            onShareLocation={() => console.log('Share location with rider')}
            onMoreOptions={() => console.log('More options')}
          />
        );

      case 'confirm_handover':
        return (
          <ConfirmHandoverScreen
            onBack={() => updateAppState({ currentScreen: 'accept_handover' })}
            onCompleteHandover={handleCompleteHandover}
            onCallHospital={() => console.log('Call hospital')}
            onEmergencyCancel={() => console.log('Emergency cancel')}
            handoverData={appState.handoverData}
            onReportIssue={() => console.log('Report issue')}
          />
        );


      case 'profile':
        return (
          <ProfileScreen
            onBack={handleBackToHome}
            onEditProfile={() => console.log('Edit profile')}
            onSettings={() => console.log('Settings')}
            onSignOut={handleLogout}
            onViewDelivery={(deliveryId: string) => console.log('View delivery:', deliveryId)}
            onEdit={() => console.log('Edit profile')}
            onViewPerformance={handleViewPerformance}
            onSupport={() => console.log('Support')}
            onLogout={handleLogout}
            onHomePress={handleBackToHome}
            onJobsPress={() => updateAppState({ currentScreen: 'available_jobs' })}
            onReportsPress={handleViewPerformance}
          />
        );

      case 'performance_dashboard':
        return (
          <PerformanceDashboardScreen
            onBack={handleViewProfile}
            onHomePress={handleBackToHome}
            onJobsPress={() => updateAppState({ currentScreen: 'available_jobs' })}
            onProfilePress={handleViewProfile}
          />
        );

      default:
        return <SplashScreen onFinish={handleSplashFinish} />;
    }
  };

  return (
    <ErrorBoundary>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      {renderCurrentScreen()}
    </ErrorBoundary>
  );
}
