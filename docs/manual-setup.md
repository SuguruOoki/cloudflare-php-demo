# 手動セットアップ手順

GitHub Actions による自動デプロイを動かすまでに、**人間がやる必要がある手順**をまとめる。

所要時間: 約 20〜30 分（Cloudflare 未契約の場合 +5分）。

---

## 前提

- macOS / Linux / WSL
- Node.js 22+
- `gh` CLI（GitHub 認証済み）
- Docker Desktop または docker CLI（Container デプロイのみ）
- Cloudflare アカウント（無料プランで可、ただし Containers は有料プラン推奨）

---

## Step 1. GitHub リポジトリを作成してプッシュ

ローカルで既に作成済みの `cloudflare-php-demo/` を GitHub に push する。

```bash
cd /Users/suguru_oki_mosh/ghq/github.com/SuguruOoki/cloudflare-php-demo

git init -b main
git add .
git commit -m "chore: initial commit"

# GitHub に新規リポジトリ作成 + push（gh CLI）
gh repo create cloudflare-php-demo \
    --public \
    --source=. \
    --remote=origin \
    --description "PHP on Cloudflare: Workers (php-wasm) + Containers (FrankenPHP)" \
    --push
```

> プライベートにしたい場合は `--public` を `--private` に。

---

## Step 2. Cloudflare API トークンを発行

GitHub Actions から Cloudflare にデプロイするための API トークンを作る。

1. https://dash.cloudflare.com/profile/api-tokens を開く
2. **「トークンを作成」** → テンプレート **「Edit Cloudflare Workers」** を選択
3. 権限を以下に調整:
   - **Account** → `Workers Scripts : Edit`
   - **Account** → `Workers KV Storage : Edit` （KV を使う場合）
   - **Account** → `D1 : Edit` （D1 を使う場合）
   - **Account** → `Workers R2 Storage : Edit` （R2 を使う場合）
   - **Account** → `Cloudflare Containers : Edit` （Containers を使う場合）
4. **Account Resources**: 対象アカウントを選択
5. **「続ける」→「トークンを作成」** → 表示されたトークンをコピー（1回しか見られない）

---

## Step 3. Cloudflare Account ID を取得

```bash
# wrangler 経由（ログイン済みなら最速）
npx wrangler whoami
```

または Dashboard 右サイドバーの「Account ID」をコピー。

---

## Step 4. GitHub Secrets に登録

```bash
# リポジトリのルートで
gh secret set CLOUDFLARE_API_TOKEN
# → プロンプトにトークンを貼り付け

gh secret set CLOUDFLARE_ACCOUNT_ID
# → プロンプトに Account ID を貼り付け
```

ブラウザからやる場合: `Settings → Secrets and variables → Actions → New repository secret`

---

## Step 5. wrangler CLI をローカルでログイン（初回のみ）

ローカルから `wrangler deploy` を試すときに必要。CI だけで完結させるならスキップ可。

```bash
npx wrangler login
```

ブラウザが開き、Cloudflare への認可画面が出る。許可すると完了。

---

## Step 6-A. php-wasm Worker のセットアップ

### KV namespace を作成（任意、使わなくてもデプロイは通る）

```bash
cd apps/php-wasm-worker
npx wrangler kv:namespace create CACHE
# → 出力された id を控える
```

### `wrangler.jsonc` の `REPLACE_WITH_KV_ID` を置換

```bash
# 例
sed -i '' 's/REPLACE_WITH_KV_ID/abc123def456.../' wrangler.jsonc
```

KV を使わない場合は `kv_namespaces` セクションごと削除でOK。

### 初回デプロイ

```bash
npm install
npm run deploy
```

デプロイ成功すると `https://cloudflare-php-wasm-demo.<your-subdomain>.workers.dev` が発行される。

```bash
curl https://cloudflare-php-wasm-demo.<your-subdomain>.workers.dev/api/hello
```

---

## Step 6-B. FrankenPHP Container のセットアップ

### Containers 機能を有効化

Dashboard: **Workers & Pages → Containers → Enable**
（2026年時点で一部プランで追加課金あり。料金は公式ドキュメント確認）

### 必要なら D1 / R2 / KV を作成

```bash
cd apps/frankenphp-container

# D1
npx wrangler d1 create prod-db
# → 出力された database_id を控える

# R2
npx wrangler r2 bucket create uploads

# KV
npx wrangler kv:namespace create CACHE
```

