/**
 * Import Service — CSV parsing with Zod validation for Cloudflare Workers.
 *
 * Handles quoted fields, commas inside quotes, escaped quotes, and
 * multiline values inside quotes.
 */

import { z } from 'zod';
import { Injectable } from '../di';

export type ImportError = {
  row: number;
  field: string;
  message: string;
};

export type ImportResult<T> = {
  success: boolean;
  rows: T[];
  errors: ImportError[];
  total: number;
  imported: number;
  failed: number;
};

@Injectable()
export class ImportService {
  /**
   * Parse CSV text and validate each row against a Zod schema.
   *
   * Returns all successfully parsed rows plus detailed errors for failures.
   */
  parseCSV<T>(
    csvText: string,
    schema: z.ZodSchema<T>,
    options?: { skipHeader?: boolean; delimiter?: string },
  ): ImportResult<T> {
    const delimiter = options?.delimiter ?? ',';
    const skipHeader = options?.skipHeader ?? true;

    const lines = this.parseCSVLines(csvText, delimiter);

    if (lines.length === 0) {
      return { success: true, rows: [], errors: [], total: 0, imported: 0, failed: 0 };
    }

    const headers = lines[0];
    const dataLines = skipHeader ? lines.slice(1) : lines;

    const rows: T[] = [];
    const errors: ImportError[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const rowNumber = skipHeader ? i + 2 : i + 1; // 1-based, accounting for header

      // Build a record from headers + values
      const record: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j].trim()] = line[j]?.trim() ?? '';
      }

      const result = schema.safeParse(record);
      if (result.success) {
        rows.push(result.data);
      } else {
        for (const issue of result.error.issues) {
          errors.push({
            row: rowNumber,
            field: issue.path.join('.'),
            message: issue.message,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      rows,
      errors,
      total: dataLines.length,
      imported: rows.length,
      failed: dataLines.length - rows.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Parse CSV text into an array of rows, each row being an array of field strings.
   *
   * Handles:
   * - Quoted fields with commas inside
   * - Escaped double-quotes ("") inside quoted fields
   * - Multiline values inside quoted fields
   * - CRLF and LF line endings
   */
  private parseCSVLines(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      if (inQuotes) {
        if (char === '"') {
          // Check for escaped quote ("")
          if (i + 1 < text.length && text[i + 1] === '"') {
            currentField += '"';
            i += 2;
            continue;
          }
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
        currentField += char;
        i++;
        continue;
      }

      // Not in quotes
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }

      if (char === delimiter) {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      }

      if (char === '\r') {
        // Handle CRLF
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }

      if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }

      currentField += char;
      i++;
    }

    // Handle last field/row
    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    return rows;
  }
}
