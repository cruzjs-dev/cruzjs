import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

// Mock useIsMobile to default to desktop
vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

// --- Header Rendering ---------------------------------------------------------------

describe('AppShell -- header', () => {
  it('renders header content', () => {
    render(
      <AppShell header={<div>My Header</div>}>
        <div>Main</div>
      </AppShell>,
    );
    expect(screen.getByText('My Header')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell-header')).toBeInTheDocument();
  });
});

// --- Sidebar Rendering --------------------------------------------------------------

describe('AppShell -- sidebar', () => {
  it('renders sidebar content', () => {
    render(
      <AppShell sidebar={<div>My Sidebar</div>}>
        <div>Main</div>
      </AppShell>,
    );
    expect(screen.getByText('My Sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell-sidebar')).toBeInTheDocument();
  });
});

// --- Main Content -------------------------------------------------------------------

describe('AppShell -- main content', () => {
  it('renders main content', () => {
    render(
      <AppShell>
        <div>Main Content</div>
      </AppShell>,
    );
    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell-main')).toBeInTheDocument();
  });
});

// --- Footer Rendering ---------------------------------------------------------------

describe('AppShell -- footer', () => {
  it('renders footer content', () => {
    render(
      <AppShell footer={<div>My Footer</div>}>
        <div>Main</div>
      </AppShell>,
    );
    expect(screen.getByText('My Footer')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell-footer')).toBeInTheDocument();
  });
});

// --- Sidebar Width ------------------------------------------------------------------

describe('AppShell -- sidebar width', () => {
  it('applies sidebar width', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>} sidebarWidth={300}>
        <div>Main</div>
      </AppShell>,
    );
    const sidebar = screen.getByTestId('app-shell-sidebar');
    expect(sidebar.style.width).toBe('300px');
  });

  it('applies string sidebar width', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>} sidebarWidth="20rem">
        <div>Main</div>
      </AppShell>,
    );
    const sidebar = screen.getByTestId('app-shell-sidebar');
    expect(sidebar.style.width).toBe('20rem');
  });
});

// --- Collapsed Width ----------------------------------------------------------------

describe('AppShell -- collapsed width', () => {
  it('applies collapsed width when collapsed', () => {
    render(
      <AppShell
        sidebar={<div>Sidebar</div>}
        sidebarCollapsed
        collapsedWidth={80}
      >
        <div>Main</div>
      </AppShell>,
    );
    const sidebar = screen.getByTestId('app-shell-sidebar');
    expect(sidebar.style.width).toBe('80px');
  });

  it('uses default collapsed width of 64px', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>} sidebarCollapsed>
        <div>Main</div>
      </AppShell>,
    );
    const sidebar = screen.getByTestId('app-shell-sidebar');
    expect(sidebar.style.width).toBe('64px');
  });
});

// --- Header Height ------------------------------------------------------------------

describe('AppShell -- header height', () => {
  it('applies header height', () => {
    render(
      <AppShell header={<div>Header</div>} headerHeight={72}>
        <div>Main</div>
      </AppShell>,
    );
    const header = screen.getByTestId('app-shell-header');
    expect(header.style.height).toBe('72px');
  });

  it('applies string header height', () => {
    render(
      <AppShell header={<div>Header</div>} headerHeight="4rem">
        <div>Main</div>
      </AppShell>,
    );
    const header = screen.getByTestId('app-shell-header');
    expect(header.style.height).toBe('4rem');
  });
});

// --- No Sidebar ---------------------------------------------------------------------

describe('AppShell -- no sidebar', () => {
  it('renders without sidebar when not provided', () => {
    render(
      <AppShell header={<div>Header</div>}>
        <div>Main</div>
      </AppShell>,
    );
    expect(screen.queryByTestId('app-shell-sidebar')).toBeNull();
    // Main should span full width
    const main = screen.getByTestId('app-shell-main');
    expect(main.style.gridColumn).toBe('1 / -1');
  });
});

// --- Padding ------------------------------------------------------------------------

describe('AppShell -- padding', () => {
  it('applies padding none', () => {
    render(
      <AppShell padding="none">
        <div>Main</div>
      </AppShell>,
    );
    const main = screen.getByTestId('app-shell-main');
    expect(main.className).not.toContain('p-4');
    expect(main.className).not.toContain('p-6');
    expect(main.className).not.toContain('p-8');
  });

  it('applies padding sm', () => {
    render(
      <AppShell padding="sm">
        <div>Main</div>
      </AppShell>,
    );
    const main = screen.getByTestId('app-shell-main');
    expect(main.className).toContain('p-4');
  });

  it('applies default padding md', () => {
    render(
      <AppShell>
        <div>Main</div>
      </AppShell>,
    );
    const main = screen.getByTestId('app-shell-main');
    expect(main.className).toContain('p-6');
  });

  it('applies padding lg', () => {
    render(
      <AppShell padding="lg">
        <div>Main</div>
      </AppShell>,
    );
    const main = screen.getByTestId('app-shell-main');
    expect(main.className).toContain('p-8');
  });
});

// --- Custom ClassName ---------------------------------------------------------------

describe('AppShell -- custom className', () => {
  it('supports custom className', () => {
    render(
      <AppShell className="my-custom-class">
        <div>Main</div>
      </AppShell>,
    );
    const shell = screen.getByTestId('app-shell');
    expect(shell.className).toContain('my-custom-class');
  });
});
