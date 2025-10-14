// Types for TransFleet Rider App
export interface User {
  id: string;
  phone: string;
  user_type: 'rider';
  status: 'pending_registration' | 'pending_hospital_approval' | 'pending_hq_approval' | 'active' | 'inactive' | 'suspended';
  profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface RiderProfile {
  id: string;
  user_id: string;
  hospital_id?: string;
  rider_name: string;
  phone: string;
  nic: string;
  address: string;
  city: string;
  province: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  vehicle_type: 'motorcycle' | 'car' | 'van' | 'bicycle';
  vehicle_make: string;
  vehicle_model: string;
  vehicle_registration: string;
  license_number: string;
  license_expiry: string;
  insurance_number: string;
  insurance_expiry: string;
  license_image_url?: string;
  nic_image_url?: string;
  profile_image_url?: string;
  availability_status: 'available' | 'busy' | 'offline' | 'on_break';
  rating: number;
  total_deliveries: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: string;
  network_id: string;
  hospital_type: 'main' | 'regional';
  name: string;
  address: string;
  city: string;
  province: string;
  contact_phone: string;
  email: string;
  coordinates_lat: number;
  coordinates_lng: number;
  hospital_code: string;
  main_hospital_id?: string;
  is_main_hospital: boolean;
  status: string;
  distance?: number;
  rating?: number;
  delivery_count?: number;
}

export interface Order {
  id: string;
  order_number: string;
  center_id: string;
  hospital_id: string;
  rider_id?: string;
  sample_type: string;
  sample_quantity: number;
  urgency: 'routine' | 'urgent' | 'emergency';
  special_instructions?: string;
  status: string;
  pickup_location_lat: number;
  pickup_location_lng: number;
  delivery_location_lat: number;
  delivery_location_lng: number;
  estimated_distance_km: number;
  estimated_payment: number;
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
  created_at: string;
  updated_at: string;
}

export interface QRCode {
  id: string;
  qr_id: string;
  qr_type: 'pickup' | 'delivery' | 'handover' | 'combined';
  order_id?: string;
  center_id?: string;
  hospital_id?: string;
  sample_type?: string;
  urgency?: string;
  security_hash: string;
  qr_data_json: any;
  status: string;
  expires_at?: string;
  created_at: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export interface RegistrationFormData {
  // Personal Details
  full_name: string;
  phone: string;
  nic: string;
  date_of_birth: string;
  address: string;
  emergency_contact: string;
  
  // Vehicle Details
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  insurance_valid_until: string;
  
  // Experience
  delivery_experience: string;
  areas_known: string[];
  
  // Hospital Affiliation
  main_hospital_id?: string;
  regional_hospital_ids: string[];
  
  // Images
  profile_image?: string;
  license_image_front?: string;
  license_image_back?: string;
  nic_image_front?: string;
  nic_image_back?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
}

export interface NavigationState {
  currentScreen: string;
  registrationStep: number;
  isLoading: boolean;
}