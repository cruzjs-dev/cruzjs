---
title: Export & Import
description: Export query results to CSV or Excel, and import CSV files with validation.
---

CruzJS provides `ExportService` for generating CSV and Excel downloads, and `ImportService` for parsing uploaded CSV files with Zod validation. Both services work in Cloudflare Workers.

## Exporting to CSV

Use `ExportService.toCSV()` to generate a CSV download response from an array of records:

```typescript
import { ExportService } from '@cruzjs/core';

@Injectable()
export class UserExportHandler {
  constructor(
    @Inject(ExportService) private readonly exportService: ExportService,
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  async exportUsers(): Promise<Response> {
    const users = await this.db.select().from(schema.users);

    return this.exportService.toCSV(users, {
      columns: [
        { header: 'Name', key: 'name' },
        { header: 'Email', key: 'email' },
        { header: 'Role', key: 'role' },
        { header: 'Joined', key: 'createdAt', transform: (v) =>
          new Date(v as string).toLocaleDateString()
        },
      ],
      filename: 'users.csv',
    });
  }
}
```

The response includes `Content-Type: text/csv` and `Content-Disposition: attachment` headers, triggering a browser download.

## Exporting to Excel

Use `toExcel()` for `.xlsx` files. It dynamically imports the `xlsx` package:

```typescript
return await this.exportService.toExcel(users, {
  columns: [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Role', key: 'role' },
  ],
  filename: 'users.xlsx',
  sheetName: 'Users',
});
```

Note that `toExcel()` is async (returns `Promise<Response>`) due to the dynamic import.

## Column Configuration

Each column in the `columns` array defines how a field is exported:

```typescript
type ExportColumn<T> = {
  header: string;                                      // Column header text
  key: keyof T | string;                               // Field name or dot-path
  transform?: (value: unknown, row: T) => string | number;  // Optional formatter
};
```

### Nested Keys

Use dot notation to access nested properties:

```typescript
{ header: 'City', key: 'address.city' }
```

### Transforms

Transform functions receive the raw field value and the full row:

```typescript
{ header: 'Price', key: 'price', transform: (v) => `$${(v as number).toFixed(2)}` },
{ header: 'Status', key: 'active', transform: (v) => v ? 'Active' : 'Inactive' },
{ header: 'Full Name', key: 'firstName', transform: (_, row) => `${row.firstName} ${row.lastName}` },
```

### Building Raw CSV

Use `buildCSV()` to get the CSV as a string instead of a Response:

```typescript
const csvString = this.exportService.buildCSV(data, { columns });
// Useful for testing, logging, or streaming
```

## Importing CSV with Zod Validation

Use `ImportService.parseCSV()` to parse CSV text and validate each row:

```typescript
import { ImportService } from '@cruzjs/core';
import { z } from 'zod';

const importService = container.resolve(ImportService);

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

// Read CSV from uploaded file
const csvText = await request.text();
const result = importService.parseCSV(csvText, schema);

if (result.success) {
  // All rows valid -- insert into database
  await db.insert(users).values(result.rows);
} else {
  // Some rows failed validation
  return Response.json({
    imported: result.imported,
    failed: result.failed,
    errors: result.errors,
  }, { status: 422 });
}
```

### Options

```typescript
importService.parseCSV(csvText, schema, {
  skipHeader: true,   // Default: true (first row is column headers)
  delimiter: ',',     // Default: ','
});
```

## ImportResult Shape

```typescript
type ImportResult<T> = {
  success: boolean;      // true when errors.length === 0
  rows: T[];             // Successfully validated rows
  errors: ImportError[]; // Validation failures with row/field detail
  total: number;         // Total data rows parsed
  imported: number;      // Number of valid rows
  failed: number;        // Number of invalid rows
};

type ImportError = {
  row: number;     // 1-based row number (accounting for header)
  field: string;   // Dot-path of the failing field
  message: string; // Zod validation message
};
```

## Cloudflare Workers Compatibility

- **CSV export** uses pure string manipulation with no external dependencies
- **CSV import** uses a custom parser that handles quoted fields, escaped quotes, multiline values, and both CRLF and LF line endings
- **Excel export** uses the `xlsx` package (pure JavaScript, no native modules), loaded via dynamic `import()` to keep the bundle lean when unused
