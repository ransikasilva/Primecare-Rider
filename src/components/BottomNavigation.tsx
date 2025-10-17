import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Briefcase, BarChart3, User } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';

export type NavigationTab = 'home' | 'jobs' | 'reports' | 'profile';

interface NavigationItem {
  key: NavigationTab;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  onPress: () => void;
}

interface BottomNavigationProps {
  activeTab: NavigationTab;
  onHomePress: () => void;
  onJobsPress: () => void;
  onReportsPress: () => void;
  onProfilePress: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onHomePress,
  onJobsPress,
  onReportsPress,
  onProfilePress,
}) => {
  const insets = useSafeAreaInsets();

  const navigationItems: NavigationItem[] = [
    {
      key: 'home',
      label: 'Home',
      icon: Home,
      onPress: onHomePress,
    },
    {
      key: 'jobs',
      label: 'Jobs',
      icon: Briefcase,
      onPress: onJobsPress,
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: BarChart3,
      onPress: onReportsPress,
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: User,
      onPress: onProfilePress,
    },
  ];

  const renderNavItem = (item: NavigationItem) => {
    const isActive = activeTab === item.key;
    const IconComponent = item.icon;

    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
          <IconComponent
            size={22}
            color={isActive ? COLORS.primary : COLORS.textSecondary}
          />
        </View>
        <Text style={[
          styles.navText,
          isActive && styles.navTextActive
        ]}>
          {item.label}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.navigationBar}>
        {navigationItems.map(renderNavItem)}
      </View>
      {/* Safe area bottom padding */}
      <View style={[styles.safeAreaBottom, { height: insets.bottom }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
  },
  safeAreaBottom: {
    backgroundColor: COLORS.white,
  },
  navigationBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.xs,
    paddingBottom: 0,
    backgroundColor: COLORS.white,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: SPACING.xs,
    borderRadius: LAYOUT.radius.lg,
    minHeight: 52,
    justifyContent: 'center',
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: COLORS.primaryUltraLight,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LAYOUT.radius.md,
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: COLORS.primary + '15',
  },
  navText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  navTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 32,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.sm,
  },
});

export default BottomNavigation;