/**
 * Payment Terms
 * Ported from: NavoditaERP/PaymentTerm.swift
 *
 * Standard payment term options: 15, 30, 45, 60, 90 days.
 */

const PAYMENT_TERMS = [
  { days: 15, label: '15 Days' },
  { days: 30, label: '30 Days' },
  { days: 45, label: '45 Days' },
  { days: 60, label: '60 Days' },
  { days: 90, label: '90 Days' },
];

module.exports = {
  PAYMENT_TERMS,
};
