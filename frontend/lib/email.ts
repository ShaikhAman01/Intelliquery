import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!process.env.SMTP_HOST) {
    console.log(`\n[EMAIL - DEV MODE]\nTo: ${to}\nSubject: ${subject}`);
    const urlMatch = html.match(/href="([^"]+)"/);
    if (urlMatch) console.log(`Link: ${urlMatch[1]}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Intelliquery <noreply@intelliquery.com>",
    to,
    subject,
    html,
  });
}

export function verifyEmail(name: string, url: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#111">
      <div style="margin-bottom:28px;display:flex;align-items:center;gap:10px">
        <div style="background:#2563eb;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center">
          <span style="color:white;font-size:13px;font-weight:700">IQ</span>
        </div>
        <span style="font-size:15px;font-weight:700;color:#111">Intelliquery</span>
      </div>
      <h2 style="font-size:22px;font-weight:700;margin:0 0 12px">Verify your email</h2>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 28px">
        Hi ${name || "there"},<br><br>
        Welcome to Intelliquery! Please confirm this email address so we know it's really you.
      </p>
      <a href="${url}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:13px 30px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:32px">
        Verify email →
      </a>
      <p style="font-size:13px;color:#888;line-height:1.6">
        If you didn't create an Intelliquery account, you can safely ignore this email.<br><br>
        Or paste this link in your browser:<br>
        <a href="${url}" style="color:#2563eb;word-break:break-all;font-size:12px">${url}</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px">
      <p style="font-size:12px;color:#bbb;margin:0">Intelliquery · © 2025 All rights reserved</p>
    </div>
  `;
}

export function resetPasswordEmail(name: string, url: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#111">
      <div style="margin-bottom:28px;display:flex;align-items:center;gap:10px">
        <div style="background:#2563eb;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center">
          <span style="color:white;font-size:13px;font-weight:700">IQ</span>
        </div>
        <span style="font-size:15px;font-weight:700;color:#111">Intelliquery</span>
      </div>
      <h2 style="font-size:22px;font-weight:700;margin:0 0 12px">Reset your password</h2>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 28px">
        Hi ${name || "there"},<br><br>
        We received a request to reset your Intelliquery password. Click the button below to set a new one. This link expires in <strong>1 hour</strong>.
      </p>
      <a href="${url}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:13px 30px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:32px">
        Reset password →
      </a>
      <p style="font-size:13px;color:#888;line-height:1.6">
        If you didn't request this, you can safely ignore this email — your password won't change.<br><br>
        Or paste this link in your browser:<br>
        <a href="${url}" style="color:#2563eb;word-break:break-all;font-size:12px">${url}</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px">
      <p style="font-size:12px;color:#bbb;margin:0">Intelliquery · © 2025 All rights reserved</p>
    </div>
  `;
}
