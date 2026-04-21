# 30秒 CPU 制限を越える: Cloudflare Queues 実装 Tips

Workers / php-wasm の **1リクエスト CPU 30秒上限** を越えて、PDF生成・動画変換・一括メール送信・帳票生成のような重い PHP 処理を走らせるための実装ガイド。

## なぜ Queue が必要か

| 制限 | Workers (Paid) | Containers | Queue 経由 |
|---|---|---|---|
| **CPU time / 1req** | **30秒** | 実質無制限（常駐） | 30秒 × バッチ |
| **応答時間** | 〜15秒でクライアント切断 | 同上 | **即 202 応答** |
| **失敗時** | 呼び出し元で対処 | 5xx を返す | **自動リトライ + DLQ** |
| **バッチ処理** | 1件ずつ | 1件ずつ | **最大100件まとめて** |

PHPer のメンタルモデルでは **Laravel の Queue::push と同じ**。違うのは:
- Worker / Container をまたいで非同期実行される
- インフラ側がリトライ・DLQ・バッチを面倒見てくれる
- Redis / Beanstalkd 不要

---

## 基本パターン

```
  Client
    │ POST /api/heavy-job   (payload)
    ▼
  [Producer Worker]
    │ env.JOBS.send({ jobId, payload })   ← 10ms で返す
    │
    ▼  202 Accepted + { jobId }
  Client

           ─── 非同期 ───

  [Cloudflare Queues]
    │ batch delivery (最大100件 / 30秒)
    ▼
  [Consumer Worker]
    │ 失敗時 自動リトライ (max_retries)
    │ 3回失敗 → DLQ
    ▼
  [Container (FrankenPHP)]
    │ 実 PHP 処理 30秒まで
    ▼
  [R2 / D1 / KV] に結果書き込み
```

---

## wrangler.jsonc 設定

### Producer + Consumer 同居型（最小構成）

```jsonc
{
  "name": "my-php-app",
  "main": "src/worker.ts",
  "compatibility_date": "2026-01-01",

  "queues": {
    "producers": [
      {
        "binding": "JOBS",
        "queue": "php-heavy-jobs"
      }
    ],
    "consumers": [
      {
        "queue": "php-heavy-jobs",
        "max_batch_size": 10,
        "max_batch_timeout": 30,
        "max_concurrency": 2,
        "max_retries": 3,
        "retry_delay": 60,
        "dead_letter_queue": "php-heavy-jobs-dlq"
      }
    ]
  }
}
```

### 設定の意味

| キー | 意味 | 推奨値 |
|---|---|---|
| `max_batch_size` | 1 consumer 呼び出しで受け取る最大メッセージ数 | 10〜100 |
| `max_batch_timeout` | バッチが埋まらなくても何秒で配信するか | 30（Workers CPU 上限と揃える） |
| `max_concurrency` | 同時並行 consumer 数 | 2〜10（下流負荷に合わせる） |
| `max_retries` | 失敗時の最大リトライ回数 | 3〜5 |
| `retry_delay` | リトライまでの秒数（指数バックオフ有） | 60 |
| `dead_letter_queue` | N回失敗後の退避先 | 必ず設定する |

### DLQ も Queue として作成する

DLQ も通常の Queue。事前に作成しておく:

```bash
npx wrangler queues create php-heavy-jobs
npx wrangler queues create php-heavy-jobs-dlq
```

---

## Worker 実装（Producer + Consumer）

```ts
interface JobPayload {
  type: 'pdf' | 'email' | 'report';
  user_id: string;
  args: Record<string, unknown>;
}

interface Env {
  JOBS: Queue<JobPayload>;
  APP: DurableObjectNamespace;  // FrankenPHP Container binding
  RESULTS: R2Bucket;
}

export default {
  // --- Producer ---
  async fetch(req: Request, env: Env): Promise<Response> {
    if (new URL(req.url).pathname !== '/api/heavy-job') {
      return new Response('Not Found', { status: 404 });
    }
    const body = (await req.json()) as JobPayload;
    const jobId = crypto.randomUUID();

    await env.JOBS.send({ ...body });  // ← 10ms で enqueue

    return Response.json(
      { jobId, status: 'queued', poll_url: `/api/jobs/${jobId}` },
      { status: 202 }
    );
  },

  // --- Consumer ---
  async queue(batch: MessageBatch<JobPayload>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        // Container の PHP エンドポイントに委譲（30秒フル使える）
        const res = await env.APP
          .get(env.APP.idFromName('php-worker'))
          .fetch('https://internal/process', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(msg.body),
          });

        if (!res.ok) throw new Error(`container failed: ${res.status}`);

        msg.ack();  // 成功 → Queue から削除
      } catch (err) {
        console.error('job failed', msg.body, err);
        msg.retry({ delaySeconds: 60 });  // 失敗 → リトライ（指数バックオフ可）
      }
    }
  },
};
```

