const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ── Multer config for costing image uploads ────────────────────────
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'costing');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `costing-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype.split('/')[1]);
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed'));
    }
  },
});

router.use(authenticate);

// ── Helper: get or create default version for a costing sheet ──────
async function getOrCreateDefaultVersion(sheetId, trx) {
  const knex = trx || db;
  let version = await knex('costing_versions')
    .where({ costing_sheet_id: sheetId })
    .orderBy('version_number', 'asc')
    .first();

  if (!version) {
    [version] = await knex('costing_versions')
      .insert({ costing_sheet_id: sheetId, version_number: 1, status: 'Draft' })
      .returning('*');
  }
  return version;
}

// ── POST /upload-image - Upload an image for a costing sheet ────────
router.post('/upload-image', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    const imageUrl = `/uploads/costing/${req.file.filename}`;
    res.json({ data: { image_url: imageUrl, filename: req.file.filename } });
  } catch (err) { next(err); }
});

// GET / - List costing sheets with pagination, search, filters
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', status, customer_id } = req.query;
    const offset = (page - 1) * limit;

    let query = db('costing_sheets')
      .leftJoin('customers', 'costing_sheets.customer_id', 'customers.id')
      .select('costing_sheets.*', 'customers.display_name as customer_name');

    if (status) query = query.where('costing_sheets.status', status);
    if (customer_id) query = query.where('costing_sheets.customer_id', customer_id);

    if (search) {
      query = query.where(function () {
        this.where('costing_sheets.sheet_number', 'ilike', `%${search}%`)
          .orWhere('costing_sheets.style_name', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('costing_sheets.id');
    const data = await query
      .orderBy(sort_by ? `costing_sheets.${sort_by}` : 'costing_sheets.created_at', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /:id - Get costing sheet with fabric, trim, and packing items
router.get('/:id', async (req, res, next) => {
  try {
    const sheet = await db('costing_sheets')
      .leftJoin('customers', 'costing_sheets.customer_id', 'customers.id')
      .select('costing_sheets.*', 'customers.display_name as customer_name')
      .where('costing_sheets.id', req.params.id)
      .first();

    if (!sheet) return res.status(404).json({ error: 'Costing sheet not found' });

    // Get the default version and its items
    const version = await getOrCreateDefaultVersion(sheet.id);

    const fabric_items = await db('costing_fabric_items').where({ costing_version_id: version.id });
    const trim_items = await db('costing_trim_items').where({ costing_version_id: version.id });
    const packing_items = await db('costing_packing_items').where({ costing_version_id: version.id });

    res.json({ data: { ...sheet, fabric_items, trim_items, packing_items } });
  } catch (err) { next(err); }
});

// POST / - Create costing sheet with line items
router.post('/', async (req, res, next) => {
  try {
    const { fabric_items, trim_items, packing_items, overhead_items, ...sheetData } = req.body;

    if (!sheetData.sheet_number) {
      const settings = await db('invoice_number_settings').where({ document_type: 'CostingSheet' }).first();
      if (settings) {
        const nextNum = settings.next_number || 1;
        const padded = String(nextNum).padStart(settings.padding_digits || 4, '0');
        sheetData.sheet_number = `${settings.prefix || 'CS'}${settings.separator || '-'}${padded}`;
        await db('invoice_number_settings').where({ id: settings.id }).update({ next_number: nextNum + 1, updated_at: new Date() });
      } else {
        const [{ count }] = await db('costing_sheets').count();
        sheetData.sheet_number = `CS-${String(parseInt(count) + 1).padStart(4, '0')}`;
      }
    }

    const [sheet] = await db('costing_sheets').insert(sheetData).returning('*');

    // Create default version for this sheet
    const version = await getOrCreateDefaultVersion(sheet.id);

    if (fabric_items && fabric_items.length > 0) {
      await db('costing_fabric_items').insert(
        fabric_items.map((i) => ({ ...i, costing_version_id: version.id }))
      );
    }
    if (trim_items && trim_items.length > 0) {
      await db('costing_trim_items').insert(
        trim_items.map((i) => ({ ...i, costing_version_id: version.id }))
      );
    }
    if (packing_items && packing_items.length > 0) {
      await db('costing_packing_items').insert(
        packing_items.map((i) => ({ ...i, costing_version_id: version.id }))
      );
    }

    const savedFabric = await db('costing_fabric_items').where({ costing_version_id: version.id });
    const savedTrim = await db('costing_trim_items').where({ costing_version_id: version.id });
    const savedPacking = await db('costing_packing_items').where({ costing_version_id: version.id });

    res.status(201).json({
      data: { ...sheet, fabric_items: savedFabric, trim_items: savedTrim, packing_items: savedPacking },
    });
  } catch (err) { next(err); }
});

// PUT /:id - Update costing sheet with line items
router.put('/:id', async (req, res, next) => {
  try {
    const { fabric_items, trim_items, packing_items, overhead_items, ...sheetData } = req.body;

    const existing = await db('costing_sheets').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Costing sheet not found' });

    // Get the default version
    const version = await getOrCreateDefaultVersion(req.params.id);

    if (fabric_items) {
      await db('costing_fabric_items').where({ costing_version_id: version.id }).del();
      if (fabric_items.length > 0) {
        await db('costing_fabric_items').insert(
          fabric_items.map((i) => ({ ...i, costing_version_id: version.id }))
        );
      }
    }

    if (trim_items) {
      await db('costing_trim_items').where({ costing_version_id: version.id }).del();
      if (trim_items.length > 0) {
        await db('costing_trim_items').insert(
          trim_items.map((i) => ({ ...i, costing_version_id: version.id }))
        );
      }
    }

    if (packing_items) {
      await db('costing_packing_items').where({ costing_version_id: version.id }).del();
      if (packing_items.length > 0) {
        await db('costing_packing_items').insert(
          packing_items.map((i) => ({ ...i, costing_version_id: version.id }))
        );
      }
    }

    sheetData.updated_at = new Date();
    const [updated] = await db('costing_sheets')
      .where({ id: req.params.id })
      .update(sheetData)
      .returning('*');

    const savedFabric = await db('costing_fabric_items').where({ costing_version_id: version.id });
    const savedTrim = await db('costing_trim_items').where({ costing_version_id: version.id });
    const savedPacking = await db('costing_packing_items').where({ costing_version_id: version.id });

    res.json({
      data: { ...updated, fabric_items: savedFabric, trim_items: savedTrim, packing_items: savedPacking },
    });
  } catch (err) { next(err); }
});

// DELETE /:id - Delete costing sheet and all line items
router.delete('/:id', async (req, res, next) => {
  try {
    const sheet = await db('costing_sheets').where({ id: req.params.id }).first();
    if (!sheet) return res.status(404).json({ error: 'Costing sheet not found' });

    // Delete uploaded image file if exists
    if (sheet.image_url) {
      const imagePath = path.join(__dirname, '..', '..', sheet.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Cascade delete: versions → items are auto-deleted via ON DELETE CASCADE
    // But explicitly delete versions to be safe
    await db('costing_versions').where({ costing_sheet_id: req.params.id }).del();
    await db('costing_sheets').where({ id: req.params.id }).del();

    res.json({ message: 'Costing sheet deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
