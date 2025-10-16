import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { ArrowLeft, Share2, Bookmark, MapPin, Clock, Phone, AlertCircle, Package2, CheckCircle, Truck, Shield, TestTube, Hospital, Calendar, User, Gauge, Timer, TrendingUp } from 'lucide-react-native';
import { apiService } from '../services/api';
import { getDistanceToPickup, getDistanceToDelivery, formatDistance, formatTime, DistanceResult } from '../utils/distanceCalculator';

// Professional screen utilities

// Icon mapping function for Lucide icons
const getIcon = (iconName: string, size: number, color: string) => {
  switch (iconName) {
    case 'location-on':
    case 'place':
      return <MapPin size={size} color={color} />;
    case 'phone':
      return <Phone size={size} color={color} />;
    case 'schedule':
    case 'access-time':
      return <Clock size={size} color={color} />;
    case 'local-shipping':
    case 'directions-car':
      return <Truck size={size} color={color} />;
    case 'inventory':
    case 'inventory-2':
      return <Package2 size={size} color={color} />;
    case 'local-hospital':
      return <Hospital size={size} color={color} />;
    case 'security':
    case 'verified':
      return <Shield size={size} color={color} />;
    case 'science':
      return <TestTube size={size} color={color} />;
    case 'person':
      return <User size={size} color={color} />;
    case 'trending-up':
      return <TrendingUp size={size} color={color} />;
    case 'timer':
      return <Timer size={size} color={color} />;
    case 'straighten':
      return <Gauge size={size} color={color} />;
    case 'date-range':
      return <Calendar size={size} color={color} />;
    case 'check-circle':
      return <CheckCircle size={size} color={color} />;
    default:
      return <AlertCircle size={size} color={color} />;
  }
};

interface JobDetailsScreenProps {
  jobId: string;
  onBack: () => void;
  onAcceptJob: (jobId: string) => void;
  onShare: () => void;
  onBookmark: () => void;
}

interface JobDetails {
  id: string;
  jobCode: string;
  priority: 'URGENT' | 'STANDARD';
  totalDistance: string;
  totalTime: string;
  pickupDistance: string;
  deliveryDistance: string;
  destination: string;
  pickup: {
    labName: string;
    address: string;
    contactPhone: string;
    contactPerson: string;
    distance: string;
    parking: string;
    qrRequired: boolean;
    samples: {
      bloodSamples: string;
      urineSamples: string;
      totalCount: number;
    };
    specialHandling: string[];
    collectionTime: string;
    instructions: string[];
  };
  delivery: {
    hospitalName: string;
    address: string;
    contactPhone: string;
    contactPerson: string;
    department: string;
    floor: string;
    instructions: string[];
  };
  timing: {
    urgency: string;
    deadline: string;
    patientWaiting: boolean;
  };
  route: {
    recommendedPath: string;
    trafficCondition: string;
    estimatedTime: string;
  };
  riderBenefits: string[];
}

