import nodemailer from 'nodemailer';

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = `"ConstructionBear.AI" <${process.env.SMTP_USER}>`;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

export async function sendVerificationEmail(email, token) {
  if (!process.env.SMTP_USER) return; // Skip if not configured
  const link = `${CLIENT_URL}/verify-email?token=${token}`;
  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your ConstructionBear.AI account',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e293b;">Welcome to ConstructionBear.AI</h2>
        <p>Click the button below to verify your email address.</p>
        <a href="${link}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify Email</a>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Or copy this link: ${link}</p>
        <p style="color: #64748b; font-size: 12px;">Link expires in 24 hours.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email, token) {
  if (!process.env.SMTP_USER) return;
  const link = `${CLIENT_URL}/reset-password?token=${token}`;
  await getTransporter().sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your ConstructionBear.AI password',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e293b;">Reset your password</h2>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${link}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Or copy this link: ${link}</p>
        <p style="color: #64748b; font-size: 12px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
