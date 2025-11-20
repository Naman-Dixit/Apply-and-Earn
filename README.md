**Refer & Earn — Apply & Earn Feature**
##
Overview

This repository implements the Refer & Earn platform with a focused, production-ready Apply & Earn feature. Registered users receive a unique referral code at signup and can apply another user's code to receive reward coins instantly. The codebase uses Node.js, Express, and MongoDB Atlas. Security, input validation, and anti-abuse checks are included.
##
Key Highlights

Instant coin rewards when a valid referral code is applied.

Auto-generated, collision-resistant referral codes per user.

Protection against self-referral and repeated code application.

Configurable reward amount stored in the database.

Clean REST API and straightforward frontend integration.
##
Features (Apply & Earn)

Apply Referral Code — Endpoint to apply a referral code to an existing user account.

Instant Reward — Config-driven reward coins are credited instantly to the applying user.

Validation & Anti-Abuse — Prevents self-referral, enforces one-time application, and validates code existence.

Audit-friendly — Applied referral code is saved on the user document for traceability.

Admin Config — Reward amount (e.g., reward_coins) is stored in a configs collection and can be updated without code changes.
##
Tech Stack

Backend: Node.js (18.x+), Express.js

Database: MongoDB Atlas (Mongoose ODM)

Security: bcryptjs for password hashing, input sanitization, validation

Utilities: shortid (referral generation), dotenv, cors
##
Quick Start — Installation

Clone the repository:

git clone https://github.com/YOUR_USERNAME/refer-earn-system.git
cd refer-earn-system


Install backend dependencies:

cd Backend
npm install


Create .env from .env.example and configure:

PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://refer_earn_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/referearn?retryWrites=true&w=majority
REWARD_COINS=50


URL-encode special characters in the password.

Start the server:

npm run dev    # if nodemon configured
# or
node server.js


Server defaults to http://127.0.0.1:5000.
##
Database Setup (MongoDB Atlas)

Create a free cluster on MongoDB Atlas.

Add a database user with read/write privileges.

Set Network Access. For development, you may allow 0.0.0.0/0. For production, whitelist specific IPs.

Use the provided connection string in MONGO_URI.
##
API Reference — Apply & Earn Endpoints
1. Register New User

POST /register
Request body:

{
  "name": "string",
  "email": "string",
  "password": "string"
}


Successful response includes auto-generated referralCode.
##
2. Apply Referral Code (Apply & Earn)

POST /apply-referral
Request body:

{
  "userEmail": "string",       // the email of the user applying the code
  "referralCode": "string"     // the referral code being applied
}


Business rules

The applying user must already exist.

The referral code must exist and belong to another user.

A user can apply a referral code only once.

Self-application (applying your own code) is not allowed.

Reward value is taken from configs.reward_coins.

Success (200) Example

{
  "message": "Referral applied",
  "reward": 50,
  "user": {
    "email": "john@example.com",
    "coins": 50,
    "appliedReferral": "ALICEX570"
  }
}


Error cases

400 — Missing fields

404 — User not found

400 — Referral code invalid

400 — Referral code already applied

400 — Cannot use your own referral code

500 — Server error

cURL example

curl -X POST http://127.0.0.1:5000/apply-referral \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"john@example.com","referralCode":"ALICEX570"}'
  ##
3. (Dev-only) Get All Users

GET /all-users
Development-only endpoint to inspect user records. Remove or protect before production.
##
Database Schemas (Highlights)
users collection
{
  _id: ObjectId,
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,           // bcrypt hash
  referralCode: { type: String, unique: true, uppercase: true },
  coins: { type: Number, default: 0 },
  appliedReferral: { type: String, default: null },
  createdAt: Date,
  updatedAt: Date
}

configs collection
{
  _id: ObjectId,
  key: { type: String, unique: true },
  value: Number,
  createdAt: Date,
  updatedAt: Date
}


Example document: { key: "reward_coins", value: 50 }
##
Security & Validation

Password hashing: bcrypt with 10 salt rounds.

Input validation: Required fields, email format, trimming, lowercasing for consistency.

Unique indexes: email and referralCode to prevent duplication.

Anti-abuse rules: Prevent self-referral and multiple applications per account.

Environment variables: Sensitive info is stored in .env and not committed.
##
Frontend Integration (Minimal Example)

Apply referral (fetch):

fetch('http://127.0.0.1:5000/apply-referral', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userEmail: 'john@example.com',
    referralCode: 'ALICEX570'
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));


Dashboard should display:

User's referral code

Current coin balance

Applied referral code (if any)
##
Testing
Manual

Use Postman or cURL to test:

Registration

Applying valid/invalid referral codes

Edge cases (self-apply, repeat apply)

Suggested automated testing (future)

Jest + Supertest for API endpoints

mongodb-memory-server for isolated DB tests
##
Troubleshooting

Common issues

Authentication failed when connecting to MongoDB: verify credentials and URL encoding.

Could not connect to any servers: check IP whitelist and internet/firewall settings.

EADDRINUSE: port already in use; change PORT in .env or kill the process using the port.

CORS errors: ensure frontend origin matches backend CORS settings.
##
Deployment Notes

Ensure environment variables are set in the hosting environment (Heroku, Render, Railway, etc.).

Remove or secure development endpoints like /all-users.

For production, restrict MongoDB IP access to trusted IPs or VPC peering.

Set NODE_ENV=production to enable production optimizations.
##
Future Enhancements (Apply & Earn)

Email notifications when referral is applied.

Multi-level referral support.

Rate limiting or fraud detection for abuse prevention.

Admin dashboard to adjust reward_coins and view referral analytics.

Reward redemption options (coupons, gift cards).
##
Contributing

Fork the repository.

Create a feature branch: git checkout -b feature/<name>.

Implement changes and test thoroughly.

Commit and push: git push origin feature/<name>.

Open a pull request with a clear description.

Follow repository coding style and include tests for new behavior.
