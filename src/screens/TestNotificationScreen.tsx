import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import notificationService from '../services/notificationService';
import { apiService } from '../services/api';

const TestNotificationScreen = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    registerForNotifications();
  }, []);

  const registerForNotifications = async () => {
    setLoading(true);
    try {
      const expoPushToken = await notificationService.registerForPushNotifications();

      if (expoPushToken) {
        setToken(expoPushToken);
        console.log('🔔 EXPO PUSH TOKEN:', expoPushToken);
        Alert.alert('Success!', `Token received!\n\n${expoPushToken}`, [
          { text: 'Copy Token', onPress: () => console.log('Token:', expoPushToken) }
        ]);

        // Save to database (replace with your actual rider ID)
        const riderId = '4d4d2dae-769b-4feb-9953-4d25f0ac2dca'; // Your rider ID from database
        await apiService.updateExpoPushToken(riderId, expoPushToken);
        console.log('✅ Token saved to database');
      } else {
        Alert.alert('Warning', 'No token received. Make sure you granted notification permissions.');
      }
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!token) {
      Alert.alert('Error', 'No token available. Please register first.');
      return;
    }

    try {
      const url = `http://192.168.1.4:8000/api/test/send-notification?token=${encodeURIComponent(token)}`;
      console.log('Sending test notification to:', url);

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        Alert.alert('Success!', 'Test notification sent! Check your phone.');
      } else {
        Alert.alert('Error', result.error || 'Failed to send notification');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🔔 Push Notification Test</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>
            {loading ? 'Loading...' : token ? '✅ Registered' : '❌ Not Registered'}
          </Text>
        </View>

        {token && (
          <View style={styles.section}>
            <Text style={styles.label}>Your Expo Push Token:</Text>
            <Text style={styles.token} selectable>{token}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={registerForNotifications}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Registering...' : 'Register for Notifications'}
          </Text>
        </TouchableOpacity>

        {token && (
          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={sendTestNotification}
          >
            <Text style={styles.buttonText}>Send Test Notification</Text>
          </TouchableOpacity>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>📋 Instructions:</Text>
          <Text style={styles.instructionText}>1. Tap "Register for Notifications"</Text>
          <Text style={styles.instructionText}>2. Grant notification permissions when asked</Text>
          <Text style={styles.instructionText}>3. Token will be saved automatically</Text>
          <Text style={styles.instructionText}>4. Tap "Send Test Notification" to test</Text>
          <Text style={styles.instructionText}>5. You should receive a notification!</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  token: {
    fontSize: 12,
    color: '#4ECDC4',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    fontFamily: 'monospace',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4ECDC4',
  },
  successButton: {
    backgroundColor: '#2ecc71',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
});

export default TestNotificationScreen;
