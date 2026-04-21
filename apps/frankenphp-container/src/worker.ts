import { Container, getContainer } from '@cloudflare/containers';

export interface Env {
  APP: DurableObjectNamespace<AppContainer>;
  DB?: D1Database;
  FILES?: R2Bucket;
  CACHE?: KVNamespace;
}

export class AppContainer extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = '10m';

  override onStart() {
    console.log('[AppContainer] FrankenPHP starting…');
  }

  override onStop() {
    console.log('[AppContainer] FrankenPHP stopped');
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/_worker/healthz') {
      return new Response('worker-ok', { status: 200 });
    }

    const container = getContainer(env.APP);
    return container.fetch(request);
  },
};
