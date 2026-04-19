'use strict';
const nodemailer = require('nodemailer');
const logger     = require('./logger');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from:    `"ShuttliX" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to, subject, html, text,
    });
    logger.info({ msg: 'Email sent', to, messageId: info.messageId });
    return info;
  } catch (err) {
    logger.error({ msg: 'Email failed', to, err: err.message });
    throw err;
  }
};

const sendOTPEmail = (email, otp) => sendEmail({
  to:      email,
  subject: 'ShuttliX — Your verification code',
  html:    `<div style="font-family:Inter,sans-serif;max-width:400px;margin:auto">
    <h2>Verification Code</h2>
    <p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#7C3AED">${otp}</p>
    <p>This code expires in 5 minutes. Do not share it with anyone.</p>
    <p style="color:#9B8EC4;font-size:12px">ShuttliX — Smart Shuttle Platform</p>
  </div>`,
});

module.exports = { sendEmail, sendOTPEmail };
