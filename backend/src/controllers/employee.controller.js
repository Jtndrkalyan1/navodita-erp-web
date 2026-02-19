const db = require('../config/database');

/**
 * Generate next employee code like EMP-0001
 */
async function generateEmployeeCode() {
  const [{ count }] = await db('employees').count();
  const nextNum = parseInt(count) + 1;
  return `EMP-${String(nextNum).padStart(4, '0')}`;
}

/**
 * GET / - List all employees with pagination, search, filters
 */
const list = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 50, search, sort_by, sort_order = 'desc',
      is_active, department_id, employment_status, grade,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = db('employees')
      .leftJoin('departments', 'employees.department_id', 'departments.id')
      .select(
        'employees.*',
        'departments.name as department_name'
      );

    if (is_active !== undefined) {
      query = query.where('employees.is_active', is_active === 'true');
    }

    if (department_id) {
      query = query.where('employees.department_id', department_id);
    }

    if (employment_status) {
      query = query.where('employees.employment_status', employment_status);
    }

    if (grade) {
      query = query.where('employees.grade', parseInt(grade));
    }

    if (search) {
      query = query.where(function () {
        this.where('employees.first_name', 'ilike', `%${search}%`)
          .orWhere('employees.last_name', 'ilike', `%${search}%`)
          .orWhere('employees.display_name', 'ilike', `%${search}%`)
          .orWhere('employees.employee_id', 'ilike', `%${search}%`)
          .orWhere('employees.designation', 'ilike', `%${search}%`)
          .orWhere('employees.work_email', 'ilike', `%${search}%`)
          .orWhere('employees.mobile_number', 'ilike', `%${search}%`)
          .orWhere('departments.name', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('employees.id');
    const data = await query
      .orderBy(sort_by === 'name' ? 'employees.first_name' : (sort_by ? `employees.${sort_by}` : 'employees.created_at'), sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /:id - Get employee by ID with department details
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const employee = await db('employees')
      .leftJoin('departments', 'employees.department_id', 'departments.id')
      .select('employees.*', 'departments.name as department_name')
      .where('employees.id', id)
      .first();

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get reporting manager info
    let reportingManager = null;
    if (employee.reporting_manager_id) {
      reportingManager = await db('employees')
        .select('id', 'employee_id', 'first_name', 'last_name', 'display_name', 'designation')
        .where({ id: employee.reporting_manager_id })
        .first();
    }

    // Get recent salary records
    const recentSalaries = await db('salary_records')
      .where({ employee_id: id })
      .orderBy('year', 'desc')
      .orderBy('month', 'desc')
      .limit(6);

    // Get active advances
    const advances = await db('advances')
      .where({ employee_id: id, status: 'Active' });

    res.json({
      data: {
        ...employee,
        reporting_manager: reportingManager,
        recent_salaries: recentSalaries,
        active_advances: advances,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST / - Create employee
 */
const create = async (req, res, next) => {
  try {
    const employeeData = req.body;

    if (!employeeData.first_name || !employeeData.last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Auto-generate employee code if not provided
    if (!employeeData.employee_id) {
      employeeData.employee_id = await generateEmployeeCode();
    }

    // Auto-generate display name if not provided
    if (!employeeData.display_name) {
      employeeData.display_name = `${employeeData.first_name} ${employeeData.last_name}`.trim();
    }

    // Calculate gross salary if components are provided
    const basic = parseFloat(employeeData.basic_salary) || 0;
    const hra = parseFloat(employeeData.hra) || 0;
    const da = parseFloat(employeeData.dearness_allowance) || 0;
    const ca = parseFloat(employeeData.conveyance_allowance) || 0;
    const ma = parseFloat(employeeData.medical_allowance) || 0;
    const sa = parseFloat(employeeData.special_allowance) || 0;
    const oa = parseFloat(employeeData.other_allowance) || 0;

    if (basic > 0 && !employeeData.gross_salary) {
      employeeData.gross_salary = basic + hra + da + ca + ma + sa + oa;
    }

    const [employee] = await db('employees')
      .insert(employeeData)
      .returning('*');

    res.status(201).json({ data: employee });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id - Update employee
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employeeData = req.body;

    const existing = await db('employees').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Recalculate gross if salary components changed
    if (employeeData.basic_salary !== undefined) {
      const basic = parseFloat(employeeData.basic_salary ?? existing.basic_salary) || 0;
      const hra = parseFloat(employeeData.hra ?? existing.hra) || 0;
      const da = parseFloat(employeeData.dearness_allowance ?? existing.dearness_allowance) || 0;
      const ca = parseFloat(employeeData.conveyance_allowance ?? existing.conveyance_allowance) || 0;
      const ma = parseFloat(employeeData.medical_allowance ?? existing.medical_allowance) || 0;
      const sa = parseFloat(employeeData.special_allowance ?? existing.special_allowance) || 0;
      const oa = parseFloat(employeeData.other_allowance ?? existing.other_allowance) || 0;
      employeeData.gross_salary = basic + hra + da + ca + ma + sa + oa;
    }

    employeeData.updated_at = new Date();

    const [updated] = await db('employees')
      .where({ id })
      .update(employeeData)
      .returning('*');

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /:id - Soft delete employee
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const employee = await db('employees').where({ id }).first();
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check for unpaid salary records
    const [{ count }] = await db('salary_records')
      .where({ employee_id: id })
      .whereIn('status', ['Processed', 'Approved'])
      .count();

    if (parseInt(count) > 0) {
      return res.status(409).json({
        error: `Cannot delete employee with ${count} unpaid salary record(s). Process payments first.`,
      });
    }

    await db('employees')
      .where({ id })
      .update({ is_active: false, employment_status: 'Relieved', updated_at: new Date() });

    res.json({ message: 'Employee deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
