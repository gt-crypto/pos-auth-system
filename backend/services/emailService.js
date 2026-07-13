import nodemailer from 'nodemailer';
import getTransporter from '../config/email.js';
import { getResetPasswordTemplate } from '../templates/resetPassword.js';
import logger from '../config/logger.js';

export const sendResetPasswordEmail = async (toEmail, username, resetUrl) => {
  try {
    const transporter = await getTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@smartpos.com',
      to: toEmail,
      subject: 'Apexify - Password Reset Request',
      html: getResetPasswordTemplate(resetUrl, username)
    };

    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Password reset email timed out')), 10000))
    ]);
    
    logger.info(`Password reset email sent to ${toEmail}. MessageID: ${info.messageId}`);

    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      logger.info(`\n==================================================\n[ETHEREAL INBOX - VIEW SENT EMAIL]\nEmail sent successfully via real test SMTP!\nView Sent Email URL: ${testUrl}\n==================================================\n`);
    }

    return info;
  } catch (error) {
    logger.error(`Error sending reset password email to ${toEmail}: ${error.message}`);
    throw error;
  }
};
