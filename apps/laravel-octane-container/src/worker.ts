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

  /**
   * Laravel + Octane の boot は Caddy/FrankenPHP 単体に比べてやや時間がかかる
   * (config/route キャッシュ済でも初回は 1-2 秒)。デフォルトの fetch() は
   * start を待たず即時 forward するため Cloudflare 側で
   * "container is not running" エラーが出ることがある。
   * startAndWaitForPorts() で 8080 ポートの listen を待ってから forward する。
   */
  override async fetch(request: Request): Promise<Response> {
    await this.startAndWaitForPorts();
    return this.containerFetch(request);
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
