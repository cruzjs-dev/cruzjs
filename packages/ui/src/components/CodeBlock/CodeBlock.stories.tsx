import type { Meta, StoryObj } from '@storybook/react';
import { CodeBlock } from './CodeBlock';

// ─── Meta ────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Documentation/CodeBlock',
  component: CodeBlock,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Code display block for documentation. Features monospace rendering, copy-to-clipboard, optional line numbers, filename bar, language badge, and line highlighting. No syntax highlighting library — just styled text.',
      },
    },
  },
  argTypes: {
    language: { control: 'text' },
    filename: { control: 'text' },
    showLineNumbers: { control: 'boolean' },
    showCopyButton: { control: 'boolean' },
  },
  args: {
    code: `import { createCruzApp } from '@cruzjs/core';
import { NotesModule } from './features/notes';

const app = createCruzApp({
  modules: [NotesModule],
});

export default app;`,
    showCopyButton: true,
  },
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── WithFilename ────────────────────────────────────────────────────────────

export const WithFilename: Story = {
  args: {
    filename: 'entry.server.tsx',
    language: 'tsx',
    code: `import { createCruzApp } from '@cruzjs/core';
import { NotesModule } from './features/notes';

export const app = createCruzApp({
  modules: [NotesModule],
});`,
  },
  parameters: {
    docs: {
      description: {
        story: 'Code block with a filename in the title bar and a language badge.',
      },
    },
  },
};

// ─── WithLineNumbers ─────────────────────────────────────────────────────────

export const WithLineNumbers: Story = {
  args: {
    showLineNumbers: true,
    filename: 'schema.ts',
    language: 'typescript',
    code: `import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey().$defaultFn(createId),
  title: text('title').notNull(),
  content: text('content'),
  orgId: text('org_id').notNull(),
  createdById: text('created_by_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});`,
  },
  parameters: {
    docs: {
      description: {
        story: 'Line numbers displayed alongside code content.',
      },
    },
  },
};

// ─── WithHighlightedLines ────────────────────────────────────────────────────

export const WithHighlightedLines: Story = {
  args: {
    showLineNumbers: true,
    highlightLines: [4, 5, 6],
    filename: 'notes.service.ts',
    language: 'typescript',
    code: `@injectable()
export class NotesService {
  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @inject(EventEmitterService) private readonly events: EventEmitterService,
  ) {}

  async create(orgId: string, userId: string, input: CreateNoteInput) {
    const [note] = await this.db.insert(notes).values({
      ...input,
      orgId,
      createdById: userId,
    }).returning();
    return note;
  }
}`,
  },
  parameters: {
    docs: {
      description: {
        story: 'Specific lines highlighted with a subtle primary color tint.',
      },
    },
  },
};

// ─── NoCopyButton ────────────────────────────────────────────────────────────

export const NoCopyButton: Story = {
  args: {
    showCopyButton: false,
    code: `npm install @cruzjs/core @cruzjs/start`,
  },
  parameters: {
    docs: {
      description: {
        story: 'Code block with the copy button disabled.',
      },
    },
  },
};

// ─── LongLines ───────────────────────────────────────────────────────────────

export const LongLines: Story = {
  args: {
    showLineNumbers: true,
    filename: 'middleware.ts',
    language: 'typescript',
    code: `export const authMiddleware = createMiddleware(async (req, res, next) => { const token = req.headers.get('authorization')?.replace('Bearer ', ''); if (!token) { return res.status(401).json({ error: 'Unauthorized: no token provided in the Authorization header' }); } });
const veryLongConfigObject = { database: { host: 'localhost', port: 5432, name: 'myapp_production', pool: { min: 5, max: 25, idleTimeout: 30000, acquireTimeout: 60000 }, ssl: { enabled: true, rejectUnauthorized: false } } };
// Short line for contrast
export default authMiddleware;`,
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates horizontal scrolling for lines that exceed the container width.',
      },
    },
  },
};

// ─── Mobile ──────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  args: {
    filename: 'app.tsx',
    language: 'tsx',
    showLineNumbers: true,
    code: `export default function App() {
  return <h1>Hello</h1>;
}`,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story: 'Mobile viewport. Copy button is always visible (no hover).',
      },
    },
  },
};
