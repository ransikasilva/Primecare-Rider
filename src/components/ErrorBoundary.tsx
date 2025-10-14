import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, SHADOWS } from '../theme/design-system';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  resetError: () => void;
  errorId: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = this.state.errorId;
    
    // Log error for debugging
    console.error('🚨 React Error Boundary caught an error:', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // In production, you might want to send this to an error reporting service
    if (!__DEV__) {
      this.reportErrorToService(error, errorInfo, errorId);
    }
  }

  private reportErrorToService = async (
    error: Error,
    errorInfo: React.ErrorInfo,
    errorId: string
  ) => {
    try {
      // This would integrate with your error reporting service
      // For example: Sentry, Bugsnag, or custom error reporting
      const errorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        platform: 'mobile',
        version: '1.0.0', // App version
        userId: 'rider_id_here', // Would get from auth context
      };

      // In a real app, you'd send this to your error reporting endpoint
      console.log('📊 Error report prepared:', errorReport);
      
      // Example API call:
      // await apiService.reportError(errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo!}
          resetError={this.resetError}
          errorId={this.state.errorId}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  errorId,
}) => {
  const handleReportIssue = () => {
    Alert.alert(
      'Report Issue',
      'Would you like to send this error report to our support team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Report',
          onPress: () => {
            // This would open an email or contact form with error details
            Alert.alert(
              'Report Sent',
              'Thank you for reporting this issue. Our team will investigate it.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const handleRestartApp = () => {
    Alert.alert(
      'Restart App',
      'This will restart the TransFleet Rider app. Any unsaved progress may be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: () => {
            // In a real app, you might use a library like RNRestart
            // For now, just reset the error
            resetError();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
        </View>

        {/* Error Title */}
        <Text style={styles.title}>Oops! Something went wrong</Text>
        
        {/* Error Description */}
        <Text style={styles.description}>
          We're sorry, but the app encountered an unexpected error. This has been reported to our team.
        </Text>

        {/* Error ID */}
        <View style={styles.errorIdContainer}>
          <Text style={styles.errorIdLabel}>Error ID:</Text>
          <Text style={styles.errorId}>{errorId}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={resetError}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleReportIssue}>
            <Text style={styles.secondaryButtonText}>Report Issue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleRestartApp}>
            <Text style={styles.secondaryButtonText}>Restart App</Text>
          </TouchableOpacity>
        </View>

        {/* Development Info */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Information:</Text>
            <Text style={styles.debugText}>Error: {error.message}</Text>
            {error.stack && (
              <ScrollView style={styles.stackContainer} horizontal>
                <Text style={styles.stackText}>{error.stack}</Text>
              </ScrollView>
            )}
            {errorInfo?.componentStack && (
              <ScrollView style={styles.stackContainer} horizontal>
                <Text style={styles.stackText}>{errorInfo.componentStack}</Text>
              </ScrollView>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    padding: SPACING.lg * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.lg * 2,
  },
  errorIcon: {
    fontSize: 64,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text_primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  description: {
    fontSize: 16,
    color: COLORS.text_secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg * 2,
  },
  errorIdContainer: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    marginBottom: SPACING.lg * 2,
    alignSelf: 'stretch',
  },
  errorIdLabel: {
    fontSize: 12,
    color: COLORS.text_muted,
    marginBottom: 4,
  },
  errorId: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: COLORS.text_primary,
  },
  actionsContainer: {
    alignSelf: 'stretch',
    gap: SPACING.lg,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.text_primary,
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    marginTop: SPACING.lg * 3,
    alignSelf: 'stretch',
    backgroundColor: '#000',
    padding: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
  },
  debugTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: SPACING.lg / 2,
  },
  stackContainer: {
    maxHeight: 200,
    backgroundColor: '#111',
    padding: SPACING.lg / 2,
    borderRadius: 4,
    marginTop: SPACING.lg / 2,
  },
  stackText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});

export default ErrorBoundary;
export { ErrorFallbackProps };