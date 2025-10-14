import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
  Platform,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { ArrowLeft, Phone, Navigation, MapPin, Clock, CheckCircle, RotateCcw, Share, Hospital, Package, Truck, Car, AlertTriangle, Timer, FlaskConical, Thermometer, Shield, User, Route } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocation, LocationData as GPSLocationData } from '../hooks/useLocation';
import { apiService } from '../services/api';
import { locationService } from '../services/locationService';

const { height: screenHeight } = Dimensions.get('window');

interface NavigateToHospitalScreenProps {
  jobId: string;
  onBack: () => void;
  onArrivedAtHospital: () => void;
  onCallHospital: () => void;
  onHandoverRequest: () => void;
  onShareLocation?: () => void;
  onNavigateToPickup?: (orderId: string) => void; // Navigate to pickup for multi-parcel
}

interface LocationData {
  latitude: number;
  longitude: number;
}

interface HospitalNavigationData {
  currentLocation: LocationData;
  hospital: LocationData;
  route: LocationData[];
  remainingDistance: string;
  remainingKm: number;
  estimatedTime: string;
  estimatedMinutes: number;
  routeInstructions: string;
  nextInstruction: string;
  hospital_name: string;
  hospital_address: string;
  hospital_phone: string;
  contactPerson: string;
  department: string;
  floor: string;
  hospital_instructions: string[];
  samples: {
    types: string[];
    totalCount: number;
    bloodTubes: number;
    urineSamples: number;
    description: string;
  };
  pickupTime: string;
  deliveryDeadline: string;
  temperatureStatus: string;
  priority: 'URGENT' | 'STANDARD';
  earnings: string;
  deliveryProgress: {
    pickupCompleted: string;
    deliveryInProgress: string;
    remaining: string;
    totalJob: string;
  };
  trafficStatus: 'light' | 'moderate' | 'heavy';
  speedLimit: number;
  currentSpeed: number;
}

interface NewOrderNotification {
  orderId: string;
  multiParcelOfferId?: string; // For multi-parcel offers
  centerName: string;
  centerAddress: string;
  sampleType: string;
  sampleQuantity: number;
  urgency: 'urgent' | 'routine';
  additionalDistance: number;
  additionalTime: number;
  earnings: number;
  hospitalId: string;
}

