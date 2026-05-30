---
title: Storybook
description: Interactive component explorer for the @cruzjs/ui component library.
---

CruzJS ships with a fully configured Storybook for the `@cruzjs/ui` component library. Every component has stories covering all variants, sizes, states, and responsive viewports.

## Running Storybook

Start the development server with hot reload:

```bash
pnpm --filter @cruzjs/ui storybook
```

Storybook opens at `http://localhost:6006`.

## What's Included

### All 124 Components

Stories are organized by category in the sidebar:

| Category | Components | Examples |
|----------|-----------|----------|
| Primitives | 11 | Alert, Avatar, Badge, Card, Spinner, Tooltip |
| Forms & Inputs | 20 | Input, Select, DatePicker, ColorPicker, RichTextEditor |
| Layout | 8 | AppShell, Sidebar, Navbar, PageShell, SettingsLayout |
| Overlays & Feedback | 11 | Modal, Drawer, CommandPalette, Notification |
| Navigation | 7 | Tabs, Accordion, Stepper, Pagination |
| Data Display | 17 | DataTable, Timeline, StatsGrid, Tree, DragAndDropList |
| Application Blocks | 22 | LoginBlock, OrgSwitcher, TeamRoster, PricingCards |
| Marketing Blocks | 14 | HeroSection, FeatureGrid, TestimonialCarousel, Footer |
| Documentation Blocks | 6 | DocSidebar, CodeBlock, ExamplePreview, Changelog |

### Viewport Presets

Test responsive behavior with built-in viewport presets:

| Preset | Width | Height |
|--------|-------|--------|
| Mobile | 375px | 812px |
| Tablet | 768px | 1024px |
| Desktop | 1280px | 800px |

Select viewports from the toolbar to see how components adapt. Components that use `useIsMobile()` will switch to their mobile variants (bottom sheets, full-screen overlays, larger touch targets) when the Mobile viewport is active.

### Background Toggles

Switch between background presets to test component appearance on different surfaces:

| Background | Value |
|------------|-------|
| Light | `#ffffff` |
| Dark | `#1e293b` |
| Subtle | `#f8fafc` |

### Accessibility Addon

The `@storybook/addon-a11y` addon is pre-configured. It runs automated WCAG accessibility checks on every story and surfaces violations in the a11y panel. Check this panel when building or modifying components to catch:

- Missing ARIA roles or labels
- Insufficient color contrast
- Missing keyboard interaction
- Focus order issues

### Controls Panel

Every story exposes component props via the Controls panel. Edit props interactively to explore all combinations of variants, sizes, and states without writing code.

## Story File Structure

Stories live next to their components:

```
packages/ui/src/components/
  Modal/
    Modal.tsx
    Modal.stories.tsx
    Modal.test.tsx
  Button/
    Button.tsx
    Button.stories.tsx
    Button.test.tsx
```

## Writing Stories for Custom Components

If you build custom components in your application, you can add stories for them following the same pattern.

### Basic Story

```tsx
// src/components/ProjectCard/ProjectCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ProjectCard } from './ProjectCard';

const meta: Meta<typeof ProjectCard> = {
  title: 'Application/ProjectCard',
  component: ProjectCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ProjectCard>;

export const Default: Story = {
  args: {
    name: 'My Project',
    description: 'A sample project for testing.',
    status: 'active',
  },
};

export const Archived: Story = {
  args: {
    name: 'Old Project',
    description: 'This project is archived.',
    status: 'archived',
  },
};
```

### Story with Viewport Presets

Test responsive behavior by rendering the component in different viewports:

```tsx
export const Mobile: Story = {
  args: { name: 'My Project', status: 'active' },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

export const Tablet: Story = {
  args: { name: 'My Project', status: 'active' },
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
};
```

### Story with Decorators

Wrap stories in layout containers or providers:

```tsx
export const InSidebar: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 300, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    name: 'Sidebar Project',
    status: 'active',
  },
};
```

### Story with Actions

Capture and log user interactions:

```tsx
import { fn } from '@storybook/test';

export const WithActions: Story = {
  args: {
    name: 'My Project',
    onEdit: fn(),
    onDelete: fn(),
  },
};
```

## Storybook Configuration

The Storybook configuration lives in `packages/ui/.storybook/`:

### `main.ts`

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
```

### `preview.ts`

```typescript
import type { Preview } from '@storybook/react';
import '../../../apps/web/src/index.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
      },
    },
    backgrounds: {
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1e293b' },
        { name: 'subtle', value: '#f8fafc' },
      ],
    },
  },
};

export default preview;
```

The preview imports `apps/web/src/index.css` so all CSS variables from the design system are available. Components render identically in Storybook and in the application.

## Building a Static Storybook Site

Build a static HTML site for hosting or sharing:

```bash
pnpm --filter @cruzjs/ui storybook:build
```

The output is written to `packages/ui/storybook-static/`. Deploy it to any static hosting provider (Cloudflare Pages, Vercel, Netlify, S3) to share with your team or stakeholders.
