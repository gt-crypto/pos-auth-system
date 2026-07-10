import nodemailer from 'nodemailer';
import logger from './logger.js';

// Setup mail transporter
const getTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '585', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If credentials are placeholders or empty, setup Ethereal mail for testing
  if (!user || user === 'your_mailtrap_user' || user === 'placeholder_user') {
    logger.info('SMTP credentials not configured. Generating an Ethereal Mail test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      logger.info(`Ethereal Account Created: User: ${testAccount.user}, Pass: ${testAccount.pass}`);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (err) {
      logger.error(`Failed to create Ethereal account: ${err.message}`);
      throw err;
    }
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
