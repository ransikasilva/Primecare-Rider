import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,

  StatusBar,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { apiService } from '../services/api';

interface ConfirmHandoverScreenProps {
  onBack: () => void;
  onCompleteHandover: () => void;
  onCallHospital: () => void;
  onEmergencyCancel: () => void;
  handoverData?: {
    fromRider: string;
    toRider: string;
    riderId: string;
    qrScanned: boolean;
    handoverId?: string;
    orderId?: string;
  } | null;
  onReportIssue?: () => void;
}

interface HandoverConfirmationData {
  status: {
    title: string;
    ready: boolean;
  };
  handover_summary: {
    from: string;
    to: string;
    time: string;
    date: string;
    location: string;
    packages: number;
  };
  package_transfer: {
    blood_tubes: {
      count: number;
      status: 'complete';
    };
    urine_containers: {
      count: number;
      status: 'complete';
    };
    refrigerated_items: {
      count: number;
      status: 'complete';
    };
    qr_codes_scanned: boolean;
    no_damage: boolean;
  };
  receiving_rider: {
    name: string;
    photo_url: string;
    rating: number;
    completed_deliveries: number;
    hospital: string;
    phone: string;
  };
  chain_of_custody: Array<{
    time: string;
    action: string;
    status: 'completed' | 'pending';
    details?: string;
  }>;
  emergency_contacts: Array<{
    name: string;
    phone: string;
    type: 'rider' | 'hospital' | 'support';
  }>;
}

