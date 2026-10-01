import { create } from 'zustand';
import SubscriptionService from '../services/subscription.service';
import FeedService from '../services/feed.service';

interface FeatureFlagsState {
  paidFeaturesDisabled: boolean;
  feedEnabled: boolean;
  loaded: boolean;
  fetchFlags: () => Promise<void>;
  setFeedEnabled: (enabled: boolean) => void;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set) => ({
  paidFeaturesDisabled: false,
  feedEnabled: false,
  loaded: false,
  fetchFlags: async () => {
    const [flags, feed] = await Promise.allSettled([
      SubscriptionService.getFeatureFlags(),
      FeedService.getStatus(),
    ]);
    set((s) => ({
      paidFeaturesDisabled: flags.status === 'fulfilled' ? !!flags.value.paidFeaturesDisabled : s.paidFeaturesDisabled,
      feedEnabled: feed.status === 'fulfilled' ? feed.value : s.feedEnabled,
      loaded: true,
    }));
  },
  setFeedEnabled: (enabled) => set({ feedEnabled: enabled }),
}));
