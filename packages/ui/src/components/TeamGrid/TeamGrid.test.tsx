import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TeamGrid } from './TeamGrid';
import type { TeamMember } from './TeamGrid';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const basicMembers: TeamMember[] = [
  {
    id: 'alice',
    name: 'Alice Johnson',
    role: 'CEO',
  },
  {
    id: 'bob',
    name: 'Bob Smith',
    role: 'CTO',
  },
  {
    id: 'carol',
    name: 'Carol Williams',
    role: 'VP Engineering',
  },
];

const membersWithAvatars: TeamMember[] = [
  {
    id: 'alice',
    name: 'Alice Johnson',
    role: 'CEO',
    avatarSrc: '/avatars/alice.jpg',
  },
  {
    id: 'bob',
    name: 'Bob Smith',
    role: 'CTO',
    avatarSrc: '/avatars/bob.jpg',
  },
];

const membersWithBios: TeamMember[] = [
  {
    id: 'alice',
    name: 'Alice Johnson',
    role: 'CEO',
    bio: 'Passionate about building great products.',
  },
  {
    id: 'bob',
    name: 'Bob Smith',
    role: 'CTO',
    bio: 'Full-stack engineer with 15 years of experience.',
  },
];

const membersWithSocials: TeamMember[] = [
  {
    id: 'alice',
    name: 'Alice Johnson',
    role: 'CEO',
    socialLinks: [
      {
        platform: 'Twitter',
        href: 'https://twitter.com/alice',
        icon: <span data-testid="icon-twitter-alice">T</span>,
      },
      {
        platform: 'LinkedIn',
        href: 'https://linkedin.com/in/alice',
        icon: <span data-testid="icon-linkedin-alice">L</span>,
      },
    ],
  },
  {
    id: 'bob',
    name: 'Bob Smith',
    role: 'CTO',
    socialLinks: [
      {
        platform: 'GitHub',
        href: 'https://github.com/bob',
        icon: <span data-testid="icon-github-bob">G</span>,
      },
    ],
  },
];

// ─── Rendering member names ─────────────────────────────────────────────────

describe('TeamGrid -- member names', () => {
  it('renders all member names', () => {
    render(<TeamGrid members={basicMembers} />);
    for (const member of basicMembers) {
      expect(screen.getByText(member.name)).toBeInTheDocument();
    }
  });
});

// ─── Rendering roles ────────────────────────────────────────────────────────

describe('TeamGrid -- roles', () => {
  it('renders all member roles', () => {
    render(<TeamGrid members={basicMembers} />);
    for (const member of basicMembers) {
      expect(screen.getByText(member.role)).toBeInTheDocument();
    }
  });
});

// ─── Rendering avatars ──────────────────────────────────────────────────────

describe('TeamGrid -- avatars', () => {
  it('renders avatar images when avatarSrc is provided', () => {
    render(<TeamGrid members={membersWithAvatars} />);
    for (const member of membersWithAvatars) {
      const avatar = screen.getByTestId(`team-avatar-${member.id}`);
      expect(avatar).toBeInTheDocument();
      expect(avatar.tagName).toBe('IMG');
      expect(avatar).toHaveAttribute('src', member.avatarSrc);
    }
  });

  it('renders initials fallback when avatarSrc is not provided', () => {
    render(<TeamGrid members={basicMembers} />);
    const avatar = screen.getByTestId('team-avatar-alice');
    expect(avatar).toBeInTheDocument();
    expect(avatar.tagName).not.toBe('IMG');
    expect(avatar).toHaveTextContent('AJ');
  });
});

// ─── Heading and description ────────────────────────────────────────────────

describe('TeamGrid -- heading and description', () => {
  it('renders heading and description when provided', () => {
    render(
      <TeamGrid
        members={basicMembers}
        heading="Meet the Team"
        description="The people behind the product."
      />,
    );
    expect(screen.getByText('Meet the Team')).toBeInTheDocument();
    expect(screen.getByText('The people behind the product.')).toBeInTheDocument();
    expect(screen.getByTestId('team-grid-header')).toBeInTheDocument();
  });

  it('does not render header section when heading and description are absent', () => {
    render(<TeamGrid members={basicMembers} />);
    expect(screen.queryByTestId('team-grid-header')).not.toBeInTheDocument();
  });
});

// ─── Grid columns ───────────────────────────────────────────────────────────

describe('TeamGrid -- grid columns', () => {
  it('applies 2-column grid class', () => {
    render(<TeamGrid members={basicMembers} columns={2} />);
    const grid = screen.getByTestId('team-grid-container');
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).not.toContain('lg:grid-cols-3');
  });

  it('applies 3-column grid class (default)', () => {
    render(<TeamGrid members={basicMembers} />);
    const grid = screen.getByTestId('team-grid-container');
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).toContain('lg:grid-cols-3');
  });

  it('applies 4-column grid class', () => {
    render(<TeamGrid members={basicMembers} columns={4} />);
    const grid = screen.getByTestId('team-grid-container');
    expect(grid.className).toContain('lg:grid-cols-4');
  });
});

// ─── Social links ───────────────────────────────────────────────────────────

describe('TeamGrid -- social links', () => {
  it('renders social link icons', () => {
    render(<TeamGrid members={membersWithSocials} />);
    expect(screen.getByTestId('icon-twitter-alice')).toBeInTheDocument();
    expect(screen.getByTestId('icon-linkedin-alice')).toBeInTheDocument();
    expect(screen.getByTestId('icon-github-bob')).toBeInTheDocument();
  });

  it('renders social links with correct hrefs', () => {
    render(<TeamGrid members={membersWithSocials} />);
    const socials = screen.getByTestId('team-socials-alice');
    const links = socials.querySelectorAll('a');
    expect(links[0]).toHaveAttribute('href', 'https://twitter.com/alice');
    expect(links[1]).toHaveAttribute('href', 'https://linkedin.com/in/alice');
  });

  it('does not render socials container when no social links', () => {
    render(<TeamGrid members={basicMembers} />);
    expect(screen.queryByTestId('team-socials-alice')).not.toBeInTheDocument();
  });
});

// ─── Bio text ───────────────────────────────────────────────────────────────

describe('TeamGrid -- bio', () => {
  it('renders bio text when provided', () => {
    render(<TeamGrid members={membersWithBios} />);
    expect(screen.getByText('Passionate about building great products.')).toBeInTheDocument();
    expect(screen.getByText('Full-stack engineer with 15 years of experience.')).toBeInTheDocument();
  });

  it('does not render bio element when bio is absent', () => {
    render(<TeamGrid members={basicMembers} />);
    expect(screen.queryByTestId('team-bio-alice')).not.toBeInTheDocument();
  });
});

// ─── Custom className ───────────────────────────────────────────────────────

describe('TeamGrid -- className', () => {
  it('supports custom className', () => {
    const { container } = render(
      <TeamGrid members={basicMembers} className="custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});

// ─── Ref forwarding ─────────────────────────────────────────────────────────

describe('TeamGrid -- ref forwarding', () => {
  it('forwards ref to the root section element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<TeamGrid ref={ref} members={basicMembers} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });
});
