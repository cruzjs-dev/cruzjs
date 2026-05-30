import React, { forwardRef, useEffect, useRef, useCallback } from 'react';
import { Spinner } from '../Spinner';

export type InfiniteScrollProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Content to render inside the scrollable area */
  children: React.ReactNode;
  /** Called when the sentinel enters the viewport and more data should be loaded */
  onLoadMore: () => void;
  /** Whether there is more data to load */
  hasMore: boolean;
  /** Whether a load is currently in progress */
  loading?: boolean;
  /** Distance in px from the bottom at which to trigger loading (default 200) */
  threshold?: number;
  /** Custom loading indicator (default: Spinner) */
  loader?: React.ReactNode;
  /** Message shown when all data has been loaded (!hasMore) */
  endMessage?: React.ReactNode;
};

export const InfiniteScroll = forwardRef<HTMLDivElement, InfiniteScrollProps>(
  function InfiniteScroll(
    {
      children,
      onLoadMore,
      hasMore,
      loading = false,
      threshold = 200,
      loader,
      endMessage,
      className,
      ...rest
    },
    ref,
  ) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const lastCallRef = useRef<number>(0);

    const handleIntersect = useCallback(
      (entries: IntersectionObserverEntry[]) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || !hasMore || loading) {
          return;
        }

        // Debounce: ignore calls within 100ms of the last trigger
        const now = Date.now();
        if (now - lastCallRef.current < 100) {
          return;
        }
        lastCallRef.current = now;

        onLoadMore();
      },
      [hasMore, loading, onLoadMore],
    );

    useEffect(() => {
      if (typeof IntersectionObserver === 'undefined') {
        return;
      }

      const sentinel = sentinelRef.current;
      if (!sentinel) {
        return;
      }

      const observer = new IntersectionObserver(handleIntersect, {
        rootMargin: `0px 0px ${threshold}px 0px`,
      });

      observer.observe(sentinel);

      return () => {
        observer.disconnect();
      };
    }, [handleIntersect, threshold]);

    const defaultLoader = (
      <div className="flex justify-center py-4">
        <Spinner size="md" />
      </div>
    );

    return (
      <div
        ref={ref}
        className={className}
        {...rest}
      >
        {children}

        {/* Sentinel element observed by IntersectionObserver */}
        <div ref={sentinelRef} data-testid="infinite-scroll-sentinel" aria-hidden="true" />

        {loading && (loader ?? defaultLoader)}

        {!hasMore && !loading && endMessage}
      </div>
    );
  },
);

InfiniteScroll.displayName = 'InfiniteScroll';
