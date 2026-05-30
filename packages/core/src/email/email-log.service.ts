import { injectable, inject } from 'inversify';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '../shared/database/drizzle.service';
import { emailLogs, type EmailLog } from '../database/schema';
import { eq, desc } from 'drizzle-orm';

type CreateEmailLogInput = {
  to: string;
  from?: string;
  cc?: string;
  subject: string;
  template?: string;
  metadata?: Record<string, unknown>;
};

type UpdateEmailLogInput = {
  status: 'SENT' | 'FAILED';
  messageId?: string;
  error?: string;
};

/**
 * Email log service for tracking all sent emails
 */
@injectable()
export class EmailLogService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /**
   * Create a new email log entry
   */
  async createLog(input: CreateEmailLogInput): Promise<EmailLog> {
    const [log] = await this.db
      .insert(emailLogs)
      .values({
        to: input.to,
        from: input.from || null,
        cc: input.cc || null,
        subject: input.subject,
        template: input.template || null,
        status: 'PENDING',
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      })
      .returning();

    return log;
  }

  /**
   * Update email log entry with result
   */
  async updateLog(
    id: string,
    input: UpdateEmailLogInput
  ): Promise<EmailLog | null> {
    const [log] = await this.db
      .update(emailLogs)
      .set({
        status: input.status,
        messageId: input.messageId || null,
        error: input.error || null,
        sentAt: input.status === 'SENT' ? new Date().toISOString() : null,
      })
      .where(eq(emailLogs.id, id))
      .returning();

    return log || null;
  }

  /**
   * Get email log by ID
   */
  async getLog(id: string): Promise<EmailLog | null> {
    const [log] = await this.db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, id))
      .limit(1);

    return log || null;
  }

  /**
   * Get email logs by recipient
   */
  async getLogsByRecipient(
    to: string,
    limit = 50
  ): Promise<EmailLog[]> {
    return this.db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.to, to))
      .orderBy(desc(emailLogs.createdAt))
      .limit(limit);
  }
}

