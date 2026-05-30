/**
 * Multi-Database Module
 *
 * Registers the MultiDatabaseService and health check into the DI container.
 * Platform-specific adapters call setupMultiDatabase() to wire connections
 * from environment bindings.
 */

import { Module } from '../di';
import { HEALTH_CHECK } from '../health/health.types';
import { MultiDatabaseService } from './multi-database.service';
import { MultiDatabaseHealthCheck } from './multi-database.health';

@Module({
  providers: [
    MultiDatabaseService,
    MultiDatabaseHealthCheck,
    { provide: HEALTH_CHECK, useClass: MultiDatabaseHealthCheck, multi: true },
  ],
})
export class MultiDatabaseModule {}
