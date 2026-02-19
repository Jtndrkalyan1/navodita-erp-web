/**
 * Invoice Helper Service
 * Ported from: NavoditaERP/Invoice+Helpers.swift
 *
 * Balance due, overdue detection, days until due calculations.
 */

/**
 * Calculate balance due on an invoice.
 * balanceDue = max(totalAmount - paidAmount, 0)
 *
 * @param {number} totalAmount
 * @param {number} paidAmount
 * @returns {number} Balance due (never negative)
 */
function balanceDue(totalAmount, paidAmount) {
  return Math.max((totalAmount || 0) - (paidAmount || 0), 0);
}

/**
 * Check if an invoice is overdue.
 * An invoice is overdue if: dueDate < today AND status is not 'Paid' or 'Cancelled'.
 *
 * @param {Date|string} dueDate - Due date
 * @param {string} status - Invoice status
 * @returns {boolean} true if overdue
 */
function isOverdue(dueDate, status) {
  if (!dueDate) return false;

  const due = new Date(dueDate);
  const today = new Date();

  // Compare start-of-day (strip time)
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return due < today && status !== 'Paid' && status !== 'Cancelled';
}

/**
 * Calculate days until due date.
 * Positive = days remaining, negative = days overdue, 0 = due today.
 * Returns null if no due date.
 *
 * @param {Date|string} dueDate
 * @returns {number|null} Integer days (negative = overdue)
 */
function daysUntilDue(dueDate) {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  const today = new Date();

  // Compare start-of-day (strip time)
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

module.exports = {
  balanceDue,
  isOverdue,
  daysUntilDue,
};
