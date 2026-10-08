const multer = require('multer');
const path = require('node:path');
const crypto = require('node:crypto');

const uploadDirectory = path.resolve(__dirname, '../../uploads');
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!file.mimetype.startsWith('image/') || !allowedExtensions.has(extension)) {
      const error = new Error('Le fichier doit être une image JPG, PNG, GIF, WebP ou AVIF.');
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

module.exports = { imageUpload, uploadDirectory };
