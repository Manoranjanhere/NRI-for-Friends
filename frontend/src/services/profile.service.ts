import { api } from './api';
import type { PublicUser, InterestSummary, Paged } from './social.service';

export interface UserPhoto {
  id: string;
  url: string;
  order: number;
  isPrimary?: boolean;
}

export interface ProfileUser extends PublicUser {
  photos: UserPhoto[];
  hasLiked: boolean;
  likedMe: boolean;
  isFriend: boolean;
  isSuperLike?: boolean;
  complimentMessage?: string | null;
  isFavorite: boolean;
  interestSent: InterestSummary | null;
  interestReceived: InterestSummary | null;
  sameHometown: boolean;
  isOwnProfile: boolean;
  blockedByMe: boolean;
}

export interface ListedUser extends PublicUser {
  likedAt?: string;
  matchedAt?: string;
  favoritedAt?: string;
  visitedAt?: string;
  visitCount?: number;
  isSuperLike?: boolean;
  complimentMessage?: string | null;
}

const ProfileService = {
  async getFullProfile(userId: string): Promise<ProfileUser> {
    const { data } = await api.get(`/likes/profile/${userId}`);
    return data;
  },

  async toggleLike(userId: string): Promise<{ liked: boolean; isMatch: boolean }> {
    const { data } = await api.post(`/likes/${userId}`);
    return data;
  },

  async superLike(userId: string, message?: string): Promise<{ liked: boolean; isMatch: boolean }> {
    const { data } = await api.post(`/likes/${userId}/super-like`, { message });
    return data;
  },

  async sendCompliment(userId: string, message: string): Promise<{ sent: boolean; messageId: string }> {
    const { data } = await api.post(`/likes/${userId}/compliment`, { message });
    return data;
  },

  async getYouLiked(page = 1, limit = 20): Promise<Paged<ListedUser>> {
    const { data } = await api.get('/likes/you-liked', { params: { page, limit } });
    return data;
  },

  async getLikedBy(page = 1, limit = 20): Promise<Paged<ListedUser>> {
    const { data } = await api.get('/likes/liked-by', { params: { page, limit } });
    return data;
  },

  async getUnseenLikedByCount(): Promise<number> {
    const { data } = await api.get<{ count: number }>('/likes/liked-by/unseen-count');
    return data.count;
  },

  async markLikedBySeen(): Promise<void> {
    await api.post('/likes/liked-by/mark-seen');
  },

  async getMatches(page = 1, limit = 20): Promise<Paged<ListedUser>> {
    const { data } = await api.get('/likes/matches', { params: { page, limit } });
    return data;
  },

  async reportUser(userId: string, reason: string, description?: string, reportedPhotoId?: string) {
    const { data } = await api.post(`/reports/${userId}`, {
      reason,
      description,
      reportedPhotoId,
    });
    return data;
  },
};

export default ProfileService;
