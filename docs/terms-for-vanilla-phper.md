# スライド用語集 — バニラ PHPer 向け

「**PHPer、Cloudflare に引っ越す — あなたの Laravel を世界330都市で動かすまで**」（Laravel Live Japan 2026 登壇資料）で登場する専門用語を、バニラPHPしか書いたことがない方でも詰まらずに読めるようにまとめた用語集です。

対象読者:
- `$_GET` / `$_POST` / `require` でページを作ってきた PHPer
- Laravel / Symfony は触ったことがない or 軽く触った程度
- Docker は `docker-compose up` を叩いたことはある
- Cloudflare は名前を聞いたことはある、くらい

> 凡例: 🟦 Laravel / 🟧 Cloudflare / ⬜ 共通 Web用語

---

## 1. 🟦 Laravel エコシステム

### Composer
PHP のパッケージマネージャ。`npm`（Node.js）/ `pip`（Python）の PHP 版。`composer.json` に依存を書いて `composer install` すると `vendor/` に展開される。`autoload` が効いて `require` 地獄から解放される。

### Artisan
Laravel 同梱の CLI ツール。`php artisan` で実行。DB マイグレーション (`migrate`)、tinker（REPL）、ルート一覧 (`route:list`)、キャッシュクリアなど、コマンド1発で Laravel を操作できる。

### `.env` ファイル
DB 接続情報・キャッシュ先・メール送信設定など、環境ごとに変えたい値を `KEY=VALUE` で書く。コード内からは `env('DB_HOST')` で読む。バニラPHP で `config.php` に書いていた定数を「環境ごとに切り替え可能にしたもの」。

### Route（ルート）
URL とハンドラ関数の対応表。`routes/web.php` / `routes/api.php` に
```php
Route::get('/users', function () { return User::all(); });
```
と書くと `GET /users` が動く。バニラPHP の `if ($_SERVER['REQUEST_URI'] === '/users')` の分岐を集約したもの。

### Middleware（ミドルウェア）
リクエスト処理の前後に差し込む中間層。認証チェック、ログ、CSRF検証など。バニラPHP で各ファイル冒頭に `require 'auth.php'` していた処理を、1箇所で宣言して複数ルートにまとめて適用できる。

### AppServiceProvider
Laravel アプリの初期化フック（`app/Providers/AppServiceProvider.php`）。起動時に「このインターフェースにはこの実装を注入する」「このサービスをこう拡張する」と宣言する場所。

### Octane
Laravel を **プロセス常駐型** で動かす公式拡張。通常の PHP は 1 リクエストごとに autoload / config 読み込みを全部やり直すが、Octane はワーカープロセスを立ち上げっぱなしにして「起動済み Laravel を流用」する。結果: 起動コストゼロ × スループット数倍。

### FrankenPHP
Caddy Web サーバーに PHP を組み込んだ次世代 PHP サーバー。Apache/Nginx + PHP-FPM の代替。Laravel Octane のバックエンドとしても推奨。Dockerfile 1 行で組み込める。

### Sanctum
Laravel 公式の軽量 API 認証。SPA やモバイルアプリ向けに **Bearer トークン発行**を簡単に書ける。今回のデモの `/api/login → token 発行 → /api/me` は全部 Sanctum。

### Passport
Sanctum の先輩。OAuth2 サーバー機能を含むフル機能版。**外部アプリに自アプリの API を開放**したいなら Passport。自前 SPA だけなら Sanctum で十分。

### Queue / Job
非同期処理の仕組み。「重い処理はレスポンスに乗せず裏で走らせたい」ときに `dispatch(new SendMailJob(...))` する。キューの実体は DB / Redis / SQS / **Cloudflare Queues** など差し替え可能。

### Mailer / `Mail::to()`
Laravel のメール送信ファサード。
```php
Mail::to($user)->send(new WelcomeMail(...));
```
で送れる。SMTP / Mailgun / SES / Resend などドライバ差し替え可。今回は Cloudflare Email Service 用の **カスタム Transport** を書いて `MAIL_MAILER=cloudflare` で使っている。

### bootstrap/app.php
Laravel 11 以降の「アプリ設定の入口」。どの route ファイルを読む、ミドルウェアはどう束ねる、など根本設定を書く。Laravel 10以前の `app/Http/Kernel.php` + `config/*.php` のいくつかを統合したもの。

### CSRF トークン
Cross-Site Request Forgery 対策のトークン。Laravel は `@csrf` ディレクティブで hidden input を挿入。API では Sanctum が `/sanctum/csrf-cookie` エンドポイントで発行。

---

## 2. 🟧 Cloudflare エコシステム

### Cloudflare Workers
エッジで JavaScript/TypeScript を動かす実行環境。AWS Lambda のエッジ・超高速版ポジション。**V8 isolate** ベースでコールドスタート 5ms 程度。

