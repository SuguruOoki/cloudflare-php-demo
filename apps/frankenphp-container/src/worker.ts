import { Container, getContainer } from '@cloudflare/containers';
import { handleSendMail, type SendEmailBinding } from './handlers/email';

/**
 * スライドで紹介した機能の実装:
 *   - Queue + DLQ: Producer(fetch /api/enqueue) / Consumer(queue handler)
 *   - Cloudflare Email Service: POST /api/send-mail で env.SEND_EMAIL.send()
 *     → ハンドラは src/handlers/email.ts に分離
 *
 * 各バインディングは wrangler.jsonc で有効化するまでは undefined のため、
 * 未設定時はフレンドリーな 503 を返して deploy が壊れないようにしている。
 * アクティベート手順は docs/manual-setup.md 「Queue / Email Service を有効化」節参照。
 */

interface JobPayload {
  jobId: string;
  kind: string;
  args?: Record<string, unknown>;
}

export interface Env {
  APP: DurableObjectNamespace<AppContainer>;
  // ↓ スライド紹介機能: 必要に応じて wrangler.jsonc で有効化
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

function notConfigured(feature: string, howTo: string): Response {
  return Response.json(
    {
      error: `${feature} is not configured on this deployment`,
      how_to_enable: howTo,
      docs: 'docs/manual-setup.md',
    },
    { status: 503 }
  );
}

export default {
  /**
   * HTTP エントリポイント
   * - /_worker/healthz        Worker 生存確認
   * - /api/enqueue            Queue Producer デモ
   * - /api/send-mail          Cloudflare Email Service デモ (handlers/email.ts)
   * - その他                   Container の PHP にフォワード
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/_worker/healthz') {
      return new Response('worker-ok', { status: 200 });
    }

    // --- Queue Producer デモ ---
    if (url.pathname === '/api/enqueue') {
      if (!env.JOBS) {
        return notConfigured(
          'Queue (JOBS binding)',
          'wrangler queues create php-heavy-jobs && wrangler queues create php-heavy-jobs-dlq ' +
            '→ wrangler.jsonc の "queues" ブロックのコメントを外す → deploy'
        );
      }
      const jobId = crypto.randomUUID();
      const body = await request.json<Record<string, unknown>>().catch(() => ({}));
      await env.JOBS.send({ jobId, kind: 'demo-heavy-work', args: body });
      return Response.json({ jobId, status: 'queued' }, { status: 202 });
    }

    // --- Cloudflare Email Service デモ ---
    // 実装は src/handlers/email.ts に分離。バインディング有無の判定も向こう側で行う。
    if (url.pathname === '/api/send-mail' && request.method === 'POST') {
      return handleSendMail(request, env.SEND_EMAIL);
    }

    // その他は PHP Container にフォワード
    const container = getContainer(env.APP, 'php-8.4-r2');
    return container.fetch(request);
  },

  /**
   * Queue Consumer ハンドラ
   *
   * Queue に入ったメッセージを受け取り、PHP Container の /process に
   * HTTP で POST して処理委譲する。
   *
   * 失敗時は msg.retry() で再試行 → max_retries 到達で DLQ に退避される。
   * 実行時間枠は: CPU 最大 5分 / wall clock 15分 (Queue Consumer の仕様)
   */
  async queue(batch: MessageBatch<JobPayload>, env: Env): Promise<void> {
    const container = getContainer(env.APP, 'php-8.4-r2');
    for (const msg of batch.messages) {
      try {
        const res = await container.fetch(
          new Request('https://internal.invalid/process', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(msg.body),
          })
        );
        if (!res.ok) {
          throw new Error(`container /process returned ${res.status}`);
        }
        msg.ack();
      } catch (err) {
        console.error('[queue] job failed', msg.body, err);
        msg.retry({ delaySeconds: 60 });
      }
    }
  },
};
