/**
 * Soft Delete Module
 *
 * Registers the SoftDeleteService into the DI container.
 */

import { Module } from '../di';
import { SoftDeleteService } from './soft-delete.service';

@Module({
  providers: [SoftDeleteService],
})
export class SoftDeleteModule {}
