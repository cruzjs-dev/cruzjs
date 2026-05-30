import { Injectable, Inject } from '@cruzjs/core/di';
import { eq, and } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { aiConnections, type AiProvider } from '../database/schema';
import { TRPCError } from '@trpc/server';
import { encryptToken, decryptToken } from '../utils/encryption';
import { AI_PROVIDER_CONFIGS } from './ai-connections.models';
import type { ConnectAiInput, UpdateAiConnectionInput } from './ai-connections.types';

@Injectable()
export class AiConnectionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase
  ) {}

  /** List all AI connections for an org — API keys NEVER returned. */
  async listConnections(orgId: string) {
    const rows = await this.db
      .select({
        id: aiConnections.id,
        provider: aiConnections.provider,
        displayName: aiConnections.displayName,
        selectedModel: aiConnections.selectedModel,
        isEnabled: aiConnections.isEnabled,
        isDefault: aiConnections.isDefault,
        connectedBy: aiConnections.connectedBy,
        createdAt: aiConnections.createdAt,
        updatedAt: aiConnections.updatedAt,
      })
      .from(aiConnections)
      .where(eq(aiConnections.orgId, orgId));
    return rows;
  }

  /** Connect an AI provider — encrypts API key and stores. */
  async connect(orgId: string, userId: string, input: ConnectAiInput) {
    // Check if already connected
    const existing = await this.db
      .select({ id: aiConnections.id })
      .from(aiConnections)
      .where(and(eq(aiConnections.orgId, orgId), eq(aiConnections.provider, input.provider)))
      .limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `${input.provider} is already connected. Disconnect first or update the existing connection.`,
      });
    }

    const { encrypted, iv } = await encryptToken(input.apiKey);

    // If this is being set as default, clear other defaults
    if (input.isDefault) {
      await this.db
        .update(aiConnections)
        .set({ isDefault: false, updatedAt: new Date().toISOString() })
        .where(eq(aiConnections.orgId, orgId));
    }

    const config = AI_PROVIDER_CONFIGS[input.provider];

    await this.db.insert(aiConnections).values({
      orgId,
      provider: input.provider,
      displayName: input.displayName || config.label,
      encryptedApiKey: encrypted,
      apiKeyIv: iv,
      selectedModel: input.selectedModel || config.defaultModel,
      isEnabled: true,
      isDefault: input.isDefault ?? false,
      connectedBy: userId,
    });

    return { success: true };
  }

  /** Disconnect an AI provider. */
  async disconnect(orgId: string, provider: AiProvider) {
    const result = await this.db
      .delete(aiConnections)
      .where(and(eq(aiConnections.orgId, orgId), eq(aiConnections.provider, provider)));
    return { success: true };
  }

  /** Update an AI connection (model, display name, enabled, default, or API key). */
  async update(orgId: string, input: UpdateAiConnectionInput) {
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.displayName !== undefined) updates.displayName = input.displayName;
    if (input.selectedModel !== undefined) updates.selectedModel = input.selectedModel;
    if (input.isEnabled !== undefined) updates.isEnabled = input.isEnabled;

    if (input.apiKey) {
      const { encrypted, iv } = await encryptToken(input.apiKey);
      updates.encryptedApiKey = encrypted;
      updates.apiKeyIv = iv;
    }

    if (input.isDefault) {
      // Clear all other defaults first
      await this.db
        .update(aiConnections)
        .set({ isDefault: false, updatedAt: new Date().toISOString() })
        .where(eq(aiConnections.orgId, orgId));
      updates.isDefault = true;
    }

    await this.db
      .update(aiConnections)
      .set(updates)
      .where(and(eq(aiConnections.orgId, orgId), eq(aiConnections.provider, input.provider)));

    return { success: true };
  }

  /** Test an AI connection by making a lightweight API call. */
  async testConnection(orgId: string, provider: AiProvider): Promise<{ success: boolean; error?: string }> {
    const conn = await this.db
      .select()
      .from(aiConnections)
      .where(and(eq(aiConnections.orgId, orgId), eq(aiConnections.provider, provider)))
      .limit(1);

    if (!conn.length) {
      return { success: false, error: 'Connection not found' };
    }

    const apiKey = await decryptToken(conn[0].encryptedApiKey, conn[0].apiKeyIv);

    try {
      switch (provider) {
        case 'ANTHROPIC': {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: conn[0].selectedModel || 'claude-sonnet-4-20250514',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'hi' }],
            }),
          });
          if (!res.ok) {
            const body = await res.text();
            return { success: false, error: `API returned ${res.status}: ${body.slice(0, 200)}` };
          }
          return { success: true };
        }
        case 'OPENAI': {
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!res.ok) {
            return { success: false, error: `API returned ${res.status}` };
          }
          return { success: true };
        }
        case 'GEMINI': {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          );
          if (!res.ok) {
            return { success: false, error: `API returned ${res.status}` };
          }
          return { success: true };
        }
        case 'FIREWORKS': {
          const res = await fetch('https://api.fireworks.ai/inference/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!res.ok) {
            return { success: false, error: `API returned ${res.status}` };
          }
          return { success: true };
        }
        default:
          return { success: false, error: `Unknown provider: ${provider}` };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Connection test failed' };
    }
  }

  /**
   * Get decrypted API key for internal use (never exposed to client).
   * Used by ChatService to create AI provider instances.
   */
  async getDecryptedKey(orgId: string, provider?: AiProvider): Promise<{
    apiKey: string;
    provider: AiProvider;
    selectedModel: string | null;
  } | null> {
    let query = this.db
      .select()
      .from(aiConnections)
      .where(
        provider
          ? and(eq(aiConnections.orgId, orgId), eq(aiConnections.provider, provider), eq(aiConnections.isEnabled, true))
          : and(eq(aiConnections.orgId, orgId), eq(aiConnections.isDefault, true), eq(aiConnections.isEnabled, true))
      )
      .limit(1);

    const rows = await query;

    if (!rows.length) {
      // Fall back to any enabled connection if no default/specific
      if (!provider) {
        const fallback = await this.db
          .select()
          .from(aiConnections)
          .where(and(eq(aiConnections.orgId, orgId), eq(aiConnections.isEnabled, true)))
          .limit(1);
        if (!fallback.length) return null;
        const apiKey = await decryptToken(fallback[0].encryptedApiKey, fallback[0].apiKeyIv);
        return { apiKey, provider: fallback[0].provider as AiProvider, selectedModel: fallback[0].selectedModel };
      }
      return null;
    }

    const apiKey = await decryptToken(rows[0].encryptedApiKey, rows[0].apiKeyIv);
    return { apiKey, provider: rows[0].provider as AiProvider, selectedModel: rows[0].selectedModel };
  }
}
