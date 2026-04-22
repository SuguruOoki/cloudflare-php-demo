/**
 * Cloudflare Queues ハンドラ（Producer + Consumer）
 *
 * Producer: POST /api/enqueue → env.JOBS.send() でメッセージ投入
 * Consumer: Worker の queue() ハンドラから processBatch() を呼び出す。
 *           各メッセージは PHP Container の POST /process に HTTP で委譲。
 *
 * Consumer の実行枠（Cloudflare Queues 仕様）:
 *   - CPU: 既定 30秒 / 設定で最大 **5分**
 *   - Wall clock: 最大 **15分**
 *   - max_retries 到達で dead_letter_queue に自動退避
 *
 * 有効化手順:
 *   1. wrangler queues create php-heavy-jobs
 *   2. wrangler queues create php-heavy-jobs-dlq
 *   3. wrangler.jsonc の `queues` ブロックのコメント解除
 *   4. deploy
 *
 * 参考: https://developers.cloudflare.com/queues/
 */

// -------------------- 型定義 --------------------

export interface JobPayload {
  jobId: string;
  kind: string;
  args?: Record<string, unknown>;
}

/** Container の fetch 相当（DurableObjectStub<Container> を受ける） */
export interface ContainerLike {
  fetch(request: Request): Promise<Response>;
}

// -------------------- 設定 --------------------

/** Consumer が処理委譲する Container 側のエンドポイント */
const PROCESS_ENDPOINT = 'https://internal.invalid/process';

/** 失敗時のリトライ delay (秒) - max_retries 到達で DLQ へ */
const RETRY_DELAY_SECONDS = 60;

// -------------------- Producer --------------------

/**
 * POST /api/enqueue のリクエストを処理する。
 * ボディを丸ごと Queue に投入し、即 202 Accepted + jobId を返す。
 */
export async function handleEnqueue(
  request: Request,
  jobs: Queue<JobPayload> | undefined
): Promise<Response> {
  if (!jobs) {
    return Response.json(
      {
        error: 'Queue (JOBS binding) is not configured',
        how_to_enable:
          'wrangler queues create php-heavy-jobs && wrangler queues create php-heavy-jobs-dlq ' +
          '→ wrangler.jsonc の "queues" ブロックのコメントを外す → deploy',
        docs: 'docs/manual-setup.md',
      },
      { status: 503 }
    );
  }

  const jobId = crypto.randomUUID();
  const body = await request.json<Record<string, unknown>>().catch(() => ({}));

  await jobs.send({
    jobId,
    kind: 'demo-heavy-work',
    args: body,
  });

  return Response.json({ jobId, status: 'queued' }, { status: 202 });
}

// -------------------- Consumer --------------------

/**
 * Queue Consumer のバッチ処理本体。
 *
 * 各メッセージを Container の POST /process に HTTP で委譲する。
 * - 成功: msg.ack() で Queue から削除
 * - 失敗: msg.retry({delaySeconds}) で再試行キュー投入
 *   → max_retries 到達で自動的に DLQ へ退避される
 *
 * batch 全体を retry したい場合は `batch.retryAll()` も可。
 */
export async function processBatch(
  batch: MessageBatch<JobPayload>,
  container: ContainerLike
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      const res = await container.fetch(
        new Request(PROCESS_ENDPOINT, {
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
      msg.retry({ delaySeconds: RETRY_DELAY_SECONDS });
    }
  }
}

// -------------------- 使い方の最小サンプル --------------------

/**
 * Producer を叩く最小サンプル:
 *
 * ```sh
 * curl -X POST https://your-worker.workers.dev/api/enqueue \
 *   -H 'content-type: application/json' \
 *   -d '{"target_user_id": 42}'
 * # => 202 Accepted {"jobId":"...","status":"queued"}
 * ```
 *
 * Consumer (Worker の default export 内) での組み合わせ:
 *
 * ```ts
 * async queue(batch, env) {
 *   const container = getContainer(env.APP, 'php-8.4');
 *   await processBatch(batch, container);
 * }
 * ```
 */
export const EXAMPLE_USAGE = null;
