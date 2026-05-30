import type { LoaderFunctionArgs } from 'react-router';
import { sql } from 'drizzle-orm';
import { handleCruzLoader } from '@cruzjs/core/routing';
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';
import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';
import { AuthService } from '@cruzjs/core/auth/auth.service';

/**
 * Debug endpoint - tests DI container
 */
export const loader = async (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ container }) => {
    try {
      const envInfo = {
        ok: true,
        timestamp: new Date().toISOString(),
        ...CloudflareContext.diagnostics,
        dbTest: null as string | null,
        containerTest: null as string | null,
      };

      // Test D1 database connection
      if (DrizzleService.isInitialized()) {
        try {
          const db = DrizzleService.getDb();
          await db.run(sql`SELECT 1 as test`);
          envInfo.dbTest = 'connected';
        } catch (dbError) {
          envInfo.dbTest = `error: ${dbError instanceof Error ? dbError.message : String(dbError)}`;
        }
      }

      // Test DI container
      try {
        envInfo.containerTest = 'ok';

        // Test resolving AuthService through the container
        try {
          const authService = container.get(AuthService);
          (envInfo as any).authServiceTest = 'ok';

          // Test calling login exactly like the router procedure would
          try {
            await authService.login({ email: 'test@test.com', password: 'test123' });
            (envInfo as any).loginTest = 'ok (unexpected)';
          } catch (loginError) {
            // Login should fail with "invalid credentials" not a system error
            const msg = loginError instanceof Error ? loginError.message : String(loginError);
            const stack = loginError instanceof Error ? loginError.stack : undefined;
            (envInfo as any).loginTest = msg.includes('Invalid') ? 'ok (expected auth error)' : `error: ${msg}`;
            if (!msg.includes('Invalid')) {
              (envInfo as any).loginStack = stack;
            }
          }
        } catch (authError) {
          (envInfo as any).authServiceTest = `error: ${authError instanceof Error ? authError.message : String(authError)}`;
          (envInfo as any).authServiceStack = authError instanceof Error ? authError.stack : undefined;
        }
      } catch (containerError) {
        envInfo.containerTest = `error: ${containerError instanceof Error ? containerError.message : String(containerError)}`;
        (envInfo as any).containerStack = containerError instanceof Error ? containerError.stack : undefined;
      }

      return Response.json(envInfo);
    } catch (error) {
      return Response.json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, { status: 500 });
    }
  });
