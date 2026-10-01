const {
  loadEnv,
  createPgClient,
  requireProductionConfirmation,
  randomFrom,
  buildNriProfile,
  insertSeedUser,
} = require("./lib/db");

const argv = process.argv.slice(2);

loadEnv(process.argv);
requireProductionConfirmation(argv);

const BASE_LAT = Number(process.env.SEED_LAT || 28.5355);
const BASE_LNG = Number(process.env.SEED_LNG || 77.391);
const DEFAULT_COUNT = 12;

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Arjun", "Reyansh", "Aditya", "Kabir", "Ishaan", "Ayaan",
  "Rohan", "Vihaan", "Krish", "Dev", "Anika", "Kiara", "Sara", "Mira", "Riya",
  "Naina", "Tara", "Ira",
];

const CITY = process.env.SEED_CITY || "Noida";
const COUNTRY = process.env.SEED_COUNTRY || "India";

async function seedUsers(count) {
  const client = createPgClient();
  await client.connect();

  let inserted = 0;
  try {
    for (let i = 0; i < count; i += 1) {
      const profile = buildNriProfile({
        gender: Math.random() > 0.5 ? "female" : "male",
        name: `${randomFrom(FIRST_NAMES)} Test${Math.floor(100 + Math.random() * 900)}`,
        age: Math.floor(21 + Math.random() * 20),
        city: CITY,
        country: COUNTRY,
        latitude: BASE_LAT + (Math.random() - 0.5) * 0.25,
        longitude: BASE_LNG + (Math.random() - 0.5) * 0.25,
      });
      await insertSeedUser(client, profile, `nritest_${Date.now()}_${i}`);
      inserted += 1;
    }
    console.log(`Inserted ${inserted} seeded users with photos.`);
  } finally {
    await client.end();
  }
}

const countArg = Number(argv.find((a) => /^\d+$/.test(a)));
const count = Number.isFinite(countArg) && countArg > 0 ? Math.floor(countArg) : DEFAULT_COUNT;

seedUsers(count).catch((error) => {
  console.error("Failed to seed users:", error.message);
  process.exit(1);
});
