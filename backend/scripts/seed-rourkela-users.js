/**
 * Seed discover-ready NRI Friends users around a city.
 *
 * Defaults: Rourkela, Odisha, India (22.2604, 84.8536). Override with
 * SEED_CITY / SEED_COUNTRY / SEED_STATE / SEED_LAT / SEED_LNG.
 *
 * Local DB:
 *   npm run seed:rourkela
 *   npm run seed:rourkela -- 25
 *
 * Inside Docker on EC2:
 *   bash scripts/seed-via-docker.sh 20 20
 */
const { randomBytes } = require('crypto');
const {
  loadEnv,
  createPgClient,
  requireProductionConfirmation,
  randomFrom,
  jitterCoord,
  buildNriProfile,
  insertSeedUser,
} = require('./lib/db');

const argv = process.argv.slice(2);

const LOCALITY = {
  city: process.env.SEED_CITY || 'Rourkela',
  country: process.env.SEED_COUNTRY || 'India',
  state: process.env.SEED_STATE || 'Odisha',
  baseLat: Number(process.env.SEED_LAT || 22.2604),
  baseLng: Number(process.env.SEED_LNG || 84.8536),
};

const MALE_FIRST = [
  'Rahul', 'Amit', 'Vikram', 'Sourav', 'Debasis', 'Manish', 'Pratik', 'Ankit',
  'Rohan', 'Siddharth', 'Abhishek', 'Nikhil', 'Arjun', 'Karan', 'Rajat',
];

const FEMALE_FIRST = [
  'Priya', 'Ananya', 'Sneha', 'Ishita', 'Pooja', 'Ritika', 'Shreya', 'Kavya',
  'Aditi', 'Neha', 'Divya', 'Swati', 'Megha', 'Tanvi', 'Aishwarya',
];

function parseCount(args) {
  const n = Number(args.find((a) => /^\d+$/.test(a)));
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return 15;
}

async function main() {
  loadEnv();
  requireProductionConfirmation(argv);

  const count = parseCount(argv);
  const client = createPgClient();

  console.log(`Seeding ${count} users near ${LOCALITY.city}, ${LOCALITY.state}`);
  console.log(`DB: ${process.env.DB_HOST}/${process.env.DB_NAME}`);

  await client.connect();
  const created = [];

  try {
    for (let i = 0; i < count; i += 1) {
      const gender = Math.random() > 0.5 ? 'female' : 'male';
      const profile = buildNriProfile({
        gender,
        name: `${randomFrom(gender === 'female' ? FEMALE_FIRST : MALE_FIRST)} ${LOCALITY.city.slice(0, 3)}${100 + i}`,
        age: Math.floor(21 + Math.random() * 20),
        city: LOCALITY.city,
        country: LOCALITY.country,
        latitude: jitterCoord(LOCALITY.baseLat, 0.08),
        longitude: jitterCoord(LOCALITY.baseLng, 0.08),
      });
      await insertSeedUser(client, profile, `nri_${Date.now()}_${i}_${randomBytes(2).toString('hex')}`);
      created.push(profile);
    }
    console.log(`\n✅ Inserted ${created.length} users with photos.\n`);
    created.forEach((u) => {
      console.log(`  • ${u.name} (${u.gender}, grew up in ${u.grewUpCity}) ref:${u.referralCode}`);
    });
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
