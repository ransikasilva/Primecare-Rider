// src/services/distanceService.ts
import { API_CONFIG } from '../config/environment';

export interface DistanceResult {
  distance_km: string;
  duration_minutes: number;
  duration_in_traffic_minutes?: number;
  distance_text: string;
  duration_text: string;
  duration_in_traffic_text?: string;
  api_used: 'google_maps' | 'haversine_fallback';
  fallback: boolean;
  eta_minutes?: number;
  eta_timestamp?: string;
  breakdown?: {
    travel_minutes: number;
    buffer_minutes: number;
    assignment_minutes: number;
    pickup_minutes: number;
    total_minutes: number;
  };
}

export interface LocationCoords {
  lat: number;
  lng: number;
}

class DistanceService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    // Remove /api suffix if it exists since we'll add it in our requests
    const baseUrl = API_CONFIG.baseUrl || 'http://localhost:3000';
    this.baseUrl = baseUrl.replace('/api', '');
    console.log('🔧 DistanceService initialized:', {
      originalUrl: API_CONFIG.baseUrl,
      processedUrl: this.baseUrl
    });
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Get token from AsyncStorage if not set
    if (!this.authToken) {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          this.authToken = token;
        }
      } catch (error) {
        console.warn('Failed to get auth token:', error);
      }
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      console.log('🔐 Auth token included in request');
    } else {
      console.warn('⚠️ No auth token available for distance API');
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'API request failed');
    }

    return data.data;
  }

  /**
   * Get real distance and duration between two points using Google Maps API
   * This connects to the backend's Google Maps Distance Matrix API for accurate road distances
   */
  async getDistance(origin: LocationCoords, destination: LocationCoords): Promise<DistanceResult> {
    try {
      // First try the backend API with Google Maps integration
      const url = `${this.baseUrl}/api/distance/calculate?origin_lat=${origin.lat}&origin_lng=${origin.lng}&destination_lat=${destination.lat}&destination_lng=${destination.lng}&mode=driving`;
      
      const response = await this.makeRequest(url, {
        method: 'GET',
      });
      
      // Backend returns the exact format we need
      return response;
      
    } catch (error) {
      console.warn('Backend distance API failed, using fallback calculation:', error);
      // Use smart fallback calculation when API fails
      return this.fallbackCalculation(origin, destination);
    }
  }

  /**
   * Get ETA with traffic and urgency factors using backend API
   */
  async getETA(origin: LocationCoords, destination: LocationCoords, urgency: 'routine' | 'urgent' | 'emergency' = 'routine'): Promise<DistanceResult> {
    try {
      // Try backend ETA API first (includes traffic data and urgency calculations)
      const url = `${this.baseUrl}/api/distance/eta?origin_lat=${origin.lat}&origin_lng=${origin.lng}&destination_lat=${destination.lat}&destination_lng=${destination.lng}&urgency=${urgency}`;
      
      const response = await this.makeRequest(url, {
        method: 'GET',
      });
      
      return response;
      
    } catch (error) {
      console.warn('Backend ETA API failed, using fallback:', error);
      // Use fallback calculation with urgency adjustments
      const baseResult = this.fallbackCalculation(origin, destination);
      
      // Apply urgency multipliers to ETA
      const urgencyMultiplier = urgency === 'emergency' ? 0.7 : urgency === 'urgent' ? 0.8 : 1.0;
      const adjustedETA = Math.round((baseResult.eta_minutes || 0) * urgencyMultiplier);
      
      return {
        ...baseResult,
        eta_minutes: adjustedETA,
        eta_timestamp: new Date(Date.now() + adjustedETA * 60000).toISOString(),
      };
    }
  }

  /**
   * Calculate estimated total distance for payment purposes
   * This matches the backend's calculation logic
   */
  async getEstimatedJobDistance(
    pickupLocation: LocationCoords, 
    deliveryLocation: LocationCoords,
    urgency: 'routine' | 'urgent' | 'emergency' = 'routine'
  ): Promise<DistanceResult & { estimated_payment: number }> {
    const distanceResult = await this.getDistance(pickupLocation, deliveryLocation);
    
    // Payment calculation (matches backend logic)
    const baseRatePerKm = 50; // Rs. 50 per km base rate
    const urgencyMultiplier = urgency === 'emergency' ? 2 : urgency === 'urgent' ? 1.5 : 1;
    const estimatedPayment = parseFloat(distanceResult.distance_km) * baseRatePerKm * urgencyMultiplier;

    return {
      ...distanceResult,
      estimated_payment: Math.round(estimatedPayment),
    };
  }

  /**
   * Smart fallback calculation using Haversine formula (matches backend exactly)
   */
  private fallbackCalculation(origin: LocationCoords, destination: LocationCoords): DistanceResult {
    const distance = this.calculateHaversineDistance(
      origin.lat, 
      origin.lng, 
      destination.lat, 
      destination.lng
    );

    // Sri Lankan traffic-aware speed calculation (matches backend exactly)
    let avgSpeedKmh: number;
    if (distance <= 5) {
      avgSpeedKmh = 25; // Colombo city traffic
    } else if (distance <= 15) {
      avgSpeedKmh = 35; // Suburban areas
    } else {
      avgSpeedKmh = 45; // Highway/expressway
    }

    const baseDurationMinutes = (distance / avgSpeedKmh) * 60;
    // Sri Lankan traffic factor: 30% additional time for traffic
    const trafficDurationMinutes = baseDurationMinutes * 1.3;

    // Buffer calculations (matches backend)
    const bufferMinutes = 10; // Standard buffer
    const assignmentMinutes = 5; // Time for rider assignment
    const pickupMinutes = 3; // Time at pickup location
    const totalMinutes = Math.round(trafficDurationMinutes) + bufferMinutes + assignmentMinutes + pickupMinutes;

    return {
      distance_km: distance.toFixed(2),
      duration_minutes: Math.round(baseDurationMinutes),
      duration_in_traffic_minutes: Math.round(trafficDurationMinutes),
      distance_text: `${distance.toFixed(1)} km`,
      duration_text: `${Math.round(baseDurationMinutes)} min`,
      duration_in_traffic_text: `${Math.round(trafficDurationMinutes)} min`,
      api_used: 'haversine_fallback',
      fallback: true,
      eta_minutes: totalMinutes,
      eta_timestamp: new Date(Date.now() + totalMinutes * 60000).toISOString(),
      breakdown: {
        travel_minutes: Math.round(trafficDurationMinutes),
        buffer_minutes: bufferMinutes,
        assignment_minutes: assignmentMinutes,
        pickup_minutes: pickupMinutes,
        total_minutes: totalMinutes,
      },
    };
  }

  /**
   * Calculate Haversine distance (same formula as backend)
   */
  private calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Get route directions with polyline for map visualization
   */
  async getDirections(origin: LocationCoords, destination: LocationCoords): Promise<DistanceResult & { route: Array<{ latitude: number; longitude: number }>; polyline: string; start_address?: string; end_address?: string }> {
    try {
      // Try backend directions API first
      const url = `${this.baseUrl}/api/distance/directions?origin_lat=${origin.lat}&origin_lng=${origin.lng}&destination_lat=${destination.lat}&destination_lng=${destination.lng}`;
      
      console.log('🌐 Directions API URL:', url);
      console.log('🔧 Base URL:', this.baseUrl);
      
      const response = await this.makeRequest(url, {
        method: 'GET',
      });
      
      return response;
      
    } catch (error) {
      console.warn('Backend directions API failed, using fallback:', error);
      // Use fallback with simple straight line
      const baseResult = this.fallbackCalculation(origin, destination);
      
      return {
        ...baseResult,
        route: [
          { latitude: origin.lat, longitude: origin.lng },
          { latitude: destination.lat, longitude: destination.lng }
        ],
        polyline: '',
        start_address: `${origin.lat}, ${origin.lng}`,
        end_address: `${destination.lat}, ${destination.lng}`,
      };
    }
  }

  /**
   * Check if backend distance API is available
   */
  async checkServiceStatus(): Promise<{ available: boolean; provider: string; configured: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/distance/status`);
      const data = await response.json();
      
      return {
        available: data.success,
        configured: data.data?.configured || false,
        provider: data.data?.api_provider || 'haversine_fallback',
      };
    } catch (error) {
      console.warn('Distance service status check failed:', error);
      return {
        available: false,
        configured: false,
        provider: 'haversine_fallback',
      };
    }
  }
}

export const distanceService = new DistanceService();