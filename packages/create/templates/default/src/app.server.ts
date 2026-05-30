/**
 * App Server
 *
 * Configures database schema and registers application modules.
 * Imported by entry.server.tsx before any request handling.
 */
import 'reflect-metadata';

import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import * as schema from './database/schema';

DrizzleService.setSchema(schema);

registerModules([
  StartModule,
  // Add your feature modules here
]);
