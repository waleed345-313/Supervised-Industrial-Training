/**
 * Creates the default administrator account if it does not exist.
 * Run: node scripts/seedAdmin.js   (from backend/)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';


const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';
const ADMIN_DEPARTMENT = process.env.ADMIN_DEPARTMENT || 'IT';

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI in backend/.env');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    if (existing.role !== 'admin') {
      console.error(`User ${ADMIN_EMAIL} exists but role is "${existing.role}", not admin.`);
      process.exit(1);
    }
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    console.log('If login fails, reset the password with: npm run seed:admin -- --reset');
    if (process.argv.includes('--reset')) {
      const salt = await bcrypt.genSalt(10);
      existing.password = await bcrypt.hash(ADMIN_PASSWORD, salt);
      await existing.save();
      console.log('Password reset to configured default.');
    }
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, salt);

  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: hashed,
    role: 'admin',
    department: ADMIN_DEPARTMENT,
  });

  console.log('Administrator account created.');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
