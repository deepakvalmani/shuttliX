const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();
  try {
    // Verify connection first
    await transporter.verify();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"ShutliX" <noreply@shuttlix.com>',
      to,
      subject,
      text,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('❌ Email error:', err.message);
    throw err;
  }
};

module.exports = sendEmail;
