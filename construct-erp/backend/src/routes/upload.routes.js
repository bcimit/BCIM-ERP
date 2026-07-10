// src/routes/upload.routes.js
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuid } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { uploadAndShare, isConfigured: onedriveConfigured } = require('../services/onedrive.service');
const router = express.Router();
router.use(authenticate);

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the directory exists on every request — Railway's ephemeral FS
    // can wipe it between deploys and the startup check may have already run.
    try {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      cb(null, UPLOADS_DIR);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const ALLOWED_EXT = new Set([
  '.jpg','.jpeg','.png','.gif','.webp',
  '.pdf','.xlsx','.xls','.docx','.doc','.pptx','.ppt','.txt','.csv',
  '.dwg','.dxf','.ifc',
  '.mp4','.mov','.avi','.mkv','.wmv',
  '.zip','.rar','.7z',
]);
const ALLOWED_MIME = new Set([
  'image/jpeg','image/png','image/gif','image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain','text/csv',
  'video/mp4','video/quicktime','video/x-msvideo','video/x-matroska','video/x-ms-wmv',
  'application/zip','application/x-rar-compressed','application/x-7z-compressed',
  'application/octet-stream', // dwg/dxf/ifc — browsers send this for unknown types
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext))    return cb(new Error(`File type "${ext}" is not allowed`));
  if (!ALLOWED_MIME.has(file.mimetype)) return cb(new Error(`MIME type "${file.mimetype}" is not allowed`));
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB

// Wrapper so multer errors return JSON (not Express's default HTML 500 page).
function runUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        console.error('[upload] multer error:', err.message);
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
}

// POST /upload  (multi-file)
router.post('/', runUpload(upload.array('files', 10)), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ urls, count: urls.length, message: `${urls.length} file(s) uploaded` });
});

// POST /upload/single
router.post('/single', runUpload(upload.single('file')), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });

  const localUrl  = `/uploads/${req.file.filename}`;
  const localPath = req.file.path;
  const origName  = req.file.originalname;
  const module    = req.body.module  || 'Attachments';
  const project   = req.body.project || '';

  // Try OneDrive first — permanent link that survives Railway redeploys
  if (onedriveConfigured()) {
    try {
      const od = await uploadAndShare(localPath, origName, module, project);
      if (od?.share_url) {
        fs.unlink(localPath, () => {});
        return res.json({ url: od.share_url, filename: origName, provider: 'onedrive' });
      }
    } catch (e) {
      console.error('[upload] OneDrive failed, falling back to local:', e.message);
    }
  }

  // Fallback: local disk (ephemeral on Railway — file survives until next deploy)
  res.json({ url: localUrl, filename: req.file.filename, provider: 'local' });
});

module.exports = router;
