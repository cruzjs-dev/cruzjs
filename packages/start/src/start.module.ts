import { Module } from '@cruzjs/core/di';
import { OrgModule } from './orgs/org.module';
import { UserProfileModule } from './user-profile/user-profile.module';
import { ApiKeyModule } from './api-keys/api-key.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationModule } from './notifications/notification.module';
import { RealTimeModule } from './real-time/real-time.module';
import { IntegrationModule } from './integrations/integration.module';
import { AiConnectionsModule } from './ai-connections/ai-connections.module';
import { SocialAuthModule } from './social-auth/social-auth.module';

/**
 * StartModule
 *
 * Aggregates all @cruzjs/start feature modules into a single import.
 * Use this with `createCruzApp({ modules: [StartModule] })`.
 */
@Module({
  imports: [
    OrgModule,
    UserProfileModule,
    ApiKeyModule,
    DashboardModule,
    NotificationModule,
    RealTimeModule,
    IntegrationModule,
    AiConnectionsModule,
    SocialAuthModule,
  ],
})
export class StartModule {}
