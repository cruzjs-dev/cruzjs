/**
 * PdfService — server-only PDF storage + AI analysis + chat.
 *
 * SERVER ONLY. Freely imports server-bound modules (CloudflareContext, drizzle).
 * Never import this from a client-bundled module (e.g. the tRPC router) — the
 * router resolves it lazily via `Symbol.for('PdfService')` so none of this code
 * leaks into the browser bundle.
 *
 * AI: Cruz AIService — `toMarkdown` to extract text, `chatMessages` to analyze
 * and to answer chat questions. Feature code never touches the raw env.AI
 * binding; AIService owns it (and routes to Workers AI or a gateway per config).
 * Storage: Cruz StorageService (R2 in prod, local filesystem in dev).
 */

import 'reflect-metadata';
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE } from '@cruzjs/core/shared/database/drizzle.service';
import type { DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { AIService } from '@cruzjs/core/ai';
import { StorageService } from '@cruzjs/core/shared/storage/storage.service.server';
import { and, desc, eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { pdfs, type Pdf } from '@/database/pdfs.schema';

const MAX_CONTEXT_CHARS = 12_000;

type ChatTurn = { role: 'user' | 'assistant'; content: string };

// Explicit token name: the production build minifies class names, so the
// default `Symbol.for(class.name)` token would not match the literal
// `Symbol.for('PdfService')` the tRPC router resolves. Pin it here.
@Injectable({ name: 'PdfService' })
export class PdfService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDatabase,
    @Inject(AIService) private ai: AIService,
    @Inject(StorageService) private storage: StorageService
  ) {}

  list(ownerId: string): Promise<Pdf[]> {
    return this.db
      .select()
      .from(pdfs)
      .where(eq(pdfs.ownerId, ownerId))
      .orderBy(desc(pdfs.createdAt));
  }

  async get(ownerId: string, id: string): Promise<Pdf | undefined> {
    const [row] = await this.db
      .select()
      .from(pdfs)
      .where(and(eq(pdfs.id, id), eq(pdfs.ownerId, ownerId)));
    return row;
  }

  /** Store the PDF in object storage, extract its text, analyze it, and persist the row. */
  async upload(ownerId: string, name: string, bytes: Uint8Array): Promise<Pdf> {
    const id = createId();
    const r2Key = `pdfs/${ownerId}/${id}.pdf`;

    await this.storage.disk().put(r2Key, Buffer.from(bytes), {
      contentType: 'application/pdf',
    });

    let extractedText = '';
    let analysis = '';
    let status: 'ready' | 'error' = 'ready';
    let error: string | null = null;

    try {
      const blob = new Blob([bytes], { type: 'application/pdf' });
      extractedText = await this.ai.toMarkdown([{ name, blob }]);
      analysis = await this.analyze(name, extractedText);
    } catch (e) {
      status = 'error';
      error = e instanceof Error ? e.message : String(e);
    }

    const [row] = await this.db
      .insert(pdfs)
      .values({
        id,
        ownerId,
        name,
        r2Key,
        sizeBytes: bytes.byteLength,
        status,
        extractedText: extractedText || null,
        analysis: analysis || null,
        error,
      })
      .returning();
    return row;
  }

  private async analyze(name: string, text: string): Promise<string> {
    if (!text.trim()) {
      return 'No extractable text was found in this document.';
    }
    const res = await this.ai.chatMessages([
      {
        role: 'system',
        content:
          'You are a precise document analyst. Given the text of a document, produce a concise analysis in plain markdown: a 2-3 sentence summary, the likely document type, and 3-5 key points as a bulleted list.',
      },
      {
        role: 'user',
        content: `Document name: ${name}\n\nDocument text:\n${text.slice(0, MAX_CONTEXT_CHARS)}`,
      },
    ]);
    return res?.trim() || 'Analysis unavailable.';
  }

  /** Answer a question grounded in the uploaded document. */
  async chat(
    ownerId: string,
    id: string,
    message: string,
    history: ChatTurn[]
  ): Promise<string> {
    const pdf = await this.get(ownerId, id);
    if (!pdf) {
      throw new Error('PDF not found.');
    }
    const context = (pdf.extractedText ?? pdf.analysis ?? '').slice(0, MAX_CONTEXT_CHARS);
    const res = await this.ai.chatMessages([
      {
        role: 'system',
        content: `You are a helpful assistant answering questions strictly about the following document ("${pdf.name}"). If the answer is not in the document, say so plainly.\n\n--- DOCUMENT START ---\n${context}\n--- DOCUMENT END ---`,
      },
      ...history.slice(-8),
      { role: 'user', content: message },
    ]);
    return res?.trim() || 'No response.';
  }

  async remove(ownerId: string, id: string): Promise<{ success: true }> {
    const pdf = await this.get(ownerId, id);
    if (!pdf) {
      return { success: true };
    }
    try {
      await this.storage.disk().delete(pdf.r2Key);
    } catch {
      // best-effort; still remove the row
    }
    await this.db
      .delete(pdfs)
      .where(and(eq(pdfs.id, id), eq(pdfs.ownerId, ownerId)));
    return { success: true };
  }
}
