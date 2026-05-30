# Export & Import

## ExportService

Located at `packages/core/src/export/export.service.ts`. Decorated with `@Injectable()`.

### toCSV(data, options)

Returns a `Response` with `Content-Type: text/csv` and `Content-Disposition: attachment`.

```typescript
const exportService = container.resolve(ExportService);

return exportService.toCSV(users, {
  columns: [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Role', key: 'role' },
    { header: 'Joined', key: 'createdAt', transform: (v) => new Date(v as string).toLocaleDateString() },
  ],
  filename: 'users.csv',
});
```

### toExcel(data, options)

Returns a `Response` with `.xlsx` content. Uses the `xlsx` package (async import).

```typescript
return await exportService.toExcel(users, {
  columns: [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
  ],
  filename: 'users.xlsx',
  sheetName: 'Users',
});
```

### buildCSV(data, options)

Returns the CSV as a raw string (useful for testing or streaming).

### ExportColumn

```typescript
type ExportColumn<T> = {
  header: string;
  key: keyof T | string;  // Supports nested keys like 'profile.name'
  transform?: (value: unknown, row: T) => string | number;
};
```

### ExportOptions

```typescript
type ExportOptions<T> = {
  columns: ExportColumn<T>[];
  filename?: string;     // Default: 'export.csv' or 'export.xlsx'
  sheetName?: string;    // Default: 'Sheet1' (Excel only)
};
```

## ImportService

Located at `packages/core/src/export/import.service.ts`. Decorated with `@Injectable()`.

### parseCSV(csvText, schema, options?)

Parses CSV text and validates each row against a Zod schema.

```typescript
const importService = container.resolve(ImportService);

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

const result = importService.parseCSV(csvText, schema);
```

### Options

```typescript
{ skipHeader?: boolean; delimiter?: string }
```

- `skipHeader` -- default `true` (first row is treated as headers)
- `delimiter` -- default `','`

### ImportResult

```typescript
type ImportResult<T> = {
  success: boolean;    // true if zero errors
  rows: T[];           // Successfully validated rows
  errors: ImportError[];
  total: number;       // Total data rows parsed
  imported: number;    // rows.length
  failed: number;      // total - imported
};

type ImportError = {
  row: number;    // 1-based row number
  field: string;  // Dot-path of the failing field
  message: string;
};
```

### CSV Parsing Features

- Quoted fields with commas inside
- Escaped double-quotes (`""` inside quoted fields)
- Multiline values inside quoted fields
- CRLF and LF line endings
