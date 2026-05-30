/**
 * Export Service — CSV and Excel export for Cloudflare Workers.
 *
 * CSV: pure string manipulation (no external deps).
 * Excel: uses the `xlsx` package (pure JS, works in CF Workers).
 */

import { Injectable } from '../di';

export type ExportColumn<T> = {
  header: string;
  key: keyof T | string;
  transform?: (value: unknown, row: T) => string | number;
};

export type ExportOptions<T> = {
  columns: ExportColumn<T>[];
  filename?: string;
  sheetName?: string;
};

@Injectable()
export class ExportService {
  /**
   * Export data to CSV and return a download Response.
   */
  toCSV<T extends Record<string, unknown>>(
    data: T[],
    options: ExportOptions<T>,
  ): Response {
    const csv = this.buildCSV(data, options);
    const filename = options.filename ?? 'export.csv';

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  /**
   * Export data to Excel (.xlsx) and return a download Response.
   */
  async toExcel<T extends Record<string, unknown>>(
    data: T[],
    options: ExportOptions<T>,
  ): Promise<Response> {
    const XLSX = await import('xlsx');

    const rows = data.map((row) => {
      const obj: Record<string, string | number> = {};
      for (const col of options.columns) {
        const rawValue = this.resolveValue(row, col.key as string);
        obj[col.header] = col.transform
          ? col.transform(rawValue, row)
          : this.toStringValue(rawValue);
      }
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, options.sheetName ?? 'Sheet1');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const filename = options.filename ?? 'export.xlsx';

    return new Response(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  /**
   * Build a CSV string from data and column definitions.
   * Useful for testing or streaming.
   */
  buildCSV<T extends Record<string, unknown>>(
    data: T[],
    options: ExportOptions<T>,
  ): string {
    const { columns } = options;

    const headerRow = columns.map((c) => this.escapeCSV(c.header)).join(',');

    const dataRows = data.map((row) => {
      return columns
        .map((col) => {
          const rawValue = this.resolveValue(row, col.key as string);
          const value = col.transform
            ? col.transform(rawValue, row)
            : this.toStringValue(rawValue);
          return this.escapeCSV(String(value));
        })
        .join(',');
    });

    return [headerRow, ...dataRows].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve a potentially nested key (e.g. "profile.name") from a row object.
   */
  private resolveValue(row: Record<string, unknown>, key: string): unknown {
    const parts = key.split('.');
    let current: unknown = row;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  /**
   * Escape a value for CSV output.
   * Wraps in double quotes if the value contains a comma, newline, or double quote.
   * Inner double quotes are escaped by doubling them.
   */
  private escapeCSV(value: string): string {
    if (
      value.includes(',') ||
      value.includes('\n') ||
      value.includes('\r') ||
      value.includes('"')
    ) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Convert an unknown value to a display string.
   */
  private toStringValue(value: unknown): string {
    if (value == null) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
