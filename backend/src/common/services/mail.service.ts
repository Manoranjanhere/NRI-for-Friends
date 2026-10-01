import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const BRAND = 'NRI Friends';
const ORANGE = '#FF6F00';
const CARD_STYLE =
  'font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#FFFFFF;color:#1F1F1F;border-radius:12px;border:1px solid #F3E1D0';
const BUTTON_STYLE = `background:${ORANGE};color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700`;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,  // Google App Password
      },
    });
  }

  private async send(to: string | string[], subject: string, html: string): Promise<void> {
    if (!process.env.GMAIL_USER) {
      this.logger.warn(`[MAIL DEV] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: `"${BRAND}" <${process.env.GMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  // ─── Password Reset ───────────────────────────────────────────────────────

  async sendPasswordResetLink(to: string, userName: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.APP_DEEP_LINK || 'nrifriends'}://reset-password?token=${resetToken}`;
    const webUrl = `${process.env.WEB_BASE_URL || 'https://nrifriends.sugarbf.club'}/reset-password?token=${resetToken}`;

    await this.send(to, `Reset your ${BRAND} access`, `
      <div style="${CARD_STYLE}">
        <h2 style="color:${ORANGE}">${BRAND} 🤝</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>An administrator has requested a login reset link for your account.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="${BUTTON_STYLE}">Reset My Access</a>
        </p>
        <p style="color:#5F5F5F;font-size:13px">Or open this URL in your browser:<br><a href="${webUrl}" style="color:${ORANGE}">${webUrl}</a></p>
        <p style="color:#9A9A9A;font-size:12px">This link expires in 24 hours. If you didn't request this, ignore this email.</p>
      </div>
    `);
  }

  // ─── New User Alert to Admins ─────────────────────────────────────────────

  async sendNewUserAlertToAdmins(
    adminEmails: string[],
    user: {
      id: string; name: string; email: string; phone: string;
      city: string; country: string; createdAt: Date;
    },
  ): Promise<void> {
    if (!adminEmails.length) return;

    const row = (label: string, value: string) =>
      `<tr><td style="padding:8px;color:#5F5F5F;width:140px">${label}</td><td style="padding:8px">${value}</td></tr>`;

    await this.send(adminEmails, `New member joined: ${user.name || user.phone || user.id}`, `
      <div style="${CARD_STYLE}">
        <h2 style="color:${ORANGE}">👤 New member joined ${BRAND}</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          ${row('User ID', `<span style="font-family:monospace;font-size:12px">${user.id}</span>`)}
          ${row('Name', `<strong>${user.name || '—'}</strong>`)}
          ${row('Email', user.email || '—')}
          ${row('Phone', user.phone || '—')}
          ${row('Lives in', `${user.city || '—'}, ${user.country || '—'}`)}
          ${row('Joined', new Date(user.createdAt).toLocaleString('en-IN'))}
        </table>
        <p style="margin-top:24px">
          <a href="${process.env.ADMIN_WEB_URL || 'https://admin.nrifriends.app'}/users/${user.id}" style="${BUTTON_STYLE}">
            View in Admin Panel
          </a>
        </p>
      </div>
    `);
  }

  // ─── Marketing Email (future use) ─────────────────────────────────────────

  async sendMarketingEmail(to: string[], subject: string, body: string): Promise<void> {
    await this.send(to, subject, `
      <div style="${CARD_STYLE}">
        <h2 style="color:${ORANGE}">${BRAND} 🤝</h2>
        ${body}
        <p style="color:#9A9A9A;font-size:11px;margin-top:32px">You are receiving this because you are a ${BRAND} member.<br>
        <a href="nrifriends://unsubscribe" style="color:${ORANGE}">Unsubscribe</a></p>
      </div>
    `);
  }

  // ─── Warning Email ────────────────────────────────────────────────────────

  async sendAccountWarning(to: string, userName: string, reason: string): Promise<void> {
    await this.send(to, `⚠️ Account Warning - ${BRAND}`, `
      <div style="${CARD_STYLE}">
        <h2 style="color:#FB8C00">⚠️ Account Warning</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your ${BRAND} account has received an official warning.</p>
        <p style="background:#FFF1E6;padding:16px;border-radius:8px;border-left:4px solid #FB8C00">${reason}</p>
        <p>Please review our <a href="${process.env.PRIVACY_URL || 'https://nrifriends.sugarbf.club/api/v1/privacy'}" style="color:${ORANGE}">Community Guidelines</a>.
        Repeated violations may result in account suspension.</p>
      </div>
    `);
  }
}
