/**
 * Salary Calculator Service
 * Ported from: NavoditaERP/PayrollViews/SalaryCalculator.swift
 *             + NavoditaERP/PayrollViews/StatutoryManager.swift
 *
 * Includes: PF, ESI, LWF (Haryana), Professional Tax, TDS (FY 2025-26),
 * pro-rata calculation (Grade 1-3), manual override (Grade 4-5),
 * compliance checks (Haryana Shops & Commercial Establishments Act).
 */

// ============================================================================
// Default Statutory Rates (matches StatutoryRates.default in Swift)
// ============================================================================
const DEFAULT_STATUTORY_RATES = {
  pf: {
    employeePercent: 12.0,
    employerPercent: 12.0,
    maxBasicForMandatory: 15000.0,
  },
  esi: {
    employeePercent: 0.75,
    employerPercent: 3.25,
    maxGrossForESI: 21000.0,
  },
  professionalTax: {
    Maharashtra: [
      { min: 0, max: 7500, amount: 0 },
      { min: 7501, max: 10000, amount: 175 },
      { min: 10001, max: 9999999, amount: 200 },
    ],
    Karnataka: [
      { min: 0, max: 15000, amount: 0 },
      { min: 15001, max: 9999999, amount: 200 },
    ],
  },
  minimumWages: {
    Haryana: 0,
  },
  lwf: {
    employeeContribution: 10.0,
    employerContribution: 20.0,
    minimumGrossForLWF: 10000.0,
    months: [6, 12], // June & December
    lwfPercentage: 0.2,           // 0.2% of gross
    maxEmployeeContribution: 34.0, // Cap at 34
    maxEmployerContribution: 68.0, // Cap at 68
  },
};

// ============================================================================
// PF Rules
// Provident Fund:
// - Employee: 12% of Basic (capped at 15,000 if pfCapFlag is true)
// - Employer: 12% of Basic (3.67% to EPF, 8.33% to EPS)
// ============================================================================
const PFRules = {
  EMPLOYEE_PERCENT: 12.0,
  EMPLOYER_PERCENT: 12.0,
  MAX_BASIC_FOR_MANDATORY: 15000.0,

  /**
   * @param {number} basicSalary
   * @param {number} employeePercent
   * @param {number} employerPercent
   * @param {boolean} isApplicable
   * @param {boolean} pfCapFlag - Cap wages at 15,000 if true
   * @returns {{ employee: number, employer: number }}
   */
  calculate(basicSalary, employeePercent, employerPercent, isApplicable, pfCapFlag = true) {
    if (!isApplicable) return { employee: 0, employer: 0 };

    const cappedBasic = pfCapFlag
      ? Math.min(basicSalary, this.MAX_BASIC_FOR_MANDATORY)
      : basicSalary;

    const employeeContrib = (cappedBasic * employeePercent) / 100.0;
    const employerContrib = (cappedBasic * employerPercent) / 100.0;

    return {
      employee: Math.round(employeeContrib),
      employer: Math.round(employerContrib),
    };
  },
};

// ============================================================================
// ESI Rules
// Employee State Insurance:
// - Employee: 0.75% of Gross
// - Employer: 3.25% of Gross
// - Applicable if Gross <= 21,000
// ============================================================================
const ESIRules = {
  EMPLOYEE_PERCENT: 0.75,
  EMPLOYER_PERCENT: 3.25,
  MAX_GROSS_FOR_ESI: 21000.0,

  /**
   * @param {number} grossSalary
   * @param {number} employeePercent
   * @param {number} employerPercent
   * @param {boolean} isApplicable
   * @param {number} maxGrossForESI
   * @returns {{ employee: number, employer: number }}
   */
  calculate(grossSalary, employeePercent, employerPercent, isApplicable, maxGrossForESI) {
    if (!isApplicable || grossSalary > maxGrossForESI) {
      return { employee: 0, employer: 0 };
    }

    const employeeContrib = (grossSalary * employeePercent) / 100.0;
    const employerContrib = (grossSalary * employerPercent) / 100.0;

    return {
      employee: Math.round(employeeContrib),
      employer: Math.round(employerContrib),
    };
  },
};

