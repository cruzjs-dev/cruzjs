import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedView } from './FeedView';
import type { FeedItem } from './FeedView';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                          */
/* ------------------------------------------------------------------ */

const baseItems: FeedItem[] = [
  {
    id: '1',
    author: { name: 'Alice', avatarSrc: '/alice.png' },
    content: 'Just shipped a new feature!',
    timestamp: '2 hours ago',
    upvotes: 5,
    upvoted: false,
  },
  {
    id: '2',
    author: { name: 'Bob' },
    content: 'Great work on the release.',
    timestamp: '1 hour ago',
    upvotes: 3,
    upvoted: true,
  },
  {
    id: '3',
    author: { name: 'Carol', avatarSrc: '/carol.png' },
    content: <p>This is <strong>rich</strong> content</p>,
    timestamp: '30 minutes ago',
  },
  {
    id: '4',
    author: { name: 'Dave' },
    content: 'Looking forward to the next sprint.',
    timestamp: '5 minutes ago',
    metadata: <span data-testid="custom-badge">Staff</span>,
  },
];

const itemsWithReplies: FeedItem[] = [
  {
    id: '1',
    author: { name: 'Alice' },
    content: 'Top-level post',
    timestamp: '3 hours ago',
    replies: [
      {
        id: '1-1',
        author: { name: 'Bob' },
        content: 'First reply',
        timestamp: '2 hours ago',
        replies: [
          {
            id: '1-1-1',
            author: { name: 'Carol' },
            content: 'Nested reply',
            timestamp: '1 hour ago',
          },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Basic Rendering                                                    */
/* ------------------------------------------------------------------ */

describe('FeedView -- renders feed items with author names', () => {
  it('renders all author names', () => {
    render(<FeedView items={baseItems} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('Dave')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  Timestamps                                                         */
/* ------------------------------------------------------------------ */

describe('FeedView -- renders timestamps', () => {
  it('shows all timestamps', () => {
    render(<FeedView items={baseItems} />);
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('1 hour ago')).toBeInTheDocument();
    expect(screen.getByText('30 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

describe('FeedView -- renders content', () => {
  it('renders text content', () => {
    render(<FeedView items={baseItems} />);
    expect(screen.getByText('Just shipped a new feature!')).toBeInTheDocument();
    expect(screen.getByText('Great work on the release.')).toBeInTheDocument();
  });

  it('renders rich content (ReactNode)', () => {
    render(<FeedView items={baseItems} />);
    expect(screen.getByText('rich')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  Upvote                                                             */
/* ------------------------------------------------------------------ */

describe('FeedView -- calls onUpvote when upvote clicked', () => {
  it('calls onUpvote with correct item id', () => {
    const handleUpvote = vi.fn();
    render(<FeedView items={baseItems} onUpvote={handleUpvote} />);
    const upvoteButtons = screen.getAllByTestId('feed-upvote-button');
    fireEvent.click(upvoteButtons[0]);
    expect(handleUpvote).toHaveBeenCalledWith('1');
  });

  it('calls onUpvote for different items', () => {
    const handleUpvote = vi.fn();
    render(<FeedView items={baseItems} onUpvote={handleUpvote} />);
    const upvoteButtons = screen.getAllByTestId('feed-upvote-button');
    fireEvent.click(upvoteButtons[1]);
    expect(handleUpvote).toHaveBeenCalledWith('2');
  });
});

/* ------------------------------------------------------------------ */
/*  Upvoted State                                                      */
/* ------------------------------------------------------------------ */

describe('FeedView -- shows upvoted state', () => {
  it('applies primary color class when upvoted', () => {
    const handleUpvote = vi.fn();
    render(<FeedView items={baseItems} onUpvote={handleUpvote} />);
    const upvoteButtons = screen.getAllByTestId('feed-upvote-button');
    // Item at index 1 (Bob) has upvoted: true
    expect(upvoteButtons[1]).toHaveClass('text-primary');
    expect(upvoteButtons[1]).toHaveClass('font-medium');
  });

  it('does not apply upvoted class when not upvoted', () => {
    const handleUpvote = vi.fn();
    render(<FeedView items={baseItems} onUpvote={handleUpvote} />);
    const upvoteButtons = screen.getAllByTestId('feed-upvote-button');
    // Item at index 0 (Alice) has upvoted: false
    expect(upvoteButtons[0]).not.toHaveClass('text-primary');
  });

  it('displays upvote count', () => {
    const handleUpvote = vi.fn();
    render(<FeedView items={baseItems} onUpvote={handleUpvote} />);
    const counts = screen.getAllByTestId('feed-upvote-count');
    expect(counts[0]).toHaveTextContent('5');
    expect(counts[1]).toHaveTextContent('3');
  });
});

/* ------------------------------------------------------------------ */
/*  Replies Indented                                                   */
/* ------------------------------------------------------------------ */

describe('FeedView -- renders replies indented', () => {
  it('renders reply items', () => {
    render(<FeedView items={itemsWithReplies} />);
    expect(screen.getByText('First reply')).toBeInTheDocument();
    expect(screen.getByText('Nested reply')).toBeInTheDocument();
  });

  it('renders replies container with indentation classes', () => {
    render(<FeedView items={itemsWithReplies} />);
    const repliesContainers = screen.getAllByTestId('feed-replies');
    expect(repliesContainers[0]).toHaveClass('ml-10');
    expect(repliesContainers[0]).toHaveClass('border-l-2');
    expect(repliesContainers[0]).toHaveClass('border-surface-border');
    expect(repliesContainers[0]).toHaveClass('pl-4');
  });

  it('renders the correct number of feed items including replies', () => {
    render(<FeedView items={itemsWithReplies} />);
    const allItems = screen.getAllByTestId('feed-item');
    expect(allItems).toHaveLength(3); // 1 top + 1 reply + 1 nested reply
  });
});

/* ------------------------------------------------------------------ */
/*  Reply Input                                                        */
/* ------------------------------------------------------------------ */

describe('FeedView -- shows reply input on reply button click', () => {
  it('shows reply form after clicking reply button', () => {
    const handleReply = vi.fn();
    render(<FeedView items={baseItems} onReply={handleReply} />);

    // Reply form should not be visible initially
    expect(screen.queryByTestId('feed-reply-form')).not.toBeInTheDocument();

    // Click reply on first item
    const replyButtons = screen.getAllByTestId('feed-reply-button');
    fireEvent.click(replyButtons[0]);

    // Reply form should now be visible
    expect(screen.getByTestId('feed-reply-form')).toBeInTheDocument();
    expect(screen.getByTestId('feed-reply-input')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  onReply                                                            */
/* ------------------------------------------------------------------ */

describe('FeedView -- calls onReply with content', () => {
  it('calls onReply with item id and text content', () => {
    const handleReply = vi.fn();
    render(<FeedView items={baseItems} onReply={handleReply} />);

    // Open reply form
    const replyButtons = screen.getAllByTestId('feed-reply-button');
    fireEvent.click(replyButtons[0]);

    // Type a reply
    const input = screen.getByTestId('feed-reply-input');
    fireEvent.change(input, { target: { value: 'Nice post!' } });

    // Submit
    const submit = screen.getByTestId('feed-reply-submit');
    fireEvent.click(submit);

    expect(handleReply).toHaveBeenCalledWith('1', 'Nice post!');
  });

  it('clears input after submitting reply', () => {
    const handleReply = vi.fn();
    render(<FeedView items={baseItems} onReply={handleReply} />);

    const replyButtons = screen.getAllByTestId('feed-reply-button');
    fireEvent.click(replyButtons[0]);

    const input = screen.getByTestId('feed-reply-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Reply content' } });
    fireEvent.click(screen.getByTestId('feed-reply-submit'));

    // After submit, the form should close (reply form hides)
    expect(screen.queryByTestId('feed-reply-form')).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

describe('FeedView -- shows empty message when no items', () => {
  it('shows default empty message', () => {
    render(<FeedView items={[]} />);
    expect(screen.getByText('No items to display')).toBeInTheDocument();
    expect(screen.getByTestId('feed-empty')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(<FeedView items={[]} emptyMessage="Nothing here yet" />);
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

describe('FeedView -- renders metadata', () => {
  it('renders metadata ReactNode in action bar', () => {
    render(<FeedView items={baseItems} />);
    expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
  });

  it('wraps metadata in a container element', () => {
    render(<FeedView items={baseItems} />);
    const metadataContainers = screen.getAllByTestId('feed-item-metadata');
    expect(metadataContainers.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Ref Forwarding                                                     */
/* ------------------------------------------------------------------ */

describe('FeedView -- ref forwarding', () => {
  it('forwards ref to container div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<FeedView ref={ref} items={baseItems} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('forwards ref on empty state', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<FeedView ref={ref} items={[]} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

/* ------------------------------------------------------------------ */
/*  HTML Attributes                                                    */
/* ------------------------------------------------------------------ */

describe('FeedView -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(<FeedView data-testid="my-feed" id="feed-1" items={baseItems} />);
    const el = screen.getByTestId('my-feed');
    expect(el).toHaveAttribute('id', 'feed-1');
  });

  it('merges custom className', () => {
    const { container } = render(<FeedView items={baseItems} className="custom-class" />);
    expect(container.firstElementChild).toHaveClass('custom-class');
    expect(container.firstElementChild).toHaveClass('flex');
    expect(container.firstElementChild).toHaveClass('flex-col');
  });
});
