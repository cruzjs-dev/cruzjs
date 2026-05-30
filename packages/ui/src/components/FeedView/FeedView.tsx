import React, { forwardRef, useCallback, useState } from 'react';
import { Avatar } from '../Avatar';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type FeedItem = {
  id: string;
  author: {
    name: string;
    avatarSrc?: string;
  };
  content: React.ReactNode;
  timestamp: string;
  upvotes?: number;
  upvoted?: boolean;
  replies?: FeedItem[];
  metadata?: React.ReactNode;
};

export type FeedViewProps = React.HTMLAttributes<HTMLDivElement> & {
  items: FeedItem[];
  onUpvote?: (itemId: string) => void;
  onReply?: (itemId: string, content: string) => void;
  showReplyInput?: boolean;
  emptyMessage?: string;
  maxDepth?: number;
  variant?: 'feed' | 'compact';
};

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const HeartIcon: React.FC<{ filled?: boolean; className?: string }> = ({ filled, className }) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 1.5}
    aria-hidden="true"
  >
    <path
      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
    />
  </svg>
);

const ReplyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z"
      clipRule="evenodd"
    />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Reply Input                                                        */
/* ------------------------------------------------------------------ */

type ReplyInputProps = {
  onSubmit: (content: string) => void;
  compact?: boolean;
};

const ReplyInput: React.FC<ReplyInputProps> = ({ onSubmit, compact }) => {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) {
        onSubmit(trimmed);
        setValue('');
      }
    },
    [value, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${compact ? 'mt-2' : 'mt-3'}`} data-testid="feed-reply-form">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Write a reply..."
        className="flex-1 text-sm rounded-md border border-surface-border bg-surface px-3 py-1.5 text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
        data-testid="feed-reply-input"
      />
      <button
        type="submit"
        className="text-sm font-medium px-3 py-1.5 rounded-md bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        disabled={!value.trim()}
        data-testid="feed-reply-submit"
      >
        Reply
      </button>
    </form>
  );
};

/* ------------------------------------------------------------------ */
/*  FeedItemRow                                                        */
/* ------------------------------------------------------------------ */

type FeedItemRowProps = {
  item: FeedItem;
  depth: number;
  maxDepth: number;
  variant: 'feed' | 'compact';
  showReplyInput: boolean;
  onUpvote?: (itemId: string) => void;
  onReply?: (itemId: string, content: string) => void;
};

const FeedItemRow: React.FC<FeedItemRowProps> = ({
  item,
  depth,
  maxDepth,
  variant,
  showReplyInput,
  onUpvote,
  onReply,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const compact = variant === 'compact';
  const avatarSize = compact ? 'xs' : 'sm';
  const isNested = depth > 0;

  const handleReplySubmit = useCallback(
    (content: string) => {
      onReply?.(item.id, content);
      setShowReplyForm(false);
    },
    [item.id, onReply],
  );

  const handleUpvoteClick = useCallback(() => {
    onUpvote?.(item.id);
  }, [item.id, onUpvote]);

  const handleReplyClick = useCallback(() => {
    setShowReplyForm((prev) => !prev);
  }, []);

  // Flatten replies beyond maxDepth
  const replies = item.replies ?? [];
  const shouldNest = depth < maxDepth;

  return (
    <div data-testid="feed-item" data-depth={depth}>
      <div className={`flex ${compact ? 'gap-2' : 'gap-3'}`}>
        {/* Avatar */}
        <div className="shrink-0">
          <Avatar
            src={item.author.avatarSrc}
            name={item.author.name}
            size={avatarSize}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: author + timestamp */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-text" data-testid="feed-item-author">
              {item.author.name}
            </span>
            <span className="text-xs text-text-muted" data-testid="feed-item-timestamp">
              {item.timestamp}
            </span>
          </div>

          {/* Content body */}
          <div className="text-sm text-text-secondary mt-1" data-testid="feed-item-content">
            {item.content}
          </div>

          {/* Action bar */}
          <div className={`flex gap-4 ${compact ? 'mt-1' : 'mt-2'} text-xs text-text-muted items-center`}>
            {/* Upvote button */}
            {onUpvote && (
              <button
                type="button"
                onClick={handleUpvoteClick}
                className={[
                  'inline-flex items-center gap-1 transition-colors',
                  item.upvoted
                    ? 'text-primary font-medium'
                    : 'hover:text-primary',
                ].join(' ')}
                data-testid="feed-upvote-button"
                aria-label={item.upvoted ? 'Remove upvote' : 'Upvote'}
              >
                <HeartIcon filled={item.upvoted} className="w-3.5 h-3.5" />
                {(item.upvotes ?? 0) > 0 && (
                  <span data-testid="feed-upvote-count">{item.upvotes}</span>
                )}
              </button>
            )}

            {/* Reply button */}
            {showReplyInput && onReply && (
              <button
                type="button"
                onClick={handleReplyClick}
                className="hover:text-text-secondary cursor-pointer transition-colors"
                data-testid="feed-reply-button"
              >
                <span className="inline-flex items-center gap-1">
                  <ReplyIcon className="w-3.5 h-3.5" />
                  Reply
                </span>
              </button>
            )}

            {/* Metadata */}
            {item.metadata && (
              <span data-testid="feed-item-metadata">{item.metadata}</span>
            )}
          </div>

          {/* Reply form */}
          {showReplyForm && showReplyInput && onReply && (
            <ReplyInput onSubmit={handleReplySubmit} compact={compact} />
          )}

          {/* Threaded replies */}
          {replies.length > 0 && (
            <div
              className={`${isNested || shouldNest ? 'ml-10 border-l-2 border-surface-border pl-4' : ''} ${compact ? 'mt-2 space-y-2' : 'mt-3 space-y-3'}`}
              data-testid="feed-replies"
            >
              {replies.map((reply) => (
                <FeedItemRow
                  key={reply.id}
                  item={reply}
                  depth={shouldNest ? depth + 1 : depth}
                  maxDepth={maxDepth}
                  variant={variant}
                  showReplyInput={showReplyInput}
                  onUpvote={onUpvote}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  FeedView                                                           */
/* ------------------------------------------------------------------ */

export const FeedView = forwardRef<HTMLDivElement, FeedViewProps>(function FeedView(
  {
    items,
    onUpvote,
    onReply,
    showReplyInput = true,
    emptyMessage = 'No items to display',
    maxDepth = 3,
    variant = 'feed',
    className,
    ...rest
  },
  ref,
) {
  const compact = variant === 'compact';

  if (items.length === 0) {
    return (
      <div
        ref={ref}
        className={['flex items-center justify-center py-12', className].filter(Boolean).join(' ')}
        data-testid="feed-empty"
        {...rest}
      >
        <p className="text-sm text-text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={['flex flex-col', compact ? 'divide-y divide-surface-border/50' : 'divide-y divide-surface-border/50', className].filter(Boolean).join(' ')}
      role="feed"
      {...rest}
    >
      {items.map((item) => (
        <div key={item.id} className={compact ? 'py-3' : 'py-4'}>
          <FeedItemRow
            item={item}
            depth={0}
            maxDepth={maxDepth}
            variant={variant}
            showReplyInput={showReplyInput}
            onUpvote={onUpvote}
            onReply={onReply}
          />
        </div>
      ))}
    </div>
  );
});

FeedView.displayName = 'FeedView';
