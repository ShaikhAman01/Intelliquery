"""
Outgoing email — stdlib smtplib, no extra dependencies.

Mirrors the frontend's lib/email.ts: when SMTP_HOST is unset (dev),
the email is logged instead of sent so links stay testable locally.
"""

import re
import smtplib
from datetime import datetime
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.logger import logger


def send_email(to: str, subject: str, html: str) -> None:
    if not settings.SMTP_HOST:
        link = re.search(r'href="([^"]+)"', html)
        logger.info(f"[EMAIL - DEV MODE] To: {to} | Subject: {subject}"
                    + (f" | Link: {link.group(1)}" if link else ""))
        return

    msg = MIMEText(html, "html", "utf-8")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to

    if settings.SMTP_SECURE:
        server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
    else:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        server.starttls()
    try:
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.send_message(msg)
    finally:
        server.quit()


SITE_URL = "https://intelliquery.shaikhaman.dev"
ACCENT = "#2563eb"


def team_invite_email(inviter_name: str, org_name: str, role: str, url: str) -> str:
    year = datetime.utcnow().year
    return f"""
  <div style="background:#f4f5f7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;margin:0 auto">
      <tr>
        <td style="padding:0 4px 20px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px">
                <img src="{SITE_URL}/icon" width="28" height="28" alt="Intelliquery logo" style="display:block;border-radius:7px">
              </td>
              <td style="vertical-align:middle;font-size:16px;font-weight:700;color:#111827;letter-spacing:-0.2px">Intelliquery</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:36px 36px 32px">
          <h1 style="font-size:21px;font-weight:700;color:#111827;margin:0 0 14px;letter-spacing:-0.3px">Join {org_name} on Intelliquery</h1>
          <p style="font-size:14.5px;color:#4b5563;line-height:1.7;margin:0 0 28px">
            Hi there,<br><br>
            <strong>{inviter_name}</strong> invited you to join <strong>{org_name}</strong> as
            <strong>{role}</strong>. Intelliquery lets your team query databases in plain English.
          </p>
          <a href="{url}" style="display:inline-block;background:{ACCENT};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:9px;font-size:14.5px;font-weight:600">Accept invitation &rarr;</a>
          <p style="font-size:12.5px;color:#9ca3af;line-height:1.65;margin:30px 0 0;border-top:1px solid #f3f4f6;padding-top:20px">
            New to Intelliquery? The link above will let you create an account first.<br>
            If you weren't expecting this invitation, you can safely ignore this email.<br><br>
            Button not working? Paste this link into your browser:<br>
            <a href="{url}" style="color:{ACCENT};word-break:break-all;font-size:11.5px">{url}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 4px 0;text-align:center">
          <p style="font-size:12px;color:#9ca3af;margin:0">
            Intelliquery &middot; Ask your database anything &middot; &copy; {year}<br>
            <a href="{SITE_URL}/docs" style="color:#9ca3af;text-decoration:underline">Docs</a> &middot;
            <a href="{SITE_URL}/privacy" style="color:#9ca3af;text-decoration:underline">Privacy</a> &middot;
            <a href="{SITE_URL}/terms" style="color:#9ca3af;text-decoration:underline">Terms</a>
          </p>
        </td>
      </tr>
    </table>
  </div>
    """
