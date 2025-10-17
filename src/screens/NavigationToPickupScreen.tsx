import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { ArrowLeft, Phone, Navigation, MapPin, Clock, CheckCircle, Package, Share, Route, Car } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocation, LocationData as GPSLocationData } from '../hooks/useLocation';
import { distanceService } from '../services/distanceService';
import { apiService } from '../services/api';
import { locationService } from '../services/locationService';

interface NavigationToPickupScreenProps {
  jobId: string;
  onBack: () => void;
  onArrivedAtCenter: () => void;
  onCallCenter: () => void;
  onShareLocation: () => void;
  onMoreOptions: () => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
}

interface NavigationData {
  currentLocation: LocationData;
  destination: LocationData;
  route: LocationData[];
  remainingDistance: string;
  remainingKm: number;
  estimatedTime: string;
  estimatedMinutes: number;
  routeInstructions: string;
  nextInstruction: string;
  destination_name: string;
  destination_address: string;
  destination_phone: string;
  weatherAlert?: string;
  trafficStatus: 'light' | 'moderate' | 'heavy';
  speedLimit: number;
  currentSpeed: number;
  priority: 'URGENT' | 'STANDARD';
  totalDistance: string;
  contributesToKM: string;
}

const NavigationToPickupScreen: React.FC<NavigationToPickupScreenProps> = ({
  jobId,
  onBack,
  onArrivedAtCenter,
  onCallCenter,
  onShareLocation,
  onMoreOptions,
}) => {
  const [isNavigating, setIsNavigating] = useState(true);
  const mapRef = useRef<MapView>(null);

  // Function to open Google Maps navigation
  const openGoogleMaps = () => {
    if (destinationData.latitude && destinationData.longitude) {
      // Try Google Maps first on both platforms
      const googleMapsUrl = Platform.select({
        ios: `comgooglemaps://?daddr=${destinationData.latitude},${destinationData.longitude}&directionsmode=driving`,
        android: `google.navigation:q=${destinationData.latitude},${destinationData.longitude}&mode=d`,
      });

      if (googleMapsUrl) {
        Linking.canOpenURL(googleMapsUrl).then((supported) => {
          if (supported) {
            Linking.openURL(googleMapsUrl);
          } else {
            // Fallback to web Google Maps
            const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationData.latitude},${destinationData.longitude}&travelmode=driving`;
            Linking.openURL(webUrl);
          }
        });
      }
    }
  };
  const [loading, setLoading] = useState(true);

  // Real GPS location tracking
  const { locationState, startTracking, stopTracking, getDistance } = useLocation();

  // Fallback location from database when GPS unavailable
  const [fallbackLocation, setFallbackLocation] = useState<GPSLocationData | null>(null);

  // Dynamic destination data loaded from API
  const [destinationData, setDestinationData] = useState({
    latitude: 6.9271, // Default Colombo coordinates until API loads
    longitude: 79.8612,
    name: 'Loading...',
    address: 'Loading address...',
    phone: '',
  });

  // Load job details and destination data
  useEffect(() => {
    const loadJobData = async () => {
      try {
        setLoading(true);
        const response = await apiService.getOrderDetails(jobId);
        
        if (response.success && response.data) {
          const orderData = response.data.order || response.data;

          // Check if this is handover navigation (handover_point coordinates exist)
          const isHandoverNavigation = orderData.handover_point_lat && orderData.handover_point_lng;

          if (isHandoverNavigation) {
            // Navigating to handover point for Rider B
            if (!orderData.handover_point_lat || !orderData.handover_point_lng) {
              console.error('❌ No valid handover coordinates');
              Alert.alert('Error', 'Handover location not available. Please contact the other rider.');
              return;
            }

            setDestinationData({
              latitude: parseFloat(orderData.handover_point_lat),
              longitude: parseFloat(orderData.handover_point_lng),
              name: `Handover with ${orderData.rider_name || 'Rider'}`,
              address: 'Handover Meeting Point',
              phone: orderData.rider_phone || orderData.center_phone || '',
            });
          } else {
            // Normal navigation to collection center
            // Try multiple possible coordinate field names from backend
            const lat = orderData.center_coordinates?.lat ||
                       orderData.pickup_location_lat ||
                       orderData.locations?.pickup?.lat;
            const lng = orderData.center_coordinates?.lng ||
                       orderData.pickup_location_lng ||
                       orderData.locations?.pickup?.lng;

            if (!lat || !lng) {
              console.error('❌ No valid coordinates found for collection center');
              Alert.alert('Error', 'Collection center location not available. Please contact support.');
              return;
            }

            setDestinationData({
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
              name: orderData.center_name || 'Collection Center',
              address: orderData.center_address || 'Address not available',
              phone: orderData.center_phone || '',
            });
          }
        }
      } catch (error: any) {
        console.error('Failed to load job data:', error);
        // Keep default data as fallback
      } finally {
        setLoading(false);
      }
    };

    loadJobData();
  }, [jobId]);
  
  // Dynamic navigation data based on real location
  const [navigationData, setNavigationData] = useState<NavigationData>({
    currentLocation: {
      latitude: 6.9271, // Default Colombo coordinates until GPS loads
      longitude: 79.8612,
    },
    destination: {
      latitude: destinationData.latitude,
      longitude: destinationData.longitude,
    },
    route: [],
    remainingDistance: 'Calculating...',
    remainingKm: 0,
    estimatedTime: 'Calculating...',
    estimatedMinutes: 0,
    routeInstructions: 'Getting directions...',
    nextInstruction: 'Please wait while we calculate the route',
    destination_name: destinationData.name,
    destination_address: destinationData.address,
    destination_phone: destinationData.phone,
    weatherAlert: undefined,
    trafficStatus: 'light',
    speedLimit: 50,
    currentSpeed: 0,
    priority: 'URGENT',
    totalDistance: '4.5 km total trip',
    contributesToKM: '2.1 km toward monthly target',
  });

  // Start GPS tracking when component mounts
  useEffect(() => {
    const initializeNavigation = async () => {
      // Start location tracking
      const trackingStarted = await startTracking({
        accuracy: 'high',
        interval: 2000, // Update every 2 seconds
        distanceInterval: 5, // Update every 5 meters
      });

      if (trackingStarted) {
        console.log('🚀 Navigation tracking started');

        // Start background GPS tracking for this order
        const backgroundStarted = await locationService.startBackgroundOrderTracking(jobId);
        if (backgroundStarted) {
          console.log('✅ Background GPS tracking started for pickup navigation');
        }
      } else {
        // GPS not available - try to use rider's last known location from database
        Alert.alert(
          'Enable Location Services',
          'GPS is needed for accurate navigation. Would you like to enable it now, or use your last known location?',
          [
            {
              text: 'Use Last Location',
              onPress: async () => {
                console.log('📍 Fetching rider last known location from database...');
                try {
                  const response = await apiService.getRiderCurrentLocation();
                  if (response.success && response.data?.location) {
                    const { lat, lng } = response.data.location;
                    console.log('✅ Using database location:', { lat, lng });

                    // Set fallback location
                    setFallbackLocation({
                      latitude: lat,
                      longitude: lng,
                      accuracy: 100, // Database location, less accurate
                      timestamp: Date.now(),
                    });
                  } else {
                    Alert.alert('Error', 'Could not retrieve your last known location. Please enable GPS.');
                  }
                } catch (error) {
                  console.error('Failed to fetch last location:', error);
                  Alert.alert('Error', 'Could not retrieve your last known location. Please enable GPS.');
                }
              }
            },
            {
              text: 'Enable GPS',
              style: 'default',
              onPress: () => {
                Alert.alert('Enable GPS', 'Please enable location services in your device settings and restart the app.');
              }
            }
          ]
        );
      }
    };

    initializeNavigation();

    return () => {
      stopTracking(); // Stop tracking when component unmounts
      // Note: Don't stop background tracking here - it continues to hospital
    };
  }, []);

  // Load route when GPS location or fallback location becomes available
  useEffect(() => {
    const currentLoc = locationState.currentLocation || fallbackLocation;
    if (currentLoc && destinationData.latitude && destinationData.latitude !== 0) {
      console.log('📍 Location available (GPS or fallback), loading route to pickup...');
      loadRoute();
    }
  }, [locationState.currentLocation, fallbackLocation, destinationData.latitude]);

  // Function to load route from backend
  const loadRoute = async () => {
    const currentLoc = locationState.currentLocation || fallbackLocation;
    if (!currentLoc) return;
    const destination = {
      lat: destinationData.latitude,
      lng: destinationData.longitude
    };

    try {
      console.log('🗺️ Loading route:', {
        from: { lat: currentLoc.latitude, lng: currentLoc.longitude },
        to: destination
      });

      // Get real distance and route from backend Google Maps API
      const directionsResult = await distanceService.getDirections(
        { lat: currentLoc.latitude, lng: currentLoc.longitude },
        destination
      );

      const distanceKm = parseFloat(directionsResult.distance_km);
      const remainingDistance = directionsResult.distance_text;
      const estimatedTime = directionsResult.duration_in_traffic_text || directionsResult.duration_text;

      console.log('🗺️ Route loaded:', {
        distance: directionsResult.distance_text,
        duration: estimatedTime,
        api: directionsResult.api_used,
        routePoints: directionsResult.route?.length || 0
      });

      // Filter out any invalid coordinates from route
      const validRoute = (directionsResult.route || []).filter((coord: any) =>
        coord && coord.latitude != null && coord.longitude != null &&
        !isNaN(parseFloat(coord.latitude)) && !isNaN(parseFloat(coord.longitude))
      );

      setNavigationData(prev => ({
        ...prev,
        currentLocation: {
          latitude: currentLoc.latitude,
          longitude: currentLoc.longitude,
        },
        destination: {
          latitude: destination.lat,
          longitude: destination.lng,
        },
        route: validRoute, // Real route polyline points - validated
        remainingDistance,
        remainingKm: distanceKm,
        estimatedTime,
        estimatedMinutes: directionsResult.duration_in_traffic_minutes || directionsResult.duration_minutes,
        routeInstructions: distanceKm > 0.1 ? 'Tap below to open Google Maps for navigation' : 'You have arrived!',
        nextInstruction: distanceKm > 0.1 ?
          `${remainingDistance} to pickup location ${directionsResult.api_used === 'google_maps' ? '(Real traffic data)' : '(Estimated)'}` :
          'You have arrived!',
        currentSpeed: 0, // Remove speed monitoring
        totalDistance: `${distanceKm.toFixed(1)} km total trip`,
        contributesToKM: `${distanceKm.toFixed(1)} km toward monthly target`,
      }));

      // Fit map to show both locations
      if (mapRef.current) {
        mapRef.current.fitToCoordinates(
          [
            { latitude: currentLoc.latitude, longitude: currentLoc.longitude },
            { latitude: destination.lat, longitude: destination.lng }
          ],
          {
            edgePadding: { top: 200, right: 50, bottom: 400, left: 50 },
            animated: true,
          }
        );
      }

    } catch (error) {
      console.error('🗺️ Route loading failed:', error);

      // Fallback to simple calculation if API fails
      const destinationGPS: GPSLocationData = {
        latitude: destination.lat,
        longitude: destination.lng,
        accuracy: 0,
        timestamp: Date.now(),
      };
      const distanceKm = getDistance(currentLoc, destinationGPS);
      const remainingDistance = `${distanceKm.toFixed(1)} km`;
      const estimatedMinutes = Math.round((distanceKm / 25) * 60);
      const estimatedTime = estimatedMinutes > 60
        ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
        : `${estimatedMinutes} min`;

      setNavigationData(prev => ({
        ...prev,
        currentLocation: {
          latitude: currentLoc.latitude,
          longitude: currentLoc.longitude,
        },
        route: [],
        remainingDistance,
        remainingKm: distanceKm,
        estimatedTime,
        estimatedMinutes,
        routeInstructions: distanceKm > 0.1 ? 'Tap below to open Google Maps for navigation' : 'You have arrived!',
        nextInstruction: distanceKm > 0.1 ? `${remainingDistance} to pickup location (Estimated)` : 'You have arrived!',
        currentSpeed: 0,
        totalDistance: `${distanceKm.toFixed(1)} km total trip`,
        contributesToKM: `${distanceKm.toFixed(1)} km toward monthly target`,
      }));
    }
  };

  // Update navigation data when location changes (just update position, not reload route)
  useEffect(() => {
    if (locationState.currentLocation) {
      const currentLoc = locationState.currentLocation;

      setNavigationData(prev => ({
        ...prev,
        currentLocation: {
          latitude: currentLoc.latitude,
          longitude: currentLoc.longitude,
        },
      }));
    }
  }, [locationState.currentLocation]);

  const handleOpenGoogleMaps = async () => {
    const { destination, currentLocation } = navigationData;
    
    const googleMapsApp = Platform.OS === 'ios' 
      ? `comgooglemaps://?daddr=${destination.latitude},${destination.longitude}&directionsmode=driving`
      : `google.navigation:q=${destination.latitude},${destination.longitude}&mode=d`;
    
    const googleMapsWeb = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
    
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

  const handleCallCenter = () => {
    if (!destinationData.phone) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    const url = `tel:${destinationData.phone}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to make phone call');
    });
    onCallCenter();
  };

  const handleArrivedAtCenter = () => {
    Alert.alert(
      'Confirm Arrival',
      'Have you arrived at the collection center?',
      [
        { text: 'Not Yet', style: 'cancel' },
        { 
          text: 'Yes, I\'m Here', 
          onPress: () => {
            setIsNavigating(false);
            onArrivedAtCenter();
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
          
          {/* Destination Marker */}
          <Marker
            coordinate={navigationData.destination}
            title={navigationData.destination_name}
            description={navigationData.destination_address}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.destinationMarker}>
              <MapPin size={24} color={COLORS.white} />
            </View>
          </Marker>
          
          {/* Route Polyline from Google Maps */}
          {navigationData.route && navigationData.route.length > 1 && (
            <Polyline
              coordinates={navigationData.route}
              strokeColor={COLORS.primary}
              strokeWidth={4}
              geodesic={true}
            />
          )}
        </MapView>

        {/* Professional Status Bar Overlay */}
        <View style={styles.statusOverlay}>
          <View style={styles.topControls}>
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
              <ArrowLeft size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            
            <View style={styles.statusCenter}>
              <Text style={styles.statusTitle}>Navigating to Pickup</Text>
              <Text style={styles.jobCode}>{jobId}</Text>
            </View>
            
            <View style={styles.topRightControls}>
              <TouchableOpacity onPress={onShareLocation} style={styles.topControl} activeOpacity={0.8}>
                <Share size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={openGoogleMaps} style={styles.topControl} activeOpacity={0.8}>
                <Navigation size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Professional Navigation HUD */}
        <View style={styles.navigationHUD}>
          <View style={styles.hudLeft}>
            <Text style={styles.remainingDistance}>{navigationData.remainingDistance}</Text>
            <Text style={styles.remainingTime}>
              {navigationData.estimatedTime} remaining 
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

        {/* Google Maps Button - Prominent */}
        <View style={styles.googleMapsButton}>
          <TouchableOpacity style={styles.googleMapsButtonMain} onPress={handleOpenGoogleMaps} activeOpacity={0.8}>
            <View style={styles.googleMapsIcon}>
              <Navigation size={20} color={COLORS.white} />
            </View>
            <Text style={styles.googleMapsText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton} onPress={handleCallCenter} activeOpacity={0.8}>
            <Phone size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Panel - Static (no sliding) */}
      <View style={styles.bottomPanel}>
        {/* Destination Info */}
        <View style={styles.destinationCard}>
          <View style={styles.destinationHeader}>
            <MapPin size={20} color={COLORS.primary} />
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationName}>{destinationData.name}</Text>
            </View>
          </View>

          {/* Call Button */}
          {destinationData.phone && (
            <TouchableOpacity style={styles.callButton} onPress={handleCallCenter} activeOpacity={0.8}>
              <Phone size={18} color={COLORS.white} />
              <Text style={styles.callButtonText}>
                Call {destinationData.name.includes('Handover') ? 'Rider' : 'Collection Center'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.arrivedButton,
              navigationData.priority === 'URGENT' && styles.urgentArrivedButton,
              !isNavigating && styles.completedButton
            ]}
            onPress={handleArrivedAtCenter}
            disabled={!isNavigating}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={!isNavigating ? 
                [COLORS.success, '#4CAF50'] :
                navigationData.priority === 'URGENT' ? 
                  [COLORS.error, '#d32f2f'] : 
                  [COLORS.primary, COLORS.primaryDark]
              }
              style={styles.arrivedButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {!isNavigating ? (
                <CheckCircle size={20} color={COLORS.white} />
              ) : (
                <MapPin size={20} color={COLORS.white} />
              )}
              <Text style={styles.arrivedButtonText}>
                {!isNavigating ? 'Arrived Successfully' : '✓ I\'ve Arrived at Pickup Location'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
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
  googleMapsButton: {
    position: 'absolute',
    bottom: 180,
    left: SPACING.xl,
    right: SPACING.xl,
    alignItems: 'center',
  },
  googleMapsButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4', // Google blue
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.xl,
    ...SHADOWS.lg,
    gap: SPACING.sm,
  },
  googleMapsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleMapsText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.white,
    fontWeight: '600',
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
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.error,
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
    backgroundColor: COLORS.primaryUltraLight,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  currentInstruction: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '600',
    flex: 1,
  },
  nextInstruction: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  weatherAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  weatherAlertText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.warning,
    fontWeight: '500',
    flex: 1,
  },
  detailsContent: {
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  destinationCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  destinationInfo: {
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
  destinationName: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  destinationAddress: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 18,
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
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.sm,
  },
  callButtonText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.white,
    fontWeight: '600',
  },
  actionButtons: {
    gap: SPACING.md,
  },
  arrivedButton: {
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  urgentArrivedButton: {
    ...SHADOWS.xl,
  },
  completedButton: {
    opacity: 0.8,
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
});

export default NavigationToPickupScreen;