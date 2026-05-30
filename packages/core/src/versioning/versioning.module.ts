/**
 * Versioning Module
 *
 * Registers the VersioningService and VersionNegotiator into the DI container.
 */

import { Module } from '../di';
import { VersioningService } from './versioning.service';
import { VersionNegotiator } from './version.negotiator';

@Module({
  providers: [
    VersioningService,
    VersionNegotiator,
  ],
})
export class VersioningModule {}
