const https = require('https');

const sendEmail = async ({ to, subject, text, html }) => {
  const payload = JSON.stringify({
    Messages: [{
      From: {
        Email: process.env.EMAIL_FROM_ADDRESS || 'shutlix.official@gmail.com',
        Name: 'ShutliX',
      },
      To: [{ Email: to }],
      Subject: subject,
      HTMLPart: html || `<p>${text}</p>`,
    }],
  });

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(
      `${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`
    ).toString('base64');

    const req = https.request({
      hostname: 'api.mailjet.com',
      path: '/v3.1/send',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`📧 Email sent to ${to}`);
            resolve(parsed);
          } else {
            console.error('❌ Email error:', parsed);
            reject(new Error(parsed?.ErrorMessage || JSON.stringify(parsed)));
          }
        } catch (e) {
          reject(new Error('Failed to parse email response'));
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Email request error:', err.message);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
};

module.exports = sendEmail;


