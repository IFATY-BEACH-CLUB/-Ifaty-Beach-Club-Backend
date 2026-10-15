require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function createAdmin() {
  const [, , rawEmail, password] = process.argv;
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

  if (
    !email
    || email.length > 150
    || !password
    || Buffer.byteLength(password, 'utf8') < 12
    || Buffer.byteLength(password, 'utf8') > 72
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error('Usage : npm run create-admin -- <email> <mot-de-passe-de-12-a-72-octets>');
  }

  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    throw new Error('Configurez DB_HOST, DB_USER et DB_NAME dans backend/.env avant de continuer.');
  }

  const hash = await bcrypt.hash(password, 12);
  await pool.execute('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash]);
  console.log(`Compte administrateur créé : ${email}`);
}

createAdmin()
  .catch((error) => {
    console.error(`Création du compte administrateur impossible : ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
