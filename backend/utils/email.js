/**
 * email.js — Gmail REST API via OAuth2
 * Uses HTTPS port 443 only — Render free tier compatible
 * No nodemailer, no SMTP
 */
const https = require('https');

// ── Get a fresh access token from Google ─────────────────
const getAccessToken = () =>
  new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      client_id:     process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }).toString();

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path:     '/token',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) resolve(parsed.access_token);
          else reject(new Error('OAuth2 failed: ' + JSON.stringify(parsed)));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

// ── Send email via Gmail API ──────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  const accessToken = await getAccessToken();

  // Build RFC 2822 message
  const raw = [
    `From: ShutliX <${process.env.GMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html || `<p>${text || ''}</p>`,
  ].join('\r\n');

  // Base64url encode
  const encoded = Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const body = JSON.stringify({ raw: encoded });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      path:     '/gmail/v1/users/me/messages/send',
      method:   'POST',
      headers:  {
        Authorization:    `Bearer ${accessToken}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`📧 Email sent to ${to} (id: ${parsed.id})`);
            resolve(parsed);
          } else {
            const msg = parsed?.error?.message || JSON.stringify(parsed);
            console.error('❌ Gmail API error:', msg);
            reject(new Error(msg));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// ── Email templates ───────────────────────────────────────
const otpTemplate = (otp, purpose) => `
<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#060d1a;padding:40px;border-radius:20px;border:1px solid rgba(255,255,255,0.08)">
  <div style="text-align:center;margin-bottom:32px">
    <div style="display:inline-block;background:linear-gradient(135deg,#2563EB,#3B82F6);padding:14px 28px;border-radius:50px;color:white;font-size:22px;font-weight:800;letter-spacing:1px">
      ShutliX
    </div>
  </div>
  <h2 style="color:#F1F5F9;margin:0 0 8px;font-size:24px;font-weight:700">
    ${purpose === 'reset' ? 'Reset your password' : 'Verify your email'}
  </h2>
  <p style="color:#94A3B8;margin:0 0 32px;font-size:15px">
    Your one-time code expires in <strong style="color:#F1F5F9">5 minutes</strong>.
  </p>
  <div style="background:#0d1c37;border:1px solid rgba(37,99,235,0.4);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px">
    <div style="font-size:52px;font-weight:900;letter-spacing:14px;color:#3B82F6;font-family:monospace">
      ${otp}
    </div>
  </div>
  <p style="color:#64748B;font-size:13px;text-align:center;margin:0">
    Never share this code. ShutliX will never ask for it.
  </p>
</div>`;

const welcomeTemplate = (name, orgName, orgCode) => `
<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#060d1a;padding:40px;border-radius:20px;border:1px solid rgba(255,255,255,0.08)">
  <div style="text-align:center;margin-bottom:32px">
    <div style="display:inline-block;background:linear-gradient(135deg,#2563EB,#3B82F6);padding:14px 28px;border-radius:50px;color:white;font-size:22px;font-weight:800">
      ShutliX
    </div>
  </div>
  <h2 style="color:#F1F5F9;margin:0 0 8px;font-size:24px;font-weight:700">Welcome, ${name}! 🎉</h2>
  <p style="color:#94A3B8;margin:0 0 24px;font-size:15px">
    Your organisation <strong style="color:#F1F5F9">${orgName}</strong> is ready on ShutliX.
  </p>
  <div style="background:#0d1c37;border:1px solid rgba(37,99,235,0.4);border-radius:16px;padding:24px;margin-bottom:24px">
    <p style="color:#64748B;margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:2px">Organisation Code</p>
    <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#3B82F6;font-family:monospace">${orgCode}</div>
    <p style="color:#64748B;margin:12px 0 0;font-size:13px">Share this with your drivers and students so they can join</p>
  </div>
  <p style="color:#94A3B8;font-size:13px">Admin login requires: email + password + code <strong style="color:#F1F5F9">${orgCode}</strong></p>
</div>`;

module.exports = { sendEmail, otpTemplate, welcomeTemplate };
