/**
 * @cruzjs/core Flash Messages
 *
 * Cookie-based one-time flash messages that survive a single redirect.
 */

// Types
export type { FlashLevel, FlashMessage } from './flash.types';
export { FLASH_COOKIE_NAME } from './flash.types';

// Service
export { FlashService } from './flash.service';

// Module
export { FlashModule } from './flash.module';
