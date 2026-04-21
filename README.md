# cloudflare-php-demo

> PHP を Cloudflare で本当に動かすサンプル集 + 登壇スライド
> 20分トーク「PHPer のための Cloudflare 実戦入門」のリファレンス実装

## なにこれ

「Cloudflare で PHP は動かない」という先入観を壊すためのリポジトリ。3つのアプローチそれぞれで最小構成を置いてある。

| ディレクトリ | アプローチ | ランタイム | 用途 |
|---|---|---|---|
| `apps/php-wasm-worker/` | **A: php-wasm**（※現状は Worker デモ版、php-wasm 実行は未統合） | Workers (V8 isolate) | 軽量 / WordPress系 |
| `apps/frankenphp-container/` | **B: Containers** (vanilla PHP) | FrankenPHP on Cloudflare Containers | 最小 PHP 実体デモ |
| `apps/laravel-octane-container/` | **B': Laravel Octane** | FrankenPHP Worker モード + Octane | Laravel 本番想定 |
| （ドキュメントのみ） | **C: ハイブリッド** | Workers + 既存オリジン | 段階移行 |

## 構成

```
cloudflare-php-demo/
├── slides/                       # Marp スライド（20分 / 27枚）
│   └── slides.md
├── apps/
│   ├── php-wasm-worker/          # アプローチA
│   └── frankenphp-container/     # アプローチB
├── .github/workflows/
│   ├── deploy-php-wasm.yml
│   ├── deploy-container.yml
│   └── build-slides.yml
└── docs/
    ├── manual-setup.md           # 手動セットアップ手順（必読）
    └── queue-for-long-running.md # 30秒CPU制限を越える: Cloudflare Queues 活用
```

## 長時間処理をやりたいとき

Workers は 1 リクエスト **CPU 30秒上限**。PDF生成・一括メール・動画変換等は **Cloudflare Queues** で Producer/Consumer に分離して回避する。詳細と実装例: [`docs/queue-for-long-running.md`](docs/queue-for-long-running.md)

## クイックスタート

### 1. php-wasm Worker（5分）

> **注**: 現状は「3アプローチのデモランディング + Worker ランタイム情報を返すAPI」として動作します。
> 実 PHP を Worker 内で実行するには `@php-wasm/universal` + PHPローダー `.wasm` のバンドル設定が別途必要で、TODOとしています。
> 実 PHP 実行の動作確認は `apps/frankenphp-container/` 側で行います。

デプロイは **GitHub Actions 経由**（`main` push で自動）。ローカルから `wrangler deploy` は叩きません。

```bash
# ローカル開発サーバーのみ（デプロイは CI）
cd apps/php-wasm-worker
npm install
npm run dev                 # http://localhost:8787
```

デプロイ後の動作確認:
```bash
curl https://<your-worker>.workers.dev/api/hello
```

### 2. FrankenPHP Container（10分）

事前に Cloudflare Containers が有効化されている必要あり（`docs/manual-setup.md` 参照）。
デプロイは **GitHub Actions 経由**。ローカルから `wrangler deploy` は叩きません。

```bash
cd apps/frankenphp-container
npm install

# ローカル Docker 確認のみ（デプロイは CI）
npm run docker:build
npm run docker:run          # http://localhost:8080/api/hello
```

### 3. スライドをビルド

```bash
cd slides
npx @marp-team/marp-cli@latest slides.md -o slides.pdf --allow-local-files
npx @marp-team/marp-cli@latest slides.md -o slides.html --allow-local-files
# プレゼン時のプレビュー:
npx @marp-team/marp-cli@latest -s .
```

## GitHub Actions で自動デプロイ

`main` への push で該当 app が変わっていれば自動デプロイされる。

初回だけ以下を GitHub Secrets に登録:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

詳細は [`docs/manual-setup.md`](docs/manual-setup.md) を参照。

## 登壇で使う場合

1. `slides/slides.md` を Marp でビルド → PDF を投影
2. デモ時は `apps/php-wasm-worker` のエンドポイントを事前デプロイしておく（コールドスタート対策）
3. `apps/frankenphp-container` のコードを画面で見せる（実デプロイは時間かかるので録画推奨）

## License

MIT
