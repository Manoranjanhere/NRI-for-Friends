const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');
const { randomBytes } = require('crypto');

const backendRoot = path.resolve(__dirname, '..', '..');

/**
 * Load backend env file.
 * Default: backend/.env
 * Production RDS from your machine: ENV_FILE=.env.production.local
 */
function resolveEnvFile(argv = process.argv) {
  if (process.env.ENV_FILE) return process.env.ENV_FILE;
  if (argv.includes('--prod')) {
    const candidates = ['.env.production.local', '.env.production', '.env'];
    for (const name of candidates) {
      if (fs.existsSync(path.join(backendRoot, name))) return name;
    }
    return '.env.production';
  }
  return '.env';
}

function loadEnv(argv = process.argv) {
  // Docker Compose injects DB_* into the container — no file needed
  if (
    process.env.DB_HOST &&
    typeof process.env.DB_PASSWORD === 'string' &&
    process.env.DB_PASSWORD.length > 0
  ) {
    return '(environment variables)';
  }

  const envFile = resolveEnvFile(argv);
  const envPath = path.isAbsolute(envFile)
    ? envFile
    : path.join(backendRoot, envFile);
  const result = dotenv.config({ path: envPath });
  if (result.error && argv.includes('--prod')) {
    console.error(`\n❌ Could not read env file: ${envPath}`);
    console.error('   On EC2: create backend/.env (copy from .env.production.example)');
    console.error('   Or run seeds inside Docker: bash scripts/seed-via-docker.sh 20 20\n');
    process.exit(1);
  }
  return envPath;
}

function assertDbConfig() {
  const missing = [];
  if (!process.env.DB_HOST) missing.push('DB_HOST');
  if (!process.env.DB_USERNAME) missing.push('DB_USERNAME');
  if (!process.env.DB_NAME) missing.push('DB_NAME');
  if (typeof process.env.DB_PASSWORD !== 'string' || process.env.DB_PASSWORD.length === 0) {
    missing.push('DB_PASSWORD');
  }
  if (missing.length) {
    console.error('\n❌ Missing or empty in env file:', missing.join(', '));
    console.error('   Set DB_PASSWORD=your_rds_master_password (no quotes needed unless password has spaces).\n');
    process.exit(1);
  }
}

function createPgClient() {
  assertDbConfig();
  const useSsl = process.env.DB_SSL === 'true';
  return new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: String(process.env.DB_PASSWORD),
    database: process.env.DB_NAME,
    ssl: useSsl
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
      : false,
  });
}

function isLikelyProductionDb() {
  return process.env.NODE_ENV === 'production';
}

