// App server MUST be imported first - initializes schema before any bootstrap
import '@/app.server';

import type { AppLoadContext, EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';
import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';

const ABORT_DELAY = 5_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  entryContext: EntryContext,
  loadContext: AppLoadContext
) {
  // Initialize Cloudflare bindings and database from load context
  await CloudflareContext.init(loadContext);

  const userAgent = request.headers.get('user-agent');
  const isCrawler = isbot(userAgent ?? '');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ABORT_DELAY);

  try {
    const stream = await renderToReadableStream(
      <ServerRouter context={entryContext} url={request.url} />,
      {
        signal: controller.signal,
        onError(error: unknown) {
          console.error('SSR render error:', error);
          responseStatusCode = 500;
        },
      }
    );

    // For crawlers/bots, wait for all content before responding
    if (isCrawler) {
      await stream.allReady;
    }

    clearTimeout(timeoutId);

    responseHeaders.set('Content-Type', 'text/html');
    return new Response(stream, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('SSR stream error:', error);
    return new Response(
      '<!DOCTYPE html><html><body><h1>Server Error</h1></body></html>',
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}
