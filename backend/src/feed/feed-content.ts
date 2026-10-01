import { DAILY_FREE_INTERESTS, FREE_TRIAL_DAYS, MONTHLY_PRICE_INR, REFERRAL_REWARD_COINS } from '../subscriptions/subscription.constants';

/** Screens the app knows how to open from a feed card. Keep in sync with frontend FeedScreen. */
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

export const HOW_TO_USE_FEED: FeedItem[] = [
  {
    id: 'welcome',
    type: 'welcome',
    emoji: '🧡',
    title: 'Welcome to NRI Friends',
    body:
      'Meet Indians living near you — people to celebrate festivals with, grab chai, play cricket, ' +
      'travel or just talk in your own language. Here is how to get the most out of the app.',
  },
  {
    id: 'complete-profile',
    type: 'guide',
    emoji: '📝',
    title: 'Complete your profile',
    body: 'Complete profiles get far more interests and friend requests.',
    steps: [
      'Add at least 3 clear photos — your main photo should show your face.',
      'Fill in where you grew up so people from your hometown can find you.',
      'Pick up to 5 passions and what you are looking for.',
      'Write a short bio: what you do and what you enjoy on weekends.',
    ],
    action: { label: 'Edit profile', target: 'EditProfile' },
  },
  {
    id: 'discover',
    type: 'guide',
    emoji: '🧭',
    title: 'Discover people nearby',
    body: 'The Discover tab shows members close to you, one card at a time.',
    steps: [
      'Swipe right or tap 🤝 to connect, swipe left or tap ✕ to skip.',
      'Tap a card to see the full profile.',
      'Use 🎛️ Filters for distance, age, mother tongue, hometown and more.',
      'Look for the 🏡 badge — it means you grew up in the same city.',
    ],
    action: { label: 'Start discovering', target: 'DiscoverTab' },
  },
  {
    id: 'interests',
    type: 'guide',
    emoji: '💌',
    title: 'Send an interest',
    body: `A quick, friendly hello. Interests are free — you can send ${DAILY_FREE_INTERESTS} every day.`,
    steps: [
      'Open a profile and tap 😊 Smile, 🌹 Rose, ☕ Coffee or 🧸 Teddy.',
      'It lands in their inbox and their Interests tab.',
      'They can accept or decline — you will see the status under Interests → Sent.',
      'If both of you send an interest, it is accepted automatically.',
    ],
    action: { label: 'Open Interests', target: 'InterestsTab' },
  },
  {
    id: 'friends-chat',
    type: 'guide',
    emoji: '🤝',
    title: 'Become friends and chat',
    body: 'When you both tap Connect, you become friends and can start chatting.',
    steps: [
      'See your friends under People → Friends.',
      'Send a 💝 compliment or 🌟 super like to stand out.',
      'All your chats are in the Messages tab.',
    ],
    action: { label: 'Open Messages', target: 'InboxTab' },
  },
  {
    id: 'people',
    type: 'guide',
    emoji: '👥',
    title: 'Keep track in People',
    body: 'Everything about who you have met lives in the People tab.',
    steps: [
      'Recently online and New members — great places to start.',
      'Save anyone with ⭐ Favorite and find them in My favorites.',
      'See who viewed your profile, who favorited you and who wants to connect.',
    ],
    action: { label: 'Open People', target: 'PeopleTab' },
  },
  {
    id: 'membership',
    type: 'guide',
    emoji: '🎁',
    title: `${FREE_TRIAL_DAYS} days free, then ₹${MONTHLY_PRICE_INR}/month`,
    body:
      `Every new member gets ${FREE_TRIAL_DAYS} days of Premium free — no card needed. After that, ` +
      `connecting, messaging, super likes and compliments need Premium (₹${MONTHLY_PRICE_INR}/month, same for everyone). ` +
      'Your profile, discovering, favorites and interests stay free.',
    action: { label: 'See Premium', target: 'Subscription' },
  },
  {
    id: 'invite',
    type: 'guide',
    emoji: '🎉',
    title: 'Invite friends, earn coins',
    body:
      `Share your referral code from the Profile tab. When a friend joins with it, you both get ${REFERRAL_REWARD_COINS} coins ` +
      'to use on super likes, compliments and extra chats.',
    action: { label: 'Get my code', target: 'ProfileTab' },
  },
  {
    id: 'verify',
    type: 'guide',
    emoji: '✅',
    title: 'Get verified',
    body: 'Take a quick selfie to earn the ✅ badge. Verified members get more replies and others trust them more.',
    action: { label: 'Verify my photo', target: 'PhotoVerification' },
  },
  {
    id: 'safety',
    type: 'guide',
    emoji: '🛡️',
    title: 'Stay safe',
    body: 'NRI Friends is for friendship. Treat everyone with respect.',
    steps: [
      'Meet new friends in public places first.',
      'Never share bank details or send money to someone you met here.',
      'Use 🚩 Report on a profile for fake profiles, spam or harassment.',
      'Use 🚫 Block to stop someone from seeing or contacting you.',
      'Hide your profile or manage blocked members in Settings & privacy.',
    ],
    action: { label: 'Settings & privacy', target: 'AccountSettings' },
  },
];
