import { injectable, inject } from 'inversify';
import { DRIZZLE, type DrizzleDatabase } from '../../shared/database/drizzle.service';
import { authIdentity } from '../../database/schema';
import { eq } from 'drizzle-orm';
import type { Job } from '../../database/schema';
import type { JobHandler, JobHandlerMetadata, JobResult } from '../job.types';
import { DELETE_ACCOUNT_JOB_TYPE, type DeleteAccountJobPayload } from '../job.types';
import { EMAIL_SERVICE, type EmailService } from '../../email/email.service';

@injectable()
export class DeleteAccountJobHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: DELETE_ACCOUNT_JOB_TYPE,
    statuses: ['PENDING'],
    description: 'Hard-deletes a user account after the grace period expires',
  };

  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  async run(job: Job): Promise<JobResult> {
    const { userId, email } = job.payload as unknown as DeleteAccountJobPayload;

    const [identity] = await this.db
      .select()
      .from(authIdentity)
      .where(eq(authIdentity.id, userId))
      .limit(1);

    if (!identity || !identity.deletionRequestedAt) {
      return { success: true, summary: { skipped: true, reason: 'Deletion cancelled or user not found' } };
    }

    await this.db.delete(authIdentity).where(eq(authIdentity.id, userId));

    await this.emailService.sendEmail(
      email,
      'Your account has been deleted',
      `<p>Your account has been permanently deleted. We're sorry to see you go.</p>`,
    );

    return { success: true, summary: { userId, deletedAt: new Date().toISOString() } };
  }
}
