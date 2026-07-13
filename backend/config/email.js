import nodemailer from 'nodemailer';
import logger from './logger.js';

let cachedTransporter = null;

// Setup mail transporter
const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '585', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const isPlaceholder = !host || !user || !pass || user.includes('placeholder') || pass.includes('placeholder');

  if (isPlaceholder && process.env.NODE_ENV === 'development') {
    logger.info('SMTP credentials are placeholder or missing. Creating an Ethereal Mail test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      await transporter.verify();
      logger.info(`Ethereal SMTP transporter verified. Username: ${testAccount.user}`);
      cachedTransporter = transporter;
      return transporter;
    } catch (err) {
      logger.error(`Failed to create Ethereal Mail test account: ${err.message}`);
      throw err;
    }
  }

  if (isPlaceholder) {
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
  cachedTransporter = transporter;
  return transporter;
};

export default getTransporter;