const JobDetailsScreen: React.FC<JobDetailsScreenProps> = ({
  jobId,
  onBack,
  onAcceptJob,
  onShare,
  onBookmark,
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dynamic job details loaded from API
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [pickupDistance, setPickupDistance] = useState<DistanceResult | null>(null);
  const [deliveryDistance, setDeliveryDistance] = useState<DistanceResult | null>(null);
  const [loadingDistances, setLoadingDistances] = useState(false);
  const [jobStatus, setJobStatus] = useState<{ isAccepted: boolean; status?: string; riderId?: string }>({ isAccepted: false });
  const [multiParcelOfferId, setMultiParcelOfferId] = useState<string | null>(null); // Track multi-parcel offer

  // Check job status and multi-parcel offers on component mount
  useEffect(() => {
    const checkJobStatus = async () => {
      const status = await apiService.getJobStatus(jobId);
      setJobStatus(status);

      // If job is already accepted, show different UI
      if (status.isAccepted) {
        console.log('✅ Job already accepted, status:', status.status);
      }
    };

    const checkMultiParcelOffer = async () => {
      try {
        const response = await apiService.getMyMultiParcelOffers();
        if (response.success && response.data?.offers) {
          // Find if there's a multi-parcel offer for this order
          const offer = response.data.offers.find((o: any) => o.order_id === jobId);
          if (offer) {
            setMultiParcelOfferId(offer.id);
            console.log('✅ Multi-parcel offer found:', offer.id);
          }
        }
      } catch (error) {
        console.log('No multi-parcel offer for this job');
      }
    };

    checkJobStatus();
    checkMultiParcelOffer();
  }, [jobId]);

  // Load job details on component mount
  useEffect(() => {
    const loadJobDetails = async () => {
      try {
        setLoading(true);
        const response = await apiService.getOrderDetails(jobId);
        
        if (response.success && response.data) {
          const orderData = response.data.order || response.data;
          
          // Transform API data to JobDetails format
          const transformedData: JobDetails = {
            id: orderData.id || jobId,
            jobCode: orderData.order_number || `PRC-${Date.now()}`,
            priority: orderData.urgency === 'urgent' ? 'URGENT' : 'STANDARD',
            totalDistance: `${orderData.total_distance?.toFixed(1) || '0'} km`,
            totalTime: `${orderData.estimated_time || 30} minutes`,
            pickupDistance: `${orderData.pickup_distance?.toFixed(1) || '0'} km pickup`,
            deliveryDistance: `${orderData.delivery_distance?.toFixed(1) || '0'} km delivery`,
            destination: orderData.hospital_name || 'Hospital',
            pickup: {
              labName: orderData.center_name || 'Collection Center',
              address: orderData.center_address || 'Address not available',
              contactPhone: orderData.center_phone || '+94 11 XXX XXXX',
              contactPerson: orderData.center_contact || 'Center Staff',
              distance: `${orderData.pickup_distance?.toFixed(1) || '0'} km from your location`,
              parking: 'Parking information not available',
              qrRequired: true,
              samples: {
                bloodSamples: orderData.sample_details?.blood || 'Blood samples',
                urineSamples: orderData.sample_details?.urine || 'Urine samples',
                totalCount: orderData.sample_quantity || 1,
              },
              specialHandling: orderData.special_instructions ? [orderData.special_instructions] : ['Handle with care'],
              collectionTime: orderData.pickup_time || 'Ready for pickup',
              instructions: [
                'Contact collection center for pickup',
                'Present rider ID and job code',
                'Verify sample packaging and labeling',
              ],
            },
            delivery: {
              hospitalName: orderData.hospital_name || 'Hospital',
              address: orderData.hospital_address || 'Hospital address',
              contactPhone: orderData.hospital_phone || '+94 11 XXX XXXX',
              contactPerson: orderData.hospital_contact || 'Hospital Staff',
              department: orderData.hospital_department || 'Laboratory',
              floor: orderData.hospital_floor || 'Ground Floor',
              instructions: [
                'Enter through main hospital entrance',
                'Report to laboratory reception',
                'Present delivery receipt for signature',
              ],
            },
            timing: {
              urgency: orderData.urgency === 'urgent' ? 'Critical - Urgent delivery' : 'Standard delivery',
              deadline: `Deliver within ${orderData.urgency === 'urgent' ? 30 : 60} minutes`,
              patientWaiting: false,
            },
            route: {
              recommendedPath: 'Optimal route will be calculated',
              trafficCondition: 'Current traffic conditions',
              estimatedTime: `${orderData.estimated_time || 30} minutes`,
            },
            riderBenefits: [
              'Guaranteed payment on completion',
              'Professional medical partnership',
              'GPS navigation support',
              'Real-time order tracking',
            ],
          };
          
          setJobDetails(transformedData);
          
          // Load real-time distances after job details are set
          await loadRealTimeDistances(orderData);
        } else {
          throw new Error('Failed to load job details');
        }
      } catch (error: any) {
        console.error('Failed to load job details:', error);
        Alert.alert('Error', 'Unable to load job details. Please try again.');
        // Set fallback data
        setJobDetails({
          id: jobId,
          jobCode: `JOB-${jobId}`,
          priority: 'STANDARD',
          totalDistance: '0 km',
          totalTime: '30 minutes',
          pickupDistance: '0 km pickup',
          deliveryDistance: '0 km delivery',
          destination: 'Hospital',
          pickup: {
            labName: 'Collection Center',
            address: 'Address loading...',
            contactPhone: '+94 11 XXX XXXX',
            contactPerson: 'Center Staff',
            distance: '0 km from your location',
            parking: 'Information not available',
            qrRequired: true,
            samples: {
              bloodSamples: 'Sample details loading...',
              urineSamples: 'Sample details loading...',
              totalCount: 1,
            },
            specialHandling: ['Handle with care'],
            collectionTime: 'Ready for pickup',
            instructions: ['Contact center for details'],
          },
          delivery: {
            hospitalName: 'Hospital',
            address: 'Address loading...',
            contactPhone: '+94 11 XXX XXXX',
            contactPerson: 'Hospital Staff',
            department: 'Laboratory',
            floor: 'Ground Floor',
            instructions: ['Contact hospital for details'],
          },
          timing: {
            urgency: 'Standard delivery',
            deadline: 'Deliver within 60 minutes',
            patientWaiting: false,
          },
          route: {
            recommendedPath: 'Route calculation in progress',
            trafficCondition: 'Unknown',
            estimatedTime: '30 minutes',
          },
          riderBenefits: [
            'Guaranteed payment on completion',
            'Professional service',
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    loadJobDetails();
  }, [jobId]);

  // Load real-time distances using Google Maps
  const loadRealTimeDistances = async (orderData: any) => {
    if (!orderData) return;

    try {
      setLoadingDistances(true);
      
      // Extract coordinates from order data with safe fallbacks
      let pickupLat = 0;
      let pickupLng = 0;
      let deliveryLat = 0;
      let deliveryLng = 0;

      try {
        pickupLat = parseFloat(orderData.locations?.pickup?.lat ||
                     orderData.pickup_location_lat ||
                     orderData.pickup_location?.lat || 0);
        pickupLng = parseFloat(orderData.locations?.pickup?.lng ||
                      orderData.pickup_location_lng ||
                      orderData.pickup_location?.lng || 0);
        deliveryLat = parseFloat(orderData.locations?.delivery?.lat ||
                       orderData.delivery_location_lat ||
                       orderData.delivery_location?.lat || 0);
        deliveryLng = parseFloat(orderData.locations?.delivery?.lng ||
                        orderData.delivery_location_lng ||
                        orderData.delivery_location?.lng || 0);
      } catch (error) {
        console.error('Error parsing coordinates:', error);
      }

      const pickupCoords = {
        latitude: pickupLat,
        longitude: pickupLng
      };

      const deliveryCoords = {
        latitude: deliveryLat,
        longitude: deliveryLng
      };

      console.log('📍 Calculating distances from rider location to:', {
        pickup: `${pickupCoords.latitude}, ${pickupCoords.longitude}`,
        delivery: `${deliveryCoords.latitude}, ${deliveryCoords.longitude}`
      });

      // Calculate real distances in parallel
      const [pickupResult, deliveryResult] = await Promise.all([
        getDistanceToPickup(pickupCoords, orderData.urgency),
        getDistanceToDelivery(deliveryCoords, orderData.urgency)
      ]);

      setPickupDistance(pickupResult);
      setDeliveryDistance(deliveryResult);
      
      console.log('Real-time distances calculated:', {
        pickup: pickupResult,
        delivery: deliveryResult
      });
    } catch (error) {
      console.error('Error loading real-time distances:', error);
    } finally {
      setLoadingDistances(false);
    }
  };

  const handlePhoneCall = (phoneNumber: string, personName: string) => {
    Alert.alert(
      'Make Phone Call',
      `Call ${personName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => {
            const url = `tel:${phoneNumber}`;
            Linking.openURL(url).catch(() => {
              Alert.alert('Error', 'Unable to make phone call');
            });
          },
        },
      ]
    );
  };


  const handleAcceptJob = async () => {
    setIsAccepting(true);
    try {
      console.log('🚀 Accepting job:', jobId);

      let response;
      if (multiParcelOfferId) {
        // Accept multi-parcel offer
        console.log('🎁 Accepting multi-parcel offer:', multiParcelOfferId);
        response = await apiService.acceptMultiParcelOffer(multiParcelOfferId);
      } else {
        // Use acceptOffer for regular offer-based assignments
        response = await apiService.acceptOffer(jobId);
      }

      if (response.success) {
        console.log('✅ Job offer accepted successfully');
        // Update local state
        setJobStatus({ isAccepted: true, status: 'assigned' });

        // Show success message
        const message = multiParcelOfferId
          ? 'Multi-parcel order accepted! Pick this up on your way to the hospital.'
          : 'Job accepted! You can now start the pickup.';

        Alert.alert('Success', message, [
          { text: 'OK', onPress: () => onAcceptJob(jobId) }
        ]);
      } else {
        throw new Error(response.error?.message || 'Failed to accept job');
      }
    } catch (error: any) {
      console.error('❌ Job acceptance failed:', error);
      Alert.alert('Error', error.message || 'Failed to accept job. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    onBookmark();
  };

  const handleOpenMaps = () => {
    if (!jobDetails) return;
    const destination = `${jobDetails.pickup.address}, Sri Lanka`;
    const url = `https://maps.google.com/maps?q=${encodeURIComponent(destination)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open maps');
    });
  };

  const renderSection = (title: string, icon: string, children: React.ReactNode, highlighted = false) => (
    <View style={[styles.section, highlighted && styles.sectionHighlighted]}>
      <View style={styles.sectionHeader}>
        {getIcon(icon, 20, COLORS.primary)}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const renderContactCard = (name: string, person: string, phone: string) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => handlePhoneCall(phone, person)}
      activeOpacity={0.8}
    >
      <View style={styles.contactInfo}>
        <Text style={styles.contactName} numberOfLines={1}>{name}</Text>
        <Text style={styles.contactPerson} numberOfLines={1}>{person}</Text>
      </View>
      <View style={styles.callButton}>
        <Phone size={18} color={COLORS.white} />
        <Text style={styles.callButtonText}>Call</Text>
      </View>
    </TouchableOpacity>
  );

  const renderInfoRow = (label: string, value: string, highlighted = false) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlighted && styles.infoValueHighlighted]} numberOfLines={2}>{value}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Loading...</Text>
            <Text style={styles.headerSubtitle}>Job Details</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!jobDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Error</Text>
            <Text style={styles.headerSubtitle}>Unable to load job</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Unable to load job details. Please try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Professional Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Job Details</Text>
          <Text style={styles.headerSubtitle}>{jobDetails.jobCode}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onShare} style={styles.headerAction} activeOpacity={0.8}>
            <Share2 size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBookmark} style={styles.headerAction} activeOpacity={0.8}>
            <Bookmark 
              size={22} 
              color={isBookmarked ? COLORS.warning : COLORS.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Card - Redesigned */}
        <View style={[
          styles.heroCard,
          jobDetails.priority === 'URGENT' ? styles.heroCardUrgent : styles.heroCardStandard
        ]}>
          <View style={[
            styles.heroGradient,
            { backgroundColor: jobDetails.priority === 'URGENT' ? COLORS.error : COLORS.primary }
          ]}>
            {/* Priority Badge - Top Row */}
            <View style={styles.heroTopRow}>
              <View style={styles.priorityBadge}>
                {jobDetails.priority === 'URGENT' ? (
                  <AlertCircle size={16} color={COLORS.white} />
                ) : (
                  <Timer size={16} color={COLORS.white} />
                )}
                <Text style={styles.priorityText}>{jobDetails.priority} DELIVERY</Text>
              </View>
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>
                  {loadingDistances ? 'Calculating...' : (pickupDistance ? formatDistance(pickupDistance) : '0 km')}
                </Text>
              </View>
            </View>

            {/* Destination - Middle Row */}
            <View style={styles.heroMiddleRow}>
              <Text style={styles.destinationText} numberOfLines={2}>→ {jobDetails.destination}</Text>
            </View>

            {/* Metrics - Bottom Row */}
            <View style={styles.heroBottomRow}>
              <View style={styles.metric}>
                <Gauge size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.metricText}>
                  {loadingDistances ? 'Calculating...' : (pickupDistance ? formatDistance(pickupDistance) : jobDetails.totalDistance)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Clock size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.metricText}>
                  {loadingDistances ? 'Calculating...' : (pickupDistance ? formatTime(pickupDistance) : jobDetails.totalTime)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Patient waiting alert removed as requested */}

        {/* Pickup Information */}
        {renderSection('PICKUP LOCATION', 'location-on', (
          <View>
            <Text style={styles.facilityName} numberOfLines={1}>{jobDetails.pickup.labName}</Text>
            <Text style={styles.facilityAddress}>{jobDetails.pickup.address}</Text>
            
            {renderContactCard(
              'Collection Center',
              jobDetails.pickup.contactPerson,
              jobDetails.pickup.contactPhone
            )}

            {renderInfoRow('Distance', 
              loadingDistances ? 'Calculating real distance...' : 
              (pickupDistance ? `${formatDistance(pickupDistance)} from your location` : jobDetails.pickup.distance), 
              true
            )}
            {renderInfoRow('Parking', jobDetails.pickup.parking)}
            {renderInfoRow('Collection Status', jobDetails.pickup.collectionTime, true)}

            {jobDetails.pickup.qrRequired && (
              <View style={styles.qrRequirement}>
                <Package2 size={20} color={COLORS.primary} />
                <Text style={styles.qrText}>QR code scan required before pickup</Text>
              </View>
            )}

            <View style={styles.samplesCard}>
              <View style={styles.samplesHeader}>
                <Package2 size={20} color={COLORS.primary} />
                <Text style={styles.samplesTitle}>Sample Details</Text>
                <View style={styles.sampleCount}>
                  <Text style={styles.sampleCountText}>{jobDetails.pickup.samples.totalCount}</Text>
                </View>
              </View>
              <Text style={styles.sampleItem}>• {jobDetails.pickup.samples.bloodSamples}</Text>
              <Text style={styles.sampleItem}>• {jobDetails.pickup.samples.urineSamples}</Text>
              
              <View style={styles.specialHandling}>
                <Text style={styles.specialHandlingTitle}>Special Handling Required:</Text>
                {jobDetails.pickup.specialHandling.map((item, index) => (
                  <View key={index} style={styles.handlingItem}>
                    <CheckCircle size={14} color={COLORS.success} />
                    <Text style={styles.handlingText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>Pickup Instructions</Text>
              {jobDetails.pickup.instructions.map((instruction, index) => (
                <Text key={index} style={styles.instructionText}>• {instruction}</Text>
              ))}
            </View>
          </View>
        ), true)}

        {/* Route Information */}
        {renderSection('ROUTE & NAVIGATION', 'directions', (
          <View>
            <View style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <MapPin size={20} color={COLORS.success} />
                <Text style={styles.routeTitle}>Recommended Route</Text>
              </View>
              <Text style={styles.routePath}>{jobDetails.route.recommendedPath}</Text>
              <View style={styles.routeConditions}>
                <View style={styles.conditionItem}>
                  <Truck size={16} color={COLORS.success} />
                  <Text style={styles.conditionText}>{jobDetails.route.trafficCondition}</Text>
                </View>
                <View style={styles.conditionItem}>
                  <Clock size={16} color={COLORS.primary} />
                  <Text style={styles.conditionText}>{jobDetails.route.estimatedTime}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.mapsButton} onPress={handleOpenMaps} activeOpacity={0.8}>
              <MapPin size={20} color={COLORS.white} />
              <Text style={styles.mapsButtonText}>Open in Google Maps</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Delivery Information */}
        {renderSection('DELIVERY LOCATION', 'local-hospital', (
          <View>
            <Text style={styles.facilityName}>{jobDetails.delivery.hospitalName}</Text>
            <Text style={styles.facilityAddress}>{jobDetails.delivery.address}</Text>
            <Text style={styles.department}>{jobDetails.delivery.department} • {jobDetails.delivery.floor}</Text>
            
            {renderContactCard(
              'Hospital Contact',
              jobDetails.delivery.contactPerson,
              jobDetails.delivery.contactPhone
            )}

            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>Delivery Instructions</Text>
              {jobDetails.delivery.instructions.map((instruction, index) => (
                <Text key={index} style={styles.instructionText}>• {instruction}</Text>
              ))}
            </View>
          </View>
        ))}


        {/* Rider Benefits */}
        {renderSection('RIDER BENEFITS', 'star', (
          <View style={styles.benefitsGrid}>
            {jobDetails.riderBenefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <CheckCircle size={16} color={COLORS.success} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Accept/Reject Buttons */}
      {!jobStatus.isAccepted && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={onBack}
            disabled={isAccepting}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.acceptButton,
              jobDetails.priority === 'URGENT' && styles.acceptButtonUrgent,
              isAccepting && styles.acceptButtonDisabled
            ]}
            onPress={handleAcceptJob}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <Text style={styles.acceptButtonText}>Accepting...</Text>
            ) : (
              <Text style={styles.acceptButtonText}>
                {jobDetails.priority === 'URGENT' ? '🚨 Accept Urgent Job' : 'Accept Job'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Already Accepted State */}
      {jobStatus.isAccepted && (
        <View style={styles.acceptedContainer}>
          <CheckCircle size={24} color={COLORS.success} />
          <Text style={styles.acceptedText}>✅ Job Accepted - Navigate to Pickup</Text>
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: LAYOUT.borderWidth.thin,
    borderBottomColor: COLORS.gray200,
    ...SHADOWS.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: LAYOUT.radius.lg,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: LAYOUT.radius.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  heroCard: {
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
  },
  heroCardUrgent: {
    borderWidth: LAYOUT.borderWidth.thick,
    borderColor: COLORS.error + '40',
  },
  heroCardStandard: {
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.primary + '40',
  },
  heroGradient: {
    padding: SPACING.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroMiddleRow: {
    marginBottom: SPACING.md,
  },
  heroBottomRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'center',
  },
  distanceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.lg,
  },
  distanceText: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.white,
    fontWeight: '700',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.lg,
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
    gap: SPACING.xs,
  },
  priorityText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  destinationText: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.white,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metricText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  patientAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.warning,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  patientAlertText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.warning,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  sectionHighlighted: {
    borderWidth: LAYOUT.borderWidth.default,
    borderColor: COLORS.primary + '30',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  facilityName: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  facilityAddress: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  department: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
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
  contactPerson: {
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: LAYOUT.borderWidth.thin,
    borderBottomColor: COLORS.gray200,
  },
  infoLabel: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  infoValue: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.md,
  },
  infoValueHighlighted: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  qrRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryUltraLight,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    gap: SPACING.sm,
  },
  qrText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '600',
    flex: 1,
  },
  samplesCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginVertical: SPACING.md,
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
  sampleItem: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  specialHandling: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: LAYOUT.borderWidth.thin,
    borderTopColor: COLORS.gray300,
  },
  specialHandlingTitle: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  handlingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  handlingText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
  },
  instructionsCard: {
    backgroundColor: COLORS.primaryUltraLight,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  instructionsTitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  instructionText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  routeCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  routeTitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.success,
    fontWeight: '700',
  },
  routePath: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  routeConditions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  conditionText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: LAYOUT.radius.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  mapsButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '600',
  },
  paymentCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  paymentLabel: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  paymentValue: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  bonusValue: {
    color: COLORS.success,
    fontWeight: '600',
  },
  paymentDivider: {
    height: LAYOUT.borderWidth.default,
    backgroundColor: COLORS.gray300,
    marginVertical: SPACING.sm,
  },
  paymentTotal: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  paymentTotalValue: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.success,
    fontWeight: '800',
  },
  benefitsGrid: {
    gap: SPACING.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  benefitText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  bottomSpacing: {
    height: SPACING.xl,
  },
  // Action Buttons (Replace slider)
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: LAYOUT.borderWidth.thin,
    borderTopColor: COLORS.gray200,
    ...SHADOWS.card,
    gap: SPACING.md,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 16,
  },
  acceptButton: {
    flex: 2,
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  acceptButtonUrgent: {
    backgroundColor: COLORS.error,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.success + '10',
    borderTopWidth: LAYOUT.borderWidth.thin,
    borderTopColor: COLORS.success + '30',
    gap: SPACING.sm,
  },
  acceptedText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.error,
    textAlign: 'center',
  },
  acceptButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default JobDetailsScreen;