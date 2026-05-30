/**
 * Magic Link / Passwordless Auth -- barrel exports
 */

// Types
export type {
  MagicLink,
  RequestMagicLinkInput,
  VerifyMagicLinkResult,
  MagicLinkConfig,
} from './magic-link.types';
export { DEFAULT_MAGIC_LINK_CONFIG } from './magic-link.types';

// Schema
export { magicLinks } from './magic-link.schema';
export type { MagicLinkRow, NewMagicLinkRow } from './magic-link.schema';

// Validation
export { requestMagicLinkSchema, verifyMagicLinkSchema } from './magic-link.validation';
export type {
  RequestMagicLinkInput as RequestMagicLinkZodInput,
  VerifyMagicLinkInput,
} from './magic-link.validation';

// Email template builder
export { buildMagicLinkEmail } from './magic-link.email';
export type { MagicLinkEmailOptions } from './magic-link.email';

// Service
export { MagicLinkService } from './magic-link.service';

// tRPC Router
export { MagicLinkTrpc } from './magic-link.trpc';

// Module
export { MagicLinkModule } from './magic-link.module';
