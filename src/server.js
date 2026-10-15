require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('node:fs');
const pool = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const { uploadDirectory } = require('./middleware/upload');

const requiredEnvironment = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET', 'CORS_ORIGIN'];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);

if (missingEnvironment.length) {
  throw new Error(`Variables d’environnement manquantes : ${missingEnvironment.join(', ')}`);
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET doit contenir au moins 32 caractères.');
}

fs.mkdirSync(uploadDirectory, { recursive: true });

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDirectory, { fallthrough: false }));
app.use('/api/admin', adminRoutes);
app.use('/api/gallery', galleryRoutes);

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Corps JSON invalide.' });
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'L’image ne doit pas dépasser 5 Mo.' });
  }
  if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Un seul fichier image est autorisé.' });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    error: status >= 500 ? 'Une erreur interne est survenue.' : error.message,
  });
});

async function start() {
  await pool.query('SELECT 1');
  app.listen(port, () => {
    console.log(`Ifaty Beach Club API disponible sur http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Impossible de démarrer l’API :', error);
  process.exitCode = 1;
});

module.exports = app;