const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('../config/db');
const { uploadDirectory } = require('../middleware/upload');

function serializeGalleryItem(req, item) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return {
    ...item,
    imageUrl: `${baseUrl}/uploads/${encodeURIComponent(item.image)}`,
  };
}

async function removeImage(filename) {
  if (!filename) return;
  const filePath = path.resolve(uploadDirectory, filename);
  if (path.dirname(filePath) !== uploadDirectory) {
    throw new Error('Chemin d’image invalide.');
  }
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function list(req, res, next) {
  try {
    const [items] = await pool.execute(
      'SELECT id, image, created_at, updated_at FROM gallery ORDER BY created_at DESC, id DESC',
    );
    return res.json(items.map((item) => serializeGalleryItem(req, item)));
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  let imagePersisted = false;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Une image est obligatoire.' });
    }

    const [result] = await pool.execute(
      'INSERT INTO gallery (image) VALUES (?)',
      [req.file.filename],
    );
    imagePersisted = true;
    const [items] = await pool.execute(
      'SELECT id, image, created_at, updated_at FROM gallery WHERE id = ?',
      [result.insertId],
    );
    return res.status(201).json(serializeGalleryItem(req, items[0]));
  } catch (error) {
    if (req.file && !imagePersisted) {
      try {
        await removeImage(req.file.filename);
      } catch (cleanupError) {
        return next(cleanupError);
      }
    }
    return next(error);
  }
}

async function update(req, res, next) {
  let newImagePersisted = false;
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      if (req.file) await removeImage(req.file.filename);
      return res.status(400).json({ error: 'Identifiant invalide.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Sélectionnez une nouvelle image.' });
    }

    const [existingItems] = await pool.execute(
      'SELECT id, image, created_at, updated_at FROM gallery WHERE id = ?',
      [id],
    );
    const existing = existingItems[0];
    if (!existing) {
      await removeImage(req.file.filename);
      return res.status(404).json({ error: 'Image introuvable.' });
    }

    await pool.execute(
      'UPDATE gallery SET image = ? WHERE id = ?',
      [req.file.filename, id],
    );
    newImagePersisted = true;

    const [updatedItems] = await pool.execute(
      'SELECT id, image, created_at, updated_at FROM gallery WHERE id = ?',
      [id],
    );
    await removeImage(existing.image);
    return res.json(serializeGalleryItem(req, updatedItems[0]));
  } catch (error) {
    if (req.file && !newImagePersisted) {
      try {
        await removeImage(req.file.filename);
      } catch (cleanupError) {
        return next(cleanupError);
      }
    }
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Identifiant invalide.' });
    }

    const [items] = await pool.execute('SELECT image FROM gallery WHERE id = ?', [id]);
    if (!items[0]) {
      return res.status(404).json({ error: 'Image introuvable.' });
    }

    await pool.execute('DELETE FROM gallery WHERE id = ?', [id]);
    await removeImage(items[0].image);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

module.exports = { create, list, remove, update };