const NavigateToHospitalScreen: React.FC<NavigateToHospitalScreenProps> = ({
  jobId,
  onBack,
  onArrivedAtHospital,
  onCallHospital,
  onHandoverRequest,
  onShareLocation,
  onNavigateToPickup,
}) => {
  const [isNavigating, setIsNavigating] = useState(true);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  // Multi-parcel delivery states
  const [newOrderNotification, setNewOrderNotification] = useState<NewOrderNotification | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [isProcessingNewOrder, setIsProcessingNewOrder] = useState(false);
  const [activeOrders, setActiveOrders] = useState<string[]>([jobId]); // Current orders being carried

  const speedPulse = useRef(new Animated.Value(1)).current;

  // Function to open Google Maps navigation
  const openGoogleMaps = () => {
    if (hospitalData.latitude && hospitalData.longitude) {
      // Try Google Maps first on both platforms
      const googleMapsUrl = Platform.select({
        ios: `comgooglemaps://?daddr=${hospitalData.latitude},${hospitalData.longitude}&directionsmode=driving`,
        android: `google.navigation:q=${hospitalData.latitude},${hospitalData.longitude}&mode=d`,
      });

      if (googleMapsUrl) {
        Linking.canOpenURL(googleMapsUrl).then((supported) => {
          if (supported) {
            Linking.openURL(googleMapsUrl);
          } else {
            // Fallback to web Google Maps
            const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${hospitalData.latitude},${hospitalData.longitude}&travelmode=driving`;
            Linking.openURL(webUrl);
          }
        });
      }
    }
  };
  
  // Real GPS location tracking
  const { locationState, startTracking, stopTracking, getDistance } = useLocation();
  
  // Dynamic hospital data loaded from API
  const [hospitalData, setHospitalData] = useState({
    latitude: 6.9271, // Default Colombo coordinates until API loads
    longitude: 79.8612,
    name: 'Loading...',
    address: 'Loading address...',
    phone: '',
    contactPerson: 'Hospital Staff',
    department: 'Laboratory',
    floor: 'Ground Floor',
  });

  // Load job details and hospital data
  useEffect(() => {
    const loadJobData = async () => {
      try {
        setLoading(true);
        const response = await apiService.getOrderDetails(jobId);
        
        if (response.success && response.data) {
          const orderData = response.data.order || response.data;

          console.log('📦 Order delivery_location:', orderData.delivery_location);

          const hospitalInfo = {
            latitude: orderData.delivery_location?.lat || orderData.hospital_coordinates?.lat,
            longitude: orderData.delivery_location?.lng || orderData.hospital_coordinates?.lng,
            name: orderData.delivery_location?.name || orderData.hospital_name || 'Hospital',
            address: orderData.delivery_location?.address || orderData.hospital_address || 'Hospital address',
            phone: orderData.delivery_location?.phone || orderData.hospital_phone || '',
            contactPerson: 'Hospital Staff',
            department: 'Laboratory',
            floor: 'Ground Floor',
          };

          console.log('🏥 Hospital Info:', hospitalInfo);

          setHospitalData(hospitalInfo);
          // Route will be loaded automatically by the useEffect when GPS is ready
        }
      } catch (error: any) {
        console.error('Failed to load job data:', error);
        // Keep default data as fallback
      } finally {
        setLoading(false);
      }
    };

    loadJobData();
    checkForAvailableRoutes(); // Check for multi-parcel opportunities
  }, [jobId]);

  // Load route from distance API
  const loadRouteWithCoordinates = async (originLat: number, originLng: number, destLat: number, destLng: number) => {
    try {
      console.log('🗺️ Loading route:', { originLat, originLng, destLat, destLng });

      const response = await apiService.getDirections(
        { lat: originLat, lng: originLng },
        { lat: destLat, lng: destLng }
      );

      console.log('🗺️ Route response:', response);

      if (response.success && response.data?.route) {
        console.log('🗺️ Route points count:', response.data.route.length);

        // Convert route to coordinate array for Polyline
        const routeCoordinates = response.data.route.map((point: any) => ({
          latitude: point.lat || point.latitude,
          longitude: point.lng || point.longitude,
        }));

        console.log('🗺️ Setting route with', routeCoordinates.length, 'points');

        setNavigationData(prev => ({
          ...prev,
          route: routeCoordinates,
          currentLocation: { latitude: originLat, longitude: originLng },
          hospital: { latitude: destLat, longitude: destLng },
        }));

        // Fit map to show both locations
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(
            [
              { latitude: originLat, longitude: originLng },
              { latitude: destLat, longitude: destLng }
            ],
            {
              edgePadding: { top: 200, right: 50, bottom: 400, left: 50 },
              animated: true,
            }
          );
        }
      } else {
        console.log('🗺️ No route in response');
      }
    } catch (error) {
      console.error('🗺️ Failed to load route:', error);
    }
  };

  // Check for available routes and multi-parcel opportunities
  const checkForAvailableRoutes = async () => {
    try {
      // Check for multi-parcel offers first
      const multiParcelResponse = await apiService.getMyMultiParcelOffers();

      if (multiParcelResponse.success && multiParcelResponse.data?.offers?.length > 0) {
        const offer = multiParcelResponse.data.offers[0]; // Take first offer

        const notification: NewOrderNotification = {
          orderId: offer.order_id,
          multiParcelOfferId: offer.id, // Store the multi-parcel offer ID
          centerName: offer.collection_center_name,
          centerAddress: offer.collection_center_address,
          sampleType: offer.sample_type,
          sampleQuantity: offer.sample_quantity || 1,
          urgency: offer.urgency,
          additionalDistance: parseFloat(offer.rider_to_center_distance_km) || 0,
          additionalTime: offer.additional_time_minutes || 0,
          earnings: parseFloat(offer.additional_earnings) || 0,
          hospitalId: offer.hospital_id
        };

        setNewOrderNotification(notification);
        setShowNewOrderModal(true);
      }
    } catch (error) {
      console.error('Error checking multi-parcel opportunities:', error);
    }
  };

  // Handle accepting new order on route
  const handleAcceptNewOrder = async () => {
    if (!newOrderNotification) return;

    try {
      setIsProcessingNewOrder(true);

      let response;
      if (newOrderNotification.multiParcelOfferId) {
        // Accept multi-parcel offer
        response = await apiService.acceptMultiParcelOffer(newOrderNotification.multiParcelOfferId);
      } else {
        // Accept regular job
        response = await apiService.acceptJob(newOrderNotification.orderId);
      }

      if (response.success) {
        // Add new order to active orders
        setActiveOrders(prev => [...prev, newOrderNotification.orderId]);
        setShowNewOrderModal(false);

        // Navigate to pickup screen for the new order
        if (onNavigateToPickup) {
          onNavigateToPickup(newOrderNotification.orderId);
        } else {
          Alert.alert(
            'Order Accepted!',
            `Navigate to ${newOrderNotification.centerName} first, then continue to hospital.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to accept order');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept order');
    } finally {
      setIsProcessingNewOrder(false);
    }
  };

  // Handle declining new order
  const handleDeclineNewOrder = async () => {
    if (!newOrderNotification) return;

    try {
      if (newOrderNotification.multiParcelOfferId) {
        // Reject multi-parcel offer
        await apiService.rejectMultiParcelOffer(newOrderNotification.multiParcelOfferId);
      }
    } catch (error) {
      console.error('Error declining multi-parcel offer:', error);
    }

    setShowNewOrderModal(false);
    setNewOrderNotification(null);
  };
  
  // Dynamic navigation data based on real location
  const [navigationData, setNavigationData] = useState<HospitalNavigationData>({
    currentLocation: {
      latitude: 6.9147,
      longitude: 79.8731,
    },
    hospital: {
      latitude: hospitalData.latitude,
      longitude: hospitalData.longitude,
    },
    route: [],
    remainingDistance: 'Calculating...',
    remainingKm: 0,
    estimatedTime: 'Calculating...',
    estimatedMinutes: 0,
    routeInstructions: 'Getting directions...',
    nextInstruction: 'Please wait while we calculate the route',
    hospital_name: hospitalData.name,
    hospital_address: hospitalData.address,
    hospital_phone: hospitalData.phone,
    contactPerson: hospitalData.contactPerson,
    department: 'Central Laboratory',
    floor: '2nd Floor, Block A',
    hospital_instructions: [
      'Enter through main hospital entrance',
      'Report to Central Lab reception desk',
      'Present delivery receipt for signature',
      'Use elevator to reach 2nd floor',
    ],
    samples: {
      types: ['Blood samples', 'Urine specimens'],
      totalCount: 11,
      bloodTubes: 8,
      urineSamples: 3,
      description: '8 blood tubes (EDTA: 5, Serum: 3) + 3 urine containers',
    },
    pickupTime: '3:18 PM',
    deliveryDeadline: 'Deliver within 45 minutes',
    temperatureStatus: 'Temperature controlled - All samples secure',
    priority: 'URGENT',
    earnings: 'Rs. 1,250',
    deliveryProgress: {
      pickupCompleted: '2.8 km completed',
      deliveryInProgress: '1.7 km total delivery',
      remaining: '1.2 km remaining',
      totalJob: '4.5 km toward monthly KM target',
    },
    trafficStatus: 'light',
    speedLimit: 50,
    currentSpeed: 38,
  });

  // Start GPS tracking when component mounts
  useEffect(() => {
    let speedAnimation: any;

    const initializeNavigation = async () => {
      // Start location tracking
      const trackingStarted = await startTracking({
        accuracy: 'high',
        interval: 2000, // Update every 2 seconds
        distanceInterval: 5, // Update every 5 meters
      });

      if (trackingStarted) {
        console.log('🚀 Hospital navigation tracking started');

        // Background tracking should already be running from pickup
        // Just verify it's tracking the correct order
        if (!locationService.isTrackingOrder() || locationService.getTrackingOrderId() !== jobId) {
          console.log('⚠️ Background tracking not active, starting it now');
          await locationService.startBackgroundOrderTracking(jobId);
        }
      } else {
        Alert.alert(
          'Navigation Required',
          'GPS tracking is needed for navigation. Please enable location services.',
          [{ text: 'OK' }]
        );
      }
    };

    // Speed monitoring animation
    speedAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(speedPulse, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(speedPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    speedAnimation.start();

    initializeNavigation();

    return () => {
      speedAnimation?.stop();
      stopTracking(); // Stop tracking when component unmounts
      // Background tracking will be stopped when delivery is completed
    };
  }, []);

  // Load route when GPS location becomes available
  useEffect(() => {
    if (locationState.currentLocation && hospitalData.latitude && hospitalData.latitude !== 0) {
      console.log('📍 GPS location available, loading route...');
      loadRouteWithCoordinates(
        locationState.currentLocation.latitude,
        locationState.currentLocation.longitude,
        hospitalData.latitude,
        hospitalData.longitude
      );
    }
  }, [locationState.currentLocation, hospitalData.latitude]);

  // Update navigation data when location changes
  useEffect(() => {
    if (locationState.currentLocation) {
      const currentLoc = locationState.currentLocation;
      const hospital = { latitude: hospitalData.latitude, longitude: hospitalData.longitude };

      // Calculate distance and estimated time
      const hospitalGPS: GPSLocationData = {
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        accuracy: 0,
        timestamp: Date.now(),
      };
      const distanceKm = getDistance(currentLoc, hospitalGPS);
      const remainingDistance = `${distanceKm.toFixed(1)} km`;

      // Estimate time based on average city speed (25 km/h)
      const estimatedMinutes = Math.round((distanceKm / 25) * 60);
      const estimatedTime = estimatedMinutes > 60
        ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
        : `${estimatedMinutes} min`;

      // Get current speed from GPS (convert from m/s to km/h)
      const currentSpeed = currentLoc.speed
        ? Math.round(currentLoc.speed * 3.6)
        : 0;

      setNavigationData(prev => ({
        ...prev,
        currentLocation: {
          latitude: currentLoc.latitude,
          longitude: currentLoc.longitude,
        },
        remainingDistance,
        remainingKm: distanceKm,
        estimatedTime,
        estimatedMinutes,
        routeInstructions: distanceKm > 0.1 ? 'Tap below to open Google Maps for navigation' : 'You have arrived!',
        nextInstruction: distanceKm > 0.1 ? `${remainingDistance} to hospital` : 'Ready for delivery!',
        currentSpeed: 0, // Remove speed monitoring
        deliveryProgress: {
          ...prev.deliveryProgress,
          remaining: `${distanceKm.toFixed(1)} km remaining`,
          totalJob: `${distanceKm.toFixed(1)} km toward monthly target`,
        },
      }));
    }
  }, [locationState.currentLocation]);

  const handleOpenGoogleMaps = async () => {
    const { hospital, currentLocation } = navigationData;
    
    const googleMapsApp = Platform.OS === 'ios' 
      ? `comgooglemaps://?daddr=${hospital.latitude},${hospital.longitude}&directionsmode=driving`
      : `google.navigation:q=${hospital.latitude},${hospital.longitude}&mode=d`;
    
    const googleMapsWeb = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${hospital.latitude},${hospital.longitude}&travelmode=driving`;
    
    try {
      const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsApp);
      
      if (canOpenGoogleMaps) {
        await Linking.openURL(googleMapsApp);
      } else {
        await Linking.openURL(googleMapsWeb);
      }
    } catch (error) {
      Alert.alert('Navigation Error', 'Unable to open maps application.');
    }
  };

  const handleCallHospital = () => {
    const url = `tel:${navigationData.hospital_phone}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to make phone call');
    });
    onCallHospital();
  };

  const handleArrivedAtHospital = () => {
    Alert.alert(
      'Confirm Hospital Arrival',
      'Have you arrived at the hospital and ready to deliver samples?',
      [
        { text: 'Not Yet', style: 'cancel' },
        { 
          text: 'Yes, I\'m Here', 
          onPress: () => {
            setIsNavigating(false);
            onArrivedAtHospital();
          }
        },
      ]
    );
  };

  const getTrafficColor = () => {
    switch (navigationData.trafficStatus) {
      case 'light': return COLORS.success;
      case 'moderate': return COLORS.warning;
      case 'heavy': return COLORS.error;
      default: return COLORS.success;
    }
  };

  const getSpeedStatus = () => {
    const ratio = navigationData.currentSpeed / navigationData.speedLimit;
    if (ratio > 1.1) return { color: COLORS.error, status: 'Over Speed' };
    if (ratio > 0.9) return { color: COLORS.warning, status: 'At Limit' };
    return { color: COLORS.success, status: 'Safe Speed' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent />
      
      {/* Professional Map Container */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: navigationData.currentLocation.latitude,
            longitude: navigationData.currentLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsTraffic={true}
          followsUserLocation={false}
          onMapReady={() => {}}
        >
          {/* Current Location Marker */}
          <Marker
            coordinate={navigationData.currentLocation}
            title="Your Location"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.currentLocationMarker}>
              <Navigation size={20} color={COLORS.white} />
            </View>
          </Marker>
          
          {/* Hospital Marker */}
          <Marker
            coordinate={navigationData.hospital}
            title={navigationData.hospital_name}
            description={navigationData.hospital_address}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.hospitalMarker}>
              <Hospital size={24} color={COLORS.white} />
            </View>
          </Marker>
          
          {/* Professional Route Line */}
          <Polyline
            coordinates={navigationData.route}
            strokeColor={COLORS.success}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
            geodesic={true}
          />
        </MapView>

        {/* Professional Status Bar Overlay */}
        <View style={styles.statusOverlay}
        >
          <View style={styles.topControls}>
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
              <ArrowLeft size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            
            <View style={styles.statusCenter}>
              <Text style={styles.statusTitle}>Delivering to Hospital</Text>
              <Text style={styles.jobCode}>{jobId}</Text>
            </View>
            
            <View style={styles.topRightControls}>
              {onShareLocation && (
                <TouchableOpacity onPress={onShareLocation} style={styles.topControl} activeOpacity={0.8}>
                  <Share size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={openGoogleMaps} style={styles.topControl} activeOpacity={0.8}>
                <Navigation size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onHandoverRequest} style={styles.topControl} activeOpacity={0.8}>
                <RotateCcw size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Professional Navigation HUD */}
        <View style={styles.navigationHUD}>
          <View style={styles.hudLeft}>
            <Text style={styles.remainingDistance}>{navigationData.remainingDistance}</Text>
            <Text style={styles.remainingTime}>
              {navigationData.estimatedTime} to hospital
              {locationState.isTracking && <Text style={styles.gpsStatus}> • GPS Active</Text>}
            </Text>
          </View>
          
          <View style={styles.hudRight}>
            <View style={[styles.trafficIndicator, { backgroundColor: getTrafficColor() }]}>
              <Car size={16} color={COLORS.white} />
              <Text style={styles.trafficText}>
                {navigationData.trafficStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Status Badge */}
        <View style={styles.deliveryBadge}>
          <LinearGradient
            colors={navigationData.priority === 'URGENT' ? 
              [COLORS.error, '#d32f2f'] : 
              [COLORS.success, '#4CAF50']
            }
            style={styles.deliveryBadgeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Hospital size={16} color={COLORS.white} />
            <Text style={styles.deliveryBadgeText}>
              {navigationData.priority} DELIVERY
            </Text>
          </LinearGradient>
        </View>

        {/* Speed Monitor */}
        <Animated.View style={[styles.speedMonitor, { transform: [{ scale: speedPulse }] }]}>
          <Text style={[styles.currentSpeed, { color: getSpeedStatus().color }]}>
            {navigationData.currentSpeed}
          </Text>
          <Text style={styles.speedUnit}>km/h</Text>
          <Text style={[styles.speedStatus, { color: getSpeedStatus().color }]}>
            {getSpeedStatus().status}
          </Text>
        </Animated.View>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton} onPress={handleOpenGoogleMaps} activeOpacity={0.8}>
            <MapPin size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton} onPress={handleCallHospital} activeOpacity={0.8}>
            <Phone size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Simple Bottom Panel with Two Buttons */}
      <View style={styles.bottomPanel}>
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.arrivedButton}
            onPress={handleArrivedAtHospital}
            disabled={!isNavigating}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={!isNavigating ?
                [COLORS.success, '#4CAF50'] :
                navigationData.priority === 'URGENT' ?
                  [COLORS.error, '#d32f2f'] :
                  [COLORS.success, '#4CAF50']
              }
              style={styles.arrivedButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Hospital size={20} color={COLORS.white} />
              <Text style={styles.arrivedButtonText}>
                {!isNavigating ? 'Delivery Completed' : 'Arrived at Hospital'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.handoverButton}
            onPress={onHandoverRequest}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.warning, '#f57c00']}
              style={styles.handoverButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <RotateCcw size={20} color={COLORS.white} />
              <Text style={styles.handoverButtonText}>Start Handover</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Multi-Parcel New Order Modal */}
      <Modal
        visible={showNewOrderModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleDeclineNewOrder}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.newOrderModal}>
            <View style={styles.modalHeader}>
              <Package size={24} color={COLORS.primary} />
              <Text style={styles.modalHeaderTitle}>New Order Available!</Text>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.newOrderTitle}>
                Pick up on your route to {hospitalData.name}
              </Text>

              {newOrderNotification && (
                <>
                  <View style={styles.orderInfoRow}>
                    <MapPin size={16} color={COLORS.primary} />
                    <Text style={styles.orderInfoLabel}>Collection Center:</Text>
                  </View>
                  <Text style={styles.centerName}>{newOrderNotification.centerName}</Text>
                  <Text style={styles.centerAddress}>{newOrderNotification.centerAddress}</Text>

                  <View style={styles.orderInfoRow}>
                    <Route size={16} color={COLORS.textSecondary} />
                    <Text style={styles.orderInfoLabel}>Distance from you:</Text>
                    <Text style={styles.orderInfoValue}>
                      {newOrderNotification.additionalDistance.toFixed(1)} km away
                    </Text>
                  </View>

                  <View style={styles.orderInfoRow}>
                    <Package size={16} color={COLORS.textSecondary} />
                    <Text style={styles.orderInfoLabel}>Sample:</Text>
                    <Text style={styles.orderInfoValue}>
                      {newOrderNotification.sampleQuantity} {newOrderNotification.sampleType}
                    </Text>
                  </View>

                  <View style={styles.orderInfoRow}>
                    <Clock size={16} color={COLORS.textSecondary} />
                    <Text style={styles.orderInfoLabel}>Extra Time:</Text>
                    <Text style={styles.orderInfoValue}>
                      +{newOrderNotification.additionalTime} min
                    </Text>
                  </View>

                  {newOrderNotification.urgency === 'urgent' && (
                    <View style={styles.urgentBadge}>
                      <Timer size={16} color={COLORS.white} />
                      <Text style={styles.urgentText}>URGENT DELIVERY</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={handleDeclineNewOrder}
                disabled={isProcessingNewOrder}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.acceptButton, isProcessingNewOrder && styles.buttonDisabled]}
                onPress={handleAcceptNewOrder}
                disabled={isProcessingNewOrder}
              >
                <LinearGradient
                  colors={[COLORS.success, '#4CAF50']}
                  style={styles.acceptButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.acceptButtonText}>
                    {isProcessingNewOrder ? 'Processing...' : 'Accept Order'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingTop: 25,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    ...SHADOWS.md,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
  },
  statusTitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  jobCode: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  topControl: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationHUD: {
    position: 'absolute',
    top: 120,
    left: SPACING.xl,
    right: SPACING.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: LAYOUT.radius.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.lg,
  },
  hudLeft: {
    flex: 1,
  },
  remainingDistance: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  remainingTime: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  gpsStatus: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.success,
    fontWeight: '600',
  },
  hudRight: {
    alignItems: 'flex-end',
  },
  trafficIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
    gap: SPACING.xs,
  },
  trafficText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  deliveryBadge: {
    position: 'absolute',
    top: 180,
    left: SPACING.xl,
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  deliveryBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  deliveryBadgeText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
  },
  speedMonitor: {
    position: 'absolute',
    bottom: 200,
    right: SPACING.xl,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.md,
    alignItems: 'center',
    minWidth: 80,
    ...SHADOWS.card,
  },
  currentSpeed: {
    ...TYPOGRAPHY.styles.h2,
    fontWeight: '800',
  },
  speedUnit: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  speedStatus: {
    ...TYPOGRAPHY.styles.caption,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  mapControls: {
    position: 'absolute',
    bottom: 200,
    left: SPACING.xl,
    gap: SPACING.sm,
  },
  mapControlButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  currentLocationMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  hospitalMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: LAYOUT.radius.xl,
    borderTopRightRadius: LAYOUT.radius.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    ...SHADOWS.xl,
  },
  panelHandle: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.gray50,
    marginHorizontal: -SPACING.xl,
    marginTop: -SPACING.sm,
  },
  handleBar: {
    width: 50,
    height: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    marginBottom: SPACING.sm,
  },
  handleIconContainer: {
    marginBottom: SPACING.xs,
  },
  panelHandleText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  quickInfo: {
    marginBottom: SPACING.lg,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  currentInstruction: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.success,
    fontWeight: '600',
    flex: 1,
  },
  nextInstruction: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  temperatureAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  temperatureAlertText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '500',
    flex: 1,
  },
  detailsContent: {
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  hospitalCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  hospitalTitle: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.success,
    fontWeight: '700',
    flex: 1,
  },
  priorityBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
  },
  priorityText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  hospitalName: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  hospitalAddress: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  department: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.success,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  contactPhone: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.xs,
  },
  callButtonText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.white,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: COLORS.success + '10',
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
  },
  instructionsTitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.success,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  instructionText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.success,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  samplesCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
  },
  samplesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  samplesTitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '700',
    flex: 1,
  },
  sampleCount: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.round,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sampleCountText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  samplesDescription: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  sampleTypes: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sampleType: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
  },
  sampleTypeText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },
  deliveryTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  deliveryTimeText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
  },
  progressCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  progressTitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '700',
  },
  progressItems: {
    gap: SPACING.md,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressItemText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
  },
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  earningsText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.success,
    fontWeight: '700',
  },
  actionButtons: {
    gap: SPACING.md,
  },
  arrivedButton: {
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  arrivedButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  arrivedButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '700',
  },
  handoverButton: {
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  handoverButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  handoverButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '700',
  },

  // Multi-parcel modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  newOrderModal: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.sm,
    backgroundColor: COLORS.gray50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalHeaderTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  modalContent: {
    padding: SPACING.lg,
  },
  newOrderTitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  centerName: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  centerAddress: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  orderInfoLabel: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
    width: 80,
  },
  orderInfoValue: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    flex: 1,
  },
  earningsRow: {
    backgroundColor: COLORS.success + '15',
    borderRadius: LAYOUT.radius.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    justifyContent: 'space-between',
  },
  earningsLabel: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.success,
    fontWeight: '600',
  },
  earningsValue: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.success,
    fontWeight: '700',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    borderRadius: LAYOUT.radius.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
    alignSelf: 'flex-start',
  },
  urgentText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  declineButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: 'center',
  },
  declineButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.textSecondary,
  },
  acceptButton: {
    flex: 2,
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default NavigateToHospitalScreen;