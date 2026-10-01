import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type UserListKind =
  | 'favorites'
  | 'favorited-by'
  | 'viewers'
  | 'visited'
  | 'liked-by'
  | 'you-liked'
  | 'friends'
  | 'recently-online'
  | 'new-users'
  | 'blocked';

export type MainTabParamList = {
  FeedTab: undefined;
  DiscoverTab: undefined;
  PeopleTab: undefined;
  InterestsTab: undefined;
  InboxTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  PhoneEntry: undefined;
  OtpVerify: { phone: string };
  Stage1: undefined;
  Stage2: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  EditProfile: undefined;
  ProfileDetail: { userId: string };
  UserList: { kind: UserListKind };
  Subscription: undefined;
  Coins: undefined;
  PhotoVerification: undefined;
  AccountSettings: undefined;
  AdminPanel: undefined;
  ChatConversation: { userId: string; userName?: string };
};

type TabProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

// Typed props for every screen — import these in each screen file
export type WelcomeScreenProps        = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
export type PhoneEntryScreenProps     = NativeStackScreenProps<RootStackParamList, 'PhoneEntry'>;
export type OtpVerifyScreenProps      = NativeStackScreenProps<RootStackParamList, 'OtpVerify'>;
export type Stage1ScreenProps         = NativeStackScreenProps<RootStackParamList, 'Stage1'>;
export type EditProfileScreenProps    = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;
export type Stage2ScreenProps         = NativeStackScreenProps<RootStackParamList, 'Stage2'>;
export type ProfileDetailScreenProps  = NativeStackScreenProps<RootStackParamList, 'ProfileDetail'>;
export type UserListScreenProps       = NativeStackScreenProps<RootStackParamList, 'UserList'>;
export type SubscriptionScreenProps   = NativeStackScreenProps<RootStackParamList, 'Subscription'>;
export type CoinsScreenProps          = NativeStackScreenProps<RootStackParamList, 'Coins'>;
export type PhotoVerificationProps    = NativeStackScreenProps<RootStackParamList, 'PhotoVerification'>;
export type AccountSettingsProps      = NativeStackScreenProps<RootStackParamList, 'AccountSettings'>;
export type AdminPanelProps           = NativeStackScreenProps<RootStackParamList, 'AdminPanel'>;
export type ChatConversationProps     = NativeStackScreenProps<RootStackParamList, 'ChatConversation'>;

export type FeedScreenProps           = TabProps<'FeedTab'>;
export type DiscoverScreenProps       = TabProps<'DiscoverTab'>;
export type PeopleScreenProps         = TabProps<'PeopleTab'>;
export type InterestsScreenProps      = TabProps<'InterestsTab'>;
export type InboxScreenProps          = TabProps<'InboxTab'>;
export type MyProfileScreenProps      = TabProps<'ProfileTab'>;
