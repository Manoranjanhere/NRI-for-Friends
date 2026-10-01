import { create } from 'zustand';
import MessageService from '../services/message.service';
import ProfileService from '../services/profile.service';
import SocialService from '../services/social.service';

interface BadgesState {
  unreadMessages: number;
  pendingInterests: number;
  unseenLikes: number;
  refresh: () => Promise<void>;
  set: (patch: Partial<Pick<BadgesState, 'unreadMessages' | 'pendingInterests' | 'unseenLikes'>>) => void;
}

export const useBadgesStore = create<BadgesState>((set) => ({
  unreadMessages: 0,
  pendingInterests: 0,
  unseenLikes: 0,
  refresh: async () => {
    const [messages, interests, likes] = await Promise.allSettled([
      MessageService.getUnreadCount(),
      SocialService.getPendingCount(),
      ProfileService.getUnseenLikedByCount(),
    ]);
    set((s) => ({
      unreadMessages: messages.status === 'fulfilled' ? messages.value : s.unreadMessages,
      pendingInterests: interests.status === 'fulfilled' ? interests.value : s.pendingInterests,
      unseenLikes: likes.status === 'fulfilled' ? likes.value : s.unseenLikes,
    }));
  },
  set: (patch) => set(patch),
}));
