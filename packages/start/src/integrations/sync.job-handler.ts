import { injectable, inject } from 'inversify';
import type { Job } from '../database/schema';
import type { JobHandler, JobHandlerMetadata, JobResult } from '@cruzjs/core/jobs/job.types';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import type { IntegrationSyncPayload } from './integration.types';

/**
 * IntegrationSyncJobHandler
 *
 * Background job handler for periodic integration syncs.
 */
@injectable()
export class IntegrationSyncJobHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: 'integration-sync',
    statuses: ['PENDING'],
    description: 'Sync data from external integrations',
  };

  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  async run(job: Job): Promise<JobResult> {
    const payload = (
      typeof job.payload === 'string'
        ? JSON.parse(job.payload)
        : job.payload
    ) as IntegrationSyncPayload;

    if (!payload.connectionId || !payload.orgId || !payload.provider) {
      return {
        success: false,
        error: 'Missing required fields: connectionId, orgId, provider',
      };
    }

    return {
      success: false,
      error: `Sync not supported for provider: ${payload.provider}`,
    };
  }
}
