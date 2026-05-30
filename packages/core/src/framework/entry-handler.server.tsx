import type { AppLoadContext, EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';
import { isbot } from 'isbot';
import { renderToReadableStream, renderToString } from 'react-dom/server';
import { CloudflareContext } from '../shared/cloudflare/context';
import { DevErrorPage } from './components/DevErrorPage';
import { ProdErrorPage } from './components/ProdErrorPage';

const ABORT_DELAY = 5_000;

/**
 * Default SSR request handler for CruzJS applications.
 *
 * Initializes Cloudflare bindings, renders the React app to a stream,
 * and returns the HTML response. Bot/crawler requests wait for full content.
 *
 * Usage in entry.server.tsx:
 * ```
 * import '@/app.server';
 * export { handleRequest as default } from '@cruzjs/core/framework/entry-handler.server';
 * ```
 */
export async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  entryContext: EntryContext,
  loadContext: AppLoadContext
) {
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

    const isDev = process.env.NODE_ENV !== 'production';
    const errorHtml = renderToString(
      isDev
        ? <DevErrorPage error={error} url={request.url} method={request.method} statusCode={500} />
        : <ProdErrorPage statusCode={500} supportEmail={process.env.SUPPORT_EMAIL} />
    );

    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Error</title></head><body>${errorHtml}</body></html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}
