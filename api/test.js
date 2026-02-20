module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    ok: true,
    hasResendKey: !!process.env.RESEND_API_KEY,
    keyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 6) + '...' : 'NOT SET',
    fromEmail: process.env.FROM_EMAIL || 'onboarding@resend.dev (default)',
    adminEmails: process.env.ADMIN_EMAILS || 'bookings@stonehouse.io (default)',
    nodeEnv: process.env.NODE_ENV
  });
};
