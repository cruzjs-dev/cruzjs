/**
 * Audit Module
 *
 * Registers the AuditLogService, DatabaseAuditAdapter, and AuditLogTrpc router.
 */

import { Module } from '../di';
import { AuditLogService } from './audit.service';
import { DatabaseAuditAdapter } from './adapters/database.audit.adapter';
import { AuditLogTrpc } from './audit.trpc';

@Module({
  providers: [
    AuditLogService,
    DatabaseAuditAdapter,
    AuditLogTrpc,
  ],
  trpcRouters: {
    auditLog: AuditLogTrpc,
  },
})
export class AuditModule {}
