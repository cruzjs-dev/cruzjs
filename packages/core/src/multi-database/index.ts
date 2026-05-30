/**
 * @cruzjs/core Multi-Database
 *
 * Multiple database connection management with role-based routing,
 * round-robin replica selection, and health checks.
 */

// Types
export { ConnectionRole } from './multi-database.types';
export type {
  ConnectionInfo,
  DatabaseConnectionConfig,
  MultiDatabaseConfig,
} from './multi-database.types';

// Service
export { MultiDatabaseService } from './multi-database.service';

// Decorator
export { UseConnection, getConnectionRoute } from './use-connection.decorator';

// Health Check
export { MultiDatabaseHealthCheck } from './multi-database.health';

// Module
export { MultiDatabaseModule } from './multi-database.module';
