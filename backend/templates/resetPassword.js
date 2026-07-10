export const getResetPasswordTemplate = (resetUrl, username) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="x-ua-compatible" content="ie=edge">
      <title>Reset Your Password</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style type="text/css">
        body, table, td, a { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; }
        body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0B0F19; color: #F3F4F6; }
        a:vertical-align { border: none; }
      </style>
    </head>
    <body style="background-color: #0B0F19; color: #F3F4F6; margin: 0; padding: 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);">
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 40px 40px 20px 40px; background: linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%);">
                  <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #38BDF8; letter-spacing: -0.025em;">Apexify</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td align="left" style="padding: 40px; line-height: 1.6; font-size: 16px; color: #D1D5DB;">
                  <p style="margin: 0 0 16px 0; font-weight: 600; font-size: 18px; color: #F3F4F6;">Hello, ${username || 'Valued User'}</p>
                  <p style="margin: 0 0 24px 0;">We received a request to reset the password for your account. Click the button below to choose a new password. This link is only valid for <strong>15 minutes</strong>.</p>
                  
                  <!-- Button -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                    <tr>
                      <td align="center">
                        <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #FFFFFF; background-color: #2563EB; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); transition: background-color 0.2s;">Reset Password</a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0 0 16px 0; font-size: 14px; color: #9CA3AF;">If you cannot click the button above, copy and paste the link below into your browser:</p>
                  <p style="margin: 0 0 24px 0; font-size: 14px; word-break: break-all;"><a href="${resetUrl}" target="_blank" style="color: #38BDF8; text-decoration: underline;">${resetUrl}</a></p>
                  
                  <hr style="border: 0; border-top: 1px solid #1F2937; margin: 32px 0;">
                  <p style="margin: 0; font-size: 13px; color: #9CA3AF;">If you did not request this change, you can safely ignore this email. Your password will remain unchanged.</p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 24px 40px; background-color: #0F172A; border-top: 1px solid #1F2937; font-size: 12px; color: #6B7280;">
                  <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} Apexify. All rights reserved.</p>
                  <p style="margin: 0;">This is an automated security notification. Do not reply directly to this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
