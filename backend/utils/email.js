const https = require('https');

const sendEmail = async ({ to, subject, text, html }) => {
  const payload = JSON.stringify({
    from: process.env.EMAIL_FROM || 'ShutliX <onboarding@resend.dev>',
    to: [to],
    subject,
    html: html || `<p>${text}</p>`,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`📧 Email sent to ${to}: ${parsed.id}`);
          resolve(parsed);
        } else {
          console.error('❌ Email error:', parsed);
          reject(new Error(parsed.message || 'Email failed'));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

module.exports = sendEmail;