// Mirrors backend/src/users/profile-options.ts — keep both lists in sync.

export interface Option {
  value: string;
  label: string;
  emoji?: string;
}

export const GENDERS: Option[] = [
  { value: 'male', label: 'Man', emoji: '👨' },
  { value: 'female', label: 'Woman', emoji: '👩' },
  { value: 'other', label: 'Other', emoji: '🌈' },
];

export const RELATIONSHIP_STATUSES: Option[] = [
  { value: 'single', label: 'Single' },
  { value: 'in_relationship', label: 'In a relationship' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'separated', label: 'Separated' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const LOOKING_FOR_OPTIONS: Option[] = [
  { value: 'friendship', label: 'Friendship', emoji: '🤝' },
  { value: 'hangouts', label: 'Weekend hangouts', emoji: '☕' },
  { value: 'festivals_events', label: 'Festivals & events', emoji: '🪔' },
  { value: 'travel_buddy', label: 'Travel buddy', emoji: '✈️' },
  { value: 'sports_fitness', label: 'Sports & fitness', emoji: '🏏' },
  { value: 'language_exchange', label: 'Language exchange', emoji: '🗣️' },
];

export const INTERESTED_IN_OPTIONS: Option[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
];

const toOptions = (values: readonly string[]): Option[] => values.map((v) => ({ value: v, label: v }));

export const MOTHER_TONGUES = toOptions([
  'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu', 'Gujarati', 'Kannada',
  'Odia', 'Malayalam', 'Punjabi', 'Assamese', 'Maithili', 'Konkani', 'Sindhi',
  'Kashmiri', 'Nepali', 'Tulu', 'English', 'Other',
]);

export const RELIGIONS = toOptions([
  'Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Jewish',
  'Spiritual', 'No religion', 'Other', 'Prefer not to say',
]);

export const EDUCATION_LEVELS = toOptions([
  'High school', 'Diploma', "Bachelor's", "Master's", 'Doctorate',
  'Professional degree', 'Other',
]);

export const PROFESSIONS = toOptions([
  'IT & Software', 'Healthcare', 'Finance & Banking', 'Engineering', 'Education',
  'Business / Self-employed', 'Government', 'Legal', 'Hospitality', 'Retail',
  'Media & Arts', 'Research & Science', 'Student', 'Homemaker', 'Not working', 'Other',
]);

export const PASSIONS: Option[] = [
  { value: 'Painting', label: 'Painting', emoji: '🎨' },
  { value: 'Dancing', label: 'Dancing', emoji: '💃' },
  { value: 'Singing', label: 'Singing', emoji: '🎤' },
  { value: 'Music', label: 'Music', emoji: '🎵' },
  { value: 'Cooking', label: 'Cooking', emoji: '🍳' },
  { value: 'Travel', label: 'Travel', emoji: '✈️' },
  { value: 'Photography', label: 'Photography', emoji: '📷' },
  { value: 'Reading', label: 'Reading', emoji: '📚' },
  { value: 'Writing', label: 'Writing', emoji: '✍️' },
  { value: 'Cricket', label: 'Cricket', emoji: '🏏' },
  { value: 'Football', label: 'Football', emoji: '⚽' },
  { value: 'Badminton', label: 'Badminton', emoji: '🏸' },
  { value: 'Yoga', label: 'Yoga', emoji: '🧘' },
  { value: 'Gym & Fitness', label: 'Gym & Fitness', emoji: '🏋️' },
  { value: 'Running', label: 'Running', emoji: '🏃' },
  { value: 'Hiking', label: 'Hiking', emoji: '🥾' },
  { value: 'Cycling', label: 'Cycling', emoji: '🚴' },
  { value: 'Swimming', label: 'Swimming', emoji: '🏊' },
  { value: 'Movies', label: 'Movies', emoji: '🎬' },
  { value: 'Bollywood', label: 'Bollywood', emoji: '🎞️' },
  { value: 'Gaming', label: 'Gaming', emoji: '🎮' },
  { value: 'Tech', label: 'Tech', emoji: '💻' },
  { value: 'Startups', label: 'Startups', emoji: '🚀' },
  { value: 'Volunteering', label: 'Volunteering', emoji: '🙌' },
  { value: 'Gardening', label: 'Gardening', emoji: '🌱' },
  { value: 'Fashion', label: 'Fashion', emoji: '👗' },
  { value: 'Foodie', label: 'Foodie', emoji: '🍛' },
  { value: 'Board games', label: 'Board games', emoji: '🎲' },
  { value: 'Meditation', label: 'Meditation', emoji: '🕉️' },
  { value: 'Pets', label: 'Pets', emoji: '🐾' },
];

export const MAX_PASSIONS = 5;
export const MAX_LOOKING_FOR = 3;
export const MIN_AGE = 18;
export const MAX_AGE = 80;
export const MIN_HEIGHT_CM = 120;
export const MAX_HEIGHT_CM = 220;
export const DEFAULT_HEIGHT_CM = 165;

/** Salary is stored as a display string, so ranges read naturally in any currency. */
export const SALARY_CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'AED', 'SGD'] as const;
export type SalaryCurrency = (typeof SALARY_CURRENCIES)[number];

const CURRENCY_SYMBOL: Record<SalaryCurrency, string> = {
  INR: '₹', USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$', AED: 'AED ', SGD: 'S$',
};

export function getSalaryRanges(currency: SalaryCurrency): string[] {
  const s = CURRENCY_SYMBOL[currency];
  if (currency === 'INR') {
    return ['Under ₹5 LPA', '₹5–10 LPA', '₹10–20 LPA', '₹20–35 LPA', '₹35–50 LPA', '₹50 LPA+'];
  }
  return [
    `Under ${s}30k / yr`,
    `${s}30–60k / yr`,
    `${s}60–100k / yr`,
    `${s}100–150k / yr`,
    `${s}150–250k / yr`,
    `${s}250k+ / yr`,
  ];
}

export function guessSalaryCurrency(salaryRange?: string | null, country?: string | null): SalaryCurrency {
  if (salaryRange) {
    if (salaryRange.includes('₹')) return 'INR';
    for (const c of SALARY_CURRENCIES) {
      const sym = CURRENCY_SYMBOL[c].trim();
      if (c !== 'USD' && salaryRange.includes(sym)) return c;
    }
    if (salaryRange.includes('$')) return 'USD';
  }
  const byCountry: Record<string, SalaryCurrency> = {
    india: 'INR', 'united states': 'USD', usa: 'USD', us: 'USD', 'united kingdom': 'GBP', uk: 'GBP',
    canada: 'CAD', australia: 'AUD', 'united arab emirates': 'AED', uae: 'AED', singapore: 'SGD',
    germany: 'EUR', france: 'EUR', netherlands: 'EUR', ireland: 'EUR', italy: 'EUR', spain: 'EUR',
  };
  return byCountry[(country || '').trim().toLowerCase()] ?? 'USD';
}

export function labelFor(options: Option[], value?: string | null): string {
  if (!value) return '';
  return options.find((o) => o.value === value)?.label ?? value;
}

export function formatHeight(cm?: number | null): string {
  if (!cm) return '';
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}" (${cm} cm)`;
}

export const INTEREST_EMOJIS = [
  { type: 'smile', emoji: '😊', label: 'Smile' },
  { type: 'rose', emoji: '🌹', label: 'Rose' },
  { type: 'coffee', emoji: '☕', label: 'Coffee' },
  { type: 'bear', emoji: '🧸', label: 'Teddy' },
] as const;
export type InterestType = (typeof INTEREST_EMOJIS)[number]['type'];

export function passionEmoji(value: string): string {
  return PASSIONS.find((p) => p.value === value)?.emoji ?? '✨';
}
