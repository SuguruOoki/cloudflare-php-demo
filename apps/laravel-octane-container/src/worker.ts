import { Container, getContainer } from '@cloudflare/containers';

export interface Env {
  APP: DurableObjectNamespace<LaravelOctaneContainer>;
}

export class LaravelOctaneContainer extends Container<Env> {
  defaultPort = 8080;
  // Laravel Octane は常駐 worker なので short sleep で入替を促進
  sleepAfter = '2m';

  override onStart() {
    console.log('[LaravelOctaneContainer] Octane starting…');
  }

  override onStop() {
    console.log('[LaravelOctaneContainer] Octane stopped');
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/_worker/healthz') {
      return new Response('worker-ok', { status: 200 });
    }

    // 固定名で同じ worker に集めると Octane の request_count が伸び続けて
    // 「常駐プロセスで動いている」事が curl だけで確認できる。
    const container = getContainer(env.APP, 'octane-v1');
    return container.fetch(request);
  },
};
