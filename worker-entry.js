import { createRequestHandler } from 'react-router';
import * as serverBuild from './dist/server/index.js';

const requestHandler = createRequestHandler(serverBuild, 'production');

export default {
  async fetch(request, env, ctx) {
    const loadContext = { env, ctx, cloudflare: { env, ctx } };
    try {
      return await requestHandler(request, loadContext);
    } catch (error) {
      console.error('SSR Error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
