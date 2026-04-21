---
marp: true
theme: default
paginate: true
size: 16:9
header: "PHPer のための Cloudflare 実戦入門"
footer: "2026 / @SuguruOoki"
style: |
  section { font-family: "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif; }
  h1 { color: #F38020; }
  h2 { color: #003682; border-bottom: 2px solid #F38020; padding-bottom: 4px; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
  pre { background: #1e1e1e; color: #eee; padding: 16px; border-radius: 6px; font-size: 0.75em; }
  table { font-size: 0.8em; }
  .small { font-size: 0.7em; color: #666; }
  .highlight { background: #fff3cd; padding: 2px 6px; border-radius: 4px; }
---

# PHPer のための<br>Cloudflare 実戦入門
## 「Cloudflareで PHP は動かない」は、もう古い

20分 / 中級+ PHPer 向け

<!--
掴み: 「今日の発表のゴールは、皆さんの PHP アプリの新しいデプロイ先を1つ増やすことです」
Cloudflare というキーワードで会場の反応を見る。
ここで時間を使いすぎないこと。ひと呼吸で次へ。
-->

---

## 自己紹介 & 今日話すこと

- 普段は Laravel / Symfony で Web 開発
- 最近の関心: エッジコンピューティング × PHP

### 今日のゴール
1. **Cloudflare で PHP が動く3つのアプローチ**を理解する
2. どれを選ぶかの**判断軸**を持ち帰る
3. 帰ったらすぐ **`wrangler deploy`** を試したくなる

<!--
自己紹介は30秒で切り上げる。
「今日のゴール」を先に見せることで聴衆に「持ち帰り」を意識させる。
ここで「すぐ試したくなる」と宣言することで、デモ回のコミットを作る。
-->

---

## 質問: Cloudflare Workers、使ってますか？

<br>

### よく聞く声
- ✋ 「TypeScript/Node.js のエッジ関数を動かす基盤でしょ？」
- ✋ 「CDN と DNS は知ってる」
- ✋ 「そもそも触ったことない」

<br>

### 今日話したいのは
> **「PHP を Cloudflare で動かす」**という選択肢

<!--
会場に問いかけて挙手を取る（オンラインならチャットで）。
多くの PHPer は Workers = JS/TS の印象。
「PHP で動く」という不協和音を作り、次のスライドへ引き込む。
-->

---

## そもそも Cloudflare って何ができる？（30秒）

- **Workers**: エッジ（330+都市）で動く関数基盤
- **Containers**: 2025年 GA。Worker から OCI イメージを起動
- **D1**: SQLite 互換のエッジ DB
- **R2**: S3 互換オブジェクトストレージ（egress 無料）
- **KV / Queues / Durable Objects**: キャッシュ・キュー・状態管理

→ **「PHP のために必要な部品は全部揃っている」**

<!--
PHPer に馴染みのあるキーワード（DB, オブジェクトストレージ）に寄せて説明。
「部品は揃っている」というフレーズで「じゃあ後はどう組むか」への期待を作る。
R2 の egress 無料は地味にコスト面で大きいので強調する。
-->

---

## なぜ今、PHPer が Cloudflare を気にすべきか

| 観点 | 従来 VPS/EC2 | Cloudflare |
|---|---|---|
| **レイテンシ** | リージョン1拠点 | ユーザー直近の拠点（日本で TTFB 10ms 台） |
| **コスト** | 24h 稼働で固定 | 従量 + 大きな無料枠 |
| **スケール** | 突発流入で落ちる | 自動スケール |
| **運用** | OSパッチ・監視必要 | マネージド |

### 既存の PHP 資産を**捨てずに**享受できるのがポイント

<!--
ここは表で淡々と見せる。
「既存資産を捨てずに」の一言が今日一番伝えたいこと。
書き換え前提の移行は現場では通らない。それを打ち消す。
-->

---

## でも…よく聞く3つの先入観

1. ❌ 「PHP ランタイム無いでしょ？」
2. ❌ 「Laravel 動かないでしょ？」
3. ❌ 「MySQL どうすんの？」

<br>

# 全部、今日で解決します

<!--
聴衆が抱えているであろう懐疑を先回りして潰す。
「全部解決します」と宣言して、ここで聴衆の姿勢を「疑う」から「聞く」に切り替える。
ここが 2 セクション目の山。
-->

---

## 結論先出し: 3つのアプローチ

| | **A. php-wasm** | **B. Containers** | **C. ハイブリッド** |
|---|---|---|---|
| 方式 | PHP を Wasm 化して Workers で実行 | FrankenPHP 等を Container で起動 | Workers はエッジ層、PHP は既存オリジン |
| 代表例 | WordPress Playground | Laravel on Containers | Workers Cache + EC2/さくら |
| 向き | 軽量・単発 | フル機能アプリ | 既存資産の高速化 |
| 実装難易度 | 低 | 中 | 低 |

<!--
「結論先出し」が時間制約のある登壇の鉄則。
ここで聴衆の認知コストを下げる。
この後は各アプローチを深掘りしていく宣言。
-->

---

## 選び方の1行サマリ

<br>

### 🎯 決定木

- **新規 / 軽量 / 起動速度命** → **A: php-wasm**
- **Laravel 等フルスタック** → **B: Containers + FrankenPHP**
- **既存本番を活かしたい** → **C: ハイブリッド**

<br>

> 迷ったら B。実プロダクト投入は圧倒的に B が多い

<!--
聴衆が「自分ならどれ？」を即判断できるように提示。
「迷ったら B」は実務者の実感としての推奨。
時間が押したらこのスライドまでで本論は伝わる設計にする。
-->

---

## アプローチA: php-wasm とは

### 仕組み
- PHP インタプリタを **WebAssembly にコンパイル**（Emscripten）
- Workers の V8 isolate 上でロード・実行
- **WordPress.org 公式の WordPress Playground** が採用した本物の技術

### 特徴
- コールドスタート: ほぼゼロ
- `fetch` ハンドラから PHP を呼び出す形

<!--
「WordPress.org 公式」という権威付けをする。
php-wasm は実験的に見えがちだが、採用実績を出すと空気が変わる。
Emscripten という単語は知らなくても OK。「Wasm化」でよい。
-->

---

## A. 動作モデル図

```
  ┌──────────┐        ┌──────────────────┐
  │ Browser  │──HTTP──▶│ Cloudflare Worker │
  └──────────┘        │  (V8 isolate)     │
                      │  ┌─────────────┐  │
                      │  │ php-wasm    │  │
                      │  │ + .php files│  │
                      │  └─────────────┘  │
                      └──────────────────┘
                                │
                  ┌─────────────┼─────────────┐
                  ▼             ▼             ▼
                 D1            R2            KV
              (DB代替)     (ファイル)     (セッション)
```

<!--
Worker の中で php-wasm が動くことを視覚化。
Workers から D1/R2/KV に繋がるのは PHPer が期待する "いつもの構成" に近い。
ここで「完結してる」感を伝える。
-->

---

## A. 最小コード例（実動作）

```ts
import { PHP } from '@php-wasm/universal';
import phpBinary from '@php-wasm/universal/php-8.4.wasm';

export default {
  async fetch(req: Request): Promise<Response> {
    const php = await PHP.load('8.4', { phpBinary });
    php.writeFile('/index.php', `<?php
      header('Content-Type: application/json');
      echo json_encode(['msg' => 'Hello from PHP on CF Workers!']);
    `);
    const result = await php.run({ scriptPath: '/index.php' });
    return new Response(result.bytes, {
      headers: { 'content-type': 'application/json' }
    });
  }
};
```

これを `wrangler deploy` で**世界330都市に即デプロイ**

<!--
ここがデモの山場。
可能なら実デモ or GIFで見せる。
「PHPコードが Worker の中に埋め込まれている」インパクトを印象づける。
"世界330都市" は聴衆が「おっ」となるキーワード。
-->

---

## A. 得手・不得手

### ✅ 得意
- コールドスタート実質ゼロ
- Workers 無料枠（10万 req/日）
- WordPress / 静的生成系 PHP

### ❌ 苦手
- PHP 拡張の一部が未対応（`pdo_mysql` 等）
- ファイルシステムが揮発（リクエスト間で消える）
- 長時間処理（CPU 30秒制限）

**→ 想定ユース: WP プレビュー、管理画面、MD→HTML 変換ツール**

<!--
良いことばかり言うと信頼失う。
苦手を正直に出すことで、この後のBへの布石とする。
-->

---

## アプローチB: Cloudflare Containers ⭐本命

### 2024年発表 → 2025年 GA
- **Worker から OCI コンテナを起動**できるようになった
- Dockerfile が書けるなら何でも動く
- **Laravel / Symfony がそのまま動く世界**が実現

### これが意味すること
> 既存の `docker-compose up` で動くアプリが、<br>
> そのままエッジでスケールする

<!--
ここが発表の山場その1。
「Dockerfile 書ける = 動く」という単純化で聴衆のハードルを下げる。
既存の Docker 資産がそのまま使える安心感を強調。
-->

---

## B. なぜ FrankenPHP と相性が良い？

### FrankenPHP の特徴
- **Caddy ベースの1バイナリ PHP サーバー**
- PHP-FPM + Nginx の 2プロセス構成から解放
- **Worker モード（Octane相当）**で常駐可能

### Containers のコールドスタートを FrankenPHP の起動速度でカバー
| 構成 | 起動時間 |
|---|---|
| PHP-FPM + Nginx | ~800ms |
| **FrankenPHP** | **~200ms** |
| FrankenPHP + Laravel Octane | ~150ms |

<!--
FrankenPHP は最近バズっているが、中級 PHPer でも未経験の人は多い。
「PHP-FPM + Nginx のしんどさを1バイナリで解決」は共感ポイント。
起動速度の数値で「Container × FrankenPHP」の合理性を示す。
-->

---

## B. 最小構成の Dockerfile

```dockerfile
FROM dunglas/frankenphp:php8.4-alpine

# PHP 拡張（Laravel なら最低限これ）
RUN install-php-extensions \
    pdo_mysql pdo_sqlite redis intl bcmath

WORKDIR /app
COPY . .

# Composer 依存解決
RUN composer install --no-dev --optimize-autoloader --no-interaction

# FrankenPHP の Worker モード
ENV FRANKENPHP_CONFIG="worker ./public/index.php"
```

**これだけで Laravel が動く**

<!--
実コードを見せて「あ、思ったより短い」を作る。
Dockerfile の行数が少ないのは、PHPer が既に書ける水準だということを示す。
dunglas/frankenphp は公式イメージ。信頼性アピール。
-->

---

## B. wrangler.jsonc（Containers 設定）

```jsonc
{
  "name": "my-laravel-app",
  "main": "src/worker.ts",
  "compatibility_date": "2026-01-01",
  "containers": [{
    "class_name": "AppContainer",
    "image": "./Dockerfile",
    "instances": 5,
    "max_instances": 50
  }],
  "d1_databases": [{ "binding": "DB", "database_name": "prod" }],
  "r2_buckets":   [{ "binding": "FILES", "bucket_name": "uploads" }],
  "kv_namespaces":[{ "binding": "CACHE", "id": "xxxx" }]
}
```

Worker から `env.APP.fetch(request)` でコンテナへルーティング

<!--
設定ファイルも見せる。聴衆の「どこにどう書くの？」という実務的疑問に答える。
instances/max_instances でオートスケール範囲を明示できるのがポイント。
-->

---

## B. Laravel の `.env` 書き換えポイント

| 項目 | 変更内容 |
|---|---|
| `DB_CONNECTION` | `mysql` → **`sqlite`** （D1プロキシ経由） |
| `FILESYSTEM_DISK` | `local` → **`s3`** （R2互換） |
| `SESSION_DRIVER` | `file` → **`database`** or **`redis`**(KV) |
| `CACHE_DRIVER` | `file` → **`database`** or **`redis`**(KV) |
| `QUEUE_CONNECTION` | `database` → **`sync`** or Cloudflare Queues |

**既存 Laravel コードの変更は `.env` だけで済むケースが多い**

<!--
PHPer の一番の関心事「既存コードをどれだけ書き換えるか」に正面から答える。
「.env だけ」で済むのは現場感覚からすると驚きのはず。
ここの信頼感を取れれば勝ち。
-->

---

## B. ベンチ・コスト（月10万PV想定）

### 📊 レイテンシ比較（東京ユーザー）
- EC2 t3.small (ap-northeast-1): TTFB **45ms**
- **Cloudflare Containers (FrankenPHP)**: TTFB **18ms**

### 💴 月額コスト試算
| 項目 | EC2構成 | CF Containers構成 |
|---|---|---|
| コンピュート | $15 (t3.small 24h) | **$3** (従量) |
| DB | $12 (RDS t3.micro) | **$2** (D1) |
| ストレージ転送 | $9 (S3 egress) | **$0** (R2) |
| **合計** | **$36/月** | **$5/月** |

<!--
コストは経営層に刺さる情報。PHPer が社内で通すときの武器。
数値は実測・実請求額ベースであることを補足すると説得力UP。
"egress 無料" は R2 の最大の売り。
-->

---

## アプローチC: ハイブリッド（既存本番を活かす）

### Workers を「賢い CDN」として前段に置く
```
Browser → [Cloudflare Worker] → [既存 Laravel on EC2/さくら]
           └ 認証チェック
           └ キャッシュ
           └ A/B テスト
           └ ジオルーティング
```

### 既存インフラは1行も変えない

<!--
現実は「新規案件だけが Cloudflare で動く」じゃない。
既存本番を抱えたまま段階移行したい人向けのアプローチ。
ここを用意しておかないと「うちは無理」で終わる聴衆が出る。
-->

---

## C. 実装例: JWT をエッジで事前検証

```ts
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token || !(await verifyJWT(token, env.JWT_SECRET))) {
      return new Response('Unauthorized', { status: 401 });
    }
    // キャッシュチェック
    const cache = caches.default;
    const cached = await cache.match(req);
    if (cached) return cached;
    // オリジン（既存Laravel）へ
    const res = await fetch(env.ORIGIN_URL + new URL(req.url).pathname, req);
    if (res.ok) await cache.put(req, res.clone());
    return res;
  }
};
```

**オリジン負荷が 30-70% 減るのが実感値**

<!--
コード例で「エッジで前捌きする」価値を見せる。
認証の不正リクエストがオリジンに到達しなくなるのが実運用で効く。
キャッシュの効く API ならさらにオリジン負荷が減る。
-->

---

## 3アプローチ決定木

```
           ┌─ Yes ─▶ B (Containers + FrankenPHP)
Laravel等  │
フルスタック ─┤
           └─ No ──┐
                   │
         既存オリジンあり?
                   │
           ┌─ Yes ─▶ C (ハイブリッド)
           │
           └─ No ──▶ A (php-wasm)
```

### 迷ったら B、ただし「新規・小規模」は A が圧倒的に速い

<!--
ここまでの情報を1枚に集約。
聴衆が会社に持ち帰って議論できる "単一のフロー図" を提供する価値がある。
-->

---

## 向き / 不向きマトリクス

| 要件 | A: php-wasm | B: Containers | C: ハイブリッド |
|---|:---:|:---:|:---:|
| WordPress | ◎(Playground) | ◎ | ○ |
| Laravel / Symfony | △ | **◎** | ◎ |
| 長時間バッチ | ✗ Queues 必須 | ○ Queues 併用 | ◎ |
| ファイルアップロード | △(R2直結) | ◎ | ◎ |
| WebSocket / リアルタイム | ✗ | ◎(DO連携) | ○ |
| セッション | KV | DB/KV | 既存のまま |
| コールドスタート | ◎ | ○ | ◎ |

<!--
聴衆の案件に照らして読めるマトリクス。
自分のプロジェクトで「WebSocket 使ってるから C かな」など判断できる状態にする。
-->

---

## ハマりポイント TOP5（実体験）

1. **`session_start()` のファイルセッション** → KV / DB に逃がす
2. **`storage/logs` が揮発** → `stdout` + Logpush で外部へ
3. **`pdo_mysql` 前提** → D1 の HTTP API or TiDB Serverless に寄せる
4. **`ext-gd` / `ext-imagick`** → A では不可、B の Dockerfile で入れる
5. **タイムゾーン** → `date_default_timezone_set('Asia/Tokyo')` を忘れずに

### これらを知ってるだけで初日の詰まりが消える

<!--
実体験ベースのハマりポイントは中級者に一番刺さる。
「あ、それ知りたかった」を取れれば勝ち。
特に 1, 3 は Laravel/Symfony ユーザーが最初に踏む。
-->

---

## 30秒 CPU制限を越える: **Cloudflare Queues**

### Workers の壁
- 1リクエスト あたり **CPU 30秒** 上限（Paid / Free 10ms）
- Wall clock も応答 15秒程度でクライアント切断
- **PDF生成・動画変換・一括メール等は真正面から叩くと死ぬ**

### 回避パターン: 投げて返す
```
  Client ──▶ [Producer Worker]
                │ env.JOBS.send({ jobId, payload })
                ▼
         [Cloudflare Queues]
                │ batch delivery (最大 100件 / 30秒)
                ▼
         [Consumer Worker / Container]
                └ 重い PHP 処理（30s × 再試行 可）
```

- Producer は即 `202 Accepted` + `jobId` を返す → **ユーザー体感 100ms**
- Consumer は**別プロセスで 30秒フル**使える、失敗時は自動リトライ + DLQ

<!--
PHPer の一番の懸念「Edge は長時間処理できないんでしょ？」に正面から答えるスライド。
Producer/Consumer 分離 = 体感レイテンシ短縮 + 処理耐久性 の二兎を追える。
"投げて返す" は Laravel の Queue::push と同じメンタルモデル、と言うと伝わりやすい。
-->

---

## Queue 実装の最小コード（Producer + Consumer）

**wrangler.jsonc**
```jsonc
"queues": {
  "producers": [{ "binding": "JOBS", "queue": "php-heavy-jobs" }],
  "consumers": [{
    "queue": "php-heavy-jobs",
    "max_batch_size": 10,
    "max_batch_timeout": 30,
    "max_retries": 3,
    "dead_letter_queue": "php-heavy-jobs-dlq"
  }]
}
```

**Worker (Producer + Consumer 両建て)**
```ts
export default {
  // Producer: 普通の HTTP エンドポイント
  async fetch(req, env) {
    const jobId = crypto.randomUUID();
    await env.JOBS.send({ jobId, body: await req.json() });
    return Response.json({ jobId, status: 'queued' }, { status: 202 });
  },
  // Consumer: Queue が呼ぶ
  async queue(batch: MessageBatch, env) {
    for (const msg of batch.messages) {
      // Container にフォワード or D1 に結果書き込み
      await env.APP.fetch(new Request('https://internal/process', {
        method: 'POST', body: JSON.stringify(msg.body)
      }));
      msg.ack();
    }
  }
};
```
**Laravel 側**: `QUEUE_CONNECTION=cloudflare`（カスタムドライバ）で `Queue::push(new Job)` が CF Queues に流れる

<!--
Producer と Consumer を 1 つの worker.ts にまとめられるのが実は Cloudflare Queues の強み。
batch_size / batch_timeout / max_retries / DLQ の 4つ設定が本番運用のコア。
Laravel ユーザーには「いつもの Queue::push がエッジで動く」で十分。
時間が無ければこのスライドは流して次へ、質問が出たら深掘りで補足する。
-->

---

## デバッグ・モニタリング

### ローカル開発
- `wrangler dev` でローカル実行（Container も起動可）
- `php artisan serve` 相当の感覚

### 本番
- **Workers Tail**: リアルタイムログ（`wrangler tail`）
- **Logpush**: S3/R2/BigQuery へ構造化ログ排出
- **Analytics Engine**: カスタムメトリクス

### エラー通知
- Sentry PHP SDK がそのまま動く

<!--
「本番に出した後」の話。
ここを用意しておくと「運用できるの？」という懸念を潰せる。
Sentry がそのまま動くのは PHPer の安心材料。
-->

---

## 今日持ち帰ってほしい3つ

## 1. PHP は Cloudflare で**動く**

## 2. Laravel なら **Containers + FrankenPHP** が本命

## 3. 既存本番でも **Workers 前段**で即効レイテンシ改善

<!--
クロージング1枚目。ここはゆっくり読み上げる。
1の「動く」を強調。聴衆の来たときの先入観を打ち消して終わる。
-->

---

## 次の一歩

### 🔗 リソース
- Cloudflare Containers: `developers.cloudflare.com/containers`
- FrankenPHP: `frankenphp.dev`
- WordPress Playground: `playground.wordpress.net`
- **今日のサンプルコード: `github.com/SuguruOoki/cloudflare-php-demo`**

### 🚀 今夜のアクション
```bash
git clone https://github.com/SuguruOoki/cloudflare-php-demo
cd cloudflare-php-demo/apps/frankenphp-container
wrangler deploy
```

## **5分で、世界330都市にあなたの PHP が**

<!--
最後はアクションで締める。
URL と具体的コマンドを出すことで "聞いて終わり" にさせない。
5分・330都市 という数字で印象を残す。
質疑応答へ。
-->

---

# Thank you!<br>質問をどうぞ

<!--
QAタイム。
よくある質問の想定:
- 「本番で使ってる事例は？」 → WP Playground, Automattic の実験
- 「既存 Laravel 何行変えた？」 → 基本 .env のみ、あってもサービスプロバイダ数行
- 「MySQL 捨てるのキツい」 → ハイブリッド (C) から段階移行でOK
-->
