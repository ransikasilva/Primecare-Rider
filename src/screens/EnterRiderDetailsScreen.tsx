import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowLeft, CheckCircle2, XCircle, Phone, MapPin, Send } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { apiService } from '../services/api';

interface EnterRiderDetailsScreenProps {
  onBack: () => void;
  onSendHandoverRequest: (riderId: string) => void;
  onCallRider: (phone: string) => void;
  onSendLocation: (riderId: string) => void;
  onSendRequest?: (riderId: string) => void;
  onScanRiderQR?: () => void;
}

interface RiderSearchResult {
  id: string;
  name: string;
  photo_url: string;
  verification_status: {
    same_hospital: boolean;
    active_status: boolean;
  };
  distance: string;
  phone: string;
  rating: number;
  completed_handovers: number;
}

interface RecentPartner {
  id: string;
  name: string;
  last_handover: string;
  rating: number;
}

interface MeetingLocation {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

const SEARCH_TABS = [
  { id: 'name', label: 'Name', active: true },
  { id: 'phone', label: 'Phone', active: false },
  { id: 'id', label: 'Rider ID', active: false },
];

const EnterRiderDetailsScreen: React.FC<EnterRiderDetailsScreenProps> = React.memo(({
  onBack,
  onSendHandoverRequest,
  onCallRider,
  onSendLocation,
}) => {
  const [activeTab, setActiveTab] = useState('name');
  const [searchInput, setSearchInput] = useState('');
  const [foundRider, setFoundRider] = useState<RiderSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Mock data - will be replaced with API calls
  const mockRider: RiderSearchResult = {
    id: 'RIDER-CLB-2024-067',
    name: 'Priya Silva',
    photo_url: 'https://example.com/photo.jpg', // Would be actual photo URL
    verification_status: {
      same_hospital: true,
      active_status: true,
    },
    distance: '2.5 km away',
    phone: '+94 77 123 4567',
    rating: 4.7,
    completed_handovers: 23,
  };

  const recentPartners: RecentPartner[] = [
    {
      id: 'RIDER-CLB-2024-045',
      name: 'Kasun P.',
      last_handover: '2 days ago',
      rating: 4.8,
    },
  ];

  const meetingLocation: MeetingLocation = {
    address: 'Galle Road, near Liberty Plaza',
    coordinates: {
      latitude: 6.9147,
      longitude: 79.8731,
    },
  };

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) {
      const fieldName = activeTab === 'id' ? 'Rider ID' : activeTab === 'phone' ? 'phone number' : 'rider name';
      Alert.alert('Input Required', `Please enter a ${fieldName} to search.`);
      return;
    }

    try {
      setIsSearching(true);
      let response;

      // Use different endpoints based on search type
      if (activeTab === 'name') {
        response = await apiService.searchRiderByName(searchInput.trim());
      } else if (activeTab === 'id') {
        response = await apiService.searchRiderById(searchInput.trim());
      } else if (activeTab === 'phone') {
        // Prepend +94 if not already there
        const phoneNumber = searchInput.trim().startsWith('+94')
          ? searchInput.trim()
          : `+94${searchInput.trim()}`;
        response = await apiService.searchRiderByPhone(phoneNumber);
      } else {
        Alert.alert('Feature Not Available', 'Nearby search is not yet implemented.');
        return;
      }

      // Handle name search response (returns array of riders)
      if (activeTab === 'name' && response.success && response.data?.riders && response.data.riders.length > 0) {
        // For name search, take the first match (or could show a list)
        const riderData = response.data.riders[0];

        if (response.data.riders.length > 1) {
          // Show info that multiple riders found
          Alert.alert(
            'Multiple Riders Found',
            `Found ${response.data.riders.length} riders. Showing the first match: ${riderData.rider_name}`,
            [{ text: 'OK' }]
          );
        }

        setFoundRider({
          id: riderData.id.toString(),
          name: riderData.rider_name || 'Unknown Rider',
          photo_url: '', // No photo URL in current API response
          verification_status: {
            same_hospital: riderData.hospital_name ? true : false,
            active_status: riderData.status === 'approved' && riderData.availability_status === 'available',
          },
          distance: 'Distance calculating...', // Would need location calculation
          phone: riderData.phone || '+94 XX XXX XXXX',
          rating: riderData.rating || 4.0,
          completed_handovers: riderData.total_deliveries || 0,
        });
      } else if (response.success && response.data?.rider) {
        // Handle ID and phone search response (returns single rider)
        const riderData = response.data.rider;
        setFoundRider({
          id: riderData.id.toString(),
          name: riderData.rider_name || 'Unknown Rider',
          photo_url: '', // No photo URL in current API response
          verification_status: {
            same_hospital: riderData.hospital_name ? true : false,
            active_status: riderData.status === 'approved' && riderData.availability_status === 'available',
          },
          distance: 'Distance calculating...', // Would need location calculation
          phone: riderData.phone || '+94 XX XXX XXXX',
          rating: riderData.rating || 4.0,
          completed_handovers: riderData.total_deliveries || 0,
        });
      } else {
        setFoundRider(null);
        const searchTypeLabel = activeTab === 'id' ? 'ID' : activeTab === 'phone' ? 'phone number' : 'name';
        Alert.alert('Rider Not Found', `No rider found with this ${searchTypeLabel}. Please check and try again.`);
      }
    } catch (error: any) {
      console.error('Failed to search rider:', error);
      setFoundRider(null);
      Alert.alert('Search Error', 'Unable to search for rider. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchInput, activeTab]);

  const handleCallRider = useCallback(() => {
    if (foundRider) {
      Alert.alert(
        'Call Rider?',
        `Call ${foundRider.name} at ${foundRider.phone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => {
              const url = `tel:${foundRider.phone}`;
              Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'Unable to make phone call');
              });
              onCallRider(foundRider.phone);
            },
          },
        ]
      );
    }
  }, [foundRider, onCallRider]);

  const handleSendLocation = useCallback(() => {
    if (foundRider) {
      Alert.alert(
        'Send Location?',
        `Send your current location to ${foundRider.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send',
            onPress: () => onSendLocation(foundRider.id),
          },
        ]
      );
    }
  }, [foundRider, onSendLocation]);

  const handleSendHandoverRequest = useCallback(() => {
    if (!foundRider) {
      Alert.alert('No Rider Selected', 'Please find and select a rider first.');
      return;
    }

    Alert.alert(
      'Send Handover Request?',
      `Send handover request to ${foundRider.name}?\n\nThey will be notified and typically respond within 2-3 minutes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: () => onSendHandoverRequest(foundRider.id),
        },
      ]
    );
  }, [foundRider, onSendHandoverRequest]);

  const handleQuickSelect = useCallback((partnerId: string) => {
    // In real app, this would load the partner details
    setFoundRider(mockRider);
    setSearchInput(partnerId);
  }, [mockRider]);

  const renderSearchInput = () => {
    switch (activeTab) {
      case 'name':
        return (
          <View style={styles.searchContainer}>
            <Text style={styles.inputLabel}>Rider Name</Text>
            <TextInput
              style={styles.textInput}
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Enter rider name..."
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="words"
            />
            <Text style={styles.formatGuide}>Search by first name, last name, or full name</Text>
          </View>
        );
      case 'id':
        return (
          <View style={styles.searchContainer}>
            <Text style={styles.inputLabel}>Rider ID</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="RIDER-CLB-2024-XXX"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.scanButton}>
                <Text style={styles.scanButtonText}>📷</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.formatGuide}>Format: RIDER-[CITY]-[YEAR]-[NUMBER]</Text>
          </View>
        );
      case 'phone':
        return (
          <View style={styles.searchContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCode}>
                <Phone size={16} color={COLORS.textSecondary} />
                <Text style={styles.countryCodeNumber}>+94</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="77 XXX XXXX"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>
        );
      case 'nearby':
        return (
          <View style={styles.nearbyContainer}>
            <Text style={styles.nearbyText}>Searching for nearby available riders...</Text>
            <TouchableOpacity style={styles.refreshButton}>
              <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Enter Rider Details</Text>
          <Text style={styles.stepIndicator}>Step 1 of 3</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Tabs */}
        <View style={styles.tabsContainer}>
          {SEARCH_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id ? styles.tabActive : styles.tabInactive
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.id ? styles.tabTextActive : styles.tabTextInactive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Input */}
        {renderSearchInput()}

        {/* Search Button */}
        <TouchableOpacity 
          style={[styles.searchButton, isSearching && styles.searchButtonDisabled]} 
          onPress={handleSearch}
          disabled={isSearching}
        >
          <Text style={styles.searchButtonText}>
            {isSearching ? '⏳ Searching...' : '🔍 Search Rider'}
          </Text>
        </TouchableOpacity>

        {/* Rider Found */}
        {foundRider && (
          <View style={styles.riderFoundCard}>
            <Text style={styles.riderFoundTitle}>Rider Found!</Text>
            
            <View style={styles.riderProfile}>
              <View style={styles.riderPhoto}>
                <Text style={styles.riderInitials}>
                  {foundRider.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{foundRider.name}</Text>
                <Text style={styles.riderId}>{foundRider.id}</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.rating}>⭐ {foundRider.rating}</Text>
                  <Text style={styles.handovers}>{foundRider.completed_handovers} handovers</Text>
                </View>
              </View>
            </View>

            <View style={styles.verificationStatus}>
              <View style={styles.verificationItem}>
                {foundRider.verification_status.same_hospital ? (
                  <CheckCircle2 size={18} color={COLORS.success} />
                ) : (
                  <XCircle size={18} color={COLORS.error} />
                )}
                <Text style={styles.verificationText}>Same hospital affiliation</Text>
              </View>
              <View style={styles.verificationItem}>
                {foundRider.verification_status.active_status ? (
                  <CheckCircle2 size={18} color={COLORS.success} />
                ) : (
                  <XCircle size={18} color={COLORS.error} />
                )}
                <Text style={styles.verificationText}>Active rider status</Text>
              </View>
            </View>

            <View style={styles.distanceWarning}>
              <MapPin size={16} color={COLORS.warning} />
              <Text style={styles.distanceText}>{foundRider.distance}</Text>
            </View>

            <View style={styles.riderActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCallRider}>
                <Phone size={18} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Call Rider</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleSendLocation}>
                <MapPin size={18} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Send Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recent Partners */}
        {recentPartners.length > 0 && (
          <View style={styles.recentPartnersCard}>
            <Text style={styles.recentTitle}>Recent Handover Partners</Text>
            <Text style={styles.recentSubtitle}>Quick access to trusted partners</Text>
            
            {recentPartners.map((partner) => (
              <TouchableOpacity
                key={partner.id}
                style={styles.partnerItem}
                onPress={() => handleQuickSelect(partner.id)}
              >
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  <Text style={styles.partnerDetails}>
                    {partner.last_handover} • ⭐ {partner.rating}
                  </Text>
                </View>
                <Text style={styles.selectArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Meeting Location */}
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>Meeting Location</Text>
          <Text style={styles.locationAddress}>{meetingLocation.address}</Text>
          
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: meetingLocation.coordinates.latitude,
                longitude: meetingLocation.coordinates.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={meetingLocation.coordinates}
                title="Meeting Location"
                description={meetingLocation.address}
                pinColor={COLORS.primary}
              />
            </MapView>
          </View>
        </View>

        {/* Response Time Info */}
        <View style={styles.responseTimeCard}>
          <Text style={styles.responseTimeText}>
            ℹ️ Riders typically respond in 2-3 minutes
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.sendRequestButton,
            !foundRider && styles.sendRequestButtonDisabled
          ]}
          onPress={handleSendHandoverRequest}
          disabled={!foundRider}
        >
          <Send size={20} color={!foundRider ? COLORS.textTertiary : COLORS.white} />
          <Text style={[
            styles.sendRequestButtonText,
            !foundRider && styles.sendRequestButtonTextDisabled
          ]}>
            Send Handover Request
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg * 1.5,
    paddingVertical: SPACING.lg,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 20,
    color: COLORS.white,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  stepIndicator: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg * 1.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.lg,
    padding: 4,
    marginVertical: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: LAYOUT.radius.lg - 4,
  },
  tabActive: {
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabInactive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabTextInactive: {
    color: COLORS.textSecondary,
  },
  searchContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: COLORS.gray200,
    gap: 6,
  },
  countryCodeNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  scanButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonText: {
    fontSize: 18,
  },
  formatGuide: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  nearbyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  nearbyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  searchButtonDisabled: {
    backgroundColor: COLORS.gray100,
    opacity: 0.7,
  },
  riderFoundCard: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  riderFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 16,
    textAlign: 'center',
  },
  riderProfile: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  riderPhoto: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.primary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  riderInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  riderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  riderName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  riderId: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rating: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  handovers: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  verificationStatus: {
    gap: 8,
    marginBottom: 16,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  distanceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7E6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  distanceText: {
    fontSize: 14,
    color: '#FA8C16',
    fontWeight: '500',
    flex: 1,
  },
  riderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingVertical: 12,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  recentPartnersCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  recentSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  partnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  partnerDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  selectArrow: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  locationCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  locationAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  mapContainer: {
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  responseTimeCard: {
    backgroundColor: '#E6F7FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: SPACING.lg * 2,
  },
  responseTimeText: {
    fontSize: 14,
    color: '#1890FF',
    textAlign: 'center',
  },
  bottomContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg * 1.5,
    paddingTop: 16,
    paddingBottom: SPACING.lg * 1.5,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sendRequestButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sendRequestButtonDisabled: {
    backgroundColor: COLORS.gray100,
  },
  sendRequestButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  sendRequestButtonTextDisabled: {
    color: COLORS.textTertiary,
  },
});

export default EnterRiderDetailsScreen;