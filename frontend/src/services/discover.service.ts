import { api } from './api';
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';
import type { PublicUser } from './social.service';

export interface DiscoverFilters {
  maxDistance?: number;
  minAge?: number;
  maxAge?: number;
  gender?: 'male' | 'female' | 'other';
  relationshipStatus?: string;
  lookingFor?: string;
  motherTongue?: string;
  religion?: string;
  country?: string;
  grewUpCity?: string;
  photoOnly?: boolean;
  verifiedOnly?: boolean;
}

export interface NearbyUser extends PublicUser {
  distance: number | null;
  photos: { id: string; url: string; order: number }[];
  sameHometown: boolean;
  isFavorite: boolean;
}

export interface DiscoverPage {
  users: NearbyUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type DiscoverList = 'nearby' | 'recently-online' | 'new-users';

/** Drop empty values so the API's strict validation never sees blank params. */
function cleanParams(filters: DiscoverFilters): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    out[key] = value as string | number | boolean;
  }
  return out;
}

const DiscoverService = {
  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      return status === 'granted';
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'NRI Friends needs your location to show friends nearby.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  },

  getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      );
    });
  },

  async updateLocation(): Promise<boolean> {
    try {
      const hasPermission = await DiscoverService.requestLocationPermission();
      if (!hasPermission) return false;
      const coords = await DiscoverService.getCurrentPosition();
      await api.patch('/discover/location', coords);
      return true;
    } catch {
      // Silent — location is optional
      return false;
    }
  },

  async getList(list: DiscoverList, filters: DiscoverFilters = {}, page = 1, limit = 10): Promise<DiscoverPage> {
    const { data } = await api.get(`/discover/${list}`, {
      params: { ...cleanParams(filters), page, limit },
    });
    return data;
  },

  getNearby(filters: DiscoverFilters = {}, page = 1): Promise<DiscoverPage> {
    return DiscoverService.getList('nearby', filters, page);
  },

  async passUser(userId: string): Promise<void> {
    await api.post(`/discover/pass/${userId}`);
  },
};

export default DiscoverService;
