import { api } from './api';

export type FeedActionTarget =
  | 'DiscoverTab'
  | 'PeopleTab'
  | 'InterestsTab'
  | 'InboxTab'
  | 'ProfileTab'
  | 'EditProfile'
  | 'PhotoVerification'
  | 'Subscription'
  | 'AccountSettings';

export interface FeedItem {
  id: string;
  type: 'welcome' | 'guide';
  emoji: string;
  title: string;
  body: string;
  steps?: string[];
  action?: { label: string; target: FeedActionTarget };
}

const FeedService = {
  async getFeed(): Promise<{ enabled: boolean; items: FeedItem[] }> {
    const { data } = await api.get('/feed');
    return data;
  },

  async getStatus(): Promise<boolean> {
    const { data } = await api.get<{ enabled: boolean }>('/feed/status');
    return !!data.enabled;
  },

  async setEnabled(enabled: boolean): Promise<boolean> {
    const { data } = await api.patch<{ enabled: boolean }>('/admin/feed', { enabled });
    return !!data.enabled;
  },
};

export default FeedService;
