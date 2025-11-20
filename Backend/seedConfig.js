// // seedConfig.js
// require('dotenv').config();
// const mongoose = require('mongoose');
// const Config = require('./models/Config');

// async function seed() {
//   const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/referearn';
//   await mongoose.connect(uri, { useNewUrlParser:true, useUnifiedTopology:true });
//   console.log('Connected to MongoDB for seeding');

//   const key = 'reward_coins';
//   const value = Number(process.env.REWARD_COINS || 50);

//   const doc = await Config.findOneAndUpdate(
//     { key },
//     { value },
//     { upsert: true, new: true, setDefaultsOnInsert: true }
//   );

//   console.log(`Seeded config: ${key} = ${value}`);
//   await mongoose.disconnect();
//   console.log('Disconnected after seeding');
// }

// seed().catch(err => {
//   console.error('Seeding error', err);
//   process.exit(1);
// });
// seedTestData.js
// Usage: node seedTestData.js
// Make sure you have a .env in the same folder with MONGO_URI configured.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Config = require('./models/Config');

const SIMULATE_APPLY = false; // set to true if you want Bob to auto-apply Alice's code

async function connect() {
  const uri = process.env.MONGO_URI ;
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
}

async function ensureIndexes() {
  console.log('Ensuring indexes...');
  await User.init();   // builds indexes defined in schema (email/referralCode)
  await Config.init();
  console.log('Indexes ensured.');
}

async function upsertConfig(rewardCoins = 50) {
  console.log(`Upserting config.reward_coins = ${rewardCoins}`);
  await Config.findOneAndUpdate(
    { key: 'reward_coins' },
    { key: 'reward_coins', value: Number(rewardCoins) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function generateReferralCode(base) {
  // produce a simple deterministic-ish code to avoid collisions for seeded users
  const suffix = Math.random().toString(36).slice(2,7).toUpperCase();
  return (base.replace(/\s+/g,'').slice(0,6).toUpperCase() + suffix).slice(0,12);
}

async function upsertUser({ name, email, passwordPlain, referralCode=null, coins=0, appliedReferral=null }) {
  const emailLower = email.toLowerCase().trim();
  let user = await User.findOne({ email: emailLower });

  const hashed = await bcrypt.hash(passwordPlain, 10);

  if (user) {
    console.log(`Updating existing user ${emailLower}`);
    user.name = name;
    user.password = hashed;
    user.coins = coins;
    user.appliedReferral = appliedReferral;
    if (referralCode) user.referralCode = referralCode;
    await user.save();
  } else {
    // ensure referralCode uniqueness
    let finalCode = referralCode || await generateReferralCode(name);
    // avoid collision
    while (await User.exists({ referralCode: finalCode })) {
      finalCode = await generateReferralCode(name);
    }

    user = new User({
      name,
      email: emailLower,
      password: hashed,
      referralCode: finalCode,
      coins,
      appliedReferral: appliedReferral || null
    });
    await user.save();
    console.log(`Created user ${emailLower} with code ${finalCode}`);
  }

  return user;
}

async function main() {
  try {
    await connect();
    await ensureIndexes();

    // read reward coins from .env if present
    const rewardFromEnv = Number(process.env.REWARD_COINS || 50);
    await upsertConfig(rewardFromEnv);

    // Seed users: Alice and Bob
    const aliceRef = 'ALICE' + Math.random().toString(36).substring(2,6).toUpperCase();

    const alice = await upsertUser({
      name: 'Alice Test',
      email: 'alice@example.com',
      passwordPlain: 'alicepass',
      referralCode: aliceRef,
      coins: 0,
      appliedReferral: null
    });

    const bob = await upsertUser({
      name: 'Bob Test',
      email: 'bob@example.com',
      passwordPlain: 'bobpass',
      // let Bob get an auto referral code
      coins: 0,
      appliedReferral: null
    });

    console.log('Seeded users:');
    console.log(' Alice ->', { email: alice.email, referralCode: alice.referralCode, coins: alice.coins });
    console.log(' Bob   ->', { email: bob.email, referralCode: bob.referralCode, coins: bob.coins });

    if (SIMULATE_APPLY) {
      // simulate Bob applying Alice's code: add reward coins to Bob and set appliedReferral
      const cfg = await Config.findOne({ key: 'reward_coins' });
      const reward = cfg ? Number(cfg.value) : rewardFromEnv;
      console.log(`Simulating Bob applying Alice's code — reward = ${reward}`);

      // prevent using own code and prevent double-apply
      if (bob.referralCode === alice.referralCode) {
        console.log('Bob and Alice share referral code (unexpected). Skipping simulate apply.');
      } else if (bob.appliedReferral) {
        console.log('Bob already applied a referral. Skipping simulate apply.');
      } else {
        bob.coins = (bob.coins || 0) + reward;
        bob.appliedReferral = alice.referralCode;
        await bob.save();
        console.log(`Bob now has ${bob.coins} coins and appliedReferral=${bob.appliedReferral}`);
      }
    } else {
      console.log('SIMULATE_APPLY is false. To auto-apply Alice->Bob, set SIMULATE_APPLY = true at top of file and rerun.');
    }

    console.log('Done. You can now use the API endpoints with these test users.');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();
