const express = require('express');
const { create, list, remove, update } = require('../controllers/galleryController');
const requireAuth = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');

const router = express.Router();

router.get('/', list);
router.post('/', requireAuth, imageUpload.single('image'), create);
router.put('/:id', requireAuth, imageUpload.single('image'), update);
router.delete('/:id', requireAuth, remove);

module.exports = router;
