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

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${toEmail}. MessageID: ${info.messageId}`);
    
    // If using Ethereal, log the preview URL for developer convenience!
    const previewUrl = nodemailerGetTestMessageUrl(info);
    if (previewUrl) {
      logger.info(`Ethereal Email Preview URL: ${previewUrl}`);
    }

    return info;
  } catch (error) {
    logger.error(`Error sending reset password email to ${toEmail}: ${error.message}`);
    throw error;
  }
};

// Internal utility helper to extract Ethereal message URL safely
function nodemailerGetTestMessageUrl(info) {
  try {
    const nodemailer = require('nodemailer'); // standard fallback check
    return nodemailer.getTestMessageUrl(info);
  } catch {
    // If ES imports makes commonjs require fail, check for direct nodemailer property
    import('nodemailer').then((nm) => {
      const url = nm.default.getTestMessageUrl(info);
      if (url) logger.info(`Ethereal Email Preview URL: ${url}`);
    }).catch(() => {});
    return false;
  }
}
