const { Resend } = require('resend');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'No API key' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'jon@madronestudios.com',
    subject: 'Stone House Cart — Email Test',
    html: '<p>If you received this, email sending is working correctly.</p>'
  });

  if (error) {
    return res.status(500).json({ success: false, error });
  }

  return res.status(200).json({ success: true, id: data?.id });
};
