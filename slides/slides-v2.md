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
  pre { background: #1e1e1e; color: #eee; padding: 16px; border-radius: 6px; font-size: 0.75em; }
  pre code { background: transparent; color: inherit; }
  table { font-size: 0.8em; }
  table th { background: #FF2D20; color: #fff; }
  a { color: #FF2D20; }
  .small { font-size: 0.7em; color: #666; }
  .highlight { background: #fff3cd; padding: 2px 6px; border-radius: 4px; }
  .big-quote { font-size: 1.5em; color: #BC002D; font-weight: bold; line-height: 1.6; }
---

# PHPer 、<br>Cloudflare に引っ越す
### あなたの Laravel を、世界330都市で動かすまで

<!--
タイトルは挑発的に。
"引っ越す" は 「デプロイ先が変わる」 を人格化した動詞。
サブタイトルで "330都市" という驚きの数字を仕込む。
-->

---

![bg left:38% w:90%](./assets/profile.jpg)

## 自己紹介

### スー

- **所属**: MOSH 株式会社
- **やってること**
  - Laravel Live Japan Core Staff
  - Go-to-Market / HROps / SalesOps あたりの自動化
  - 技術広報
- **趣味**: お酒 / サウナ / アニメ / マンガ

### よろしくお願いします 🍻

<!--
自己紹介は 30秒で切り上げる。
LaravelLiveJapan Core Staff は会場で刺さるので強調。
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
Hook スライド。本人のセリフを大きく見せて共感創出。
"半年前" の部分は本人のリアルな時間軸に差し替え可。
あえて無言で 5 秒見せるくらいが効く。
会場の共感を取ってから「その認識を今日 20 分で壊します」で次へ。
-->

---

## 今日のゴール: **先入観を3つ壊す**

PHPer の多くが抱えている、Cloudflare への3つの先入観:

1. ❌ 「PHP ランタイム無いでしょ？」
2. ❌ 「Laravel 動かないでしょ？」
3. ❌ 「長時間処理できないでしょ？」

<br>

### 今日の 20 分で、**全部壊します**

<!--
3つの先入観を提示 → 本編で1つずつ潰す構造を宣言。
聴衆に「へー、そうなんだ？」と疑問を持たせて本編へ引き込む。
このページが本日の "RoadMap" となる。
-->

---

## 先入観 ① PHP ランタイム無いでしょ？

<br>

### **php-wasm** があります

<br>

- PHP インタプリタを **WebAssembly** にコンパイル
- Workers の V8 isolate 上で **PHP 8.4** が動く
- 採用実績: **WordPress.org 公式の WordPress Playground**

→ 詳細はこのあとの **アプローチ A** で

<!--
ここは 20 秒で。
「PHPランタイムがないはウソ」 を宣言して次へ。
本論（A）で詳しく見せる前フリ。
-->

---

## 先入観 ② Laravel 動かないでしょ？

<br>

### **Cloudflare Containers** で動きます

<br>

- 2024年発表 → **2025年 GA**
- Worker から **OCI コンテナ** を起動
- **FrankenPHP + Laravel Octane** がそのまま動く

→ 詳細はこのあとの **アプローチ B** で（本命）

<!--
会場で一番反応がくるのはここ。
"2025 年 GA" = もう実戦投入できる段階、を強調。
-->

---

## 先入観 ③ 長時間処理できないでしょ？

<br>

### **Cloudflare Queues** で CPU 最大 **5分** / wall **15分**

<br>

- HTTP の 30秒制限 →  **10-30倍** に拡張
- PDF生成・一括メール・夜間バッチ OK
- **Laravel Queue::push** がそのまま流せる

→ 詳細は **Real World ノウハウ** で

<!--
30 秒 → 15 分は 「30倍」 の強いインパクト数字で覚えさせる。
現場の PHPer は必ず気にする論点なので丁寧に触れる。
-->

---

## 結論先出し: 3つのアプローチ

| | **A. php-wasm** | **B. Containers** ⭐ | **C. ハイブリッド** |
|---|---|---|---|
| 方式 | PHP を Wasm 化 | FrankenPHP Container | Worker + 既存オリジン |
| 代表例 | WordPress Playground | Laravel on Containers | Workers Cache + EC2/さくら |
| 向き | 軽量・単発 | **フル機能アプリ** | 既存資産の高速化 |
| 実装難易度 | 低 | 中 | 低 |

### 迷ったら **B**。本日の本命。

<!--
ここで「今日の本編は B」を予告。A と C は軽く触れて、B に時間配分を寄せる。
-->

---

## アプローチA: php-wasm とは

![h:320](./diagrams/wasm-arch.svg)

- PHP インタプリタを **Wasm にコンパイル**
- Workers の **V8 isolate** 上で実行
- `fetch` ハンドラから PHP が走る

<!--
WordPress.org の権威付けを口頭で補足。
Emscripten は説明しなくて OK、「Wasm 化」で十分。
-->

---

## A. 最小コード: PHP を書くだけ

```php
<?php
// public/index.php  ← これ1ファイルでOK
header('Content-Type: application/json');

echo json_encode([
    'msg'         => 'Hello from PHP on CF Workers!',
    'php_version' => PHP_VERSION,
]);
```

### デプロイ
```bash
wrangler deploy   # → 世界330都市に即配布
```

**PHPer は TS を書かない**。ランタイムの shim は bundler が自動生成。

<!--
"PHPer は TS を書かない" は会場に刺さる一言。
330都市 の数字で「おっ」を取る。
-->

---

## A. 得手 / 不得手

### ✅ 得意
- コールドスタート実質ゼロ
- 無料枠 10万 req/日
- WordPress / 軽量 API

### ❌ 苦手
- PHP 拡張の一部が未対応（`pdo_mysql` 等）
- ファイルシステム揮発
- **Laravel のフルスタック は厳しい**

→ **だから本命は B** （次ページ）

<!--
A の限界を正直に出して、B への橋渡し。
"だから本命は B" で遷移を明示するのがポイント。
-->

---

## アプローチB: Containers + FrankenPHP ⭐

### 2024年発表 → 2025年 GA
- Worker から **OCI コンテナ** を起動
- **Dockerfile が書ける = 動く**
- **Laravel / Symfony がそのまま動く**

### 意味するところ
> `docker-compose up` で動く既存アプリが、<br>
> **そのままエッジでスケールする**

<!--
ここが発表の山場 1。
「Dockerfile 書ける = 動く」の単純化で心理的ハードルを下げる。
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
"書き慣れた Dockerfile がそのまま動く" = 最大の安心材料。
dunglas/frankenphp は公式イメージであることを口頭で補足。
-->

---

## B. Laravel の `.env` 書き換えポイント

| 項目 | 変更内容 |
|---|---|
| `DB_CONNECTION` | `mysql` → **`sqlite`**（D1 プロキシ経由） |
| `FILESYSTEM_DISK` | `local` → **`s3`**（R2 互換） |
| `SESSION_DRIVER` | `file` → **`database`** / **`redis`**(KV) |
| `CACHE_STORE` | `file` → **`database`** / **`redis`**(KV) |
| `QUEUE_CONNECTION` | `database` → **`cloudflare`** (カスタムドライバ) |

### コード変更は `.env` だけで済むケースが多い

<!--
"コード変更ほぼゼロ" が PHPer の最大の安心材料。
書き慣れた Laravel を捨てずに済む、を強調。
-->

---

## 🎬 Live Demo: 本当に Octane が動く

```bash
$ for i in 1..5; do curl https://cloudflare-laravel-octane-demo.<..>/api/hello; done
```

```json
{ "request_count_this_worker": 7,  "worker_pid": 261, "laravel": "13.6" }
{ "request_count_this_worker": 8,  "worker_pid": 261, "laravel": "13.6" }
{ "request_count_this_worker": 9,  "worker_pid": 261, "laravel": "13.6" }
{ "request_count_this_worker": 10, "worker_pid": 261, "laravel": "13.6" }
{ "request_count_this_worker": 11, "worker_pid": 261, "laravel": "13.6" }
```

**`pid=261` 不変** × **カウンタが増加** = **Octane ワーカーが常駐している証拠**

<!--
発表の山場 2。
時間があれば実際に curl を叩く。
接続トラブル時のためスクリーンショット or 動画を予備で用意。
"Octane が動いてる証拠" を curl 1 発で示せるのがこのデモの価値。
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
ここは経営陣説得の武器。
egress 無料は地味に効くのでしっかり触れる。
-->

---

## アプローチC: ハイブリッド（既存本番を活かす）

![h:260](./diagrams/hybrid.svg)

- Workers を **賢い CDN** として前段に
- 認証・キャッシュ・A/B・ジオルーティング等の**前捌き**
- 既存インフラは **1 行も変えない**

<!--
C は「全部捨てて移行するのは無理」な現場向け。
段階移行の選択肢として必ず選べるという安心感を伝える。
-->

---

## C. 認証は Laravel Sanctum で完結

```php
// routes/api.php  (Laravel Octane / Container 側)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/orders', fn (Request $r) => Order::create([
        'user_id' => $r->user()->id,
        'items'   => $r->json('items'),
    ]));
});
```

### 役割分担
- **Laravel Sanctum** → 認証（既存資産そのまま）
- **Worker** → **公開 GET のキャッシュ**のみ

<!--
Sanctum/Passport がそのまま動くのが PHPer の心理的安心材料。
次ページでキャッシュの事故を防ぐ実装ガードを紹介。
-->

---

## ⚠️ キャッシュの落とし穴: 認証データ

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
Reveal moment。
「バズった時に初めて気づく」系の事故なので、先回りで防御策を提示。
Cloudflare 固有ではなく HTTP 標準 (RFC 9111) の話に昇華できる。
-->

---

## 🛡 二重防御の実装

### Laravel 側: `Cache-Control` で明示
```php
return response()->json($data)
    ->header('Cache-Control', 'private, no-store');
```

### Worker 側: 認証ヘッダ見たら即 bypass
```ts
if (req.headers.has('Authorization')) return bypass();
if (/laravel_session|auth/i.test(cookie)) return bypass();
```

**両方揃って初めて** 全レイヤで漏れない

<!--
なぜ効くかは RFC 9111 の話、詳細は Appendix A1-A4。
"belt and suspenders" という英語イディオムに近い、二重防御の考え方。
-->

---

## 3アプローチ決定木 + 向き不向き

![h:270](./diagrams/decision-tree.svg)

| 要件 | A | **B** | C |
|---|:-:|:-:|:-:|
| WordPress / 軽量API | ◎ | ◎ | ○ |
| **Laravel + Octane** | △ | **◎ 実証済** | ◎ |
| 既存本番の高速化 | ✗ | △ | ◎ |
| コールドスタート | ◎ | ○ | ◎ |

### 迷ったら B。新規小規模なら A、既存活かすなら C

<!--
決定木 + マトリクスを 1 枚に統合して視覚的に即判断できるように。
B が実証済であることを Octane デモ (S14) から callback する。
-->

---

## 「パーツ無いじゃん」問題

Cloudflare で Laravel を動かすとき、PHPer が必ず引っかかる3つ:

<br>

| 問題 | 解決 |
|---|---|
| 🔐 **認証** | Sanctum / Cloudflare Access / Clerk |
| 📧 **メール送信** | **Cloudflare Email Service** (2025/10 Beta) |
| 📬 **長時間処理** | **Cloudflare Queues** (CPU 5分) |

### → 次のページから、各パーツを Laravel から叩く

<!--
「パーツ無いじゃん」を先回りで予告して不安を消してから、
次のページで具体的解決策を見せる構造。
-->

---

## 📧 Email: Cloudflare Email Service (2025/10 Beta)

```php
// 既存の Laravel Mail はそのまま
Mail::to($user->email)->send(new WelcomeMail($user));
```

### 裏側（AppServiceProvider::boot）
```php
Mail::extend('cloudflare', fn () => new CloudflareMailTransport(
    workerUrl: config('services.cloudflare.worker_url'),
));
// .env: MAIL_MAILER=cloudflare
```

→ 既存 Mail クラスが**そのまま Cloudflare 経由** に

<!--
"Resend / SES と同じ DX、API Key 管理なし" が売り。
2025/10 Public Beta というタイミングのホット情報。
-->

---

## 📬 Queue: Laravel Queue::push が流れる

```php
// .env: QUEUE_CONNECTION=cloudflare
use App\Jobs\GenerateMonthlyReport;

GenerateMonthlyReport::dispatch($userId)
    ->onQueue('php-heavy-jobs');
```

### Consumer 側（Laravel Container で処理）
```php
Route::post('/process', function (Request $r) {
    // いつもの Job ハンドリング
    $r->json('kind') === 'monthly-report'
        && GenerateMonthlyReport::dispatchSync($r->json('args.user_id'));
    return response()->json(['status' => 'processed']);
});
```

**CPU 5分 / wall 15分** の実行枠で動く。失敗時は**自動リトライ + DLQ**。

<!--
既存 Job クラスがそのまま動く、が PHPer の心理的安心材料。
詳細 (batch_size, DLQ, 設計指針) は Appendix B1-B3 参照。
-->

---

## ハマりポイント TOP5（実体験）

1. **`session_start()` のファイルセッション** → KV / DB へ
2. **`storage/logs` 揮発** → `stdout` + Logpush
3. **`pdo_mysql` 前提** → D1 HTTP API / TiDB Serverless
4. **`ext-gd` / `ext-imagick`** → Dockerfile で `install-php-extensions`
5. **タイムゾーン** → `date_default_timezone_set('Asia/Tokyo')`

### 初日の詰まりを先回りで消せる

<!--
実体験ベースの TOP5 は中級 PHPer に一番刺さる。
「あ、それ知りたかった」を取れれば勝ち。
-->

---

## ✅ 冒頭の3つの先入観、全部壊しました

| 先入観 | 解 |
|---|---|
| ❌ ~~PHP ランタイム無いでしょ？~~ | ✅ **php-wasm** で動く |
| ❌ ~~Laravel 動かないでしょ？~~ | ✅ **Containers + FrankenPHP** で実証済 |
| ❌ ~~長時間処理できないでしょ？~~ | ✅ **Queues で CPU 5分 / wall 15分** |

<br>

### PHPer の Cloudflare、**もう "無理" ではない**

<!--
Act 2 で提示した 3 つの先入観に ✓ を返す callback スライド。
構造の完結感 = 記憶に残る。
ここで聴衆が「話が繋がった」と納得する。
-->

---

## 今日持ち帰ってほしい3つ

## 1. PHP は Cloudflare で **動く**

## 2. Laravel なら **Containers + FrankenPHP** が本命

## 3. 「無いパーツ」は **Laravel 流儀のまま差し替えるだけ**

<!--
クロージング。ゆっくり読み上げる。
Rule of 3 を守って、各行を大きく見せる。
-->

---

## 🚀 今夜の 5 分でできること

```bash
git clone https://github.com/SuguruOoki/cloudflare-php-demo
cd cloudflare-php-demo/apps/frankenphp-container
wrangler deploy
```

### 🔗 リソース
- GitHub: `github.com/SuguruOoki/cloudflare-php-demo`
- Live: `cloudflare-laravel-octane-demo.suguru-ohki.workers.dev`
- Cloudflare Containers: `developers.cloudflare.com/containers`

### **5分で、あなたの Laravel が世界330都市に**

<!--
CTA は具体的コマンドで締める。
"5分で330都市" は数字の対比が効く鉄板コピー。
-->

---

# Thank you!<br>質問をどうぞ

<!--
QA タイム。
よくある質問の想定:
- 「本番稼働事例は？」 → WP Playground, Automattic 実験
- 「既存 Laravel 何行変えた？」 → 基本 .env のみ
- 「MySQL 捨てるのキツい」 → C ハイブリッドから段階移行
- 「Email Service のコスト？」 → Workers Paid plan + 従量
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

<!--
本編では概念だけ、詳細はこのページに集約。
-->

---

## A2: Queue 詳細 — DLQ（Dead Letter Queue）

```
Producer ──▶ Queue ──▶ Consumer（処理）
                          │ ✗ 失敗
                          ▼ retry (max_retries 回)
                          │ ✗ まだ失敗
                          ▼
                         DLQ ← ここに隔離
```

### Laravel `failed_jobs` テーブルと同じ役割

違いは **DLQ 自体もキュー** なので「失敗ジョブ再実行」を Consumer 追加だけで実装できる。

<!--
failed_jobs 類比は Laravel ユーザーに即伝わる。
-->

---

## A3: キャッシュ Cache-Control 仕様（RFC 9111）

| ディレクティブ | 意味 | 誰が禁止される？ |
|---|---|---|
| **`private`** | single-user 向け | **CDN / プロキシのみ** 禁止 |
| **`no-store`** | あらゆるキャッシュ禁止 | **全員**（ブラウザ含む） |
| `public` | 共有キャッシュ OK | — |
| `no-cache` | 保存OKだが毎回再検証 | — |

### Cloudflare は**仕様に従う**ので、Laravel で `private, no-store` を書くだけで全レイヤに効く

<!--
なぜ効くか = HTTP 標準だから。Cloudflare 固有ではない。
-->

---

## A4: キャッシュ "破られる" ケース

### 契約が守られない稀なパターン
1. **Cache Rules で "Cache Everything" 強制**（Enterprise 機能、設定ミス）
2. **Worker コードで Cache-Control 剥がしてから `caches.default.put()`**
3. 壊れた中間プロキシ

### だから二重防御が正しい

| 層 | 役割 |
|---|---|
| **Laravel**: `Cache-Control: private, no-store` | 標準契約で全レイヤに通知 |
| **Worker**: `shouldBypassCache()` | 契約が破られる環境でも防ぐ |

<!--
両方揃って初めて全レイヤで漏れない。
-->

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

<!--
"本番に出した後" の話を Appendix 側に置いて本編の時間を守る。
-->

---

## A6: 参考リンク

- **Cloudflare**
  - Containers: `developers.cloudflare.com/containers`
  - Email Service: `developers.cloudflare.com/email-service`
  - Queues: `developers.cloudflare.com/queues`
  - Cache Control: `developers.cloudflare.com/cache/concepts/cache-control`
- **標準**
  - RFC 9111 HTTP Caching
- **関連 OSS**
  - FrankenPHP: `frankenphp.dev`
  - Laravel Octane: `laravel.com/docs/octane`
- **本日のサンプル**
  - `github.com/SuguruOoki/cloudflare-php-demo`

<!--
配布後に読者が深掘りするための出発点。
-->
