/**
 * Email Send Service (Cloudflare)
 *
 * Provides email sending capabilities for Cloudflare Workers/Pages.
 * Supports:
 * - MailChannels (free via Cloudflare Workers - recommended)
 * - Resend
 * - Mailgun
 * - Console logging (development)
 */

import { createToken } from '../../di';
import { ConfigService } from '../config/config.service';
import { inject, injectable } from 'inversify';

export const EMAIL_SEND_SERVICE = createToken<EmailSendService>('EmailSendService');

export interface EmailSendResult {
  messageId: string;
  success: boolean;
}

export interface BulkEmailResult {
  success: string[];
  failed: Array<{ email: string; error: string }>;
}

type EmailProvider = 'mailchannels' | 'resend' | 'mailgun' | 'console';

@injectable()
export class EmailSendService {
  private apiKey: string | undefined;
  private fromAddress: string;
  private fromName: string;
  private provider: EmailProvider;
  private dkimDomain: string | undefined;
  private dkimSelector: string | undefined;
  private dkimPrivateKey: string | undefined;

  constructor(
    @inject(ConfigService) private configService: ConfigService
  ) {
    this.apiKey = this.configService.get<string>('EMAIL_API_KEY');
    this.fromAddress = this.configService.get<string>('EMAIL_FROM') || 'noreply@example.com';
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'Aurora';

    // DKIM settings for MailChannels
    this.dkimDomain = this.configService.get<string>('DKIM_DOMAIN');
    this.dkimSelector = this.configService.get<string>('DKIM_SELECTOR') || 'mailchannels';
    this.dkimPrivateKey = this.configService.get<string>('DKIM_PRIVATE_KEY');

    // Determine provider based on config
    const providerConfig = this.configService.get<string>('EMAIL_PROVIDER');
    if (providerConfig === 'mailchannels') {
      this.provider = 'mailchannels';
    } else if (providerConfig === 'resend') {
      this.provider = 'resend';
    } else if (providerConfig === 'mailgun') {
      this.provider = 'mailgun';
    } else {
      // Default to console logging in development
      this.provider = 'console';
    }
  }

  /**
   * Send an email
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    from?: string
  ): Promise<string> {
    const fromAddress = from || this.fromAddress;

    switch (this.provider) {
      case 'mailchannels':
        return this.sendViaMailChannels(to, subject, html, text, fromAddress);
      case 'resend':
        return this.sendViaResend(to, subject, html, text, fromAddress);
      case 'mailgun':
        return this.sendViaMailgun(to, subject, html, text, fromAddress);
      case 'console':
      default:
        return this.sendViaConsole(to, subject, html, text, fromAddress);
    }
  }

  /**
   * Send bulk email
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    html: string,
    text?: string,
    from?: string
  ): Promise<BulkEmailResult> {
    const results: BulkEmailResult = {
      success: [],
      failed: [],
    };

    // Send emails sequentially to avoid rate limits
    for (const to of recipients) {
      try {
        await this.sendEmail(to, subject, html, text, from);
        results.success.push(to);
      } catch (error) {
        results.failed.push({
          email: to,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Send via MailChannels API (free via Cloudflare Workers)
   *
   * MailChannels is Cloudflare's recommended email sending solution.
   * It's free when called from Cloudflare Workers.
   *
   * Setup required:
   * 1. Add DNS TXT record for SPF: v=spf1 a mx include:relay.mailchannels.net ~all
   * 2. Add DNS TXT record for Domain Lockdown: _mailchannels.yourdomain.com TXT "v=mc1 cfid=your-account-id"
   * 3. Optionally add DKIM for better deliverability
   */
  private async sendViaMailChannels(
    to: string,
    subject: string,
    html: string,
    text?: string,
    from?: string
  ): Promise<string> {
    const messageId = `mc-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const payload: MailChannelsPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          ...(this.dkimDomain && this.dkimPrivateKey && {
            dkim_domain: this.dkimDomain,
            dkim_selector: this.dkimSelector,
            dkim_private_key: this.dkimPrivateKey,
          }),
        },
      ],
      from: {
        email: from || this.fromAddress,
        name: this.fromName,
      },
      subject,
      content: [
        ...(text ? [{ type: 'text/plain' as const, value: text }] : []),
        { type: 'text/html' as const, value: html },
      ],
    };

    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MailChannels] Error response:', errorText);
      throw new Error(`MailChannels API error (${response.status}): ${errorText}`);
    }

    // MailChannels returns 202 Accepted on success
    if (response.status === 202) {
      console.log(`[MailChannels] Email sent successfully to ${to}`);
      return messageId;
    }

    throw new Error(`MailChannels unexpected status: ${response.status}`);
  }

  /**
   * Send via Resend API
   */
  private async sendViaResend(
    to: string,
    subject: string,
    html: string,
    text?: string,
    from?: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('EMAIL_API_KEY (Resend) is not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || this.fromAddress,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await response.json() as { id: string };
    return result.id;
  }

  /**
   * Send via Mailgun API
   */
  private async sendViaMailgun(
    to: string,
    subject: string,
    html: string,
    text?: string,
    from?: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('EMAIL_API_KEY (Mailgun) is not configured');
    }

    const domain = this.configService.get<string>('MAILGUN_DOMAIN');
    if (!domain) {
      throw new Error('MAILGUN_DOMAIN is not configured');
    }

    const formData = new FormData();
    formData.append('from', from || this.fromAddress);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', html);
    if (text) {
      formData.append('text', text);
    }

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${this.apiKey}`)}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailgun API error: ${error}`);
    }

    const result = await response.json() as { id: string };
    return result.id;
  }

  /**
   * Console logging fallback (for development)
   */
  private async sendViaConsole(
    to: string,
    subject: string,
    html: string,
    text?: string,
    from?: string
  ): Promise<string> {
    const messageId = `console-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    console.log('='.repeat(60));
    console.log('[EMAIL] Console Email Service');
    console.log('='.repeat(60));
    console.log(`Message ID: ${messageId}`);
    console.log(`From: ${from || this.fromAddress}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('-'.repeat(60));
    console.log('HTML Body:');
    console.log(html.slice(0, 500) + (html.length > 500 ? '...' : ''));
    if (text) {
      console.log('-'.repeat(60));
      console.log('Text Body:');
      console.log(text.slice(0, 500) + (text.length > 500 ? '...' : ''));
    }
    console.log('='.repeat(60));

    return messageId;
  }
}

/**
 * MailChannels API Types
 */
interface MailChannelsPayload {
  personalizations: Array<{
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    dkim_domain?: string;
    dkim_selector?: string;
    dkim_private_key?: string;
  }>;
  from: {
    email: string;
    name?: string;
  };
  reply_to?: {
    email: string;
    name?: string;
  };
  subject: string;
  content: Array<{
    type: 'text/plain' | 'text/html';
    value: string;
  }>;
  headers?: Record<string, string>;
}
