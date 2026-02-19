const db = require('../config/database');

async function generateOfferNumber() {
  const year = new Date().getFullYear();
  const [result] = await db('offer_letters')
    .where('offer_number', 'like', `OL-${year}-%`)
    .count();
  const nextNum = parseInt(result.count) + 1;
  return `OL-${year}-${String(nextNum).padStart(4, '0')}`;
}

const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', status } = req.query;
    const offset = (page - 1) * limit;
    let query = db('offer_letters').select('*');
    if (status) query = query.where('status', status);
    if (search) {
      query = query.where(function () {
        this.where('candidate_name', 'ilike', `%${search}%`)
          .orWhere('offer_number', 'ilike', `%${search}%`)
          .orWhere('position', 'ilike', `%${search}%`)
          .orWhere('department', 'ilike', `%${search}%`);
      });
    }
    const [{ count }] = await query.clone().clearSelect().count('id');
    const data = await query
      .orderBy(sort_by || 'created_at', sort_order)
      .limit(limit).offset(offset);
    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const row = await db('offer_letters').where({ id: req.params.id }).first();
    if (!row) return res.status(404).json({ error: 'Offer letter not found' });
    res.json({ data: row });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.candidate_name || !data.position) {
      return res.status(400).json({ error: 'Candidate name and position are required' });
    }
    if (!data.offer_number) data.offer_number = await generateOfferNumber();
    // Auto-calculate CTC
    const basic = parseFloat(data.basic_salary) || 0;
    const hra = parseFloat(data.hra) || 0;
    const ca = parseFloat(data.conveyance_allowance) || 0;
    const sa = parseFloat(data.special_allowance) || 0;
    const ma = parseFloat(data.medical_allowance) || 0;
    const epf = parseFloat(data.employer_pf) || 0;
    const esi = parseFloat(data.employer_esi) || 0;
    if (!data.ctc_amount || parseFloat(data.ctc_amount) === 0) {
      data.ctc_amount = basic + hra + ca + sa + ma + epf + esi;
    }
    const [row] = await db('offer_letters').insert(data).returning('*');
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const existing = await db('offer_letters').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Offer letter not found' });
    const data = req.body;
    data.updated_at = new Date();
    // Recalculate CTC if salary fields changed
    if (data.basic_salary !== undefined) {
      const basic = parseFloat(data.basic_salary ?? existing.basic_salary) || 0;
      const hra = parseFloat(data.hra ?? existing.hra) || 0;
      const ca = parseFloat(data.conveyance_allowance ?? existing.conveyance_allowance) || 0;
      const sa = parseFloat(data.special_allowance ?? existing.special_allowance) || 0;
      const ma = parseFloat(data.medical_allowance ?? existing.medical_allowance) || 0;
      const epf = parseFloat(data.employer_pf ?? existing.employer_pf) || 0;
      const esi = parseFloat(data.employer_esi ?? existing.employer_esi) || 0;
      data.ctc_amount = basic + hra + ca + sa + ma + epf + esi;
    }
    const [row] = await db('offer_letters').where({ id: req.params.id }).update(data).returning('*');
    res.json({ data: row });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const existing = await db('offer_letters').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Offer letter not found' });
    await db('offer_letters').where({ id: req.params.id }).del();
    res.json({ message: 'Offer letter deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove };
