import { api } from './api';
import type { InterestType } from '../constants/profileOptions';

/** Profile fields the server shares with other members (see backend users/public-profile.ts). */
export interface PublicUser {
  id: string;
  name: string;
  age: number;
  gender: string;
  city: string;
  country: string;
  bio?: string | null;
  passions: string[];
  relationshipStatus?: string | null;
  lookingFor: string[];
  interestedIn?: string | null;
  motherTongue?: string | null;
  religion?: string | null;
  education?: string | null;
  profession?: string | null;
  jobProfile?: string | null;
  salaryRange?: string | null;
  heightCm?: number | null;
  grewUpCity?: string | null;
  photoVerifiedStatus?: string;
  subscriptionPlan?: string | null;
  lastActiveAt?: string | null;
  createdAt?: string;
  primaryPhoto?: string | null;
  distance?: number | null;
  sameHometown?: boolean;
  isFavorite?: boolean;
}

export interface Paged<T> {
  total: number;
  page: number;
  limit: number;
  pages: number;
  users?: T[];
  items?: T[];
}

export type InterestStatus = 'pending' | 'accepted' | 'rejected';

export interface InterestItem {
  id: string;
  type: InterestType;
  emoji: string;
  status: InterestStatus;
  createdAt: string;
  respondedAt: string | null;
  direction?: 'sent' | 'received';
  user: PublicUser;
}

export interface InterestSummary {
  id: string;
  type: InterestType;
  status: InterestStatus;
  createdAt: string;
}

const SocialService = {
  // ─── Favorites ──────────────────────────────────────────────────────────
  async toggleFavorite(userId: string): Promise<{ favorited: boolean }> {
    const { data } = await api.post(`/favorites/${userId}`);
    return data;
  },
  async getFavorites(page = 1, limit = 20): Promise<Paged<PublicUser>> {
    const { data } = await api.get('/favorites', { params: { page, limit } });
    return data;
  },
  async getFavoritedBy(page = 1, limit = 20): Promise<Paged<PublicUser>> {
    const { data } = await api.get('/favorites/favorited-by', { params: { page, limit } });
    return data;
  },

  // ─── Profile visits ─────────────────────────────────────────────────────
  async getViewers(page = 1, limit = 20): Promise<Paged<PublicUser>> {
    const { data } = await api.get('/visits/viewers', { params: { page, limit } });
    return data;
  },
  async getVisited(page = 1, limit = 20): Promise<Paged<PublicUser>> {
    const { data } = await api.get('/visits/visited', { params: { page, limit } });
    return data;
  },

  // ─── Interests ──────────────────────────────────────────────────────────
  async sendInterest(userId: string, type: InterestType): Promise<{
    autoAccepted: boolean;
    remainingToday: number | null;
  }> {
    const { data } = await api.post(`/interests/${userId}`, { type });
    return data;
  },
  async acceptInterest(interestId: string): Promise<void> {
    await api.post(`/interests/${interestId}/accept`);
  },
  async rejectInterest(interestId: string): Promise<void> {
    await api.post(`/interests/${interestId}/reject`);
  },
  async getReceived(page = 1, status?: InterestStatus, limit = 20): Promise<Paged<InterestItem>> {
    const { data } = await api.get('/interests/received', { params: { page, limit, status } });
    return data;
  },
  async getSent(page = 1, status?: InterestStatus, limit = 20): Promise<Paged<InterestItem>> {
    const { data } = await api.get('/interests/sent', { params: { page, limit, status } });
    return data;
  },
  async getHistory(page = 1, limit = 20): Promise<Paged<InterestItem>> {
    const { data } = await api.get('/interests/history', { params: { page, limit } });
    return data;
  },
  async getPendingCount(): Promise<number> {
    const { data } = await api.get<{ count: number }>('/interests/received/pending-count');
    return data.count;
  },

  // ─── Blocks ─────────────────────────────────────────────────────────────
  async toggleBlock(userId: string): Promise<{ blocked: boolean }> {
    const { data } = await api.post(`/blocks/${userId}`);
    return data;
  },
  async getBlocked(): Promise<Paged<PublicUser & { blockedAt: string }>> {
    const { data } = await api.get<(PublicUser & { blockedAt: string })[]>('/blocks');
    return { users: data, total: data.length, page: 1, limit: data.length, pages: 1 };
  },
};

export default SocialService;
