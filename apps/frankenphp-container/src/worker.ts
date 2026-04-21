import { Container, getContainer } from '@cloudflare/containers';

export interface Env {
  APP: DurableObjectNamespace<AppContainer>;
  DB?: D1Database;
  FILES?: R2Bucket;
  CACHE?: KVNamespace;
}

export class AppContainer extends Container<Env> {
  defaultPort = 8080;
  // sleepAfter を短めにして、次のバージョン更新時のロールアウトを早める。
  // デモ用途なので idle 2分でインスタンスを寝かせ、新 PHP ランタイムへの入替を促進。
  sleepAfter = '2m';

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

    // 名前を PHP バージョンに紐づけておくと、PHP メジャー/マイナー更新時に
    // 新しい DO インスタンス = 新 container が起動し、旧 sleepAfter 内の
    // 生きたインスタンスに当たる心配が無い（強制ロールアウト効果）。
    const container = getContainer(env.APP, 'php-8.4');
    return container.fetch(request);
  },
};
