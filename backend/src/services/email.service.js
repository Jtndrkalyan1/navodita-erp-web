const nodemailer = require('nodemailer');
const { getCompanyProfile } = require('../utils/getCompanyProfile');

/**
 * Email Service
 *
 * Uses nodemailer for sending emails with SMTP configuration from environment
 * variables. Falls back to returning a mailto: link if SMTP is not configured.
 * The "from" name is derived from the company_profile table (single source of truth).
 */

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '';

/**
 * Check if SMTP is properly configured
 */
function isSmtpConfigured() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

/**
 * Create a nodemailer transporter (only if SMTP is configured)
 */
function createTransporter() {
  if (!isSmtpConfigured()) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/**
 * Send an email via SMTP.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Email body (plain text)
 * @param {string} [options.html] - Optional HTML body
 * @returns {Promise<Object>} - { success, method, messageId?, mailtoUrl? }
 */
async function sendEmail({ to, subject, body, html }) {
  if (!to) {
    throw new Error('Recipient email address is required');
  }

  if (isSmtpConfigured()) {
    const transporter = createTransporter();
    const companyProfile = await getCompanyProfile();
    const fromName = companyProfile.company_name || 'ERP System';
    const fromEmail = SMTP_FROM || companyProfile.email || SMTP_USER;
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: body,
      html: html || undefined,
    });
    return {
      success: true,
      method: 'smtp',
      messageId: info.messageId,
    };
  }

  // SMTP not configured - generate mailto: link as fallback
  const mailtoUrl = buildMailtoUrl({ to, subject, body });
  return {
    success: true,
    method: 'mailto',
    mailtoUrl,
  };
}

/**
 * Build a mailto: URL for fallback when SMTP is not configured.
 */
function buildMailtoUrl({ to, subject, body }) {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}

/**
 * Build a WhatsApp share URL.
 *
 * @param {Object} options
 * @param {string} options.phone - Phone number (digits only or with country code)
 * @param {string} options.message - Message text
 * @returns {string} WhatsApp URL
 */
function buildWhatsAppUrl({ phone, message }) {
  // Strip non-digits
  let cleaned = (phone || '').replace(/[^0-9]/g, '');

  // If it starts with 0, replace with 91 (India)
  if (cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.slice(1);
  }

  // If no country code (10 digits), prepend 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }

  const encodedMessage = encodeURIComponent(message || '');
  return `https://wa.me/${cleaned}?text=${encodedMessage}`;
}

module.exports = {
  sendEmail,
  buildMailtoUrl,
  buildWhatsAppUrl,
  isSmtpConfigured,
};