`wrangler.jsonc` 末尾のコメントアウト部分を該当IDで埋めて有効化する。

### ローカル動作確認（Docker のみで完結）

```bash
npm run docker:build
npm run docker:run
# 別ターミナルで
curl http://localhost:8080/api/hello
```

### Cloudflare にデプロイ

```bash
npm install
npm run deploy
```

初回は Docker イメージのビルド+プッシュに数分かかる。

---

## Step 7. GitHub Actions が回ることを確認

何か小さな変更を入れて push:

```bash
echo "# Trigger CI" >> README.md
git commit -am "chore: trigger ci"
git push
```

- `Actions` タブで `Deploy php-wasm Worker` / `Deploy FrankenPHP Container` / `Build Slides` が流れていれば成功
- 失敗時は `CLOUDFLARE_API_TOKEN` の権限不足が大半

---

## Step 7.5. Queue / Email Service を有効化（任意）

スライド S26-S28 で紹介した **Queue + DLQ** と **Cloudflare Email Service** を実際に動かしたい場合。現状はどちらも `apps/frankenphp-container/wrangler.jsonc` でコメントアウトされているので、以下で有効化する。

### A. Queue + DLQ を有効化

```bash
cd apps/frankenphp-container

# 本線と DLQ の2本を作成
npx wrangler queues create php-heavy-jobs
npx wrangler queues create php-heavy-jobs-dlq
```

次に `wrangler.jsonc` の `"queues": { ... }` ブロック（`// --- Queue + DLQ` の下）のコメントを解除。

再デプロイ:
```bash
git add wrangler.jsonc && git commit -m "feat: enable queues binding" && git push
```

動作確認:
```bash
# Producer: ジョブ投入 (Worker の /api/enqueue が Queue に send)
curl -X POST https://cloudflare-php-container-demo.<subdomain>.workers.dev/api/enqueue \
  -H 'content-type: application/json' \
  -d '{"payload":"hello"}'
# → {"jobId":"...","status":"queued"} (202)

# Consumer ログを見る: Queue → Worker.queue() → Container /process
npx wrangler tail --format pretty
```

### B. Cloudflare Email Service を有効化

1. [Cloudflare Dashboard → Email → Email Service](https://dash.cloudflare.com) で機能を有効化
2. 送信元ドメイン（例: `example.com`）を verify（SPF / DKIM / DMARC が自動設定される）
3. `wrangler.jsonc` の `"send_email": [...]` ブロック（`// --- Cloudflare Email Service` の下）のコメントを解除
4. `worker.ts` の `from: { email: 'no-reply@example.com', ... }` を verify 済みドメインに書き換え
5. `git push` で再デプロイ

動作確認:
```bash
curl -X POST https://cloudflare-php-container-demo.<subdomain>.workers.dev/api/send-mail \
  -H 'content-type: application/json' \
  -d '{"to":"you@example.com","subject":"Test","text":"from CF Email Service"}'
# → {"status":"sent"}
```

> 2026 年 4 月時点で Email Service は **public beta**、`Workers Paid` プランが必要です。
> Laravel 公式ドライバはまだ未対応のため、Laravel から使うなら**この Worker エンドポイントを HTTP で叩く**構成にする。

---

## Step 8. カスタムドメイン（任意）

### php-wasm Worker に独自ドメインを付ける

```bash
npx wrangler deploy --route "php-demo.example.com/*"
```

または `wrangler.jsonc` に `routes` を追加:

```jsonc
"routes": [
  { "pattern": "php-demo.example.com/*", "zone_name": "example.com" }
]
```

ドメインは事前に Cloudflare に NS を向ける必要あり。

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `Authentication error [code: 10000]` | APIトークンの権限不足 | Step 2 の権限を追加し再発行 |
| `Container deployment not enabled` | Containers 未有効化 | Step 6-B の Dashboard で有効化 |
| `php-wasm` ビルドが重い | Wasm バンドルが大きい | `compatibility_flags: ["nodejs_compat"]` を確認 |
| Actions で `wrangler: command not found` | 古い `wrangler-action` | `@v3` を使っているか確認 |
| D1 への接続が 403 | `database_id` の指定ミス | `npx wrangler d1 list` で再確認 |

---

## 参考リンク

- Cloudflare Containers: https://developers.cloudflare.com/containers/
- FrankenPHP: https://frankenphp.dev/
- php-wasm (WordPress Playground): https://github.com/WordPress/wordpress-playground
- wrangler-action: https://github.com/cloudflare/wrangler-action
