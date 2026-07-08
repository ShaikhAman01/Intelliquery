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
    family: 4,
    connectionTimeout: 10000,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Intelliquery <shaikhaman.0020@gmail.com>",
    to,
    subject,
    html,
  });
}

const SITE_URL = "https://intelliquery.shaikhaman.dev";
const ACCENT = "#2563eb";

interface EmailShellOptions {
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaColor?: string;
  footNote: string;
}

function emailShell({ title, body, ctaLabel, ctaUrl, ctaColor = ACCENT, footNote }: EmailShellOptions): string {
  const year = new Date().getFullYear();
  return `
  <div style="background:#f4f5f7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;margin:0 auto">
      <tr>
        <td style="padding:0 4px 20px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px">
                <img src="${SITE_URL}/icon" width="28" height="28" alt="Intelliquery logo" style="display:block;border-radius:7px">
              </td>
              <td style="vertical-align:middle;font-size:16px;font-weight:700;color:#111827;letter-spacing:-0.2px">Intelliquery</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:36px 36px 32px">
          <h1 style="font-size:21px;font-weight:700;color:#111827;margin:0 0 14px;letter-spacing:-0.3px">${title}</h1>
          <p style="font-size:14.5px;color:#4b5563;line-height:1.7;margin:0 0 28px">${body}</p>
          <a href="${ctaUrl}" style="display:inline-block;background:${ctaColor};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:9px;font-size:14.5px;font-weight:600">${ctaLabel}</a>
          <p style="font-size:12.5px;color:#9ca3af;line-height:1.65;margin:30px 0 0;border-top:1px solid #f3f4f6;padding-top:20px">
            ${footNote}<br><br>
            Button not working? Paste this link into your browser:<br>
            <a href="${ctaUrl}" style="color:${ACCENT};word-break:break-all;font-size:11.5px">${ctaUrl}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 4px 0;text-align:center">
          <p style="font-size:12px;color:#9ca3af;margin:0">
            Intelliquery · Ask your database anything · © ${year}<br>
            <a href="${SITE_URL}/docs" style="color:#9ca3af;text-decoration:underline">Docs</a> ·
            <a href="${SITE_URL}/privacy" style="color:#9ca3af;text-decoration:underline">Privacy</a> ·
            <a href="${SITE_URL}/terms" style="color:#9ca3af;text-decoration:underline">Terms</a>
          </p>
        </td>
      </tr>
    </table>
  </div>
  `;
}

export function verifyEmail(name: string, url: string): string {
  return emailShell({
    title: "Verify your email",
    body: `Hi ${name || "there"},<br><br>Welcome to Intelliquery! Please confirm this email address so we know it's really you.`,
    ctaLabel: "Verify email →",
    ctaUrl: url,
    footNote: "If you didn't create an Intelliquery account, you can safely ignore this email.",
  });
}

export function resetPasswordEmail(name: string, url: string): string {
  return emailShell({
    title: "Reset your password",
    body: `Hi ${name || "there"},<br><br>We received a request to reset your Intelliquery password. Click the button below to set a new one. This link expires in <strong>1 hour</strong>.`,
    ctaLabel: "Reset password →",
    ctaUrl: url,
    footNote: "If you didn't request this, you can safely ignore this email — your password won't change.",
  });
}

export function changeEmailApproval(name: string, newEmail: string, url: string): string {
  return emailShell({
    title: "Approve email change",
    body: `Hi ${name || "there"},<br><br>You asked to change your Intelliquery email to <strong>${newEmail}</strong>. Click the button below to approve the change.`,
    ctaLabel: "Approve change →",
    ctaUrl: url,
    footNote: "If you didn't request this, ignore this email and consider changing your password — someone may have access to your account.",
  });
}

export function deleteAccountEmail(name: string, url: string): string {
  return emailShell({
    title: "Confirm account deletion",
    body: `Hi ${name || "there"},<br><br>You asked to permanently delete your Intelliquery account. This removes your profile, saved queries, and connections, and <strong>cannot be undone</strong>.`,
    ctaLabel: "Delete my account",
    ctaUrl: url,
    ctaColor: "#dc2626",
    footNote: "If you didn't request this, ignore this email — your account is safe. Consider changing your password if you don't recognise this activity.",
  });
}
