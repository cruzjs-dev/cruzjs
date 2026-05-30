/**
 * Figma Embed Component
 *
 * Renders a Figma frame URL as an embedded iframe with oEmbed preview.
 * Used in work item specs to display design references inline.
 */

import React, { useState } from 'react';
import { getTRPC } from '@cruzjs/core/trpc/client';

// ============================================================================
// Props
// ============================================================================

interface FigmaEmbedProps {
  /** Figma file/frame URL to embed */
  url: string;
  /** Optional fixed width (default: 100%) */
  width?: number | string;
  /** Optional fixed height (default: 450px) */
  height?: number | string;
  /** Whether to show the title bar */
  showTitle?: boolean;
  /** CSS class for the container */
  className?: string;
}

// ============================================================================
// FigmaEmbed Component
// ============================================================================

const FigmaEmbed: React.FC<FigmaEmbedProps> = ({
  url,
  width = '100%',
  height = 450,
  showTitle = true,
  className,
}) => {
  const trpc = getTRPC();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const { data: embedData, isLoading: isLoadingEmbed } = trpc.integrations.getFigmaEmbed.useQuery(
    { url },
    { enabled: !!url && url.includes('figma.com') },
  );

  // Build the embed URL
  const embedUrl = `https://www.figma.com/embed?embed_host=cruzjs&url=${encodeURIComponent(url)}`;

  if (!url || !url.includes('figma.com')) {
    return (
      <div className={`bg-surface-lighter rounded-lg border border-surface-lighter p-4 ${className ?? ''}`}>
        <p className="text-xs text-text-muted">Invalid Figma URL</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-surface-lighter overflow-hidden ${className ?? ''}`}>
      {/* Title bar */}
      {showTitle && (
        <div className="flex items-center justify-between bg-surface-light px-3 py-2 border-b border-surface-lighter">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 24c2.208 0 4-1.792 4-4v-4H8c-2.208 0-4 1.792-4 4s1.792 4 4 4zM4 12c0-2.208 1.792-4 4-4h4v8H8c-2.208 0-4-1.792-4-4zM4 4c0-2.208 1.792-4 4-4h4v8H8C5.792 8 4 6.208 4 4zM12 0h4c2.208 0 4 1.792 4 4s-1.792 4-4 4h-4V0zM20 12c0 2.208-1.792 4-4 4s-4-1.792-4-4 1.792-4 4-4 4 1.792 4 4z" />
            </svg>
            <span className="text-xs text-text-muted truncate max-w-xs">
              {isLoadingEmbed ? 'Loading...' : (embedData?.title ?? 'Figma Design')}
            </span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
          >
            Open in Figma
          </a>
        </div>
      )}

      {/* Embed iframe */}
      <div className="relative" style={{ width, height: typeof height === 'number' ? `${height}px` : height }}>
        {(isLoading || isLoadingEmbed) && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-lighter">
            {/* Thumbnail preview while iframe loads */}
            {embedData?.thumbnailUrl ? (
              <img
                src={embedData.thumbnailUrl}
                alt={embedData.title}
                className="max-w-full max-h-full object-contain opacity-50"
              />
            ) : (
              <div className="text-xs text-text-muted">Loading Figma embed...</div>
            )}
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-lighter gap-2">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-xs text-text-muted">Failed to load Figma embed</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Open in Figma instead
            </a>
          </div>
        ) : (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            style={{ width: '100%', height: '100%' }}
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => { setIsLoading(false); setHasError(true); }}
            title={embedData?.title ?? 'Figma Design'}
          />
        )}
      </div>
    </div>
  );
};

export { FigmaEmbed };
