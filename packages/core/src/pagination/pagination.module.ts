/**
 * Pagination Module
 *
 * Registers the PaginationService into the DI container.
 */

import { Module } from '../di';
import { PaginationService } from './pagination.service';

@Module({
  providers: [PaginationService],
})
export class PaginationModule {}
