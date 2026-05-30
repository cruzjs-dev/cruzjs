import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CodePlayground } from './CodePlayground';
import type { CodePlaygroundFile } from './CodePlayground';

// ─── Sample files ─────────────────────────────────────────────────────────────

const sampleFiles: CodePlaygroundFile[] = [
  {
    id: 'app',
    label: 'App.tsx',
    language: 'tsx',
    code: `import React from 'react';

export default function App() {
  return (
    <div className="p-4">
      <h1>Hello World</h1>
      <p>Welcome to CodePlayground</p>
    </div>
  );
}`,
  },
];

const multiSampleFiles: CodePlaygroundFile[] = [
  ...sampleFiles,
  {
    id: 'style',
    label: 'style.css',
    language: 'css',
    code: `.root {
  font-family: sans-serif;
  color: #333;
  max-width: 600px;
  margin: 0 auto;
}

h1 {
  font-size: 2rem;
  border-bottom: 2px solid #eee;
  padding-bottom: 0.5rem;
}`,
  },
  {
    id: 'config',
    label: 'vite.config.ts',
    language: 'ts',
    code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
});`,
  },
];

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Data/CodePlayground',
  component: CodePlayground,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Split editor and preview pane with language tabs, line numbers, copy button, resizable split, and fullscreen toggle.',
      },
    },
  },
  argTypes: {
    showPreview: { control: 'boolean' },
    showLineNumbers: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    defaultSplitRatio: { control: { type: 'range', min: 0.2, max: 0.8, step: 0.05 } },
  },
  args: {
    showPreview: false,
    showLineNumbers: true,
    readOnly: false,
    defaultSplitRatio: 0.5,
  },
} satisfies Meta<typeof CodePlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    files: sampleFiles,
  },
};

// ─── MultiFile ────────────────────────────────────────────────────────────────

export const MultiFile: Story = {
  render: () => {
    const [activeId, setActiveId] = useState('app');
    return (
      <CodePlayground
        files={multiSampleFiles}
        activeFileId={activeId}
        onActiveFileChange={setActiveId}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple file tabs with controlled active file state.',
      },
    },
  },
};

// ─── WithPreview ──────────────────────────────────────────────────────────────

export const WithPreview: Story = {
  render: () => {
    const [files, setFiles] = useState(sampleFiles);
    return (
      <div style={{ height: '400px' }}>
        <CodePlayground
          files={files}
          showPreview
          onCodeChange={(fileId, code) => {
            setFiles((prev) =>
              prev.map((f) => (f.id === fileId ? { ...f, code } : f)),
            );
          }}
          preview={
            <div className="p-4 text-sm">
              <div
                className="p-4 rounded-lg border border-surface-border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))',
                }}
              >
                <h1 className="text-lg font-bold mb-2">Hello World</h1>
                <p className="text-text-secondary">Welcome to CodePlayground</p>
              </div>
            </div>
          }
          className="h-full"
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Editor with a live preview pane on the right. Drag the divider to resize.',
      },
    },
  },
};

// ─── ReadOnly ─────────────────────────────────────────────────────────────────

export const ReadOnly: Story = {
  args: {
    files: multiSampleFiles,
    readOnly: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Read-only mode prevents editing the code. Useful for documentation examples.',
      },
    },
  },
};

// ─── NoLineNumbers ────────────────────────────────────────────────────────────

export const NoLineNumbers: Story = {
  args: {
    files: sampleFiles,
    showLineNumbers: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Line numbers hidden for a cleaner look.',
      },
    },
  },
};

// ─── Mobile ───────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'On mobile, the split layout switches to vertical (top/bottom) orientation.',
      },
    },
  },
  render: () => (
    <div className="p-4" style={{ height: '500px' }}>
      <CodePlayground
        files={multiSampleFiles}
        showPreview
        preview={
          <div className="p-3 text-sm">
            <div className="p-3 rounded border border-surface-border bg-surface">
              <p className="text-text-secondary">Mobile preview</p>
            </div>
          </div>
        }
        className="h-full"
      />
    </div>
  ),
};
