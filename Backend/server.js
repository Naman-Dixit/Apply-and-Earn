// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const shortid = require('shortid');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Config = require('./models/Config');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/referearn';

function maskUri(uri) {
  try {
    // hide password in connection string for logging
    return uri.replace(/(:)([^:@]+)@/, (m, p1) => `${p1}***@`);
  } catch (e) {
    return uri;
  }
}

async function connectWithDiagnostics() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:');
    console.error(err && err.message ? err.message : err);

    // provide actionable hints depending on error
    const msg = (err && err.message && err.message.toLowerCase()) || '';
    const name = err && err.name;

    if (msg.includes('authentication failed') || msg.includes('bad auth') || name === 'MongoServerError') {
      console.error('\nAuthentication problem detected. Steps to fix:');
      console.error('- Verify username and password in your `.env` (MONGO_URI).');
      console.error('- In MongoDB Atlas: go to Security -> Database Access and either reset the user password or create a new user.');
      console.error('- If your password contains special characters, URL-encode them in the connection string.');
    }

    if (name === 'MongooseServerSelectionError' || msg.includes('could not connect') || msg.includes('replicasetnoprimary') || msg.includes('whitelist') || msg.includes('ip')) {
      console.error('\nNetwork / topology problem detected. Steps to fix:');
      console.error('- In MongoDB Atlas: go to Network Access -> IP Access List and add your current IP ("Add current IP address").');
      console.error('- For quick testing only, you can add 0.0.0.0/0 (NOT recommended for production).');
      console.error('- Ensure your network allows outbound connections to MongoDB Atlas (port 27017) and SRV DNS lookups.');
      console.error('- Verify DNS resolution: run `nslookup -type=SRV _mongodb._tcp.<your-cluster-host>` from your machine.');
    }

    console.error('\nConnection string (masked):', maskUri(MONGO_URI));
    process.exit(1);
  }
}

connectWithDiagnostics();

// generate a short referral code and ensure uniqueness
async function generateUniqueReferral() {
  let code;
  let exists = true;
  while (exists) {
    code = shortid.generate().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    exists = await User.exists({ referralCode: code });
  }
  return code;
}

/**
 * POST /register
 * body: { name, email, password }
 */
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });

    const emailLower = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailLower });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const referralCode = await generateUniqueReferral();

    const user = new User({
      name,
      email: emailLower,
      password: hashed,
      referralCode,
      coins: 0
    });

    await user.save();

    const safe = {
      id: user._id,
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
      coins: user.coins
    };

    return res.json({ message: 'User registered', user: safe });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


/**
 * POST /apply-referral
 * body: { userEmail, referralCode }
 */
app.post('/apply-referral', async (req, res) => {
  try {
    const { userEmail, referralCode } = req.body;
    if (!userEmail || !referralCode) return res.status(400).json({ error: 'userEmail and referralCode are required' });

    const emailLower = userEmail.toLowerCase().trim();
    const user = await User.findOne({ email: emailLower });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.appliedReferral) return res.status(400).json({ error: 'Referral code already applied' });

    const refUser = await User.findOne({ referralCode: referralCode });
    if (!refUser) return res.status(400).json({ error: 'Invalid referral code' });

    if (refUser._id.equals(user._id)) return res.status(400).json({ error: 'Cannot use your own referral code' });

    // get reward amount from config
    const cfg = await Config.findOne({ key: 'reward_coins' });
    const reward = cfg ? Number(cfg.value) : Number(process.env.REWARD_COINS || 50);

    // add coins to the applying user
    user.coins = (user.coins || 0) + reward;
    user.appliedReferral = referralCode;
    await user.save();

    // OPTIONAL: reward the referrer as well (commented out by default)
    // refUser.coins = (refUser.coins || 0) + reward;
    // await refUser.save();

    return res.json({
      message: 'Referral applied',
      reward,
      user: {
        email: user.email,
        coins: user.coins,
        appliedReferral: user.appliedReferral
      }
    });
  } catch (err) {
    console.error('Apply-referral error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /all-users  (dev helper)
 * Returns all users (without passwords) — remove this in production.
 */
app.get('/all-users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (err) {
    console.error('All-users error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/', (req, res) => res.send('Refer & Earn backend running'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
