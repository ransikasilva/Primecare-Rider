import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { ArrowLeft, RefreshCw, MapPin, Clock, Package, QrCode, ChevronRight, RotateCcw } from 'lucide-react-native';
import BottomNavigation from '../components/BottomNavigation';
import { apiService } from '../services/api';

interface AvailableJobsScreenProps {
  onBack: () => void;
  onJobSelect: (jobId: string) => void;
  onHandoverSelect: (handoverId: string) => void;
  onRefresh: () => void;
  onHomePress: () => void;
  onReportsPress: () => void;
  onProfilePress: () => void;
  onActiveJobSelect?: (jobId: string, status: string) => void;
}

interface JobItem {
  id: string;
  type: 'pickup' | 'handover' | 'multi_parcel';
  priority: 'URGENT' | 'STANDARD';
  estimatedTime: string;
  collectionCenter: {
    name: string;
    location: string;
    distance: string;
  };
  hospital: {
    name: string;
  };
  sampleDetails: {
    description: string;
  };
  requestedAt: string;
  // Offer-specific fields (for sequential assignment)
  isOffer?: boolean;
  expiresAt?: string;
  sequenceNumber?: number;
  // Multi-parcel specific fields
  isMultiParcel?: boolean;
  multiParcelOfferId?: string;
  orderId?: string;
  additionalEarnings?: number;
  // Handover specific fields
  fromRider?: string;
  handoverReason?: string;
  meetupLocation?: string;
  // Assigned order specific fields
  status?: string;
}

