import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_CONFIG, APP_SETTINGS, isDevelopment } from '../config/environment';

// API Configuration from environment
const API_BASE_URL = API_CONFIG.baseUrl;
const API_TIMEOUT = API_CONFIG.timeout;

// Log configuration in development
if (isDevelopment()) {
  console.log('🔗 API Base URL:', API_BASE_URL);
  console.log('⏱️ API Timeout:', API_TIMEOUT, 'ms');
}

// Types
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

interface UserProfile {
  id: string;
  phone: string;
  user_type: string;
  status: string;
  profile_complete: boolean;
  auth_method: string;
  // Rider-specific fields (when user_type is 'rider')
  rider_name?: string;
  email?: string;
  nic?: string;
  address?: string;
  city?: string;
  province?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  vehicle_type?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_registration?: string;
  license_number?: string;
  license_expiry?: string;
  insurance_number?: string;
  insurance_expiry?: string;
  availability_status?: string;
  rating?: number;
  total_deliveries?: number;
  total_km?: number;
  hospital_id?: string;
}

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(
    async (config) => {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = await AsyncStorage.getItem('refresh_token');
          if (refreshToken) {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
              refresh_token: refreshToken,
            });

            if (response.data.success) {
              const { access_token, refresh_token } = response.data.data;
              await AsyncStorage.setItem('access_token', access_token);
              await AsyncStorage.setItem('refresh_token', refresh_token);
              
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return client(originalRequest);
            }
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_profile']);
          // You might want to emit an event here to redirect to login
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = createApiClient();
  }

  // Authentication Methods
  async sendOTP(phone: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/auth/mobile/send-otp', {
        phone,
        user_type: 'rider',
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async devBypassLogin(phone: string): Promise<ApiResponse<{ access_token: string; refresh_token: string; user: UserProfile; expires_at: string }>> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/auth/dev-bypass', {
        phone,
        user_type: 'rider',
      });

      // Store tokens if login successful
      if (response.data.success && response.data.data) {
        const { access_token, refresh_token, user } = response.data.data;
        await AsyncStorage.multiSet([
          ['access_token', access_token],
          ['refresh_token', refresh_token],
          ['user_profile', JSON.stringify(user)],
        ]);
      }

      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async verifyOTP(otp_id: string, otp_code: string, phone: string): Promise<ApiResponse<{ access_token: string; refresh_token: string; user: UserProfile; expires_at: string }>> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/auth/mobile/verify-otp', {
        otp_id,
        otp_code,
        phone,
      });

      // Store tokens if verification successful
      if (response.data.success && response.data.data) {
        const { access_token, refresh_token, user } = response.data.data;
        await AsyncStorage.multiSet([
          ['access_token', access_token],
          ['refresh_token', refresh_token],
          ['user_profile', JSON.stringify(user)],
        ]);
      }

      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local storage
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_profile']);
    }
  }

  // Rider Profile Methods
  async updateRiderProfile(formData: FormData): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.put('/riders/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getRiderProfile(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/profile');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getProfile(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/profile');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getRiderCurrentLocation(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/riders/current-location');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Hospital Methods
  async getAvailableHospitals(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/riders/hospitals');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getHospitalsByCode(code: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get(`/riders/hospitals/by-code/${code}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // File Upload Methods
  async uploadImage(imageUri: string, fieldName: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append(fieldName, {
        uri: imageUri,
        type: 'image/jpeg',
        name: `${fieldName}.jpg`,
      } as any);

      const response = await this.client.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        return response.data.data.url;
      } else {
        throw new Error(response.data.error?.message || 'Upload failed');
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Job Management Methods
  async getMyOrders(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/riders/my-orders');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getOrderDetails(orderId: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get(`/orders/${orderId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateOrderStatus(orderId: string, status: string, location?: { latitude: number; longitude: number }): Promise<ApiResponse> {
    try {
      const payload: any = { status };
      if (location) {
        payload.location = location;
      }
      
      const response: AxiosResponse<ApiResponse> = await this.client.put(`/orders/${orderId}/status`, payload);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async trackOrderLocation(orderId: string, latitude: number, longitude: number): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post(`/orders/${orderId}/track-location`, {
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async acceptJob(orderId: string): Promise<ApiResponse> {
    try {
      // Call backend to assign order to rider
      const response: AxiosResponse<ApiResponse> = await this.client.post(`/orders/${orderId}/accept`);

      // Store accepted job locally for immediate state management
      await AsyncStorage.setItem(`accepted_job_${orderId}`, JSON.stringify({
        jobId: orderId,
        acceptedAt: new Date().toISOString(),
        status: 'assigned'
      }));

      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // ===== SEQUENTIAL OFFER SYSTEM =====

  /**
   * Get active job offers for current rider
   */
  async getMyOffers(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/orders/my-offers');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get multi-parcel offers for rider
   */
  async getMyMultiParcelOffers(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/multi-parcel-offers/my-offers');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Accept multi-parcel offer
   */
  async acceptMultiParcelOffer(offerId: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/multi-parcel-offers/accept', {
        offerId
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Reject multi-parcel offer
   */
  async rejectMultiParcelOffer(offerId: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/multi-parcel-offers/reject', {
        offerId
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Accept a job offer (new sequential system)
   */
  async acceptOffer(orderId: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post(`/orders/${orderId}/accept-offer`);

      // Store accepted job locally
      await AsyncStorage.setItem(`accepted_job_${orderId}`, JSON.stringify({
        jobId: orderId,
        acceptedAt: new Date().toISOString(),
        status: 'assigned'
      }));

      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Reject a job offer
   */
  async rejectOffer(orderId: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post(`/orders/${orderId}/reject-offer`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getJobStatus(orderId: string): Promise<{ isAccepted: boolean; status?: string; riderId?: string }> {
    try {
      // Check local storage first for immediate response
      const storedJob = await AsyncStorage.getItem(`accepted_job_${orderId}`);
      if (storedJob) {
        const jobData = JSON.parse(storedJob);
        return { isAccepted: true, status: jobData.status };
      }
      
      // Check with backend for real status
      const response = await this.getOrderDetails(orderId);
      if (response.success && response.data) {
        const order = response.data.order || response.data;
        const isAssigned = order.rider_id && ['assigned', 'pickup_started', 'picked_up', 'delivery_started', 'delivered'].includes(order.status);
        return { 
          isAccepted: isAssigned, 
          status: order.status,
          riderId: order.rider_id 
        };
      }
      
      return { isAccepted: false };
    } catch (error: any) {
      return { isAccepted: false };
    }
  }

  // QR Code Methods
  async scanQR(qrData: string, scanType: string, location?: { latitude: number; longitude: number }): Promise<ApiResponse> {
    try {
      const payload: any = {
        qr_data: qrData,
        scan_type: scanType,
        timestamp: new Date().toISOString(),
      };

      if (location) {
        payload.scan_location = 'GPS Location';
        payload.coordinates = {
          lat: location.latitude,
          lng: location.longitude,
        };
      }

      const response: AxiosResponse<ApiResponse> = await this.client.post('/qr/scan', payload);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async validateQR(qrData: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/qr/validate', {
        qr_data: qrData,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Handover Methods
  async initiateHandover(orderId: string, reason: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post(`/orders/${orderId}/initiate-handover`, {
        handover_reason: reason,
        location: {
          latitude: 0, // Will be updated with actual GPS
          longitude: 0,
        },
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getHandoverQRData(orderId: string): Promise<ApiResponse> {
    try {
      // Get all QR codes for the order and filter for handover type
      const response: AxiosResponse<ApiResponse> = await this.client.get(`/qr/order/${orderId}`);

      if (response.data.success && response.data.data) {
        const qrCodes = response.data.data;
        // Find the most recent handover QR code
        const handoverQR = qrCodes.find((qr: any) => qr.qr_type === 'handover' && qr.status === 'active');

        if (handoverQR) {
          return {
            success: true,
            message: 'Handover QR data retrieved successfully',
            data: {
              qr_data: handoverQR.qr_data_json,
              qr_id: handoverQR.qr_id,
              expires_at: handoverQR.expires_at,
              created_at: handoverQR.created_at
            }
          };
        } else {
          return {
            success: false,
            message: 'No active handover QR found for this order'
          };
        }
      }

      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getPendingHandovers(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/orders/handovers/pending');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async acceptHandover(orderId: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post(`/orders/${orderId}/accept-handover`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async confirmHandover(orderId: string, qrData: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post(`/orders/${orderId}/confirm-handover`, {
        qr_data: qrData,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Multi-parcel delivery methods
  async getAvailableRoutes(orderId: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get(`/orders/${orderId}/available-routes`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async generateCombinedQR(orderIds: string[], hospitalId: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/qr/generate/combined-delivery', {
        order_ids: orderIds,
        hospital_id: hospitalId,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async scanCombinedQR(qrData: string, location?: { latitude: number; longitude: number }): Promise<ApiResponse> {
    try {
      const payload: any = {
        qr_data: qrData,
        timestamp: new Date().toISOString(),
      };

      if (location) {
        payload.scan_location = 'GPS Location';
        payload.coordinates = {
          lat: location.latitude,
          lng: location.longitude,
        };
      }

      const response: AxiosResponse<ApiResponse> = await this.client.post('/qr/scan/combined-delivery', payload);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Performance and Profile Methods
  async getRiderPerformance(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/riders/performance');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Dashboard Statistics Methods - Using existing SLA endpoints
  async getDashboardStats(): Promise<ApiResponse> {
    try {
      // Use existing SLA metrics endpoint which has real database queries
      const response: AxiosResponse<ApiResponse> = await this.client.get('/sla/metrics');
      return {
        success: true,
        message: 'Dashboard stats retrieved successfully',
        data: {
          todayDistance: 0, // Will be calculated from rider data
          todayDeliveries: 0,
          pendingJobs: response.data.data?.current_delays || 0,
          monthlyDistance: 0,
          monthlyDeliveries: 0,
          kmTarget: 500,
          completionRate: response.data.data?.overall_sla || 0
        }
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getTodayStats(): Promise<ApiResponse> {
    try {
      // Use profile data to calculate today's stats
      const profile = await this.getProfile();
      return {
        success: true,
        message: 'Today stats retrieved successfully',
        data: {
          deliveries: profile.data?.total_deliveries || 0,
          distance: profile.data?.total_km || 0,
          onTime: Math.round((profile.data?.total_deliveries || 0) * 0.95),
          rating: parseFloat(profile.data?.rating || '0')
        }
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getMonthlyStats(): Promise<ApiResponse> {
    try {
      // Use profile data for monthly stats
      const profile = await this.getProfile();
      return {
        success: true,
        message: 'Monthly stats retrieved successfully',
        data: {
          deliveries: profile.data?.total_deliveries || 0,
          distance: profile.data?.total_km || 0,
          workingDays: 22,
          avgDeliveries: Math.round((profile.data?.total_deliveries || 0) / 22 * 10) / 10
        }
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }


  // Rider Availability Methods
  async updateRiderAvailability(isAvailable: boolean): Promise<ApiResponse> {
    try {
      const availabilityStatus = isAvailable ? 'available' : 'offline';
      const response: AxiosResponse<ApiResponse> = await this.client.put('/riders/status', {
        availability_status: availabilityStatus,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateAvailability(isAvailable: boolean): Promise<ApiResponse> {
    return this.updateRiderAvailability(isAvailable);
  }

  async getRiderAvailabilityStatus(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/riders/status');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getRegistrationStatus(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/riders/status');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getNearbyJobs(latitude?: number, longitude?: number): Promise<ApiResponse> {
    try {
      // Use the existing getMyOrders endpoint which gets rider's assigned orders
      const response: AxiosResponse<ApiResponse> = await this.client.get('/riders/my-orders');
      
      // Transform the data to match the expected format
      if (response.data.success && response.data.data) {
        const orders = response.data.data.orders || [];
        const jobs = orders.filter((order: any) => 
          order.status === 'pending_rider_assignment' || order.status === 'assigned'
        ).map((order: any) => ({
          id: order.id,
          hospital_name: order.hospital_name || 'Unknown Hospital',
          collection_center_name: order.center_name || 'Unknown Center',
          collection_center_location: order.center_location || 'Unknown Location',
          sample_type: order.sample_type || 'Samples',
          sample_quantity: order.sample_quantity || 1,
          urgency: order.urgency || 'routine',
          distance: order.distance || 0,
          estimated_pickup_time: order.estimated_time || 15,
          total_distance: order.total_distance || 0,
          created_at: order.created_at,
          order_number: order.order_number
        }));

        return {
          success: true,
          message: 'Nearby jobs retrieved successfully',
          data: { jobs }
        };
      }
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateRiderLocation(latitude: number, longitude: number, isAvailable: boolean): Promise<ApiResponse> {
    try {
      // Use /riders/status endpoint with location data
      const response: AxiosResponse<ApiResponse> = await this.client.put('/riders/status', {
        availability_status: isAvailable ? 'available' : 'offline',
        location: {
          lat: latitude,
          lng: longitude
        }
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Utility Methods
  async getStoredUser(): Promise<UserProfile | null> {
    try {
      const userStr = await AsyncStorage.getItem('user_profile');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  }

  async getStoredTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const [accessToken, refreshToken] = await AsyncStorage.multiGet([
        'access_token',
        'refresh_token',
      ]);

      if (accessToken[1] && refreshToken[1]) {
        return {
          accessToken: accessToken[1],
          refreshToken: refreshToken[1],
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.getStoredTokens();
    return !!tokens?.accessToken;
  }

  // Generic HTTP Methods
  async get(endpoint: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get(endpoint);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Rider Orders Methods

  // Location Tracking Methods
  async updateRiderStatus(availabilityStatus: string, location?: { lat: number; lng: number }): Promise<ApiResponse> {
    try {
      const payload: any = {
        availability_status: availabilityStatus
      };
      
      if (location) {
        payload.location = location;
      }

      const response: AxiosResponse<ApiResponse> = await this.client.put('/riders/status', payload);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }


  async trackLocation(orderId: string, latitude: number, longitude: number): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post(`/orders/${orderId}/track-location`, {
        location: {
          lat: latitude,
          lng: longitude
        },
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Google Maps Distance & ETA Methods
  async calculateDistance(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/distance/calculate', {
        params: {
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          destination_lat: destination.lat,
          destination_lng: destination.lng
        }
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async calculateETA(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, urgency?: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/distance/eta', {
        params: {
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          destination_lat: destination.lat,
          destination_lng: destination.lng,
          urgency: urgency || 'standard'
        }
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getDirections(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get('/distance/directions', {
        params: {
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          destination_lat: destination.lat,
          destination_lng: destination.lng
        }
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Rider Search Methods
  async searchRiderById(riderId: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get(`/riders/search/id/${riderId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async searchRiderByPhone(phone: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get(`/riders/search/phone/${phone}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async searchRiderByName(name: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.get(`/riders/search/name/${encodeURIComponent(name)}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Error handling
  private handleError(error: any): Error {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      return new Error(apiError.message || 'API request failed');
    }
    
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return new Error('Network connection failed. Please check your internet connection.');
    }
    
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout. Please try again.');
    }
    
    return new Error(error.message || 'An unexpected error occurred');
  }

  // ===== PUSH NOTIFICATIONS =====

  /**
   * Update rider's Expo Push Token
   */
  async updateExpoPushToken(riderId: string, expoPushToken: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.post('/riders/expo-push-token', {
        rider_id: riderId,
        expo_push_token: expoPushToken,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Remove rider's Expo Push Token (on logout)
   */
  async removeExpoPushToken(riderId: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.client.delete('/riders/expo-push-token', {
        data: { rider_id: riderId },
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;