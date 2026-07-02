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
        server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
    else:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
    try:
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.send_message(msg)
    finally:
        server.quit()


def team_invite_email(inviter_name: str, org_name: str, role: str, url: str) -> str:
    year = datetime.utcnow().year
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#111">
      <div style="margin-bottom:28px;display:flex;align-items:center;gap:10px">
        <div style="background:#2563eb;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center">
          <span style="color:white;font-size:13px;font-weight:700">IQ</span>
        </div>
        <span style="font-size:15px;font-weight:700;color:#111">Intelliquery</span>
      </div>
      <h2 style="font-size:22px;font-weight:700;margin:0 0 12px">Join {org_name} on Intelliquery</h2>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 28px">
        Hi there,<br><br>
        <strong>{inviter_name}</strong> invited you to join <strong>{org_name}</strong> as
        <strong>{role}</strong>. Intelliquery lets your team query databases in plain English.
      </p>
      <a href="{url}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:13px 30px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:32px">
        Accept invitation &rarr;
      </a>
      <p style="font-size:13px;color:#888;line-height:1.6">
        New to Intelliquery? The link above will let you create an account first.<br>
        If you weren't expecting this invitation, you can safely ignore this email.<br><br>
        Or paste this link in your browser:<br>
        <a href="{url}" style="color:#2563eb;word-break:break-all;font-size:12px">{url}</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px">
      <p style="font-size:12px;color:#bbb;margin:0">Intelliquery &middot; &copy; {year} All rights reserved</p>
    </div>
    """
