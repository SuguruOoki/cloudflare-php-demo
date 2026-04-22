import { Container, getContainer } from '@cloudflare/containers';
import { handleSendMail, type SendEmailBinding } from './handlers/email';
import { handleEnqueue, processBatch, type JobPayload } from './handlers/queue';
import { withEdgeCache } from './handlers/cache';

/**
 * スライドで紹介した機能の入口:
 *   - Queue + DLQ: src/handlers/queue.ts
 *       Producer  POST /api/enqueue → handleEnqueue
 *       Consumer  default.queue()   → processBatch
 *   - Cloudflare Email Service: src/handlers/email.ts
 *       POST /api/send-mail → handleSendMail
 *
 * worker.ts はルーター / バインディング配線に徹する。
 * 各バインディングは wrangler.jsonc で有効化するまで undefined のため、
 * ハンドラ側で 503 + 活性化手順を返す。
 * アクティベート手順は docs/manual-setup.md 「Queue / Email Service を有効化」節。
 */

export interface Env {
  APP: DurableObjectNamespace<AppContainer>;
  // ↓ スライド紹介機能: wrangler.jsonc で有効化
  JOBS?: Queue<JobPayload>;
  SEND_EMAIL?: SendEmailBinding;
  // ↓ 将来オプション
  DB?: D1Database;
  FILES?: R2Bucket;
  CACHE?: KVNamespace;
}

export class AppContainer extends Container<Env> {
  defaultPort = 8080;
  // sleepAfter を短めにして、次のバージョン更新時のロールアウトを早める。
  sleepAfter = '2m';

  override onStart() {
    console.log('[AppContainer] FrankenPHP starting…');
  }

  override onStop() {
    console.log('[AppContainer] FrankenPHP stopped');
  }
}

/** PHP Container への stable な参照。name 固定で同じインスタンスに寄せる。 */
function phpContainer(env: Env) {
  return getContainer(env.APP, 'php-8.4-r2');
}

export default {
  /**
   * HTTP エントリポイント
   * - /_worker/healthz        Worker 生存確認
   * - /api/enqueue            Queue Producer (handlers/queue.ts)
   * - /api/send-mail          Email Service  (handlers/email.ts)
   * - その他                   Container の PHP にフォワード
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/_worker/healthz') {
      return new Response('worker-ok', { status: 200 });
    }

    if (url.pathname === '/api/enqueue') {
      return handleEnqueue(request, env.JOBS);
    }

    if (url.pathname === '/api/send-mail' && request.method === 'POST') {
      return handleSendMail(request, env.SEND_EMAIL);
    }

    // PHP Container にフォワード。認証付きリクエストやセッション持ちは
    // withEdgeCache が自動でキャッシュを bypass するので、別ユーザーの
    // レスポンスが混ざる事故は起きない。公開 GET だけがエッジキャッシュされる。
    return withEdgeCache(request, (req) => phpContainer(env).fetch(req));
  },

  /**
   * Queue Consumer
   *
   * Queue に入ったメッセージを processBatch() に委譲する。
   * - 成功: msg.ack()
   * - 失敗: msg.retry(delay) → max_retries 超で DLQ に退避
   * 実行枠: CPU 最大 5分 / wall 最大 15分
   */
  async queue(batch: MessageBatch<JobPayload>, env: Env): Promise<void> {
    await processBatch(batch, phpContainer(env));
  },
};
