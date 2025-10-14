import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SplashScreenProps {
  onFinish: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textScaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Floating particles animations
  const particle1Y = useRef(new Animated.Value(0)).current;
  const particle2Y = useRef(new Animated.Value(0)).current;
  const particle3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startAnimationSequence();
    startFloatingParticles();
  }, []);

  const startFloatingParticles = () => {
    // Create continuous floating animation for particles
    const createFloatingAnimation = (animValue: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: -20,
            duration: 2000,
            delay,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(animValue, {
            toValue: 20,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    };

    createFloatingAnimation(particle1Y, 0);
    createFloatingAnimation(particle2Y, 400);
    createFloatingAnimation(particle3Y, 800);
  };

  const startAnimationSequence = () => {
    // Phase 1: Logo entrance with scale
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Text entrance with fade and scale (delayed)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(textScaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);

    // Phase 3: Progress bar
    setTimeout(() => {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }).start();
    }, 800);

    // Navigate after animation completes
    setTimeout(() => {
      onFinish();
    }, 3000);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      {/* Premium Gradient Background */}
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FA', '#F1F3F5']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animated Floating Particles/Shapes */}
      <Animated.View
        style={[
          styles.particle1,
          { transform: [{ translateY: particle1Y }] },
        ]}
      />
      <Animated.View
        style={[
          styles.particle2,
          { transform: [{ translateY: particle2Y }] },
        ]}
      />
      <Animated.View
        style={[
          styles.particle3,
          { transform: [{ translateY: particle3Y }] },
        ]}
      />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo Container with Animation */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Brand Text with Slide Animation */}
        <Animated.View
          style={[
            styles.brandContainer,
            {
              opacity: textFadeAnim,
              transform: [
                { translateY: slideUpAnim },
                { scale: textScaleAnim },
              ],
            },
          ]}
        >
          <Text style={styles.brandText}>TransFleet</Text>
          <Text style={styles.brandSubtext}>Riders</Text>
          <Text style={styles.taglineText}>Medical Sample Delivery</Text>
        </Animated.View>

        {/* Progress Indicator */}
        <Animated.View
          style={[
            styles.progressContainer,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                { width: progressWidth },
              ]}
            />
          </View>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View
        style={[
          styles.footer,
          { opacity: fadeAnim },
        ]}
      >
        <Text style={styles.footerText}>Powered by TransFleet</Text>
        <Text style={styles.versionText}>v1.0.0</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle1: {
    position: 'absolute',
    top: 100,
    right: 50,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E5',
    opacity: 0.3,
  },
  particle2: {
    position: 'absolute',
    top: 250,
    left: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5F3FF',
    opacity: 0.3,
  },
  particle3: {
    position: 'absolute',
    bottom: 200,
    right: 80,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE5E5',
    opacity: 0.2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: 120,
    height: 120,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  brandText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 4,
  },
  brandSubtext: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E63946',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  taglineText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  progressContainer: {
    width: '80%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E63946',
    borderRadius: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 11,
    color: '#D1D5DB',
    fontWeight: '400',
  },
});

export default SplashScreen;
