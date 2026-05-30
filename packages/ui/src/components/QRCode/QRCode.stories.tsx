import type { Meta, StoryObj } from '@storybook/react';
import { QRCode } from './QRCode';
import type { QRCodeErrorCorrection } from './QRCode';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'UI/QRCode',
  component: QRCode,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Decorative QR-code-like SVG component. Generates a deterministic dot-grid pattern from an input string with authentic QR structural elements (finder patterns, timing patterns, alignment patterns). Not scannable -- use an external QR library for production scanning.',
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    size: { control: { type: 'number', min: 50, max: 600, step: 10 } },
    color: { control: 'color' },
    backgroundColor: { control: 'color' },
    errorCorrection: { control: 'select', options: ['L', 'M', 'Q', 'H'] },
  },
  args: {
    value: 'https://cruzjs.dev',
    size: 200,
    color: 'currentColor',
    backgroundColor: 'transparent',
    errorCorrection: 'M',
  },
} satisfies Meta<typeof QRCode>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── CustomSize ──────────────────────────────────────────────────────────────

export const CustomSize: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <div className="flex flex-col items-center gap-2">
        <QRCode value="https://cruzjs.dev" size={100} />
        <span className="text-xs text-text-secondary">100px</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <QRCode value="https://cruzjs.dev" size={200} />
        <span className="text-xs text-text-secondary">200px</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <QRCode value="https://cruzjs.dev" size={300} />
        <span className="text-xs text-text-secondary">300px</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The same value rendered at 100px, 200px, and 300px sizes.',
      },
    },
  },
};

// ─── CustomColors ────────────────────────────────────────────────────────────

export const CustomColors: Story = {
  render: () => (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="flex flex-col items-center gap-2">
        <QRCode value="https://cruzjs.dev" color="var(--color-primary)" backgroundColor="var(--color-surface)" />
        <span className="text-xs text-text-secondary">Primary on Surface</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <QRCode value="https://cruzjs.dev" color="var(--color-success)" backgroundColor="var(--color-surface-lighter)" />
        <span className="text-xs text-text-secondary">Success on Lighter</span>
      </div>
      <div className="flex flex-col items-center gap-2 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-invert, #1a1a2e)' }}>
        <QRCode value="https://cruzjs.dev" color="var(--color-surface, #ffffff)" />
        <span className="text-xs" style={{ color: 'var(--color-text-on-invert, #ccc)' }}>Light on Dark</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <QRCode value="https://cruzjs.dev" color="var(--color-danger)" />
        <span className="text-xs text-text-secondary">Danger</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Foreground and background colors using CSS variables from the design system.',
      },
    },
  },
};

// ─── DifferentValues ─────────────────────────────────────────────────────────

export const DifferentValues: Story = {
  render: () => (
    <div className="flex items-center gap-6 flex-wrap">
      {[
        'https://cruzjs.dev',
        'hello@example.com',
        'WIFI:T:WPA;S:MyNetwork;P:secret123;;',
        '{"id":"abc-123","type":"ticket"}',
      ].map((val) => (
        <div key={val} className="flex flex-col items-center gap-2">
          <QRCode value={val} size={160} />
          <span className="text-xs text-text-secondary max-w-[160px] truncate">{val}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Each unique input value produces a visually distinct pattern. Longer values generate larger grids.',
      },
    },
  },
};

// ─── ErrorCorrection ─────────────────────────────────────────────────────────

export const ErrorCorrection: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {(['L', 'M', 'Q', 'H'] as QRCodeErrorCorrection[]).map((ec) => (
        <div key={ec} className="flex flex-col items-center gap-2">
          <QRCode value="https://cruzjs.dev" size={180} errorCorrection={ec} />
          <span className="text-xs text-text-secondary">Level {ec}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Error correction levels from L (low density) to H (high density). Higher levels produce denser grids and slightly larger dimensions.',
      },
    },
  },
};

// ─── Mobile ──────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4 p-4">
      <QRCode value="https://cruzjs.dev" size={240} />
      <p className="text-sm text-text-secondary text-center">
        Scan this code to visit CruzJS
      </p>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'QR code rendered at a mobile-friendly size (240px) within a 375px viewport.',
      },
    },
  },
};
