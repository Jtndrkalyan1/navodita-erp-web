const db = require('../config/database');
const { calculateSalary, calculateSalaryManual, daysInMonth } = require('../services/salary.service');

/**
 * GET / - List salary records with employee name
 */
const list = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 50, search, sort_by, sort_order = 'desc',
      employee_id, month, year, department_id, status,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = db('salary_records')
      .leftJoin('employees', 'salary_records.employee_id', 'employees.id')
      .leftJoin('departments', 'employees.department_id', 'departments.id')
      .select(
        'salary_records.*',
        'employees.employee_id as employee_code',
        'employees.first_name',
        'employees.last_name',
        'employees.display_name as employee_name',
        'employees.designation',
        'departments.name as department_name'
      );

    if (employee_id) query = query.where('salary_records.employee_id', employee_id);
    if (month) query = query.where('salary_records.month', parseInt(month));
    if (year) query = query.where('salary_records.year', parseInt(year));
    if (status) query = query.where('salary_records.status', status);
    if (department_id) query = query.where('employees.department_id', department_id);

    if (search) {
      query = query.where(function () {
        this.where('employees.first_name', 'ilike', `%${search}%`)
          .orWhere('employees.last_name', 'ilike', `%${search}%`)
          .orWhere('employees.employee_id', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('salary_records.id');
    const data = await query
      .orderBy(sort_by ? `salary_records.${sort_by}` : 'salary_records.created_at', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /:id - Get salary record by ID with full breakdown
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const record = await db('salary_records')
      .leftJoin('employees', 'salary_records.employee_id', 'employees.id')
      .leftJoin('departments', 'employees.department_id', 'departments.id')
      .select(
        'salary_records.*',
        'employees.employee_id as employee_code',
        'employees.first_name',
        'employees.last_name',
        'employees.display_name as employee_name',
        'employees.designation',
        'employees.grade',
        'employees.bank_name',
        'employees.bank_account_number',
        'employees.bank_ifsc_code',
        'departments.name as department_name'
      )
      .where('salary_records.id', id)
      .first();

    if (!record) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    res.json({ data: record });
  } catch (err) {
    next(err);
  }
};

/**
 * POST / - Create salary record manually
 */
const create = async (req, res, next) => {
  try {
    const salaryData = req.body;

    if (!salaryData.employee_id || !salaryData.month || !salaryData.year) {
      return res.status(400).json({ error: 'Employee, month, and year are required' });
    }

    // Check for existing record
    const existing = await db('salary_records')
      .where({
        employee_id: salaryData.employee_id,
        month: salaryData.month,
        year: salaryData.year,
      })
      .first();

    if (existing) {
      return res.status(409).json({ error: 'Salary record already exists for this employee/month/year' });
    }

    const [record] = await db('salary_records')
      .insert(salaryData)
      .returning('*');

    res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /generate - Generate salary for employee + month + year using salary.service.js
 */
const generate = async (req, res, next) => {
  try {
    const { employee_id, employee_ids, month, year, department_id, days_present, paid_leave_days = 0, overtime_hours = 0, overtime_rate = 0, bonus = 0, incentive = 0, arrears = 0 } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    // Get employees to generate for
    let employeeQuery = db('employees').where({ is_active: true });

    if (employee_ids && Array.isArray(employee_ids) && employee_ids.length > 0) {
      // Frontend sends an array of selected employee IDs
      employeeQuery = employeeQuery.whereIn('id', employee_ids);
    } else if (employee_id) {
      // Single employee_id for backward compatibility
      employeeQuery = employeeQuery.where({ id: employee_id });
    }
    if (department_id) {
      employeeQuery = employeeQuery.where({ department_id });
    }

    const employees = await employeeQuery;

    if (employees.length === 0) {
      return res.status(404).json({ error: 'No active employees found' });
    }

    const generated = [];
    const errors = [];
    const totalDays = daysInMonth(month, year);

    for (const emp of employees) {
      // Check if record already exists
      const existing = await db('salary_records')
        .where({ employee_id: emp.id, month: parseInt(month), year: parseInt(year) })
        .first();

      if (existing) {
        errors.push({ employee_id: emp.employee_id, error: 'Record already exists' });
        continue;
      }

      const empDaysPresent = days_present !== undefined ? days_present : totalDays;
      const grade = emp.grade || 3;

      let breakdown;

      // Use the salary service to calculate
      const employeeData = {
        basicSalary: parseFloat(emp.basic_salary) || 0,
        hra: parseFloat(emp.hra) || 0,
        fixedAllowance: (parseFloat(emp.special_allowance) || 0) + (parseFloat(emp.other_allowance) || 0),
        monthlyCtc: parseFloat(emp.ctc) ? parseFloat(emp.ctc) / 12 : 0,
        perDaySalary: 0,
        grade,
        state: emp.current_state || 'Haryana',
        isPFApplicable: emp.is_pf_applicable,
        isESIApplicable: emp.is_esi_applicable,
        isLWFApplicable: true,
        pfEmployeePercent: 0,
        pfEmployerPercent: 0,
        esiEmployeePercent: 0,
        esiEmployerPercent: 0,
        tdsPercent: 0,
      };

      if (grade >= 4) {
        // Manual override for Grade 4-5
        breakdown = calculateSalaryManual({
          employee: employeeData,
          month: parseInt(month),
          year: parseInt(year),
          actualBasic: employeeData.basicSalary,
          actualHRA: employeeData.hra,
          actualFixedAllowance: employeeData.fixedAllowance,
          overtimeHours: overtime_hours,
          overtimeRate: overtime_rate,
          bonus,
          incentive,
          arrears,
        });
      } else {
        // Pro-rata for Grade 1-3
        breakdown = calculateSalary({
          employee: employeeData,
          month: parseInt(month),
          year: parseInt(year),
          daysPresent: empDaysPresent,
          paidLeaveDays: paid_leave_days,
          overtimeHours: overtime_hours,
          overtimeRate: overtime_rate,
          bonus,
          incentive,
          arrears,
        });
      }

      const salaryRecord = {
        employee_id: emp.id,
        month: parseInt(month),
        year: parseInt(year),
        status: 'Draft',
        total_working_days: totalDays,
        days_present: breakdown.daysPresent,
        days_absent: breakdown.daysAbsent,
        leave_days: breakdown.paidLeaveDays,
        overtime_hours: breakdown.overtimeHours,
        loss_of_pay_days: breakdown.lopDays,
        basic_salary: breakdown.basicSalary,
        hra: breakdown.hra,
        special_allowance: breakdown.fixedAllowance,
        overtime_pay: breakdown.overtimeAmount,
        bonus: breakdown.bonus,
        incentive: breakdown.incentive,
        arrears: breakdown.arrears,
        gross_earnings: breakdown.grossSalary,
        pf_employee: breakdown.pfEmployee,
        pf_employer: breakdown.pfEmployer,
        esi_employee: breakdown.esiEmployee,
        esi_employer: breakdown.esiEmployer,
        professional_tax: breakdown.professionalTax,
        income_tax: breakdown.tds,
        total_deductions: breakdown.totalDeductions,
        net_salary: breakdown.netPay,
      };

      const [record] = await db('salary_records')
        .insert(salaryRecord)
        .returning('*');

      generated.push(record);
    }

    res.status(201).json({
      data: generated,
      generated: generated.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id - Update salary record
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const salaryData = req.body;

    const existing = await db('salary_records').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    if (existing.status === 'Paid') {
      return res.status(400).json({ error: 'Cannot update a paid salary record' });
    }

    salaryData.updated_at = new Date();

    const [updated] = await db('salary_records')
      .where({ id })
      .update(salaryData)
      .returning('*');

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /:id - Delete salary record (only if Draft)
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const record = await db('salary_records').where({ id }).first();
    if (!record) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    if (record.status !== 'Draft') {
      return res.status(400).json({ error: `Cannot delete salary record with status "${record.status}". Only Draft records can be deleted.` });
    }

    await db('salary_records').where({ id }).del();
    res.json({ message: 'Salary record deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, generate, update, remove };
