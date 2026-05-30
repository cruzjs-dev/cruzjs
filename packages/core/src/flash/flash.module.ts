/**
 * Flash Module
 *
 * Registers the FlashService as a transient provider.
 * Each request gets its own FlashService instance since it holds
 * request-specific state (pending messages, consumed flag).
 */

import { Module } from '../di';
import { FlashService } from './flash.service';

@Module({
  providers: [
    { provide: FlashService, scope: 'transient' },
  ],
})
export class FlashModule {}
