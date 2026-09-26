import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html: string;
}

export class MailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: env.SMTP_USER,
        clientId: env.SMTP_CLIENT_ID,
        clientSecret: env.SMTP_CLIENT_SECRET,
        refreshToken: env.SMTP_REFRESH_TOKEN,
      },
    });

    this.transporter.on('token', (token) => {
      logger.debug(
        { user: token.user, expires: new Date(token.expires) },
        'Nodemailer OAuth2 access token refreshed',
      );
    });

    this.transporter.on('error', (err) => {
      logger.error({ err }, 'Nodemailer OAuth2 access token error');
    });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info(
        { messageId: info.messageId, to: options.to },
        'Email successfully dispatched via Gmail OAuth2',
      );
    } catch (error) {
      logger.error(
        { err: error, to: options.to },
        'Failed to send email via OAuth2',
      );
      throw error;
    }
  }
}

export const mailService = new MailService();