### 重要ポイント

1. **`msg.ack()` を必ず呼ぶ** — 呼ばないと再配信される
2. **個別 retry**: 1件だけ失敗した場合は `msg.retry()`、バッチ全体なら `batch.retryAll()`
3. **`max_batch_timeout` < `30s`** — CPU 上限を越えないよう 25秒程度で区切る
4. **冪等性**: Queue は at-least-once delivery なので、処理は冪等に設計する（`jobId` で重複検知）

---

## PHP (Container) 側の受け口

Container の `public/index.php` に `/process` エンドポイントを追加:

```php
<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/process') {
    $job = json_decode(file_get_contents('php://input'), true);

    // 冪等性: 同じ job_id の処理済みなら早期 return
    if (already_processed($job['jobId'] ?? '')) {
        echo json_encode(['status' => 'already_done']);
        exit;
    }

    match ($job['type']) {
        'pdf'    => generate_pdf($job['args']),     // 重い処理OK
        'email'  => send_batch_mail($job['args']),
        'report' => build_report($job['args']),
    };

    mark_processed($job['jobId']);
    echo json_encode(['status' => 'ok']);
}
```

Laravel の場合は `Queue::push(new GeneratePdfJob)` のままコードを書いて、**カスタムドライバ** `cloudflare-queues` を作れば透過的に動く。

---

## クライアント側のジョブステータス取得

Queue は fire-and-forget なので、結果を取るのは別エンドポイントで:

```ts
// GET /api/jobs/:jobId
async fetch(req, env) {
  const jobId = new URL(req.url).pathname.split('/').pop()!;
  const result = await env.RESULTS.get(`jobs/${jobId}.json`);
  if (!result) return Response.json({ status: 'processing' }, { status: 202 });
  return new Response(await result.text(), {
    headers: { 'content-type': 'application/json' }
  });
}
```

- Consumer が R2 に結果を書く
- Client は jobId でポーリング（または SSE / WebSocket）

---

## 実運用でよくやる構成

### 1. Fan-out（1投入 → 複数処理）

```
 POST /api/send-newsletter
     │
     ▼
 Producer: ユーザー1万件に対して 1万メッセージ enqueue
     │
     ▼
 Consumer: max_concurrency: 10 で並列処理
     │
     ▼ 各 Consumer が Container で 1通ずつ送信
 SendGrid / Resend
```

### 2. Delayed job（予約実行）

`env.JOBS.send({ ... }, { delaySeconds: 3600 })` で 1時間後に配信。cron不要。

### 3. Priority queue

Queue を複数作る（`high-priority`, `low-priority`）。Consumer は両方 consume して、high を先に処理。

---

## コスト感覚

- **Queues**: 100万メッセージ/月まで無料、以降 $0.40/100万
- **Workers Consumer 呼び出し**: 通常の request 課金（無料枠 10万/日）
- **Container 呼び出し**: Container の課金のみ

ざっくり **月1000万ジョブでも $5〜$10 以内** に収まることが多い。自前の Redis + Supervisor + Horizon を運用するより圧倒的に安い。

---

## ハマりどころ

| 症状 | 原因 | 対処 |
|---|---|---|
| メッセージが重複処理される | at-least-once 保証のみ | 処理側で `jobId` による冪等性担保 |
| Consumer が起動しない | `consumers` バインディング設定忘れ | wrangler.jsonc 再確認 |
| DLQ に大量に溜まる | `max_retries` 上限が低い or 冪等性バグ | Consumer の例外を Logpush で追う |
| バッチ受信時に1件失敗で全部 retry | `batch.retryAll()` 誤使用 | 1件ずつ `msg.ack()` / `msg.retry()` |
| 30秒超えて落ちる | `max_batch_timeout` が 30 | 25 に縮め、1件あたりの処理時間上限を設計 |

---

## 参考リンク

- Cloudflare Queues: https://developers.cloudflare.com/queues/
- Batching & Retries: https://developers.cloudflare.com/queues/configuration/batching-retries/
- Dead Letter Queues: https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
