import React, { Suspense } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';

interface LazyScreenProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  screenName?: string;
}

const DefaultLoadingFallback: React.FC<{ screenName?: string }> = ({ screenName }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>
        {screenName ? `Loading ${screenName}...` : 'Loading...'}
      </Text>
    </View>
  </SafeAreaView>
);

export const LazyScreen: React.FC<LazyScreenProps> = ({
  children,
  fallback: Fallback = DefaultLoadingFallback,
  screenName,
}) => {
  return (
    <Suspense fallback={<Fallback screenName={screenName} />}>
      {children}
    </Suspense>
  );
};

// Skeleton loading components for specific screens
export const DashboardSkeleton: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.skeletonContainer}>
      {/* Header skeleton */}
      <View style={styles.headerSkeleton}>
        <View style={[styles.skeletonBox, styles.avatarSkeleton]} />
        <View style={[styles.skeletonBox, styles.textSkeleton]} />
      </View>
      
      {/* Stats cards skeleton */}
      <View style={styles.statsContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.skeletonBox, styles.statCardSkeleton]} />
        ))}
      </View>
      
      {/* Jobs list skeleton */}
      <View style={styles.jobsContainer}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.skeletonBox, styles.jobCardSkeleton]} />
        ))}
      </View>
    </View>
  </SafeAreaView>
);

export const JobDetailsSkeleton: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.skeletonContainer}>
      {/* Header skeleton */}
      <View style={[styles.skeletonBox, styles.headerTextSkeleton]} />
      
      {/* Job info skeleton */}
      <View style={styles.jobInfoContainer}>
        <View style={[styles.skeletonBox, styles.priorityBadgeSkeleton]} />
        <View style={[styles.skeletonBox, styles.textSkeleton]} />
        <View style={[styles.skeletonBox, styles.longTextSkeleton]} />
      </View>
      
      {/* Map skeleton */}
      <View style={[styles.skeletonBox, styles.mapSkeleton]} />
      
      {/* Details skeleton */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.detailSection}>
          <View style={[styles.skeletonBox, styles.sectionTitleSkeleton]} />
          <View style={[styles.skeletonBox, styles.longTextSkeleton]} />
        </View>
      ))}
    </View>
  </SafeAreaView>
);

export const QRScannerSkeleton: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.skeletonContainer}>
      {/* Camera placeholder */}
      <View style={[styles.skeletonBox, styles.cameraSkeleton]}>
        <Text style={styles.cameraPlaceholderText}>📱 Initializing Camera...</Text>
      </View>
      
      {/* Instructions skeleton */}
      <View style={styles.instructionsContainer}>
        <View style={[styles.skeletonBox, styles.textSkeleton]} />
        <View style={[styles.skeletonBox, styles.shortTextSkeleton]} />
      </View>
      
      {/* Guidelines skeleton */}
      <View style={styles.guidelinesContainer}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.skeletonBox, styles.guidelineSkeleton]} />
        ))}
      </View>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg * 2,
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: 16,
    color: COLORS.text_secondary,
    textAlign: 'center',
  },
  skeletonContainer: {
    flex: 1,
    padding: SPACING.lg * 1.5,
  },
  skeletonBox: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.lg,
  },
  headerSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg * 2,
  },
  avatarSkeleton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.lg,
  },
  textSkeleton: {
    height: 20,
    flex: 1,
  },
  shortTextSkeleton: {
    height: 16,
    width: '60%',
  },
  longTextSkeleton: {
    height: 16,
    width: '100%',
    marginBottom: SPACING.lg / 2,
  },
  headerTextSkeleton: {
    height: 24,
    width: '70%',
    marginBottom: SPACING.lg * 2,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg * 2,
  },
  statCardSkeleton: {
    width: '48%',
    height: 80,
    marginBottom: SPACING.lg,
  },
  jobsContainer: {
    gap: SPACING.lg,
  },
  jobCardSkeleton: {
    height: 120,
    width: '100%',
  },
  jobInfoContainer: {
    marginBottom: SPACING.lg * 2,
  },
  priorityBadgeSkeleton: {
    width: 80,
    height: 24,
    marginBottom: SPACING.lg,
  },
  mapSkeleton: {
    height: 200,
    width: '100%',
    marginVertical: SPACING.lg * 2,
  },
  detailSection: {
    marginBottom: SPACING.lg * 1.5,
  },
  sectionTitleSkeleton: {
    height: 18,
    width: '40%',
    marginBottom: SPACING.lg,
  },
  cameraSkeleton: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    marginBottom: SPACING.lg * 2,
  },
  cameraPlaceholderText: {
    color: COLORS.white,
    fontSize: 16,
  },
  instructionsContainer: {
    marginBottom: SPACING.lg * 2,
    gap: SPACING.lg / 2,
  },
  guidelinesContainer: {
    gap: SPACING.lg,
  },
  guidelineSkeleton: {
    height: 40,
    width: '100%',
  },
});

export default LazyScreen;