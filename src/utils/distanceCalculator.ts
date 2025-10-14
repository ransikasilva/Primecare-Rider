import { locationService } from '../services/locationService';
import { apiService } from '../services/api';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface DistanceResult {
  distance: number; // in km
  duration: number; // in minutes
  formatted_distance: string;
  formatted_duration: string;
}

/**
 * Calculate real distance and time using Google Maps API
 * from rider's current location to destination
 */
export const getRealDistanceAndTime = async (
  destination: Location,
  urgency?: string
): Promise<DistanceResult | null> => {
  try {
    const currentLocation = await locationService.getCurrentLocation();
    if (!currentLocation) return null;

    const origin = {
      lat: currentLocation.coords.latitude,
      lng: currentLocation.coords.longitude
    };

    const dest = {
      lat: destination.latitude,
      lng: destination.longitude
    };

    // Use Google Maps API for accurate distance and ETA
    const [distanceResponse, etaResponse] = await Promise.all([
      apiService.calculateDistance(origin, dest),
      apiService.calculateETA(origin, dest, urgency)
    ]);

    if (distanceResponse.success && etaResponse.success) {
      const distanceData = distanceResponse.data;
      const etaData = etaResponse.data;

      return {
        distance: parseFloat(distanceData.distance_km || 0),
        duration: parseInt(etaData.duration_minutes || etaData.duration_in_traffic_minutes || 0),
        formatted_distance: distanceData.distance_text || `${distanceData.distance_km || 0} km`,
        formatted_duration: etaData.duration_text || etaData.duration_in_traffic_text || `${etaData.duration_minutes || 0} min`
      };
    }

    return null;
  } catch (error) {
    console.error('Error calculating real distance and time:', error);
    return null;
  }
};

/**
 * Calculate distance from rider's current location to pickup point using Google Maps
 */
export const getDistanceToPickup = async (pickupLocation: Location, urgency?: string): Promise<DistanceResult | null> => {
  return getRealDistanceAndTime(pickupLocation, urgency);
};

/**
 * Calculate distance from rider's current location to delivery point using Google Maps
 */
export const getDistanceToDelivery = async (deliveryLocation: Location, urgency?: string): Promise<DistanceResult | null> => {
  return getRealDistanceAndTime(deliveryLocation, urgency);
};

/**
 * Get formatted distance string
 */
export const formatDistance = (distanceResult: DistanceResult | null): string => {
  if (!distanceResult) return 'Calculating...';
  return distanceResult.formatted_distance;
};

/**
 * Get formatted time string
 */
export const formatTime = (distanceResult: DistanceResult | null): string => {
  if (!distanceResult) return 'Calculating...';
  return distanceResult.formatted_duration;
};

/**
 * Fallback distance calculation using Haversine formula (if Google API fails)
 */
export const calculateHaversineDistance = (point1: Location, point2: Location): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) * Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

// Helper function to convert degrees to radians
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};