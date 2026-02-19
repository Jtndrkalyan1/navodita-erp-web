const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ============================================================
// GET /hsn/search - Search HSN/SAC codes by code or description
// ============================================================

router.get('/search', async (req, res, next) => {
  try {
    const { q = '', limit = 20, chapter, section, gst_rate } = req.query;
    const searchLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const searchTerm = q.trim();

    if (!searchTerm && !chapter && !section && gst_rate === undefined) {
      // Return all codes with pagination when no filters
      const data = await db('hsn_codes')
        .orderBy('hsn_code', 'asc')
        .limit(searchLimit);

      const [{ count }] = await db('hsn_codes').count();

      return res.json({
        data,
        total: parseInt(count),
        query: searchTerm,
      });
    }

    // Determine if the search term looks like an HSN code (all digits)
    const isCodeSearch = /^\d+$/.test(searchTerm);

    let query = db('hsn_codes');

    if (searchTerm) {
      if (isCodeSearch) {
        // Search by code prefix match
        query = query.where(function () {
          this.where('hsn_code', searchTerm) // exact match first
            .orWhere('hsn_code', 'like', `${searchTerm}%`); // prefix match
        });
      } else {
        // Search by description (case-insensitive)
        query = query.where(function () {
          this.where('description', 'ilike', `%${searchTerm}%`)
            .orWhere('hsn_code', 'ilike', `%${searchTerm}%`)
            .orWhere('notes', 'ilike', `%${searchTerm}%`);
        });
      }
    }

    // Apply filters
    if (chapter) {
      query = query.where('chapter', chapter);
    }
    if (section) {
      query = query.where('section', section);
    }
    if (gst_rate !== undefined && gst_rate !== '') {
      query = query.where('gst_rate', parseFloat(gst_rate));
    }

    // Count total results
    const [{ count }] = await query.clone().count();

    // Get results with relevance sorting
    let data;
    if (isCodeSearch && searchTerm) {
      // For code searches, sort exact matches first, then prefix matches
      data = await query
        .orderByRaw(`
          CASE
            WHEN hsn_code = ? THEN 0
            WHEN hsn_code LIKE ? THEN 1
            ELSE 2
          END, hsn_code ASC
        `, [searchTerm, `${searchTerm}%`])
        .limit(searchLimit);
    } else {
      data = await query
        .orderBy('hsn_code', 'asc')
        .limit(searchLimit);
    }

    res.json({
      data,
      total: parseInt(count),
      query: searchTerm,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /hsn/chapters - Get distinct chapters for filter dropdown
// ============================================================

router.get('/chapters', async (req, res, next) => {
  try {
    const chapters = await db('hsn_codes')
      .distinct('chapter', 'section')
      .orderBy('chapter', 'asc');

    res.json({ data: chapters });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /hsn/stats - Get summary statistics
// ============================================================

router.get('/stats', async (req, res, next) => {
  try {
    const [{ count: totalCodes }] = await db('hsn_codes').count();
    const gstBreakdown = await db('hsn_codes')
      .select('gst_rate')
      .count('* as count')
      .groupBy('gst_rate')
      .orderBy('gst_rate', 'asc');

    const sectionBreakdown = await db('hsn_codes')
      .select('section')
      .count('* as count')
      .groupBy('section')
      .orderBy('section', 'asc');

    res.json({
      data: {
        totalCodes: parseInt(totalCodes),
        gstBreakdown: gstBreakdown.map((r) => ({
          gst_rate: parseFloat(r.gst_rate),
          count: parseInt(r.count),
        })),
        sectionBreakdown: sectionBreakdown.map((r) => ({
          section: r.section,
          count: parseInt(r.count),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /hsn/:code - Get exact HSN/SAC code lookup
// ============================================================

router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    // Try exact match first
    let result = await db('hsn_codes').where('hsn_code', code).first();

    if (!result) {
      // Try prefix match to find related codes
      const relatedCodes = await db('hsn_codes')
        .where('hsn_code', 'like', `${code}%`)
        .orderBy('hsn_code', 'asc')
        .limit(10);

      if (relatedCodes.length === 0) {
        return res.status(404).json({
          error: `HSN/SAC code '${code}' not found`,
          suggestion: 'Try searching with a broader term using /api/hsn/search?q=...',
        });
      }

      return res.json({
        data: null,
        related: relatedCodes,
        message: `Exact code '${code}' not found, showing related codes`,
      });
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