function requireProductionConfirmation(argv) {
  if (isLikelyProductionDb() && !argv.includes('--confirm-prod')) {
    console.error(
      '\n⚠️  NODE_ENV=production — this would write fake users to the live database.\n' +
        '   Re-run with --confirm-prod if you really intend that.\n' +
        '   Example: bash scripts/seed-via-docker.sh 20 20\n',
    );
    process.exit(1);
  }
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomReferralCode() {
  return randomBytes(3).toString('hex').toUpperCase();
}

function jitterCoord(base, spread = 0.12) {
  return base + (Math.random() - 0.5) * spread;
}

function randomSubset(list, min, max) {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  return [...list].sort(() => Math.random() - 0.5).slice(0, n);
}

// Values must stay within backend/src/users/profile-options.ts
const SEED_OPTIONS = {
  relationshipStatus: ['single', 'single', 'single', 'married', 'in_relationship', 'divorced', 'prefer_not_to_say'],
  lookingFor: ['friendship', 'hangouts', 'festivals_events', 'travel_buddy', 'sports_fitness', 'language_exchange'],
  interestedIn: ['everyone', 'everyone', 'male', 'female'],
  motherTongue: ['Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati', 'Kannada', 'Odia', 'Malayalam', 'Punjabi'],
  religion: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Spiritual', 'No religion', 'Prefer not to say'],
  education: ["Bachelor's", "Master's", "Master's", 'Doctorate', 'Professional degree'],
  profession: ['IT & Software', 'Healthcare', 'Finance & Banking', 'Engineering', 'Education', 'Business / Self-employed', 'Research & Science', 'Student'],
  jobProfile: ['Software Engineer', 'Data Analyst', 'Product Manager', 'Doctor', 'Nurse', 'Accountant', 'Consultant', 'Researcher', 'Teacher', 'Founder', 'Civil Engineer', 'Masters Student'],
  passions: ['Painting', 'Dancing', 'Singing', 'Music', 'Cooking', 'Travel', 'Photography', 'Reading', 'Cricket', 'Football', 'Badminton', 'Yoga', 'Gym & Fitness', 'Hiking', 'Movies', 'Bollywood', 'Foodie', 'Board games', 'Volunteering'],
  grewUpCity: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Bhubaneswar', 'Rourkela', 'Kochi', 'Jaipur', 'Lucknow', 'Chandigarh'],
  salaryINR: ['₹5–10 LPA', '₹10–20 LPA', '₹20–35 LPA', '₹35–50 LPA'],
  salaryUSD: ['$60–100k / yr', '$100–150k / yr', '$150–250k / yr'],
  bios: [
    'New to the city and looking for friends to explore food spots and weekend treks.',
    'Missing home food and festivals — would love to find people for Diwali, Holi and chai catch-ups.',
    'Work in tech, love cricket and board games. Always up for a coffee and a good chat.',
    'Looking for a travel buddy and friends who enjoy music, movies and long walks.',
    'Here to meet fellow Indians abroad — language exchange, sports and weekend hangouts.',
  ],
};

/** Column → value map for a discover-ready NRI Friends user (profileStage 2, free trial). */
function buildNriProfile({ gender, city, country, latitude, longitude, name, age }) {
  const inIndia = (country || '').toLowerCase() === 'india';
  const trialEndsAt = new Date(Date.now() + 30 * 86_400_000);
  const lastActiveAt = new Date(Date.now() - Math.floor(Math.random() * 5 * 86_400_000));
  return {
    name,
    age,
    gender,
    city,
    country,
    bio: randomFrom(SEED_OPTIONS.bios),
    relationshipStatus: randomFrom(SEED_OPTIONS.relationshipStatus),
    lookingFor: randomSubset(SEED_OPTIONS.lookingFor, 1, 3).join(','),
    interestedIn: randomFrom(SEED_OPTIONS.interestedIn),
    motherTongue: randomFrom(SEED_OPTIONS.motherTongue),
    religion: randomFrom(SEED_OPTIONS.religion),
    education: randomFrom(SEED_OPTIONS.education),
    profession: randomFrom(SEED_OPTIONS.profession),
    jobProfile: randomFrom(SEED_OPTIONS.jobProfile),
    salaryRange: randomFrom(inIndia ? SEED_OPTIONS.salaryINR : SEED_OPTIONS.salaryUSD),
    hideSalary: Math.random() < 0.3,
    heightCm: gender === 'female' ? 150 + Math.floor(Math.random() * 25) : 162 + Math.floor(Math.random() * 28),
    grewUpCity: randomFrom(SEED_OPTIONS.grewUpCity),
    passions: randomSubset(SEED_OPTIONS.passions, 3, 5).join(','),
    profileStage: 2,
    isActive: true,
    isBanned: false,
    latitude,
    longitude,
    locationUpdatedAt: new Date(),
    lastActiveAt,
    subscriptionPlan: 'trial',
    subscriptionTier: 1,
    subscriptionExpiresAt: trialEndsAt,
    trialEndsAt,
    coins: 0,
    referralCode: randomReferralCode(),
  };
}

/** Inserts a user row plus one approved placeholder photo. Returns the new user id. */
async function insertSeedUser(client, profile, photoSeed) {
  const columns = Object.keys(profile);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await client.query(
    `INSERT INTO users (${columns.map((c) => `"${c}"`).join(',')}) VALUES (${placeholders}) RETURNING id`,
    columns.map((c) => profile[c]),
  );
  const userId = rows[0].id;
  await client.query(
    `INSERT INTO user_photos ("userId", url, "s3Key", "order", "isPrimary", "isApproved")
     VALUES ($1,$2,$3,0,true,true)`,
    [userId, `https://picsum.photos/seed/${photoSeed}/600/900`, `seed/${photoSeed}.jpg`],
  );
  return userId;
}

module.exports = {
  resolveEnvFile,
  loadEnv,
  createPgClient,
  isLikelyProductionDb,
  requireProductionConfirmation,
  randomFrom,
  randomReferralCode,
  jitterCoord,
  buildNriProfile,
  insertSeedUser,
};
