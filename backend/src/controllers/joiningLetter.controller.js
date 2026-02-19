const db = require('../config/database');

async function generateJoiningNumber() {
  const year = new Date().getFullYear();
  const [result] = await db('joining_letters')
    .where('joining_number', 'like', `JL-${year}-%`)
    .count();
  const nextNum = parseInt(result.count) + 1;
  return `JL-${year}-${String(nextNum).padStart(4, '0')}`;
}

const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sort_by, sort_order = 'desc', status } = req.query;
    const offset = (page - 1) * limit;
    let query = db('joining_letters').select('*');
    if (status) query = query.where('status', status);
    if (search) {
      query = query.where(function () {
        this.where('employee_name', 'ilike', `%${search}%`)
          .orWhere('joining_number', 'ilike', `%${search}%`)
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
    const row = await db('joining_letters').where({ id: req.params.id }).first();
    if (!row) return res.status(404).json({ error: 'Joining letter not found' });
    res.json({ data: row });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.employee_name || !data.position || !data.date_of_joining) {
      return res.status(400).json({ error: 'Employee name, position, and date of joining are required' });
    }
    if (!data.joining_number) data.joining_number = await generateJoiningNumber();
    const [row] = await db('joining_letters').insert(data).returning('*');
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const existing = await db('joining_letters').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Joining letter not found' });
    const data = req.body;
    data.updated_at = new Date();
    const [row] = await db('joining_letters').where({ id: req.params.id }).update(data).returning('*');
    res.json({ data: row });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const existing = await db('joining_letters').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Joining letter not found' });
    await db('joining_letters').where({ id: req.params.id }).del();
    res.json({ message: 'Joining letter deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove };
