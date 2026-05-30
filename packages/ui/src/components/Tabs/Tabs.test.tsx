import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function ThreeTabs({ onValueChange }: { onValueChange?: (v: string) => void }) {
  return (
    <Tabs defaultValue="a" onValueChange={onValueChange}>
      <Tabs.List>
        <Tabs.Tab value="a">Apple</Tabs.Tab>
        <Tabs.Tab value="b">Banana</Tabs.Tab>
        <Tabs.Tab value="c" disabled>
          Cherry
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a">Apple content</Tabs.Panel>
      <Tabs.Panel value="b">Banana content</Tabs.Panel>
      <Tabs.Panel value="c">Cherry content</Tabs.Panel>
    </Tabs>
  );
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('Tabs — rendering', () => {
  it('renders tablist, tabs, and tabpanels with correct ARIA roles', () => {
    render(<ThreeTabs />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    // hidden: true to include hidden panels
    expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(3);
  });

  it('first tab is selected by default and its panel is visible', () => {
    render(<ThreeTabs />);
    expect(screen.getByRole('tab', { name: 'Apple' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Apple' })).toBeVisible();
  });

  it('inactive panels are hidden', () => {
    render(<ThreeTabs />);
    // Query via aria-controls — avoids accessible-name computation on display:none elements
    const bananaTab = screen.getByRole('tab', { name: 'Banana' });
    const bananaPanel = document.getElementById(bananaTab.getAttribute('aria-controls')!)!;
    expect(bananaPanel).toBeInTheDocument();
    expect(bananaPanel).not.toBeVisible();
  });

  it('active tab has tabIndex 0; inactive have -1', () => {
    render(<ThreeTabs />);
    expect(screen.getByRole('tab', { name: 'Apple' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Banana' })).toHaveAttribute('tabindex', '-1');
  });

  it('tab aria-controls references the correct panel id', () => {
    render(<ThreeTabs />);
    const tab = screen.getByRole('tab', { name: 'Apple' });
    const panelId = tab.getAttribute('aria-controls')!;
    const panel = document.getElementById(panelId);
    expect(panel).toHaveAttribute('role', 'tabpanel');
  });

  it('panel aria-labelledby references the correct tab id', () => {
    render(<ThreeTabs />);
    const panel = screen.getByRole('tabpanel', { name: 'Apple' });
    const tabId = panel.getAttribute('aria-labelledby')!;
    const tab = document.getElementById(tabId);
    expect(tab).toHaveAttribute('role', 'tab');
  });

  it('disabled tab has disabled attribute', () => {
    render(<ThreeTabs />);
    expect(screen.getByRole('tab', { name: 'Cherry' })).toBeDisabled();
  });
});

// ─── Click Interaction ────────────────────────────────────────────────────────

describe('Tabs — click interaction', () => {
  it('clicking a tab activates it and shows its panel', async () => {
    const user = userEvent.setup();
    render(<ThreeTabs />);
    await user.click(screen.getByRole('tab', { name: 'Banana' }));
    expect(screen.getByRole('tab', { name: 'Banana' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Banana' })).toBeVisible();
    // Previous panel is now hidden — query via aria-controls (jsdom can't compute accessible name on display:none)
    const appleTab = screen.getByRole('tab', { name: 'Apple' });
    const applePanel = document.getElementById(appleTab.getAttribute('aria-controls')!)!;
    expect(applePanel).not.toBeVisible();
  });

  it('clicking active tab does not change selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ThreeTabs onValueChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: 'Apple' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('fires onValueChange with the tab value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ThreeTabs onValueChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: 'Banana' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('clicking disabled tab does nothing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ThreeTabs onValueChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: 'Cherry' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: 'Apple' })).toHaveAttribute('aria-selected', 'true');
  });
});

// ─── Keyboard Navigation ──────────────────────────────────────────────────────

describe('Tabs — keyboard navigation', () => {
  it('ArrowRight moves focus to next tab and activates it', async () => {
    const user = userEvent.setup();
    render(<ThreeTabs />);
    screen.getByRole('tab', { name: 'Apple' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Banana' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Banana' })).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowLeft moves focus to previous tab', async () => {
    const user = userEvent.setup();
    render(<ThreeTabs />);
    // Click Banana first to start there
    await user.click(screen.getByRole('tab', { name: 'Banana' }));
    screen.getByRole('tab', { name: 'Banana' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Apple' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Apple' })).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowRight wraps from last to first (skipping disabled)', async () => {
    const user = userEvent.setup();
    render(<ThreeTabs />);
    // Activate Banana, then ArrowRight should skip disabled Cherry and wrap to Apple
    await user.click(screen.getByRole('tab', { name: 'Banana' }));
    screen.getByRole('tab', { name: 'Banana' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Apple' })).toHaveFocus();
  });

  it('ArrowLeft wraps from first to last non-disabled tab', async () => {
    const user = userEvent.setup();
    render(<ThreeTabs />);
    screen.getByRole('tab', { name: 'Apple' }).focus();
    await user.keyboard('{ArrowLeft}');
    // Last non-disabled tab is Banana (Cherry is disabled)
    expect(screen.getByRole('tab', { name: 'Banana' })).toHaveFocus();
  });

  it('Home moves focus to first tab', async () => {
    const user = userEvent.setup();
    render(<ThreeTabs />);
    await user.click(screen.getByRole('tab', { name: 'Banana' }));
    screen.getByRole('tab', { name: 'Banana' }).focus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Apple' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Apple' })).toHaveAttribute('aria-selected', 'true');
  });

  it('End moves focus to last non-disabled tab', async () => {
    const user = userEvent.setup();
    render(<ThreeTabs />);
    screen.getByRole('tab', { name: 'Apple' }).focus();
    await user.keyboard('{End}');
    // Cherry is disabled — End should land on Banana
    expect(screen.getByRole('tab', { name: 'Banana' })).toHaveFocus();
  });
});

// ─── Controlled Mode ──────────────────────────────────────────────────────────

describe('Tabs — controlled', () => {
  it('controlled: external value drives active tab', () => {
    render(
      <Tabs value="b" onValueChange={vi.fn()}>
        <Tabs.List>
          <Tabs.Tab value="a">Apple</Tabs.Tab>
          <Tabs.Tab value="b">Banana</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">Apple content</Tabs.Panel>
        <Tabs.Panel value="b">Banana content</Tabs.Panel>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'Banana' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Banana' })).toBeVisible();
  });

  it('controlled: clicking calls onValueChange but does not self-update', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <Tabs value="a" onValueChange={onChange}>
        <Tabs.List>
          <Tabs.Tab value="a">Apple</Tabs.Tab>
          <Tabs.Tab value="b">Banana</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">Apple content</Tabs.Panel>
        <Tabs.Panel value="b">Banana content</Tabs.Panel>
      </Tabs>,
    );

    await user.click(screen.getByRole('tab', { name: 'Banana' }));
    expect(onChange).toHaveBeenCalledWith('b');
    // Without rerender, Apple is still selected
    expect(screen.getByRole('tab', { name: 'Apple' })).toHaveAttribute('aria-selected', 'true');

    // Parent updates value
    rerender(
      <Tabs value="b" onValueChange={onChange}>
        <Tabs.List>
          <Tabs.Tab value="a">Apple</Tabs.Tab>
          <Tabs.Tab value="b">Banana</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">Apple content</Tabs.Panel>
        <Tabs.Panel value="b">Banana content</Tabs.Panel>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'Banana' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Banana' })).toBeVisible();
  });
});

// ─── Variants ────────────────────────────────────────────────────────────────

describe('Tabs — variants', () => {
  it.each<'line' | 'solid' | 'soft'>(['line', 'solid', 'soft'])(
    'renders %s variant without crashing',
    (variant) => {
      render(
        <Tabs defaultValue="a" variant={variant}>
          <Tabs.List>
            <Tabs.Tab value="a">One</Tabs.Tab>
            <Tabs.Tab value="b">Two</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="a">One</Tabs.Panel>
          <Tabs.Panel value="b">Two</Tabs.Panel>
        </Tabs>,
      );
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    },
  );
});

// ─── Sizes ───────────────────────────────────────────────────────────────────

describe('Tabs — sizes', () => {
  it.each<'sm' | 'md' | 'lg'>(['sm', 'md', 'lg'])('renders %s size without crashing', (size) => {
    render(
      <Tabs defaultValue="a" size={size}>
        <Tabs.List>
          <Tabs.Tab value="a">One</Tabs.Tab>
          <Tabs.Tab value="b">Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">One</Tabs.Panel>
        <Tabs.Panel value="b">Two</Tabs.Panel>
      </Tabs>,
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});

// ─── Orientation ─────────────────────────────────────────────────────────────

describe('Tabs — vertical orientation', () => {
  it('renders with aria-orientation="vertical"', () => {
    render(
      <Tabs defaultValue="a" orientation="vertical">
        <Tabs.List>
          <Tabs.Tab value="a">One</Tabs.Tab>
          <Tabs.Tab value="b">Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">One</Tabs.Panel>
        <Tabs.Panel value="b">Two</Tabs.Panel>
      </Tabs>,
    );
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('vertical: ArrowDown / ArrowUp navigate tabs', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="a" orientation="vertical">
        <Tabs.List>
          <Tabs.Tab value="a">One</Tabs.Tab>
          <Tabs.Tab value="b">Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">One</Tabs.Panel>
        <Tabs.Panel value="b">Two</Tabs.Panel>
      </Tabs>,
    );
    screen.getByRole('tab', { name: 'One' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
  });
});

// ─── Error boundary ───────────────────────────────────────────────────────────

describe('Tabs — error handling', () => {
  it('throws if Tab is rendered outside Tabs', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Tabs.Tab value="x">Orphan</Tabs.Tab>)).toThrow(
      'Tabs sub-components must be used inside <Tabs>',
    );
    spy.mockRestore();
  });

  it('throws if Panel is rendered outside Tabs', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Tabs.Panel value="x">Orphan</Tabs.Panel>)).toThrow(
      'Tabs sub-components must be used inside <Tabs>',
    );
    spy.mockRestore();
  });
});
