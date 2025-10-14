import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Share2, Calendar, Package, CheckCircle, Download, FileText } from 'lucide-react-native';
import { COLORS, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';
import { apiService } from '../services/api';
import BottomNavigation from '../components/BottomNavigation';

const { width: screenWidth } = Dimensions.get('window');

interface PerformanceDashboardScreenProps {
  onBack: () => void;
  onHomePress: () => void;
  onJobsPress: () => void;
  onProfilePress: () => void;
}

interface DailyPerformanceData {
  date: string;
  total_deliveries: number;
  actual_km: number;
}

interface PerformanceSummary {
  total_deliveries: number;
  total_km: number;
  avg_km_per_delivery: number;
  success_rate: number;
}

const PerformanceDashboardScreen: React.FC<PerformanceDashboardScreenProps> = React.memo(({
  onBack,
  onHomePress,
  onJobsPress,
  onProfilePress,
}) => {
  // Date range state - default to last 7 days
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [dailyData, setDailyData] = useState<DailyPerformanceData[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary>({
    total_deliveries: 0,
    total_km: 0,
    avg_km_per_delivery: 0,
    success_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Date picker handlers
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  // Load performance data for date range
  const loadPerformanceData = useCallback(async () => {
    try {
      setLoading(true);

      // Get my orders
      const ordersResponse = await apiService.getMyOrders();
      if (!ordersResponse.success || !ordersResponse.data) {
        throw new Error('Failed to get orders');
      }

      // Filter and process orders by date range
      const orders = ordersResponse.data.orders || [];
      const startDateTime = new Date(startDate + 'T00:00:00').getTime();
      const endDateTime = new Date(endDate + 'T23:59:59').getTime();

      // Group orders by date
      const dailyMap = new Map<string, DailyPerformanceData>();
      let totalDeliveries = 0;
      let totalKm = 0;
      let successfulDeliveries = 0;

      orders.forEach((order: any) => {
        const orderDate = new Date(order.created_at);
        const orderTime = orderDate.getTime();

        if (orderTime >= startDateTime && orderTime <= endDateTime) {
          const dateKey = orderDate.toISOString().split('T')[0];

          if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, {
              date: dateKey,
              total_deliveries: 0,
              actual_km: 0,
            });
          }

          const dailyEntry = dailyMap.get(dateKey)!;
          dailyEntry.total_deliveries++;
          const km = parseFloat(order.actual_distance_km || order.estimated_distance_km || 0);
          dailyEntry.actual_km += km;

          totalDeliveries++;
          totalKm += km;

          if (order.status === 'delivered') {
            successfulDeliveries++;
          }
        }
      });

      // Convert map to sorted array
      const dailyArray = Array.from(dailyMap.values()).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setDailyData(dailyArray);
      setSummary({
        total_deliveries: totalDeliveries,
        total_km: parseFloat(totalKm.toFixed(2)),
        avg_km_per_delivery: totalDeliveries > 0 ? parseFloat((totalKm / totalDeliveries).toFixed(2)) : 0,
        success_rate: totalDeliveries > 0 ? parseFloat(((successfulDeliveries / totalDeliveries) * 100).toFixed(1)) : 0,
      });

    } catch (error) {
      console.error('Failed to load performance data:', error);
      Alert.alert('Error', 'Failed to load performance data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysDifference = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Generate and share report
  const generateReport = async () => {
    try {
      setDownloading(true);

      // Get rider name
      const profileResponse = await apiService.getRiderProfile();
      const riderName = profileResponse.data?.rider_name || 'Rider';

      // Create report content
      let content = `TransFleet Rider Performance Report\n`;
      content += `Rider: ${riderName}\n`;
      content += `Period: ${formatDate(startDate)} - ${formatDate(endDate)}\n\n`;
      content += `Summary:\n`;
      content += `Total Deliveries: ${summary.total_deliveries}\n`;
      content += `Total Distance: ${summary.total_km} km\n`;
      content += `Avg KM per Delivery: ${summary.avg_km_per_delivery} km\n`;
      content += `Success Rate: ${summary.success_rate}%\n\n`;
      content += `Date,Deliveries,Distance (km)\n`;

      dailyData.forEach(day => {
        content += `${formatDate(day.date)},${day.total_deliveries},${day.actual_km.toFixed(2)}\n`;
      });

      // Share using React Native Share API
      await Share.share({
        message: content,
        title: 'TransFleet Performance Report',
      });

    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Failed to generate report:', error);
        Alert.alert('Error', 'Failed to share report. Please try again.');
      }
    } finally {
      setDownloading(false);
    }
  };

  // Share report
  const handleShare = async () => {
    await generateReport();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading performance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Performance</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Share2 size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dateRangeCard}>
          <View style={styles.dateRangeHeader}>
            <Calendar size={20} color={COLORS.primary} />
            <Text style={styles.dateRangeTitle}>Date Range</Text>
          </View>

          <View style={styles.dateInputsRow}>
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>From</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                <Calendar size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>To</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                <Calendar size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={new Date(startDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onStartDateChange}
              maximumDate={new Date()}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={new Date(endDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onEndDateChange}
              minimumDate={new Date(startDate)}
              maximumDate={new Date()}
            />
          )}

          <View style={styles.dateRangeInfo}>
            <Text style={styles.dateRangeInfoText}>
              {getDaysDifference()} day{getDaysDifference() !== 1 ? 's' : ''} selected
            </Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Package size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.summaryValue}>{summary.total_deliveries}</Text>
            <Text style={styles.summaryLabel}>Deliveries</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Calendar size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.summaryValue}>{summary.total_km} km</Text>
            <Text style={styles.summaryLabel}>Total Distance</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <FileText size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.summaryValue}>{summary.avg_km_per_delivery} km</Text>
            <Text style={styles.summaryLabel}>Avg KM/Del</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <CheckCircle size={24} color={COLORS.success} />
            </View>
            <Text style={styles.summaryValue}>{summary.success_rate}%</Text>
            <Text style={styles.summaryLabel}>Success Rate</Text>
          </View>
        </View>

        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>Daily Performance</Text>
            <TouchableOpacity onPress={generateReport} disabled={downloading} style={styles.downloadButton}>
              {downloading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Download size={18} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>

          {dailyData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No deliveries in this date range</Text>
            </View>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Date</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.5 }]}>Deliveries</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.5 }]}>KM</Text>
              </View>

              {dailyData.map((day, index) => (
                <View key={day.date} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{formatDate(day.date)}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{day.total_deliveries}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{day.actual_km.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>

      <BottomNavigation
        activeTab="reports"
        onHomePress={onHomePress}
        onJobsPress={onJobsPress}
        onReportsPress={() => {}}
        onProfilePress={onProfilePress}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.md, fontSize: 14, color: COLORS.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
  backButton: { padding: SPACING.xs },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, flex: 1, textAlign: 'center' },
  shareButton: { padding: SPACING.xs },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  dateRangeCard: { backgroundColor: COLORS.white, borderRadius: LAYOUT.radius.lg, padding: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.gray200, ...SHADOWS.sm },
  dateRangeHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  dateRangeTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  dateInputsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  dateInputContainer: { flex: 1 },
  dateLabel: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary, marginBottom: SPACING.xs },
  dateInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.gray300, borderRadius: LAYOUT.radius.md, padding: SPACING.md, backgroundColor: COLORS.white },
  dateText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  dateRangeInfo: { paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.gray200, marginTop: SPACING.sm },
  dateRangeInfoText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.md },
  summaryCard: { width: (screenWidth - (SPACING.lg * 2) - SPACING.md) / 2, backgroundColor: COLORS.white, borderRadius: LAYOUT.radius.lg, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.gray200, ...SHADOWS.sm },
  summaryIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  summaryValue: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  tableCard: { backgroundColor: COLORS.white, borderRadius: LAYOUT.radius.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.gray200, ...SHADOWS.sm },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  tableTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  downloadButton: { padding: SPACING.sm, borderRadius: LAYOUT.radius.md, backgroundColor: COLORS.primary + '15' },
  table: { borderRadius: LAYOUT.radius.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.gray200 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.gray200, paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm },
  tableRowEven: { backgroundColor: COLORS.gray50 },
  tableHeaderCell: { fontWeight: '600', color: COLORS.textPrimary, backgroundColor: COLORS.gray100 },
  tableCell: { fontSize: 13, color: COLORS.textSecondary },
  emptyState: { paddingVertical: SPACING.xxxl, alignItems: 'center' },
  emptyStateText: { fontSize: 14, color: COLORS.textSecondary },
});

export default PerformanceDashboardScreen;
