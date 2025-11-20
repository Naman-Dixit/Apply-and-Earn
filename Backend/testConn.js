require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

function maskUri(uri) {
  try {
    return uri.replace(/(:)([^:@]+)@/, (m, p1) => `${p1}***@`);
  } catch (e) {
    return uri || '<not set>';
  }
}

if (!MONGO_URI) {
  console.error('MONGO_URI not set in .env — add your Atlas connection string to .env');
  process.exit(1);
}

console.log('Testing MongoDB connection to:', maskUri(MONGO_URI));

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connection OK — your credentials and network look good.');
    return mongoose.connection.close();
  })
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\nConnection failed:');
    console.error(err && err.message ? err.message : err);

    const msg = (err && err.message && err.message.toLowerCase()) || '';
    const name = err && err.name;

    if (msg.includes('authentication failed') || msg.includes('bad auth') || name === 'MongoServerError') {
      console.error('\nAuthentication error. Actions:');
      console.error('- Reset the DB user password in Atlas and update `.env`.');
      console.error("- If password has special characters, URL-encode them (e.g. '#' -> '%23').");
    }

    if (name === 'MongooseServerSelectionError' || msg.includes('could not connect') || msg.includes('replicasetnoprimary') || msg.includes('whitelist') || msg.includes('ip')) {
      console.error('\nNetwork / whitelist issue. Actions:');
      console.error('- In Atlas, add your IP to Network Access -> IP Access List.');
      console.error('- For quick testing, add 0.0.0.0/0 (not for production).');
      console.error('- Check DNS SRV resolution: run `nslookup -type=SRV _mongodb._tcp.<your-cluster-host>`.');
    }

    process.exit(1);
  });
