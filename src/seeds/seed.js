require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seedAdmin() {
  const email = typeof process.env.ADMIN_EMAIL === 'string'
    ? process.env.ADMIN_EMAIL.trim().toLowerCase()
    : '';
  const password = process.env.ADMIN_PASSWORD || '';

  if (
    !email
    || email.length > 150
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || Buffer.byteLength(password, 'utf8') < 1
    || Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new Error(
      'Définissez ADMIN_EMAIL et un ADMIN_PASSWORD de 1 à 72 octets dans backend/.env.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [existingUsers] = await pool.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email],
  );

  if (existingUsers.length > 0) {
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [passwordHash, existingUsers[0].id],
    );
    console.log(`Mot de passe administrateur mis à jour (hash bcrypt) : ${email}`);
  } else {
    await pool.execute(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, passwordHash],
    );
    console.log(`Administrateur créé (hash bcrypt) : ${email}`);
  }
}

seedAdmin()
  .catch((error) => {
    console.error(`Seed administrateur impossible : ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