### Cloudflare Containers（2025 GA）
Workers から **Docker コンテナ** を起動できる機能。OCI 規格の image ならそのまま動く。これで Laravel / Rails / Django など重量級フレームワークもエッジで動かせるようになった。**今回の本命**。

### KV（Workers KV）
Cloudflare が提供するキーバリューストア。Redis のサーバーレス版的ポジション。世界中の PoP に分散レプリケーション。

### D1
Cloudflare の SQLite ベースのサーバーレス DB。SQL が書けて、同時接続数の悩みから解放される。MySQL からの移行は DDL 修正が必要（`AUTO_INCREMENT` → `INTEGER PRIMARY KEY AUTOINCREMENT` など）。

### R2
S3 互換の Object Storage。**egress（外向き転送）無料**が最大の差別化。S3 の画像CDN 代金で悩んでいるなら即刻移行候補。

### Cloudflare Queues
メッセージキュー。AWS SQS と同じポジション。**CPU 5分 / wall 15分** の実行時間枠を持つ Consumer が動き、HTTP の 30 秒制限で詰む処理を逃せる。

### Durable Objects
Workers で唯一「状態を持てる」オブジェクト。今回のサンプルでは `LaravelOctaneContainer` が Durable Object として実装されていて、固定名 `octane-v1` を使うことで常に同じワーカープロセスにリクエストが集まるようにしている。

### Wrangler
Cloudflare の公式 CLI。`wrangler deploy` 一発で Worker / Container / Queue / D1 migration まで全部デプロイできる。設定は `wrangler.jsonc` に書く。

### V8 isolate
Google Chrome の JS エンジン V8 を「軽量な分離単位」で切り出したもの。通常のコンテナ（〜数百ms起動）より 100倍以上速く起動する。Workers の実行環境の正体。

### OCI image
**Docker が作る image の標準規格**（Open Container Initiative）。OCI 準拠なら Docker / Podman / Cloudflare Containers のどこでも動く。「Dockerfile で作ったやつ」と理解して OK。

### 330都市
Cloudflare が PoP（Point of Presence = サーバー拠点）を持つ世界の都市数。リクエストは一番近い PoP に到達し、そこで Worker / Container が動く。これが「世界中で Laravel が動く」の正体。

---

## 3. ⬜ Web / インフラ用語

### WebAssembly（Wasm）
ブラウザや JS ランタイムで動くバイナリ実行形式。C/C++/Rust/Go/PHP などをビルドして JS 環境で動かせる。「OS に依存しない実行ファイル」イメージ。`php-wasm` は **PHP インタプリタを Wasm 化したもの**。

### エッジ / エッジコンピューティング
リクエストを受ける地理的拠点（PoP）で処理を実行するアーキテクチャ。従来のCDN は静的ファイルを近くに置くだけだったが、エッジコンピューティングは **ロジックも近くで実行する**。TTFB が桁違いに小さくなる。

### CDN（Content Delivery Network）
静的ファイルを世界中のサーバーにコピーしてユーザーに近い場所から配信する仕組み。Cloudflare・Akamai・Fastly が代表格。

### オリジン（Origin）
コンテンツの「本家」サーバー。CDN から見た「後ろ側」。AWS/さくらで動いている既存の Laravel がこれに当たる。

### TTFB（Time To First Byte）
クライアントが最初の1バイトを受け取るまでの時間。サーバーから見た応答速度の基本指標。スライドの「TTFB 45ms → 18ms」はこの値。

### egress
サーバーから **外へ出る** 通信。AWS では egress 課金が高くつく（例: S3 から CDN 経由でユーザーへ配信するたびに課金）。Cloudflare R2 は egress 無料で、画像大量配信のコストが 1/10 以下になることがある。

### GA（General Availability）
ソフトウェア/サービスが「一般提供開始」の段階に到達したこと。beta / preview を卒業して本番利用を推奨できる状態。今回スライドの「Cloudflare Containers は 2025 GA」は「もう本番投入していいよ」の意味。

### Cold Start / コールドスタート
サーバーレス環境で、久しぶりに実行されたとき初期化が走って遅い現象。Lambda は 数百ms〜数秒、Workers は 5ms 程度で事実上ゼロ。

### ワーカー / ワーカープロセス
常駐してリクエストを処理する PHP プロセス。Apache + PHP-FPM の「worker」と同じ語源だが、Laravel Octane / FrankenPHP の文脈では「起動しっぱなしで使い回される Laravel プロセス」を指す。スライドの curl デモで `worker_pid=524` が変わらないのは、同じワーカープロセスが処理を続けている証拠。

---

## 4. 🔐 認証・HTTPセキュリティ

### Bearer トークン
`Authorization: Bearer <token>` 形式でリクエストに付ける認証トークン。Sanctum / Passport / OAuth すべてこの形式が主流。バニラPHP でいう `$_SERVER['HTTP_AUTHORIZATION']` で取り出す文字列。

