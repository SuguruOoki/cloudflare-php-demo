import { Container, getContainer } from '@cloudflare/containers';

/**
 * スライドで紹介した機能の実装:
 *   - Queue + DLQ: Producer(fetch /api/enqueue) / Consumer(queue handler)
 *   - Cloudflare Email Service: POST /api/send-mail で env.SEND_EMAIL.send()
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

/**
 * Cloudflare Email Service の send_email binding 型定義
 * @see https://developers.cloudflare.com/email-service/
 */
interface EmailAddress {
  email: string;
  name?: string;
}
interface SendEmailBody {
  to: EmailAddress[];
  from: EmailAddress;
  subject: string;
  text?: string;
  html?: string;
  reply_to?: EmailAddress;
}
interface SendEmailBinding {
  send(body: SendEmailBody): Promise<void>;
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
   * - /api/send-mail          Cloudflare Email Service デモ
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
    if (url.pathname === '/api/send-mail' && request.method === 'POST') {
      if (!env.SEND_EMAIL) {
        return notConfigured(
          'Email Service (SEND_EMAIL binding)',
          'Cloudflare Dashboard で Email Service を有効化し送信元ドメインを verify → ' +
            'wrangler.jsonc の "send_email" ブロックのコメントを外す → deploy'
        );
      }
      type MailReq = { to: string; subject: string; text?: string; html?: string };
      const payload = await request.json<MailReq>().catch(() => null);
      if (!payload?.to || !payload.subject) {
        return Response.json(
          { error: 'body must be {"to":"...","subject":"...","text":"..."}' },
          { status: 400 }
        );
      }
      await env.SEND_EMAIL.send({
        to: [{ email: payload.to }],
        from: { email: 'no-reply@example.com', name: 'CF PHP Demo' },
        subject: payload.subject,
        text: payload.text ?? '(empty)',
        html: payload.html,
      });
      return Response.json({ status: 'sent' });
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
