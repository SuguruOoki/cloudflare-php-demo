---
marp: true
theme: default
paginate: true
size: 16:9
header: "Laravel Live Japan 2026 / PHPer、Cloudflare に引っ越す"
footer: "2026 / @SuguruOoki"
style: |
  /* Laravel Live Japan palette: 赤 #FF2D20 / 深赤 #BC002D / 黒 #1A202C */
  section { font-family: "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif; color: #1A202C; }
  h1 { color: #FF2D20; }
  h2 { color: #1A202C; border-bottom: 3px solid #FF2D20; padding-bottom: 4px; }
  h3 { color: #BC002D; padding-bottom: 4px; }
  strong { color: #BC002D; }
  blockquote { border-left: 4px solid #FF2D20; padding-left: 12px; color: #1A202C; }
  code { background: #fdecea; color: #BC002D; padding: 2px 6px; border-radius: 4px; }
  /* Code block: Atom One Dark */
  pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 6px; font-size: 0.75em; }
  pre code { background: transparent; color: inherit; }
  pre code .hljs-comment,
  pre code .hljs-quote { color: #5c6370; font-style: italic; }
  pre code .hljs-doctag,
  pre code .hljs-keyword,
  pre code .hljs-formula { color: #c678dd; }
  pre code .hljs-section,
  pre code .hljs-name,
  pre code .hljs-selector-tag,
  pre code .hljs-deletion,
  pre code .hljs-subst { color: #e06c75; }
  pre code .hljs-literal { color: #56b6c2; }
  pre code .hljs-string,
  pre code .hljs-regexp,
  pre code .hljs-addition,
  pre code .hljs-attribute,
  pre code .hljs-meta .hljs-string { color: #98c379; }
  pre code .hljs-attr,
  pre code .hljs-variable,
  pre code .hljs-template-variable,
  pre code .hljs-type,
  pre code .hljs-selector-class,
  pre code .hljs-selector-attr,
  pre code .hljs-selector-pseudo,
  pre code .hljs-number { color: #d19a66; }
  pre code .hljs-symbol,
  pre code .hljs-bullet,
  pre code .hljs-link,
  pre code .hljs-meta,
  pre code .hljs-selector-id,
  pre code .hljs-title { color: #61afef; }
  pre code .hljs-built_in,
  pre code .hljs-title.class_,
  pre code .hljs-class .hljs-title { color: #e6c07b; }
  pre code .hljs-emphasis { font-style: italic; }
  pre code .hljs-strong { font-weight: bold; }
  table { font-size: 0.8em; }
  table th { background: #FF2D20; color: #fff; }
  a { color: #FF2D20; }
  .small { font-size: 0.7em; color: #666; }
  .highlight { background: #fff3cd; padding: 2px 6px; border-radius: 4px; }
  .big-quote { font-size: 1.5em; color: #BC002D; font-weight: bold; line-height: 1.6; }
  .chapter { text-align: center; padding-top: 80px; }
  .chapter h1 { font-size: 2.4em; }
---

# PHPer 、<br>Cloudflare に引っ越す
### あなたの Laravel を、世界330都市で動かすまで

<!--
[0:00 - 0:15] タイトルは挑発的に。
"引っ越す" は「デプロイ先が変わる」を人格化した動詞。
サブタイトルで "330都市" という驚きの数字を仕込む。
無言で5秒見せる。
-->

---

![bg left:38% w:90%](./assets/profile.jpg)

## 自己紹介

### スー（@SuguruOoki）

- **MOSH 株式会社**
- **Laravel Live Japan Core Staff**
- Go-to-Market / HROps 自動化 / 技術広報

### よろしくお願いします 🍻

<!--
[0:15 - 0:30] 自己紹介は15秒で切り上げる。
LaravelLiveJapan Core Staff は会場で刺さるので強調。
趣味などは省略してテンポ維持。
-->

---

## 半年前の私

<br>

### 「Cloudflare？ それは JavaScript の世界。<br>PHPer が行く場所じゃない」

<br>

### — そう思ってました。

<br>

> でも、**2026 年のいま**。<br>
> 私の Laravel は **世界330都市で動いて** います。

<!--
[0:30 - 1:30] Hook スライド。本人のセリフを大きく見せて共感創出。
あえて無言で 5 秒見せるくらいが効く。
「その認識を今日 20 分で壊します」で次へ。
-->

---

## 今日壊す **3つの先入観** × **3つのアプローチ**

| 先入観 | 解決アプローチ | 本日の扱い |
|---|---|---|
| ❌ PHPランタイム無いでしょ？ | **A. php-wasm** | 軽く触れる |
| ❌ Laravel動かないでしょ？ | **B. Containers + FrankenPHP** ⭐ | **本命・デモあり** |
| ❌ 長時間処理できないでしょ？ | **+ Cloudflare Queues** | Real World で |

<br>

### → 迷ったら **B**。今日の 20 分で、**全部壊します**

<!--
[1:30 - 3:00] 結論先出しスライド。
冒頭のゴール宣言＋3アプローチマップを1枚に統合。
「今日の地図」として聴衆にロードマップを渡す。
「迷ったらB」を太字で示して時間配分の予告も済ませる。
-->

---

<div class="chapter">

# A. php-wasm
## — PHP を Wasm 化して Worker で動かす

</div>

<!--
[3:00 - 3:20] 章扉。A は軽く、Bに時間を寄せる前振り。
-->

---

## A. アーキテクチャ

![h:320](./diagrams/wasm-arch.svg)

- PHP インタプリタを **Wasm にコンパイル**
- Workers の **V8 isolate** 上で実行
- 採用実績: **WordPress.org 公式 Playground**

<!--
[3:20 - 4:00] WordPress.org の権威付けを口頭で補足。
Emscripten は説明せず「Wasm 化」で十分。
-->

---

## A. 書くのは PHP だけ・得手不得手も正直に

```php
<?php // public/index.php ← これ1ファイル
header('Content-Type: application/json');
echo json_encode(['msg' => 'Hello from PHP', 'v' => PHP_VERSION]);
```

```bash
wrangler deploy   # → 世界330都市に即配布
```

### ✅ 得意: コールドスタートゼロ / 無料枠10万req/日 / WordPress
### ❌ 苦手: `pdo_mysql` 等の拡張 / FS揮発 / **Laravel フルスタック**

### → **だから本命は B**

<!--
[4:00 - 5:20] コードと得手不得手を1枚に圧縮。
「PHPer は TS を書かない」を口頭で添える。
"だから本命は B" で遷移を明示。
-->

---

<div class="chapter">

# B. Containers ⭐
## — FrankenPHP で Laravel がそのまま動く

</div>

<!--
[5:20 - 5:40] 本日の本命・山場の章扉。
-->

---

## B. 最小 Dockerfile（これだけで Laravel が動く）

```dockerfile
FROM dunglas/frankenphp:php8.4-alpine

RUN install-php-extensions \
    pdo_mysql pdo_sqlite redis intl bcmath pcntl

WORKDIR /app
COPY . .
RUN composer install --no-dev --optimize-autoloader

# Worker モード = Laravel Octane 相当
ENV FRANKENPHP_CONFIG="worker ./public/index.php"
```

**PHPer が既に書ける水準** = **学習コストほぼゼロ**

<!--
[5:40 - 6:40] "書き慣れた Dockerfile がそのまま動く" = 最大の安心材料。
dunglas/frankenphp は公式イメージであることを口頭で補足。
2024年発表 → 2025年 GA を口頭で補足。
-->

---

## B. Laravel の `.env` 書き換えポイント

| 項目 | 変更内容 |
|---|---|
| `DB_CONNECTION` | `mysql` → **`sqlite`**（D1 プロキシ経由） |
| `FILESYSTEM_DISK` | `local` → **`s3`**（R2 互換） |
| `SESSION_DRIVER` | `file` → **`database`** / **`redis`**(KV) |
| `CACHE_STORE` | `file` → **`database`** / **`redis`**(KV) |
| `QUEUE_CONNECTION` | `database` → **`cloudflare`** |

### コード変更は `.env` だけで済むケースが多い

<!--
[6:40 - 7:25] "コード変更ほぼゼロ" が PHPer の最大の安心材料。
書き慣れた Laravel を捨てずに済む、を強調。
-->

---

## 🎬 Live Demo: 本当に Octane が動く

```bash
# そのままコピペで叩けます
URL=https://cloudflare-laravel-octane-demo.suguru-ohki.workers.dev/api/hello
for i in {1..5}; do
  curl -s $URL | jq -c '{request_count_this_worker, worker_pid, laravel_version}'
done
```

```json
{"request_count_this_worker":2,"worker_pid":524,"laravel_version":"13.6.0"}
{"request_count_this_worker":3,"worker_pid":524,"laravel_version":"13.6.0"}
{"request_count_this_worker":4,"worker_pid":524,"laravel_version":"13.6.0"}
{"request_count_this_worker":5,"worker_pid":524,"laravel_version":"13.6.0"}
{"request_count_this_worker":6,"worker_pid":524,"laravel_version":"13.6.0"}
```

**`pid=524` 不変** × **カウンタが増加** = **Octane ワーカーが常駐している証拠**

<!--
[7:25 - 9:25] 発表の山場。
時間があれば実際に curl を叩く。
接続トラブル時のためスクリーンショット/動画を予備で用意。
"Octane が動いてる証拠" を curl 1 発で示せるのがこのデモの価値。
ここで一度息を抜き、次の「コスト」へ繋ぐ。
-->

---

## B. ベンチ & コスト（月10万PV想定）

### 📊 レイテンシ
- EC2 t3.small (ap-northeast-1): TTFB **45ms**
- **CF Containers + FrankenPHP**: TTFB **18ms**

### 💴 月額
| 項目 | EC2構成 | **CF構成** |
|---|---|---|
| コンピュート | $15 | **$3** |
| DB | $12 (RDS) | **$2** (D1) |
| 転送 | $9 (S3 egress) | **$0** (R2) |
| **合計** | **$36** | **$5** |

### → **約 1/7 のコスト** で動く

<!--
[9:25 - 10:25] ここは経営陣説得の武器。
egress 無料は地味に効くのでしっかり触れる。
-->

---

<div class="chapter">

# C. ハイブリッド
## — 既存本番を活かしつつ、エッジで前捌き

</div>

<!--
[10:25 - 10:45] 章扉。移行が難しい現場向けの救済選択肢。
-->

---

## C. Worker を "賢い CDN" として前段に

- **Worker（エッジ）**: 認証 / キャッシュ / A/B / ジオルーティング
- **既存 Laravel（オリジン）**: **1 行も変えない**

```php
// routes/api.php (Laravel 側)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/orders', fn (Request $r) => Order::create([
        'user_id' => $r->user()->id,
        'items'   => $r->json('items'),
    ]));
});
```

**Sanctum / Passport がそのまま動く** = **認証資産を捨てなくていい**

<!--
[10:45 - 11:45] C は「全部捨てて移行するのは無理」な現場向け。
段階移行の選択肢として必ず選べるという安心感を伝える。
Sanctum の存在で PHPer の心理的ハードルを下げる。
-->

---

## 🧭 A / B / C ここまでのまとめ

![bg right:42% w:90%](./diagrams/decision-tree.svg)

| 要件 | A | **B** | C |
|---|:-:|:-:|:-:|
| WordPress / 軽量API | ◎ | ◎ | ○ |
| **Laravel + Octane** | △ | **◎ 実証済** | ◎ |
| 既存本番の高速化 | ✗ | △ | ◎ |
| コールドスタート | ◎ | ○ | ◎ |

### 迷ったら B。新規小規模なら A、既存活かすなら C

<!--
[11:45 - 12:45] A/B/C 完結点。決定木＋マトリクスを1枚に統合。
B が実証済である（Octaneデモ）ことから callback。
-->

---

## 🎬 Live Demo 2: 認証ありAPI + Cache-Control

```bash
URL=https://cloudflare-laravel-octane-demo.suguru-ohki.workers.dev

# 1. 認証なし → 401
curl -s -H "Accept: application/json" $URL/api/me
# → {"message":"Unauthenticated."}

# 2. ログイン → Sanctum トークン取得
TOKEN=$(curl -s $URL/api/login \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"email":"demo@example.com","password":"demo-password"}' | jq -r .token)

# 3. 認証あり → 200 + ユーザー情報
curl -s $URL/api/me -H "Authorization: Bearer $TOKEN" | jq

# 4. レスポンスヘッダ → Laravel 側の防御が効いている証拠
curl -sI $URL/api/me -H "Authorization: Bearer $TOKEN" | grep -i cache-control
# → Cache-Control: no-store, private
```

**Sanctum がそのまま動く** × **`Cache-Control` で CDN キャッシュ禁止** → でも **もしこれが無かったら？** 次へ

<!--
[12:45 - 14:15] 1:30で演出する認証APIデモ。
4ステップを順に curl で叩く。発表では1,3,4の出力を目で見せる。
最後の問いかけ「もしこれが無かったら？」がキャッシュ章への橋渡し。
ネットワーク事故時のためスクリーンショット/動画を予備。
-->

---

<div class="chapter">

# ⚠️ キャッシュの落とし穴
## — バズったとき、初めて気づく

</div>

<!--
[12:45 - 13:05] ここから警告の章。⚠️で視覚的に切り替え。
-->

---

## キャッシュが認証データを漏らす事故

### 絶対避けたい事故
- Worker が `GET /api/me` を **URL だけで**キャッシュ
- **User A の応答が User B に返る** → **個人情報漏洩 / 認証バイパス**

### 安全な3パターン
| 対象 | 戦略 |
|---|---|
| 公開 GET | そのままキャッシュ OK |
| **認証 GET** | `Authorization` / セッション あり → **bypass** |
| 認証 GET を効かせたい稀ケース | cache key に **ユーザーID** 混ぜる |

<!--
[13:05 - 14:05] Reveal moment。
「バズった時に初めて気づく」系の事故なので、先回りで防御策を提示。
Cloudflare 固有ではなく HTTP 標準 (RFC 9111) の話に昇華できる。
-->

---

## 🛡 Laravel 側: `Cache-Control` で明示

```php
return response()->json($data)
    ->header('Cache-Control', 'private, no-store');
```

### 効き目
- **`private`**: CDN / プロキシのキャッシュ **禁止**
- **`no-store`**: あらゆるキャッシュ **禁止**
- Cloudflare は **RFC 9111 準拠** なので、Laravel 側だけで全レイヤに効く

### 基本は **これだけ** で OK

<!--
[14:05 - 15:05] まず Laravel 側の標準契約だけで 9割カバーされる、と安心させる。
RFC準拠なので Cloudflare 固有の話ではないことを強調。
Worker 側のガード (belt and suspenders) は Appendix A4 参照。
-->

---

<div class="chapter">

# 🧰 Real World
## — 実戦で揃える「無いパーツ」

</div>

<!--
[15:05 - 15:25] Real World章扉。
「パーツ無いじゃん問題」を予告して次の3枚で解決を見せる。
-->

---

## 📧 Email: Cloudflare Email Service (2025/10 Beta)

```php
// 既存の Laravel Mail はそのまま
Mail::to($user->email)->send(new WelcomeMail($user));
```

### 初回セットアップ（1回だけ）

```bash
composer require symfony/http-client   # Worker へ POST するクライアント
```

- **カスタム Transport を `app/Mail/Transports/` に配置**（Appendix B0）
- `.env` で **`MAIL_MAILER=cloudflare`** に切り替え
- → 以降は既存 Mail クラスが**そのまま** Cloudflare 経由に

<!--
[15:25 - 16:10] "既存 Mail クラスがそのまま動く" が売り。
2025/10 Public Beta というタイミングのホット情報。
必要ライブラリは symfony/http-client のみ（Laravel 標準の Http:: ファサードで使う）。
Transport の実装詳細は Appendix B0 送り。
-->

---

## 📬 Queue: `dispatch()` がそのまま流れる

```php
// .env: QUEUE_CONNECTION=cloudflare
use App\Jobs\GenerateMonthlyReport;

GenerateMonthlyReport::dispatch($userId)
    ->onQueue('php-heavy-jobs');
```

### 実行枠
- **CPU 5分 / wall 15分** — HTTPの30秒制限を**最大30倍**に拡張
- 失敗時は **自動リトライ + DLQ**
- Consumer の実装は Appendix A1-A2 参照

<!--
[16:10 - 17:10] 既存 Job クラスがそのまま動く、が PHPer の心理的安心材料。
30秒 → 15分は「30倍」のインパクト数字で覚えさせる。
Consumer 実装詳細は Appendix送り。
-->

---

## 🔧 ハマりポイント TOP3（実体験・抜粋）

1. **`session_start()` のファイルセッション** → KV / DB へ
2. **`storage/logs` 揮発** → `stdout` + Logpush
3. **`pdo_mysql` 前提** → D1 HTTP API / TiDB Serverless

### 初日の詰まりを先回りで消せる（残り2件は **Appendix A7**）

<!--
[17:40 - 18:10] TOP3に圧縮。残りは Appendix送り。
実体験ベースは中級 PHPer に一番刺さる。
「あ、それ知りたかった」を取れれば勝ち。
-->

---

## ✅ 冒頭の3つの先入観、全部壊しました

| 先入観 | 解 |
|---|---|
| ❌ ~~PHP ランタイム無い~~ | ✅ **php-wasm** で動く |
| ❌ ~~Laravel 動かない~~ | ✅ **Containers + FrankenPHP** で実証済 |
| ❌ ~~長時間処理できない~~ | ✅ **Queues で CPU 5分 / wall 15分** |

<br>

### そして **半年後の私の Laravel は、世界330都市で動いている**

<!--
[18:10 - 18:55] 冒頭 Hook の「半年前の私」に対する対句 Callback。
構造の完結感 = 記憶に残る。
3つの先入観に✓を返しつつ、「半年前→半年後」のサンドイッチでタイトル回収。
-->

---

## 🎁 今日持ち帰ってほしい3つ

<br>

## 1. PHP は Cloudflare で **動く**

## 2. Laravel なら **Containers + FrankenPHP** が本命

## 3. 「無いパーツ」は **Laravel 流儀のまま差し替えるだけ**

<!--
[18:55 - 19:40] クロージング。ゆっくり読み上げる。
Rule of 3 を守って、各行を大きく見せる。
-->

---

## 🚀 今夜の 5 分で、あなたの Laravel が330都市に

```bash
# 1. wrangler をインストール（初めての方）
npm install -g wrangler
wrangler login

# 2. サンプルを clone してデプロイ
git clone https://github.com/SuguruOoki/cloudflare-php-demo
cd cloudflare-php-demo/apps/frankenphp-container
wrangler deploy
```

### 🔗 リソース
- GitHub: `github.com/SuguruOoki/cloudflare-php-demo`
- Live: `cloudflare-laravel-octane-demo.suguru-ohki.workers.dev`
- Docs: `developers.cloudflare.com/containers`

# Thank you! — ご質問をどうぞ 🙋

<!--
[19:40 - 20:00] CTA + Thank you を1枚に統合。
"5分で330都市" は数字の対比が効く鉄板コピー。
QA 想定:
- 「本番稼働事例は？」→ WP Playground, Automattic 実験
- 「既存 Laravel 何行変えた？」→ 基本 .env のみ
- 「MySQL 捨てるのキツい」→ C ハイブリッドから段階移行
- 「Email Service のコスト？」→ Workers Paid plan + 従量
-->

---

# 📎 Appendix<br>補足資料

以降は登壇中は触れず、配布資料として参照用。

<!--
ここから Appendix。
当日は時間切れで触れないが、公開後に読者が深掘りできるよう残す。
-->

---

## A1: Queue 詳細 — batch_size / batch_timeout

### 配送の 2 つのダイヤル
| 設定 | 意味 | 既定 / 最大 |
|---|---|---|
| `max_batch_size` | 1 回で受け取る最大件数 | 10 / 100 |
| `max_batch_timeout` | 満杯未満でも配送される秒数 | 5 / **60** |

### 配送ルール
> **size に達する** OR **timeout 経過** のどちらか **先に来た方** でバッチ確定

### Consumer 実行時間枠
- **CPU**: 既定 30秒 → 最大 **5分**
- **Wall clock**: 最大 **15分**

---

## A2: Queue Consumer 実装（Laravel 側）

```php
// routes/web.php などに Worker からの POST を受ける口
Route::post('/process', function (Request $r) {
    $kind = $r->json('kind');

    if ($kind === 'monthly-report') {
        GenerateMonthlyReport::dispatchSync($r->json('args.user_id'));
    }

    return response()->json(['status' => 'processed']);
});
```

### DLQ（Dead Letter Queue）

Laravel `failed_jobs` テーブルと同じ役割。違いは **DLQ 自体もキュー** なので「失敗ジョブ再実行」を Consumer 追加だけで実装できる。

---

## A3: キャッシュ Cache-Control 仕様（RFC 9111）

| ディレクティブ | 意味 | 誰が禁止される？ |
|---|---|---|
| **`private`** | single-user 向け | **CDN / プロキシのみ** 禁止 |
| **`no-store`** | あらゆるキャッシュ禁止 | **全員**（ブラウザ含む） |
| `public` | 共有キャッシュ OK | — |
| `no-cache` | 保存OKだが毎回再検証 | — |

### Cloudflare は**仕様に従う**ので、Laravel で `private, no-store` を書くだけで全レイヤに効く

---

## A4: Worker 側の二重防御（belt and suspenders）

### 契約が破られる稀なケース
1. **Cache Rules で "Cache Everything" 強制**（Enterprise設定ミス）
2. Worker コードで `Cache-Control` を剥がしてから `caches.default.put()`
3. 壊れた中間プロキシ

### Worker 側: 認証ヘッダを見たら即 bypass

```ts
if (req.headers.has('Authorization')) return bypass();
if (/laravel_session|auth/i.test(cookie)) return bypass();
```

**Laravel 側の `private, no-store`** と **Worker 側の `shouldBypassCache()`** の**両方揃って初めて**全レイヤで漏れない。

---

## B0: Cloudflare Mail Transport 実装

### 1. 必要ライブラリ
```bash
composer require symfony/http-client
```
※ Laravel 標準の `Http::` ファサードが内部で利用

### 2. Transport 登録
```php
// AppServiceProvider::boot
Mail::extend('cloudflare', fn () => new CloudflareMailTransport(
    workerUrl: config('services.cloudflare.worker_url'),
));
```

### 3. Transport 実装
```php
// app/Mail/Transports/CloudflareMailTransport.php
class CloudflareMailTransport extends AbstractTransport
{
    public function __construct(private string $workerUrl) {}

    protected function doSend(SentMessage $message): void
    {
        Http::post($this->workerUrl, ['raw' => $message->toString()])->throw();
    }
}
```

---

## A5: デバッグ・モニタリング

### ローカル開発
- `wrangler dev` → Container も起動可（`php artisan serve` 感覚）

### 本番
- `wrangler tail` → リアルタイムログ（`tail -f` 感覚）
- **Logpush** → S3 / R2 / BigQuery へ構造化ログ排出
- **Analytics Engine** → カスタムメトリクス

### エラートラッキング
- **Sentry PHP SDK** がそのまま動く

---

## A7: ハマりポイント（本編 TOP3 の残り）

4. **`ext-gd` / `ext-imagick`** → Dockerfile で `install-php-extensions` に追加
5. **タイムゾーン** → `config/app.php` `timezone => 'Asia/Tokyo'` or `date_default_timezone_set()`

### 本編 TOP3（再掲）
1. `session_start()` → KV / DB へ
2. `storage/logs` 揮発 → `stdout` + Logpush
3. `pdo_mysql` 前提 → D1 HTTP API / TiDB Serverless

---

## A6: 参考リンク

| 分類 | リンク |
|---|---|
| **Cloudflare Docs** | `developers.cloudflare.com/{containers, email-service, queues}` |
| **Cache Control** | `developers.cloudflare.com/cache/concepts/cache-control` |
| **HTTP 標準** | RFC 9111 HTTP Caching |
| **関連 OSS** | `frankenphp.dev` / `laravel.com/docs/octane` |
| **本日のサンプル** | `github.com/SuguruOoki/cloudflare-php-demo` |
