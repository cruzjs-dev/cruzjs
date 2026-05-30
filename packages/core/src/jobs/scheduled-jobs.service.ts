import { Injectable, Inject } from '../di';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '../shared/database/drizzle.service';
import { sessions, refreshTokens, uploads, jobs } from '../database/schema';
import { eq, and, lt } from 'drizzle-orm';
import { JobService } from './job.service';

/**
 * Scheduled jobs service
 * Handles recurring tasks like cleanup, notifications, etc.
 */
@Injectable()
export class ScheduledJobsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(JobService) private readonly jobService: JobService
  ) {}

  /**
   * Clean up expired sessions
   * Runs daily to remove expired sessions
   */
  async cleanupExpiredSessions() {
    // D1 uses ISO string comparison for dates
    await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date().toISOString()));

    // D1 doesn't return rowCount, so we just log that it ran
    console.log(`[ScheduledJobs] Cleaned up expired sessions`);
    return 0;
  }

  /**
   * Clean up expired refresh tokens
   * Runs daily to remove expired refresh tokens
   */
  async cleanupExpiredRefreshTokens() {
    await this.db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date().toISOString()));

    console.log(`[ScheduledJobs] Cleaned up expired refresh tokens`);
    return 0;
  }

  /**
   * Clean up orphaned uploads
   * Runs daily to remove failed uploads older than 7 days
   */
  async cleanupOldUploads() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await this.db
      .delete(uploads)
      .where(lt(uploads.createdAt, sevenDaysAgo.toISOString()));

    console.log(`[ScheduledJobs] Cleaned up old uploads`);
    return 0;
  }

  /**
   * Clean up old completed jobs
   * Runs weekly to remove completed jobs older than 30 days
   */
  async cleanupOldJobs() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.db
      .delete(jobs)
      .where(and(eq(jobs.status, 'COMPLETED'), lt(jobs.completedAt!, thirtyDaysAgo.toISOString())));

    console.log(`[ScheduledJobs] Cleaned up old completed jobs`);
    return 0;
  }

  /**
   * Send daily digest emails (placeholder)
   * Runs daily to send digest emails to users
   */
  async sendDailyDigest() {
    // TODO: Implement daily digest logic
    console.log('[ScheduledJobs] Daily digest job executed');
  }

  /**
   * Process all scheduled cleanup tasks
   */
  async runAllCleanupTasks() {
    const results = {
      sessions: 0,
      refreshTokens: 0,
      uploads: 0,
      jobs: 0,
    };

    try {
      results.sessions = await this.cleanupExpiredSessions();
    } catch (error) {
      console.error('[ScheduledJobs] Error cleaning up sessions:', error);
    }

    try {
      results.refreshTokens = await this.cleanupExpiredRefreshTokens();
    } catch (error) {
      console.error('[ScheduledJobs] Error cleaning up refresh tokens:', error);
    }

    try {
      results.uploads = await this.cleanupOldUploads();
    } catch (error) {
      console.error('[ScheduledJobs] Error cleaning up uploads:', error);
    }

    try {
      results.jobs = await this.cleanupOldJobs();
    } catch (error) {
      console.error('[ScheduledJobs] Error cleaning up jobs:', error);
    }

    return results;
  }
}
