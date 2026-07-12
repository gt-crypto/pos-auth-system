import nodemailer from 'nodemailer';
import logger from './logger.js';

const hasPlaceholderSmtp = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST;

  return (
    !host ||
    !user ||
    !pass ||
    user === 'your_mailtrap_user' ||
    user === 'placeholder_user' ||
    pass === 'placeholder_password'
  );
};

// Setup mail transporter
const getTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '585', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If credentials are placeholders or missing, skip mail delivery and let
  // the caller fall back to a local reset flow instead of hanging on SMTP setup.
  if (hasPlaceholderSmtp()) {
    logger.warn('SMTP credentials are not configured. Using local reset fallback.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // True for 465, false for other ports
    auth: {
      user,
      pass
    }
  });
};

export default getTransporter;