// ============================================================================
// Haryana LWF Rules (Updated Jan 2025)
// Labour Welfare Fund (Haryana):
// - Calculate 0.2% of Earned Gross
// - Employee contribution: Max 34 per month
// - Employer contribution: Max 68 per month
// - Applicable: Semi-annually (June & December)
// ============================================================================
const HaryanaLWFRules = {
  LWF_PERCENTAGE: 0.2,
  MAX_EMPLOYEE_CONTRIBUTION: 34.0,
  MAX_EMPLOYER_CONTRIBUTION: 68.0,

  /**
   * @param {number} month - 1-12
   * @param {object} config - LWF config from statutory rates
   * @returns {boolean}
   */
  isLWFMonth(month, config) {
    return config.months.includes(month);
  },

  /**
   * @param {number} grossSalary
   * @param {number} month
   * @param {boolean} isApplicable
   * @param {object} config - LWF config from statutory rates
   * @returns {{ employee: number, employer: number }}
   */
  calculateLWF(grossSalary, month, isApplicable, config) {
    if (
      !isApplicable ||
      grossSalary <= config.minimumGrossForLWF ||
      !this.isLWFMonth(month, config)
    ) {
      return { employee: 0, employer: 0 };
    }

    // Calculate 0.2% of gross
    const lwfPercent = config.lwfPercentage > 0 ? config.lwfPercentage : this.LWF_PERCENTAGE;
    const calculatedAmount = (grossSalary * lwfPercent) / 100.0;

    // Cap employee contribution at 34
    const employeeMax = config.maxEmployeeContribution > 0
      ? config.maxEmployeeContribution
      : this.MAX_EMPLOYEE_CONTRIBUTION;
    const employeeContrib = Math.min(calculatedAmount, employeeMax);

    // Cap employer contribution at 68 (employer typically 2x)
    const employerMax = config.maxEmployerContribution > 0
      ? config.maxEmployerContribution
      : this.MAX_EMPLOYER_CONTRIBUTION;
    const employerContrib = Math.min(calculatedAmount * 2, employerMax);

    return {
      employee: Math.round(employeeContrib),
      employer: Math.round(employerContrib),
    };
  },
};

// ============================================================================
// Professional Tax Rules
// State-based slabs (Haryana = 0, Maharashtra has slabs, Karnataka has slabs)
// ============================================================================
const ProfessionalTaxRules = {
  /**
   * @param {number} grossSalary
   * @param {string} state
   * @param {object} rates - Full statutory rates object
   * @returns {number}
   */
  calculate(grossSalary, state, rates = DEFAULT_STATUTORY_RATES) {
    const normalized = (state || '').trim().replace(/\b\w/g, (c) => c.toUpperCase());

    const slabs = rates.professionalTax[normalized];
    if (!slabs || slabs.length === 0) {
      return 0;
    }

    for (const slab of slabs) {
      if (grossSalary >= slab.min && grossSalary <= slab.max) {
        return slab.amount;
      }
    }

    return 0;
  },
};

// ============================================================================
// TDS Rules
// Tax Deducted at Source based on annual income slabs (FY 2025-26)
// Slabs: 0-2.5L = 0%, 2.5L-5L = 5%, 5L-10L = 20%, 10L+ = 30%
// + 4% Health & Education Cess
// Monthly = Annual / 12
// ============================================================================
const TDSRules = {
  /**
   * @param {number} annualTaxableIncome
   * @param {number} tdsPercent - Override percentage (0 means use slab)
   * @returns {number} Monthly TDS amount
   */
  calculateMonthlyTDS(annualTaxableIncome, tdsPercent = 0) {
    if (tdsPercent > 0) {
      return Math.round((annualTaxableIncome * tdsPercent / 100.0) / 12.0);
    }

    let tax = 0;

    if (annualTaxableIncome <= 250000) {
      tax = 0;
    } else if (annualTaxableIncome <= 500000) {
      tax = (annualTaxableIncome - 250000) * 0.05;
    } else if (annualTaxableIncome <= 1000000) {
      tax = 12500 + (annualTaxableIncome - 500000) * 0.20;
    } else {
      tax = 112500 + (annualTaxableIncome - 1000000) * 0.30;
    }

    // Add 4% Health & Education Cess
    tax = tax * 1.04;

    return Math.round(tax / 12.0);
  },
};

// ============================================================================
// Haryana Compliance Check
// Checks compliance with Haryana Shops & Commercial Establishments Act
// ============================================================================

