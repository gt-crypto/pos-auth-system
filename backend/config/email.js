import nodemailer from 'nodemailer';
import logger from './logger.js';

// Setup mail transporter
const getTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '585', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // True for 465, false for other ports
    auth: {
      user,
      pass
    }
  });

  await transporter.verify();
  logger.info(`SMTP transporter verified for ${host}:${port}`);
  return transporter;
};

export default getTransporter;
