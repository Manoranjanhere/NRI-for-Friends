// Allowed values for NRI Friends profile fields. The mobile app mirrors these in
// frontend/src/constants/profileOptions.ts — keep both lists in sync.

export const RELATIONSHIP_STATUSES = [
  'single',
  'in_relationship',
  'married',
  'divorced',
  'separated',
  'widowed',
  'prefer_not_to_say',
] as const;

export const LOOKING_FOR_OPTIONS = [
  'friendship',
  'hangouts',
  'festivals_events',
  'travel_buddy',
  'sports_fitness',
  'language_exchange',
] as const;

export const INTERESTED_IN_OPTIONS = ['male', 'female', 'everyone'] as const;

export const MOTHER_TONGUES = [
  'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu', 'Gujarati', 'Kannada',
  'Odia', 'Malayalam', 'Punjabi', 'Assamese', 'Maithili', 'Konkani', 'Sindhi',
  'Kashmiri', 'Nepali', 'Tulu', 'English', 'Other',
] as const;

export const RELIGIONS = [
  'Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Jewish',
  'Spiritual', 'No religion', 'Other', 'Prefer not to say',
] as const;

export const EDUCATION_LEVELS = [
  'High school', 'Diploma', "Bachelor's", "Master's", 'Doctorate',
  'Professional degree', 'Other',
] as const;

export const PROFESSIONS = [
  'IT & Software', 'Healthcare', 'Finance & Banking', 'Engineering', 'Education',
  'Business / Self-employed', 'Government', 'Legal', 'Hospitality', 'Retail',
  'Media & Arts', 'Research & Science', 'Student', 'Homemaker', 'Not working', 'Other',
] as const;

export const PASSIONS = [
  'Painting', 'Dancing', 'Singing', 'Music', 'Cooking', 'Travel', 'Photography',
  'Reading', 'Writing', 'Cricket', 'Football', 'Badminton', 'Yoga', 'Gym & Fitness',
  'Running', 'Hiking', 'Cycling', 'Swimming', 'Movies', 'Bollywood', 'Gaming',
  'Tech', 'Startups', 'Volunteering', 'Gardening', 'Fashion', 'Foodie',
  'Board games', 'Meditation', 'Pets',
] as const;

export const MAX_PASSIONS = 5;
export const MAX_LOOKING_FOR = 3;
export const MIN_HEIGHT_CM = 120;
export const MAX_HEIGHT_CM = 220;