### OAuth
「外部サービスの認証を借りる」仕組み。GitHub ログイン・Googleログインなど。SpeakerDeck への自動アップロードでも使った（GitHub OAuth 連携）。

### CSRF（Cross-Site Request Forgery）
悪意あるサイトからユーザーのクッキー付きリクエストを発射されてしまう攻撃。Laravel は `@csrf` ディレクティブや Sanctum で対策済み。

### Cache-Control ヘッダ
レスポンスに「このデータを誰がどれだけキャッシュしていいか」を指示する HTTP 標準ヘッダ（RFC 9111）。

| ディレクティブ | 意味 | 誰が禁止される？ |
|---|---|---|
| `public` | 共有キャッシュ OK | — |
| `private` | single-user 向け | **CDN / プロキシのみ** 禁止 |
| `no-store` | あらゆるキャッシュ禁止 | **全員**（ブラウザ含む） |
| `no-cache` | 保存OKだが毎回再検証 | — |

認証レスポンスには **`private, no-store`** を付けるのが鉄則。

### RFC 9111
HTTP Caching の最新仕様（2022年）。旧 RFC 7234 の後継。Cloudflare のようなちゃんとした CDN はこの仕様に準拠するので、Laravel 側で `Cache-Control: private, no-store` と返せば全レイヤで効く。

### DLQ（Dead Letter Queue）
キューで N 回リトライしても失敗したメッセージの「最終隔離棚」。Laravel の `failed_jobs` テーブルと同じ役割。DLQ 自体もキューなので「失敗ジョブ再実行用 Consumer」を追加で実装できる。

---

## 5. 🛠 ツール

### Docker / Dockerfile
コンテナ（= 軽量な隔離された実行環境）の定義ファイルとツール。
```
FROM ベースイメージ
RUN セットアップコマンド
COPY ホスト側のファイル コンテナ内のパス
CMD ["起動コマンド"]
```
この4行でほぼ動く。

### curl
CLI から HTTP リクエストを投げる最重要ツール。
```bash
curl -s -H "Authorization: Bearer $TOKEN" https://example.com/api/me
```
`-s` で進捗非表示、`-H` でヘッダ追加、`-d` で body、`-I` で HEAD（ヘッダだけ見る）。

### jq
JSON を CLI で整形・抽出するツール。
```bash
curl -s $URL | jq -c '{request_count_this_worker, worker_pid}'
```
`-c` で 1 行 JSON 出力。Homebrew / apt で入る。

### GitHub Actions
GitHub の CI/CD 基盤。`.github/workflows/*.yml` にジョブを定義すると push や PR で自動実行される。今回は `main` ブランチへの push で Cloudflare に Laravel Octane デプロイが自動で走るようにしている。

### SpeakerDeck
スライド共有サービス。PDF をアップロードするだけで世界に公開できる。`speakerdeck.com/SuguruOoki/...`

### marp-cli
Markdown + YAML frontmatter からスライド PDF を生成する CLI。今回のスライドも `slides-v3.md` から `npx @marp-team/marp-cli` で PDF化している。

---

## 6. 📡 HTTP ステータスコード（今日のデモで登場）

| コード | 意味 | スライドでの登場場面 |
|---|---|---|
| **200** | 成功（本文あり）| `/api/hello`、認証OK の `/api/me` |
| **204** | 成功（本文なし）| `/sanctum/csrf-cookie` |
| **401** | 未認証（Authorization ヘッダが無い/壊れてる）| トークン無しで `/api/me` を叩いた |
| **404** | リソース無し | 存在しないエンドポイント |
| **405** | そのURIで許可されていないメソッド | `GET /api/login`（POST 専用なので 405）|

---

## 7. 🎤 Laravel Live Japan 2026

### Laravel Live Japan
日本唯一の Laravel 専門カンファレンス。**2026年 5月26-27日** 開催。
公式: <https://laravellive.jp> / X: [@LaravelLiveJP](https://x.com/LaravelLiveJP)

**Core Staff 募集中**（関西リモート歓迎）。

---

## 参考リンク

- Laravel 公式: <https://laravel.com>
- Laravel Octane: <https://laravel.com/docs/octane>
- Laravel Sanctum: <https://laravel.com/docs/sanctum>
- FrankenPHP: <https://frankenphp.dev>
- Cloudflare Workers: <https://developers.cloudflare.com/workers>
- Cloudflare Containers: <https://developers.cloudflare.com/containers>
- Cloudflare Queues: <https://developers.cloudflare.com/queues>
- RFC 9111 HTTP Caching: <https://www.rfc-editor.org/rfc/rfc9111>
- サンプルリポジトリ: <https://github.com/SuguruOoki/cloudflare-php-demo>
- 発表スライド: `slides/slides-v3.md`