/**
 * @typedef {Object} ComplianceWarning
 * @property {string} type
 * @property {string} message
 * @property {'Info'|'Warning'|'Critical'} severity
 */

const HaryanaComplianceCheck = {
  /**
   * Check all compliance rules for an employee.
   * @param {object} params
   * @param {number} params.daysWorked
   * @param {number} params.elBalance - Earned Leave balance
   * @param {number} params.dailyHours
   * @param {number} params.weeklyHours
   * @param {number} params.earnedGross
   * @param {number} params.perDayWage
   * @returns {ComplianceWarning[]}
   */
  checkCompliance({ daysWorked, elBalance, dailyHours, weeklyHours, earnedGross, perDayWage }) {
    const warnings = [];

    // Leave Entitlement: Flag if EL balance < (Days Worked / 20)
    const requiredEL = daysWorked / 20.0;
    if (elBalance < requiredEL) {
      warnings.push({
        type: 'Leave Entitlement',
        message: `Earned Leave balance (${elBalance.toFixed(1)}) is less than required (${requiredEL.toFixed(1)}). Minimum EL = Days Worked / 20 per Haryana S&CE Act.`,
        severity: 'Warning',
      });
    }

    // Work Hours: Flag if > 9 hours/day
    if (dailyHours > 9.0) {
      const overtimeHours = dailyHours - 9.0;
      const otRate = (perDayWage / 9.0) * 2.0; // 2x wage for overtime
      warnings.push({
        type: 'Overtime - Daily',
        message: `Duty hours (${dailyHours.toFixed(1)}h) exceed 9 hours/day limit. Overtime of ${overtimeHours.toFixed(1)}h at 2x rate (Rs.${otRate.toFixed(0)}/hr) applies.`,
        severity: 'Warning',
      });
    }

    // Work Hours: Flag if > 48 hours/week
    if (weeklyHours > 48.0) {
      const overtimeHours = weeklyHours - 48.0;
      warnings.push({
        type: 'Overtime - Weekly',
        message: `Weekly hours (${weeklyHours.toFixed(1)}h) exceed 48 hours/week limit. Overtime of ${overtimeHours.toFixed(1)}h triggered.`,
        severity: 'Warning',
      });
    }

    // LWF Reference
    warnings.push({
      type: 'LWF Circular',
      message: 'Per Haryana LWF Amendment Jan 2025: Employee max Rs.34/month, Employer max Rs.68/month (0.2% of gross with cap).',
      severity: 'Info',
    });

    return warnings;
  },

  /**
   * Calculate overtime amount at 2x wage rate.
   * @param {number} perDayWage
   * @param {number} standardHoursPerDay
   * @param {number} overtimeHours
   * @returns {number}
   */
  calculateOvertime(perDayWage, standardHoursPerDay, overtimeHours) {
    if (overtimeHours <= 0 || perDayWage <= 0 || standardHoursPerDay <= 0) return 0;
    const hourlyRate = perDayWage / standardHoursPerDay;
    const otRate = hourlyRate * 2.0; // 2x wage for overtime per Haryana Act
    return Math.round(otRate * overtimeHours);
  },
};

// ============================================================================
// SalaryBreakdown - Result object
// ============================================================================

/**
 * @typedef {Object} SalaryBreakdown
 * @property {number} totalDays
 * @property {number} daysPresent
 * @property {number} daysAbsent
 * @property {number} paidLeaveDays
 * @property {number} unpaidLeaveDays
 * @property {number} lopDays
 * @property {number} basicSalary
 * @property {number} hra
 * @property {number} fixedAllowance
 * @property {number} overtimeHours
 * @property {number} overtimeRate
 * @property {number} overtimeAmount
 * @property {number} bonus
 * @property {number} incentive
 * @property {number} arrears
 * @property {number} otherEarnings
 * @property {number} grossSalary
 * @property {number} pfEmployee
 * @property {number} pfEmployer
 * @property {number} esiEmployee
 * @property {number} esiEmployer
 * @property {number} lwfEmployee
 * @property {number} lwfEmployer
 * @property {number} professionalTax
 * @property {number} tds
 * @property {number} advanceDeduction
 * @property {number} loanDeduction
 * @property {number} otherDeductions
 * @property {number} totalDeductions
 * @property {number} netPay
 * @property {number} totalEarnings - computed
 * @property {number} employerCost - computed
 */

