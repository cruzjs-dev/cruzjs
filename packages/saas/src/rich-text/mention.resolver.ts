/**
 * Mention Resolver
 *
 * Resolves @mention placeholders in rich text HTML and provides
 * mention target search for autocomplete.
 */

import { Injectable, Inject, DRIZZLE, type DrizzleDatabase } from '@cruzjs/core';
import { like, or, eq } from 'drizzle-orm';
import { authIdentity, organizations } from '@cruzjs/core/database/schema';
import type { MentionTarget } from './rich-text.types';

// Regex to match mention spans: <span data-mention-id="..." data-mention-type="...">@Name</span>
const MENTION_SPAN_REGEX = /<span\s+[^>]*data-mention-id="([^"]*)"[^>]*data-mention-type="([^"]*)"[^>]*>([^<]*)<\/span>/gi;

// Alternate pattern without type attribute
const MENTION_SPAN_SIMPLE_REGEX = /<span\s+[^>]*data-mention-id="([^"]*)"[^>]*>([^<]*)<\/span>/gi;

@Injectable()
export class MentionResolver {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  /**
   * Find mention targets matching a query (for autocomplete).
   * Searches both users and orgs within the given org context.
   */
  async search(query: string, orgId: string): Promise<MentionTarget[]> {
    if (!query || query.length < 1) return [];

    const searchPattern = `%${query}%`;
    const results: MentionTarget[] = [];

    // Search users by email (authIdentity has no name column; email is the identifier)
    const users = await this.db
      .select({
        id: authIdentity.id,
        email: authIdentity.email,
      })
      .from(authIdentity)
      .where(like(authIdentity.email, searchPattern))
      .limit(10);

    for (const user of users) {
      results.push({
        id: user.id,
        type: 'user',
        name: user.email,
        avatarUrl: null,
      });
    }

    // Search orgs by name
    const orgs = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
      })
      .from(organizations)
      .where(like(organizations.name, searchPattern))
      .limit(5);

    for (const org of orgs) {
      results.push({
        id: org.id,
        type: 'org',
        name: org.name,
        avatarUrl: null,
      });
    }

    return results.slice(0, 15);
  }

  /**
   * Replace @mention placeholders in HTML with proper anchor links.
   *
   * Input:  <span data-mention-id="user_123" data-mention-type="user">@John</span>
   * Output: <a href="/users/user_123" class="mention mention-user">@John</a>
   */
  async resolveMentions(html: string): Promise<string> {
    let result = html;

    // Replace mention spans with type attribute
    result = result.replace(MENTION_SPAN_REGEX, (_match, id: string, type: string, displayText: string) => {
      const href = type === 'org' ? `/orgs/${id}` : `/users/${id}`;
      return `<a href="${href}" class="mention mention-${type}">${displayText}</a>`;
    });

    // Replace mention spans without type attribute (default to user)
    result = result.replace(MENTION_SPAN_SIMPLE_REGEX, (_match, id: string, displayText: string) => {
      return `<a href="/users/${id}" class="mention mention-user">${displayText}</a>`;
    });

    return result;
  }
}