const AvailableJobsScreen: React.FC<AvailableJobsScreenProps> = ({
  onBack,
  onJobSelect,
  onHandoverSelect,
  onRefresh,
  onHomePress,
  onReportsPress,
  onProfilePress,
  onActiveJobSelect,
}) => {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      // Load available opportunities: multi-parcel offers, active offers, assigned orders, and pending handovers
      const [multiParcelResponse, offersResponse, assignedOrdersResponse, handoversResponse] = await Promise.all([
        apiService.getMyMultiParcelOffers().catch(err => {
          console.log('No multi-parcel offers:', err.message);
          return { success: false, data: null };
        }),
        apiService.getMyOffers().catch(err => {
          console.log('No offers available:', err.message);
          return { success: false, data: null };
        }),
        apiService.getMyOrders().catch(err => {
          console.log('No assigned orders:', err.message);
          return { success: false, data: null };
        }),
        apiService.get('/orders/handovers/pending').catch(err => {
          console.log('No handovers available:', err.message);
          return { success: false, data: null };
        })
      ]);

      const allJobs: JobItem[] = [];

      // Process multi-parcel offers FIRST (highest priority - shown at top)
      if (multiParcelResponse?.success && multiParcelResponse.data?.offers && Array.isArray(multiParcelResponse.data.offers)) {
        const multiParcelOffers = multiParcelResponse.data.offers;
        const multiParcelJobs: JobItem[] = multiParcelOffers.map((offer: any) => {
          const distance = parseFloat(offer.rider_to_center_distance_km) || 0;
          const timeRemaining = Math.max(0, Math.floor((new Date(offer.offer_expires_at).getTime() - Date.now()) / 1000));

          return {
            id: offer.id, // Multi-parcel offer ID
            type: 'multi_parcel' as any, // New type
            priority: (offer.urgency?.toUpperCase() === 'URGENT' || offer.urgency?.toUpperCase() === 'EMERGENCY') ? 'URGENT' : 'STANDARD',
            estimatedTime: `${Math.floor(timeRemaining / 60)} min ${timeRemaining % 60} sec`,
            collectionCenter: {
              name: offer.collection_center_name || 'Collection Center',
              location: offer.collection_center_address || 'Unknown Location',
              distance: `${distance.toFixed(1)} km`,
            },
            hospital: {
              name: offer.hospital_name || 'Unknown Hospital',
            },
            sampleDetails: {
              description: `${offer.sample_quantity || 1} ${offer.sample_type || 'blood'} samples`,
            },
            requestedAt: offer.offer_sent_at || new Date().toISOString(),
            isOffer: true,
            isMultiParcel: true,
            multiParcelOfferId: offer.id,
            orderId: offer.order_id,
            expiresAt: offer.offer_expires_at,
            additionalEarnings: parseFloat(offer.additional_earnings) || 0,
          };
        });
        allJobs.push(...multiParcelJobs);
      }

      // Process active job offers FIRST (highest priority - shown at top)
      if (offersResponse?.success && offersResponse.data?.offers && Array.isArray(offersResponse.data.offers)) {
        const offers = offersResponse.data.offers;
        const offerJobs: JobItem[] = offers.map((offer: any) => {
          // Safely format distance
          const distance = offer.estimated_distance_km
            ? (typeof offer.estimated_distance_km === 'number'
                ? offer.estimated_distance_km.toFixed(1)
                : parseFloat(offer.estimated_distance_km).toFixed(1))
            : '0';

          return {
            id: offer.order_id,
            type: 'pickup' as const,
            priority: (offer.urgency?.toUpperCase() === 'URGENT' || offer.urgency?.toUpperCase() === 'EMERGENCY') ? 'URGENT' : 'STANDARD',
            estimatedTime: `${Math.floor(offer.seconds_remaining / 60)} min ${Math.floor(offer.seconds_remaining % 60)} sec`,
            collectionCenter: {
              name: offer.collection_center_name || 'Unknown Center',
              location: offer.collection_center_address || 'Unknown Location',
              distance: `${distance} km`,
            },
            hospital: {
              name: offer.hospital_name || 'Unknown Hospital',
            },
            sampleDetails: {
              description: `${offer.sample_quantity || 1} ${offer.sample_type || 'blood'} samples`,
            },
            requestedAt: offer.offer_sent_at || new Date().toISOString(),
            // Add offer-specific data
            isOffer: true,
            expiresAt: offer.offer_expires_at,
            sequenceNumber: offer.sequence_number,
          };
        });
        allJobs.push(...offerJobs);
      }

      // Process assigned orders (accepted jobs - second priority)
      if (assignedOrdersResponse?.success && assignedOrdersResponse.data?.orders && Array.isArray(assignedOrdersResponse.data.orders)) {
        const assignedOrders = assignedOrdersResponse.data.orders;
        const assignedJobs: JobItem[] = assignedOrders.map((order: any) => {
          return {
            id: order.id,
            type: 'pickup' as const,
            priority: (order.urgency?.toUpperCase() === 'URGENT' || order.urgency?.toUpperCase() === 'EMERGENCY') ? 'URGENT' : 'STANDARD',
            estimatedTime: 'In Progress',
            collectionCenter: {
              name: order.pickup_location?.name || 'Unknown Center',
              location: order.pickup_location?.address || 'Unknown Location',
              distance: 'Active',
            },
            hospital: {
              name: order.delivery_location?.name || 'Unknown Hospital',
            },
            sampleDetails: {
              description: `${order.sample_type || 'Blood'} sample`,
            },
            requestedAt: order.created_at || new Date().toISOString(),
            isOffer: false,
            status: order.status, // Add status to identify as assigned order
          };
        });
        allJobs.push(...assignedJobs);
      }

      // Process handover requests (second priority)
      if (handoversResponse?.success && handoversResponse.data?.handovers && Array.isArray(handoversResponse.data.handovers)) {
        const handovers = handoversResponse.data.handovers;
        const handoverJobs: JobItem[] = handovers.map((handover: any) => ({
          id: handover.id,
          type: 'handover' as const,
          priority: handover.urgency?.toUpperCase() === 'URGENT' ? 'URGENT' : 'STANDARD',
          estimatedTime: `${handover.estimated_time || 15} min`,
          collectionCenter: {
            name: '',
            location: '',
            distance: '',
          },
          hospital: {
            name: handover.hospital_name || 'Unknown Hospital',
          },
          sampleDetails: {
            description: handover.sample_description || 'Samples for handover',
          },
          requestedAt: handover.created_at || new Date().toISOString(),
          fromRider: handover.from_rider_name || 'Unknown Rider',
          handoverReason: handover.reason || 'Not specified',
          meetupLocation: handover.meetup_location || 'To be determined',
        }));
        allJobs.push(...handoverJobs);
      }

      console.log(`✅ Loaded ${allJobs.length} available jobs/offers`);
      setJobs(allJobs);
    } catch (error: any) {
      console.error('⚠️ Error loading jobs:', error.message);
      // Don't show alert for empty results, just log it
      setJobs([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
    onRefresh();
  };

  const handleItemPress = (job: JobItem) => {
    if (job.type === 'handover') {
      onHandoverSelect(job.id);
    } else if (job.isMultiParcel) {
      // Multi-parcel offer - go to job details with order ID
      onJobSelect(job.orderId || job.id);
    } else if (job.status && onActiveJobSelect) {
      // Assigned order - go to active job screen
      onActiveJobSelect(job.id, job.status);
    } else {
      // Offer - go to job details screen to accept/reject
      onJobSelect(job.id);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  };

  const renderJobCard = (job: JobItem) => (
    <TouchableOpacity
      key={job.id}
      style={[
        styles.jobCard,
        job.type === 'handover' && styles.handoverCard,
        job.type === 'multi_parcel' && styles.multiParcelCard,
        job.priority === 'URGENT' && styles.urgentCard
      ]}
      onPress={() => handleItemPress(job)}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          {job.type === 'handover' ? (
            <View style={[styles.typeIndicator, styles.handoverIndicator]}>
              <RotateCcw size={14} color={COLORS.warning} />
              <Text style={[styles.typeText, styles.handoverText]}>HANDOVER</Text>
            </View>
          ) : job.type === 'multi_parcel' ? (
            <View style={[styles.typeIndicator, styles.multiParcelIndicator]}>
              <Package size={14} color={COLORS.success} />
              <Text style={[styles.typeText, styles.multiParcelText]}>MULTI-PARCEL</Text>
            </View>
          ) : (
            <View style={[styles.typeIndicator, styles.pickupIndicator]}>
              <Package size={14} color={COLORS.primary} />
              <Text style={[styles.typeText, styles.pickupText]}>PICKUP</Text>
            </View>
          )}

          {job.priority === 'URGENT' && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>URGENT</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.timeAgo}>{formatTimeAgo(job.requestedAt)}</Text>
          <ChevronRight size={16} color={COLORS.textTertiary} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        {job.type === 'handover' ? (
          // Handover request content
          <View>
            <Text style={styles.mainText}>Request from {job.fromRider}</Text>
            <View style={styles.detailRow}>
              <MapPin size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>Meet at: {job.meetupLocation}</Text>
            </View>
            <View style={styles.detailRow}>
              <Package size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>Reason: {job.handoverReason}</Text>
            </View>
            <View style={styles.detailRow}>
              <Clock size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>ETA: {job.estimatedTime}</Text>
            </View>
          </View>
        ) : (
          // Regular pickup content
          <View>
            <Text style={styles.mainText}>{job.collectionCenter.name}</Text>
            <View style={styles.detailRow}>
              <MapPin size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{job.collectionCenter.location} • {job.collectionCenter.distance}</Text>
            </View>
            <View style={styles.detailRow}>
              <Package size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{job.sampleDetails.description}</Text>
            </View>
            <View style={styles.detailRow}>
              <Clock size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>ETA: {job.estimatedTime} • To {job.hospital.name}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Footer - Show timer for offers, special badge for multi-parcel, QR indicator for regular jobs */}
      <View style={styles.cardFooter}>
        {job.isMultiParcel ? (
          // Multi-parcel special badge
          <View style={styles.multiParcelFooter}>
            <Package size={14} color={COLORS.success} />
            <Text style={styles.multiParcelFooterText}>🎁 On your route • Pick up on the way</Text>
            <Clock size={14} color={COLORS.warning} />
            <Text style={styles.offerTimerText}>{job.estimatedTime}</Text>
          </View>
        ) : job.isOffer ? (
          // Offer expiry timer
          <View style={styles.offerTimer}>
            <Clock size={14} color={COLORS.warning} />
            <Text style={styles.offerTimerText}>⚡ Offer expires in {job.estimatedTime}</Text>
            <ChevronRight size={16} color={COLORS.warning} />
          </View>
        ) : (
          // Regular QR indicator
          <View style={styles.qrIndicator}>
            <QrCode size={12} color={COLORS.textTertiary} />
            <Text style={styles.qrText}>QR verification required</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header Background */}
      <View style={styles.headerBackground} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Available Jobs</Text>
          <Text style={styles.headerSubtitle}>{jobs.length} items available</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <RefreshCw size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Jobs List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {jobs.length > 0 ? (
          <>
            {jobs.map(renderJobCard)}
            <View style={styles.listFooter}>
              <Text style={styles.listFooterText}>
                All available jobs and handover requests shown
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Package size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No Jobs Available</Text>
            <Text style={styles.emptyText}>
              Check back later for new pickup requests and handover opportunities
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleRefresh}>
              <Text style={styles.emptyButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="jobs"
        onHomePress={onHomePress}
        onJobsPress={() => {
          console.log('Jobs tab pressed - already on jobs screen');
        }}
        onReportsPress={onReportsPress}
        onProfilePress={onProfilePress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: COLORS.white,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerCenter: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.sm,
  },
  handoverCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  multiParcelCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.sm,
    gap: 4,
  },
  pickupIndicator: {
    backgroundColor: COLORS.primary + '20',
  },
  handoverIndicator: {
    backgroundColor: COLORS.warning + '20',
  },
  multiParcelIndicator: {
    backgroundColor: COLORS.success + '20',
  },
  typeText: {
    ...TYPOGRAPHY.styles.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  pickupText: {
    color: COLORS.primary,
  },
  handoverText: {
    color: COLORS.warning,
  },
  multiParcelText: {
    color: COLORS.success,
  },
  urgentBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.xs,
  },
  urgentBadgeText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeAgo: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textTertiary,
  },
  cardContent: {
    marginBottom: SPACING.md,
  },
  mainText: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  detailText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    paddingTop: SPACING.sm,
  },
  qrIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  qrText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textTertiary,
  },
  // Offer-specific styles
  offerTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
    justifyContent: 'space-between',
  },
  offerTimerText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.warning,
    fontWeight: '700',
    flex: 1,
  },
  multiParcelFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  multiParcelFooterText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.success,
    fontWeight: '700',
    flex: 1,
  },
  listFooter: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  listFooterText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
  },
  emptyButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default AvailableJobsScreen;