function createSalaryBreakdown(data) {
  return {
    ...data,
    get totalEarnings() {
      return this.basicSalary + this.hra + this.fixedAllowance + this.overtimeAmount +
        this.bonus + this.incentive + this.arrears + this.otherEarnings;
    },
    get employerCost() {
      return this.grossSalary + this.pfEmployer + this.esiEmployer + this.lwfEmployer;
    },
  };
}

// ============================================================================
// Salary Calculator
// ============================================================================

/**
 * Get the number of days in a given month/year.
 * @param {number} month - 1-12
 * @param {number} year
 * @returns {number}
 */
function daysInMonth(month, year) {
  // Day 0 of next month = last day of this month
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate salary - Method A: Pro-rata for Grade 1-3.
 * Formula: Earned_Component = (Fixed_Component / Total_Days) * Payable_Days
 *
 * @param {object} params
 * @param {object} params.employee - Employee data object
 * @param {number} params.employee.basicSalary
 * @param {number} params.employee.hra
 * @param {number} params.employee.fixedAllowance
 * @param {number} params.employee.monthlyCtc
 * @param {number} params.employee.perDaySalary
 * @param {number} params.employee.grade - 1-5
 * @param {string} params.employee.state
 * @param {boolean} params.employee.isPFApplicable
 * @param {boolean} params.employee.isESIApplicable
 * @param {boolean} params.employee.isLWFApplicable
 * @param {number} params.employee.pfEmployeePercent - override (0 = use default)
 * @param {number} params.employee.pfEmployerPercent
 * @param {number} params.employee.esiEmployeePercent
 * @param {number} params.employee.esiEmployerPercent
 * @param {number} params.employee.tdsPercent
 * @param {number} params.month - 1-12
 * @param {number} params.year
 * @param {number} params.daysPresent
 * @param {number} [params.paidLeaveDays=0]
 * @param {number} [params.unpaidLeaveDays=0]
 * @param {number} [params.lopDays=0]
 * @param {number} [params.overtimeHours=0]
 * @param {number} [params.overtimeRate=0]
 * @param {number} [params.bonus=0]
 * @param {number} [params.incentive=0]
 * @param {number} [params.arrears=0]
 * @param {number} [params.otherEarnings=0]
 * @param {number} [params.advanceDeduction=0]
 * @param {number} [params.loanDeduction=0]
 * @param {number} [params.otherDeductions=0]
 * @param {object} [params.rates] - Statutory rates override
 * @returns {SalaryBreakdown}
 */
function calculateSalary({
  employee,
  month,
  year,
  daysPresent,
  paidLeaveDays = 0,
  unpaidLeaveDays = 0,
  lopDays = 0,
  overtimeHours = 0,
  overtimeRate = 0,
  bonus = 0,
  incentive = 0,
  arrears = 0,
  otherEarnings = 0,
  advanceDeduction = 0,
  loanDeduction = 0,
  otherDeductions = 0,
  rates = DEFAULT_STATUTORY_RATES,
}) {
  const totalDays = daysInMonth(month, year);

  // Get employee salary structure
  let basicMonthly = employee.basicSalary || 0;
  let hraMonthly = employee.hra || 0;
  let fixedAllowanceMonthly = employee.fixedAllowance || 0;

  // If no salary breakdown exists, derive from monthlyCtc
  if (basicMonthly === 0 && hraMonthly === 0 && fixedAllowanceMonthly === 0) {
    const ctc = employee.monthlyCtc || 0;
    if (ctc > 0) {
      basicMonthly = ctc * 0.50;
      hraMonthly = ctc * 0.20;
      fixedAllowanceMonthly = ctc * 0.30;
    } else if ((employee.perDaySalary || 0) > 0) {
      basicMonthly = employee.perDaySalary * totalDays;
    }
  }

  // Minimum wage enforcement for attendance-based grades (1-3)
  const grade = employee.grade || 0;
  if (grade >= 1 && grade <= 3) {
    const state = (employee.state || 'Haryana').trim().replace(/\b\w/g, (c) => c.toUpperCase());
    const minPerDay = rates.minimumWages[state] || 0;
    if ((employee.perDaySalary || 0) > 0 || minPerDay > 0) {
      const perDay = Math.max(employee.perDaySalary || 0, minPerDay);
      basicMonthly = perDay * totalDays;
      hraMonthly = 0;
      fixedAllowanceMonthly = 0;
    }
  }

  // Pro-rata: Payable_Days = daysPresent + paidLeaveDays
  const effectiveWorkDays = daysPresent + paidLeaveDays;
  const workRatio = Math.min(effectiveWorkDays / totalDays, 1.0);

  // Earned_Component = (Fixed_Component / Total_Days) * Payable_Days
  const basic = Math.round(basicMonthly * workRatio);
  const hra = Math.round(hraMonthly * workRatio);
  const fixedAllowance = Math.round(fixedAllowanceMonthly * workRatio);

  // Overtime
  const overtimeAmount = Math.round(overtimeHours * overtimeRate);

  // Gross Salary
  const grossSalary = basic + hra + fixedAllowance + overtimeAmount + bonus + incentive + arrears + otherEarnings;

  // PF Calculation (with cap flag)
  const pfEmployeePercent = (employee.pfEmployeePercent || 0) > 0
    ? employee.pfEmployeePercent : rates.pf.employeePercent;
  const pfEmployerPercent = (employee.pfEmployerPercent || 0) > 0
    ? employee.pfEmployerPercent : rates.pf.employerPercent;

  const pfResult = PFRules.calculate(
    basic,
    pfEmployeePercent,
    pfEmployerPercent,
    !!employee.isPFApplicable,
    true, // pfCapFlag - Cap wages at 15,000
  );

  // ESI Calculation
  const esiEmployeePercent = (employee.esiEmployeePercent || 0) > 0
    ? employee.esiEmployeePercent : rates.esi.employeePercent;
  const esiEmployerPercent = (employee.esiEmployerPercent || 0) > 0
    ? employee.esiEmployerPercent : rates.esi.employerPercent;

  const esiResult = ESIRules.calculate(
    grossSalary,
    esiEmployeePercent,
    esiEmployerPercent,
    !!employee.isESIApplicable,
    rates.esi.maxGrossForESI,
  );

  // LWF Calculation (Haryana - 0.2% with caps)
  const lwfResult = HaryanaLWFRules.calculateLWF(
    grossSalary,
    month,
    !!employee.isLWFApplicable,
    rates.lwf,
  );

  // Professional Tax (N/A for Haryana)
  const professionalTax = ProfessionalTaxRules.calculate(
    grossSalary,
    employee.state || 'Haryana',
    rates,
  );

  // TDS
  const annualGross = grossSalary * 12;
  const tds = TDSRules.calculateMonthlyTDS(
    annualGross,
    employee.tdsPercent || 0,
  );

  // Total Deductions
  const totalDeductions = pfResult.employee + esiResult.employee + lwfResult.employee +
    professionalTax + tds + advanceDeduction + loanDeduction + otherDeductions;

  // Net Pay
  const netPay = grossSalary - totalDeductions;

  return createSalaryBreakdown({
    totalDays,
    daysPresent,
    daysAbsent: totalDays - daysPresent - paidLeaveDays,
    paidLeaveDays,
    unpaidLeaveDays,
    lopDays,
    basicSalary: basic,
    hra,
    fixedAllowance,
    overtimeHours,
    overtimeRate,
    overtimeAmount,
    bonus,
    incentive,
    arrears,
    otherEarnings,
    grossSalary,
    pfEmployee: pfResult.employee,
    pfEmployer: pfResult.employer,
    esiEmployee: esiResult.employee,
    esiEmployer: esiResult.employer,
    lwfEmployee: lwfResult.employee,
    lwfEmployer: lwfResult.employer,
    professionalTax,
    tds,
    advanceDeduction,
    loanDeduction,
    otherDeductions,
    totalDeductions,
    netPay,
  });
}

/**
 * Calculate salary - Method B: Manual Override for Grade 4-5.
 * Manually entered actual amounts are treated as final "Earned" figures.
 * PF, ESI, LWF are auto-calculated from these manually entered amounts.
 *
 * @param {object} params
 * @param {object} params.employee
 * @param {number} params.month
 * @param {number} params.year
 * @param {number} params.actualBasic
 * @param {number} [params.actualHRA=0]
 * @param {number} params.actualFixedAllowance
 * @param {number} [params.overtimeHours=0]
 * @param {number} [params.overtimeRate=0]
 * @param {number} [params.bonus=0]
 * @param {number} [params.incentive=0]
 * @param {number} [params.arrears=0]
 * @param {number} [params.otherEarnings=0]
 * @param {number} [params.advanceDeduction=0]
 * @param {number} [params.loanDeduction=0]
 * @param {number} [params.otherDeductions=0]
 * @param {object} [params.rates]
 * @returns {SalaryBreakdown}
 */
function calculateSalaryManual({
  employee,
  month,
  year,
  actualBasic,
  actualHRA = 0,
  actualFixedAllowance,
  overtimeHours = 0,
  overtimeRate = 0,
  bonus = 0,
  incentive = 0,
  arrears = 0,
  otherEarnings = 0,
  advanceDeduction = 0,
  loanDeduction = 0,
  otherDeductions = 0,
  rates = DEFAULT_STATUTORY_RATES,
}) {
  const totalDays = daysInMonth(month, year);

  // Use manually entered amounts as final earned figures
  const basic = Math.round(actualBasic);
  const hra = Math.round(actualHRA);
  const fixedAllowance = Math.round(actualFixedAllowance);

  // Overtime
  const overtimeAmount = Math.round(overtimeHours * overtimeRate);

  // Gross from manually entered amounts
  const grossSalary = basic + hra + fixedAllowance + overtimeAmount + bonus + incentive + arrears + otherEarnings;

  // PF derived from manually entered basic (with cap)
  const pfEmployeePercent = (employee.pfEmployeePercent || 0) > 0
    ? employee.pfEmployeePercent : rates.pf.employeePercent;
  const pfEmployerPercent = (employee.pfEmployerPercent || 0) > 0
    ? employee.pfEmployerPercent : rates.pf.employerPercent;

  const pfResult = PFRules.calculate(
    basic,
    pfEmployeePercent,
    pfEmployerPercent,
    !!employee.isPFApplicable,
    true,
  );

  // ESI derived from manually entered gross
  const esiEmployeePercent = (employee.esiEmployeePercent || 0) > 0
    ? employee.esiEmployeePercent : rates.esi.employeePercent;
  const esiEmployerPercent = (employee.esiEmployerPercent || 0) > 0
    ? employee.esiEmployerPercent : rates.esi.employerPercent;

  const esiResult = ESIRules.calculate(
    grossSalary,
    esiEmployeePercent,
    esiEmployerPercent,
    !!employee.isESIApplicable,
    rates.esi.maxGrossForESI,
  );

  // LWF derived from manually entered gross
  const lwfResult = HaryanaLWFRules.calculateLWF(
    grossSalary,
    month,
    !!employee.isLWFApplicable,
    rates.lwf,
  );

  // Professional Tax (N/A for Haryana)
  const professionalTax = ProfessionalTaxRules.calculate(
    grossSalary,
    employee.state || 'Haryana',
    rates,
  );

  // TDS
  const annualGross = grossSalary * 12;
  const tds = TDSRules.calculateMonthlyTDS(
    annualGross,
    employee.tdsPercent || 0,
  );

  // Total Deductions
  const totalDeductions = pfResult.employee + esiResult.employee + lwfResult.employee +
    professionalTax + tds + advanceDeduction + loanDeduction + otherDeductions;

  // Net Pay
  const netPay = grossSalary - totalDeductions;

  return createSalaryBreakdown({
    totalDays,
    daysPresent: totalDays, // Full month for manual entry
    daysAbsent: 0,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    lopDays: 0,
    basicSalary: basic,
    hra,
    fixedAllowance,
    overtimeHours,
    overtimeRate,
    overtimeAmount,
    bonus,
    incentive,
    arrears,
    otherEarnings,
    grossSalary,
    pfEmployee: pfResult.employee,
    pfEmployer: pfResult.employer,
    esiEmployee: esiResult.employee,
    esiEmployer: esiResult.employer,
    lwfEmployee: lwfResult.employee,
    lwfEmployer: lwfResult.employer,
    professionalTax,
    tds,
    advanceDeduction,
    loanDeduction,
    otherDeductions,
    totalDeductions,
    netPay,
  });
}

module.exports = {
  DEFAULT_STATUTORY_RATES,
  PFRules,
  ESIRules,
  HaryanaLWFRules,
  ProfessionalTaxRules,
  TDSRules,
  HaryanaComplianceCheck,
  calculateSalary,
  calculateSalaryManual,
  daysInMonth,
};
