import type { Meta, StoryObj } from '@storybook/react';
import { Kbd } from './Kbd';
import type { KbdSize } from './Kbd';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'UI/Kbd',
  component: Kbd,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Keyboard shortcut key styling component. Renders individual keys or key combos (Cmd+K, Shift+Enter, Ctrl+Alt+Delete) with a 3D pressed-key effect.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    size: 'md',
    children: 'K',
  },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const allSizes: KbdSize[] = ['sm', 'md', 'lg'];

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── KeyCombo ─────────────────────────────────────────────────────────────────

export const KeyCombo: Story = {
  args: {
    keys: ['⌘', 'K'],
    children: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'A two-key combo with the default "+" separator.',
      },
    },
  },
};

// ─── CommonShortcuts ──────────────────────────────────────────────────────────

export const CommonShortcuts: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-md">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">Copy</span>
        <Kbd keys={['⌘', 'C']} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">Paste</span>
        <Kbd keys={['⌘', 'V']} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">Undo</span>
        <Kbd keys={['⌘', 'Z']} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">Command palette</span>
        <Kbd keys={['Ctrl', 'Shift', 'P']} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">Escape</span>
        <Kbd>Esc</Kbd>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">Enter</span>
        <Kbd>Enter</Kbd>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">Tab</span>
        <Kbd>Tab</Kbd>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">Space</span>
        <Kbd>Space</Kbd>
      </div>
      <div className="flex items-center justify-between col-span-2">
        <span className="text-sm text-text-secondary">Arrow keys</span>
        <div className="flex items-center gap-1">
          <Kbd>{'↑'}</Kbd>
          <Kbd>{'↓'}</Kbd>
          <Kbd>{'←'}</Kbd>
          <Kbd>{'→'}</Kbd>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Common keyboard shortcuts displayed in a grid layout.',
      },
    },
  },
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      {allSizes.map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Kbd keys={['⌘', 'K']} size={size} />
          <span className="text-xs text-text-muted">{size}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Small, medium, and large sizes showing proportional padding and typography scaling.',
      },
    },
  },
};

// ─── InContext ─────────────────────────────────────────────────────────────────

export const InContext: Story = {
  render: () => (
    <p className="text-sm text-text-secondary">
      Press <Kbd keys={['⌘', 'K']} /> to open the command palette
    </p>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Kbd used inline within a sentence, showing how it aligns with surrounding text.',
      },
    },
  },
};

// ─── WithCustomSeparator ──────────────────────────────────────────────────────

export const WithCustomSeparator: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">Sequence:</span>
        <Kbd keys={['G', 'D']} separator="then" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">Dash separator:</span>
        <Kbd keys={['Ctrl', 'Alt', 'Del']} separator="-" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Custom separators between keys. Use "then" for sequential shortcuts or any other separator character.',
      },
    },
  },
};
