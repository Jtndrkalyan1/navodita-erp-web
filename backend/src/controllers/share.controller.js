const { sendEmail, buildWhatsAppUrl, isSmtpConfigured } = require('../services/email.service');

/**
 * POST /api/share/email
 *
 * Send a document via email (SMTP) or return a mailto: fallback link.
 */
async function shareViaEmail(req, res) {
  try {
    const { to, subject, body, document_type, document_id } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email (to) is required' });
    }
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    const result = await sendEmail({
      to,
      subject,
      body: body || '',
    });

    res.json({
      success: true,
      method: result.method,
      messageId: result.messageId || null,
      mailtoUrl: result.mailtoUrl || null,
      message:
        result.method === 'smtp'
          ? `Email sent successfully to ${to}`
          : 'SMTP not configured. Use the mailto link to send the email from your email client.',
    });
  } catch (err) {
    console.error('Share via email error:', err);
    res.status(500).json({
      error: err.message || 'Failed to send email',
    });
  }
}

/**
 * POST /api/share/whatsapp
 *
 * Generate a WhatsApp share link.
 */
async function shareViaWhatsApp(req, res) {
  try {
    const { phone, message, document_type, document_id } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const whatsappUrl = buildWhatsAppUrl({
      phone,
      message: message || '',
    });

    res.json({
      success: true,
      whatsappUrl,
    });
  } catch (err) {
    console.error('Share via WhatsApp error:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate WhatsApp link',
    });
  }
}

/**
 * GET /api/share/config
 *
 * Return whether SMTP is configured (so frontend knows which method to use).
 */
async function getShareConfig(req, res) {
  res.json({
    smtpConfigured: isSmtpConfigured(),
  });
}

module.exports = {
  shareViaEmail,
  shareViaWhatsApp,
  getShareConfig,
};
