const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Multer config: store on disk in uploads/ directory
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = req.body.entity_type || 'general';
    const targetDir = path.join(uploadsDir, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.zip', '.rar'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed. Allowed: ${allowed.join(', ')}`));
    }
  },
});

router.use(authenticate);

// GET / - List documents with pagination, search, filters
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', category, entity_type, entity_id } = req.query;
    const offset = (page - 1) * limit;

    let query = db('documents');

    if (category) query = query.where('category', category);
    if (entity_type) query = query.where('entity_type', entity_type);
    if (entity_id) query = query.where('entity_id', entity_id);

    if (search) {
      query = query.where(function () {
        this.where('file_name', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().count();
    const data = await query
      .orderBy(sort_by || 'created_at', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /:id - Get document metadata by ID
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await db('documents').where({ id: req.params.id }).first();
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ data: doc });
  } catch (err) { next(err); }
});

// GET /:id/download - Download document file
router.get('/:id/download', async (req, res, next) => {
  try {
    const doc = await db('documents').where({ id: req.params.id }).first();
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (!doc.file_path) {
      return res.status(404).json({ error: 'No file associated with this document' });
    }

    // Support both relative paths (uploads/...) and absolute paths
    const filePath = doc.file_path.startsWith('/') ? doc.file_path : path.join(__dirname, '..', '..', doc.file_path);
    res.download(filePath, doc.file_name || path.basename(filePath));
  } catch (err) { next(err); }
});

// POST / - Upload/create document (with optional file)
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 100MB limit. Please upload a smaller file.' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    const docData = {
      entity_type: req.body.entity_type,
      entity_id: req.body.entity_id || null,
      category: req.body.category || 'attachment',
      description: req.body.description || '',
      uploaded_by: req.user?.id || null,
    };

    if (req.file) {
      docData.file_name = req.file.originalname;
      // Store relative path for easy URL construction
      docData.file_path = `uploads/${req.body.entity_type || 'general'}/${req.file.filename}`;
      docData.file_size = req.file.size;
      // file_type stores the mime type (no separate mime_type column in schema)
      docData.file_type = req.file.mimetype;
    }

    const [doc] = await db('documents').insert(docData).returning('*');
    res.status(201).json({ data: doc });
  } catch (err) { next(err); }
});

// PUT /:id - Update document metadata
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await db('documents').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    req.body.updated_at = new Date();
    const [updated] = await db('documents')
      .where({ id: req.params.id })
      .update(req.body)
      .returning('*');

    res.json({ data: updated });
  } catch (err) { next(err); }
});

// DELETE /:id - Delete document
router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await db('documents').where({ id: req.params.id }).first();
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    await db('documents').where({ id: req.params.id }).del();
    res.json({ message: 'Document deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
