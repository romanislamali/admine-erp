const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads', 'cms');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 1600;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Unsupported file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'));
    }
    cb(null, true);
  }
});

// Converts an uploaded image buffer to a single optimized WebP file (resized
// to a sane max width, no separate thumbnail) and returns the path to store
// on the row, relative to /uploads (served statically by server.js).
const saveOptimizedImage = async (buffer, subdir) => {
  const dir = path.join(UPLOAD_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.webp`;
  const filePath = path.join(dir, filename);

  await sharp(buffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filePath);

  return `/uploads/cms/${subdir}/${filename}`;
};

// Removes a previously stored image (e.g. when replacing a logo/thumbnail).
// Silently ignores a missing file — it may already be gone, or the record
// never had one set.
const deleteImage = (relativePath) => {
  if (!relativePath) return;
  const filePath = path.join(__dirname, '..', relativePath);
  fs.unlink(filePath, () => {});
};

module.exports = { upload, saveOptimizedImage, deleteImage, MAX_FILE_SIZE, ALLOWED_MIME_TYPES };