const ConfirmHandoverScreen: React.FC<ConfirmHandoverScreenProps> = React.memo(({
  onBack,
  onCompleteHandover,
  onCallHospital,
  onEmergencyCancel,
  handoverData,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationData, setConfirmationData] = useState<HandoverConfirmationData>({
    status: {
      title: 'Ready to Complete',
      ready: true,
    },
    handover_summary: {
      from: 'You (Kasun Perera)',
      to: 'Priya Silva (RIDER-CLB-2024-067)',
      time: '4:28 PM',
      date: 'January 15, 2024',
      location: 'Galle Road, near Liberty Plaza',
      packages: 1,
    },
    package_transfer: {
      blood_tubes: {
        count: 8,
        status: 'complete',
      },
      urine_containers: {
        count: 3,
        status: 'complete',
      },
      refrigerated_items: {
        count: 2,
        status: 'complete',
      },
      qr_codes_scanned: true,
      no_damage: true,
    },
    receiving_rider: {
      name: 'Priya Silva',
      photo_url: 'https://example.com/photo.jpg', // Would be actual photo
      rating: 4.9,
      completed_deliveries: 342,
      hospital: 'National Hospital Colombo',
      phone: '+94 71 456 7890',
    },
    chain_of_custody: [
      {
        time: '3:18 PM',
        action: 'Original pickup at Nawaloka Labs',
        status: 'completed',
      },
      {
        time: '3:18 PM - 4:28 PM',
        action: 'Transport by Kasun Perera (2.8 km)',
        status: 'completed',
      },
      {
        time: '4:28 PM',
        action: 'Handover to Priya Silva',
        status: 'completed',
        details: 'Location: Galle Road (GPS verified)',
      },
      {
        time: 'Pending',
        action: 'Completion at National Hospital',
        status: 'pending',
      },
    ],
    emergency_contacts: [
      {
        name: 'Priya',
        phone: '+94 71 456 7890',
        type: 'rider',
      },
      {
        name: 'Hospital Lab',
        phone: '+94 11 269 1111',
        type: 'hospital',
      },
      {
        name: 'TransFleet Support',
        phone: '+94 11 PRIMECARE',
        type: 'support',
      },
    ],
  });

  // Load handover details from API
  useEffect(() => {
    const loadHandoverDetails = async () => {
      if (handoverData?.orderId) {
        try {
          setIsLoading(true);
          const response = await apiService.getOrderDetails(handoverData.orderId);

          if (response.success && response.data) {
            // Update confirmation data with real API data
            const orderData = response.data.order || response.data;
            setConfirmationData(prev => ({
              ...prev,
              handover_summary: {
                ...prev.handover_summary,
                from: handoverData.fromRider,
                to: handoverData.toRider,
              },
              receiving_rider: {
                ...prev.receiving_rider,
                name: handoverData.toRider,
              }
            }));
          }
        } catch (error) {
          console.error('Error loading handover details:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadHandoverDetails();
  }, [handoverData]);

  const handleCompleteHandover = useCallback(async () => {
    if (!handoverData?.orderId) {
      Alert.alert('Error', 'Missing order information');
      return;
    }
    Alert.alert(
      'Complete Handover?',
      `Confirm that you are completing the handover to ${confirmationData.receiving_rider.name}.\n\nThis action cannot be undone and will transfer responsibility for the medical samples.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Handover',
          onPress: async () => {
            try {
              setIsLoading(true);
              const response = await apiService.confirmHandover(
                handoverData.orderId!,
                'handover_qr_data'
              );

              if (response.success) {
                onCompleteHandover();
              } else {
                Alert.alert('Error', response.message || 'Failed to complete handover');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to complete handover');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [confirmationData.receiving_rider.name, onCompleteHandover]);

  const handleCallHospital = useCallback(() => {
    const hospitalContact = confirmationData.emergency_contacts.find(c => c.type === 'hospital');
    if (hospitalContact) {
      Alert.alert(
        'Call Hospital?',
        `Contact: ${hospitalContact.name}\nPhone: ${hospitalContact.phone}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => {
              const url = `tel:${hospitalContact.phone}`;
              Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'Unable to make phone call');
              });
              onCallHospital();
            },
          },
        ]
      );
    }
  }, [confirmationData.emergency_contacts, onCallHospital]);

  const handleEmergencyCancel = useCallback(() => {
    Alert.alert(
      'Emergency Cancel?',
      'This will cancel the handover process. Are you sure you want to proceed?\n\nThe original rider will retain responsibility for the delivery.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Emergency Cancel',
          style: 'destructive',
          onPress: onEmergencyCancel,
        },
      ]
    );
  }, [onEmergencyCancel]);

  const handleCallContact = useCallback((contact: typeof confirmationData.emergency_contacts[0]) => {
    Alert.alert(
      `Call ${contact.name}?`,
      `Phone: ${contact.phone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const url = `tel:${contact.phone}`;
            Linking.openURL(url).catch(() => {
              Alert.alert('Error', 'Unable to make phone call');
            });
          },
        },
      ]
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Confirm Handover</Text>
          <Text style={styles.stepIndicator}>Step 3 of 3</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Header */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIndicator} />
            <Text style={styles.statusTitle}>{confirmationData.status.title} ✅</Text>
          </View>
        </View>

        {/* Handover Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>HANDOVER SUMMARY 📋</Text>
          
          <View style={styles.summaryDetails}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>From:</Text>
              <Text style={styles.summaryValue}>{confirmationData.handover_summary.from}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>To:</Text>
              <Text style={styles.summaryValue}>{confirmationData.handover_summary.to}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Time:</Text>
              <Text style={styles.summaryValue}>
                {confirmationData.handover_summary.time}, {confirmationData.handover_summary.date}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Location:</Text>
              <Text style={styles.summaryValue}>{confirmationData.handover_summary.location}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Packages:</Text>
              <Text style={styles.summaryValue}>{confirmationData.handover_summary.packages} container</Text>
            </View>
          </View>
        </View>

        {/* Package Transfer Complete */}
        <View style={styles.transferCard}>
          <Text style={styles.sectionTitle}>PACKAGE TRANSFER COMPLETE ✅</Text>
          
          <View style={styles.transferChecks}>
            <View style={styles.transferItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.transferText}>
                <Text style={styles.transferCount}>{confirmationData.package_transfer.blood_tubes.count} Blood tubes</Text>
                <Text style={styles.transferStatus}> (all accounted for)</Text>
              </Text>
            </View>
            
            <View style={styles.transferItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.transferText}>
                <Text style={styles.transferCount}>{confirmationData.package_transfer.urine_containers.count} Urine containers</Text>
                <Text style={styles.transferStatus}> (all sealed)</Text>
              </Text>
            </View>
            
            <View style={styles.transferItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.transferText}>
                <Text style={styles.transferCount}>{confirmationData.package_transfer.refrigerated_items.count} Refrigerated items</Text>
                <Text style={styles.transferStatus}> (temperature maintained)</Text>
              </Text>
            </View>
            
            <View style={styles.transferItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.transferText}>
                QR codes scanned by {confirmationData.receiving_rider.name.split(' ')[0]}
              </Text>
            </View>
            
            <View style={styles.transferItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.transferText}>No damage or integrity issues</Text>
            </View>
          </View>
        </View>

        {/* Receiving Rider Details */}
        <View style={styles.riderCard}>
          <Text style={styles.sectionTitle}>RECEIVING RIDER DETAILS 👤</Text>
          
          <View style={styles.riderProfile}>
            <View style={styles.riderPhoto}>
              <Text style={styles.riderInitials}>
                {confirmationData.receiving_rider.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.riderInfo}>
              <Text style={styles.riderName}>{confirmationData.receiving_rider.name}</Text>
              <Text style={styles.riderRating}>
                ⭐ {confirmationData.receiving_rider.rating} ({confirmationData.receiving_rider.completed_deliveries} deliveries)
              </Text>
              <Text style={styles.riderHospital}>
                🏥 Hospital: {confirmationData.receiving_rider.hospital}
              </Text>
              <Text style={styles.riderContact}>
                📞 Contact: {confirmationData.receiving_rider.phone}
              </Text>
            </View>
          </View>
        </View>

        {/* Chain of Custody Update */}
        <View style={styles.custodyCard}>
          <Text style={styles.sectionTitle}>CHAIN OF CUSTODY UPDATE 🔗</Text>
          
          <View style={styles.custodyTimeline}>
            {confirmationData.chain_of_custody.map((step, index) => (
              <View key={index} style={styles.custodyStep}>
                <View style={[
                  styles.custodyIcon,
                  step.status === 'completed' ? styles.custodyCompleted : styles.custodyPending
                ]}>
                  <Text style={styles.custodyIconText}>
                    {step.status === 'completed' ? '✅' : '⏳'}
                  </Text>
                </View>
                <View style={styles.custodyDetails}>
                  <Text style={styles.custodyTime}>{step.time}</Text>
                  <Text style={styles.custodyAction}>{step.action}</Text>
                  {step.details && (
                    <Text style={styles.custodyDetailsText}>{step.details}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.contactsCard}>
          <Text style={styles.sectionTitle}>EMERGENCY CONTACTS ⚠️</Text>
          
          <View style={styles.contactsList}>
            {confirmationData.emergency_contacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactItem}
                onPress={() => handleCallContact(contact)}
              >
                <Text style={styles.contactIcon}>
                  {contact.type === 'rider' ? '👤' : contact.type === 'hospital' ? '🏥' : '🆘'}
                </Text>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <Text style={styles.callIcon}>📞</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.hospitalButton} onPress={handleCallHospital}>
            <Text style={styles.hospitalButtonText}>🏥 Call Hospital</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleEmergencyCancel}>
            <Text style={styles.cancelButtonText}>🚨 Emergency Cancel</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.completeButton} onPress={handleCompleteHandover}>
          <Text style={styles.completeButtonText}>Complete Handover</Text>
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
  statusCard: {
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginVertical: SPACING.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    backgroundColor: COLORS.success,
    borderRadius: 6,
    marginRight: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  summaryDetails: {
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    width: 80,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  transferCard: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  transferChecks: {
    gap: 12,
  },
  transferItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkIcon: {
    fontSize: 16,
    color: COLORS.success,
    marginRight: 12,
    width: 20,
  },
  transferText: {
    fontSize: 14,
    color: COLORS.success,
    flex: 1,
    lineHeight: 20,
  },
  transferCount: {
    fontWeight: '700',
  },
  transferStatus: {
    fontWeight: '500',
  },
  riderCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  riderProfile: {
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: 6,
  },
  riderName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  riderRating: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  riderHospital: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  riderContact: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  custodyCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg,
  },
  custodyTimeline: {
    gap: 16,
  },
  custodyStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  custodyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  custodyCompleted: {
    backgroundColor: COLORS.success,
  },
  custodyPending: {
    backgroundColor: COLORS.warning,
  },
  custodyIconText: {
    fontSize: 16,
  },
  custodyDetails: {
    flex: 1,
  },
  custodyTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  custodyAction: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  custodyDetailsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  contactsCard: {
    backgroundColor: '#FFF2E8',
    borderWidth: 1,
    borderColor: '#FFE7BA',
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg * 1.5,
    marginBottom: SPACING.lg * 2,
  },
  contactsList: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  callIcon: {
    fontSize: 18,
    marginLeft: 12,
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
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  hospitalButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
  },
  hospitalButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF2E8',
    borderWidth: 1,
    borderColor: '#FFE7BA',
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FA8C16',
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  completeButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default ConfirmHandoverScreen;