/**
 * PHP on Cloudflare Workers — Demo Landing
 *
 * 注: 実際に PHP を Worker 内で実行するには @php-wasm/universal に加えて
 *     PHPローダーモジュール (.wasm) のバンドリングが必要。
 *     このデモでは "3アプローチの入口" として Worker をデプロイし、
 *     実PHP実行は apps/frankenphp-container/ 側で確認する。
 */

export interface Env {}

const HTML = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>PHP on Cloudflare</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #222; }
    h1 { color: #F38020; }
    h2 { color: #003682; border-bottom: 2px solid #F38020; padding-bottom: 4px; margin-top: 32px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    .tag { display: inline-block; background: #F38020; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; vertical-align: middle; }
    ul li { margin: 6px 0; }
    a { color: #003682; }
  </style>
</head>
<body>
  <h1>🐘 PHP on Cloudflare <span class="tag">Demo</span></h1>
  <p>「Cloudflare で PHP は動かない」は、もう古い。3つのアプローチで動きます。</p>

  <h2>3つのアプローチ</h2>
  <ul>
    <li><strong>A. php-wasm</strong> — PHP を Wasm 化して Workers 上で実行</li>
    <li><strong>B. Containers + FrankenPHP</strong> — Laravel 等フル機能アプリ ⭐本命</li>
    <li><strong>C. ハイブリッド</strong> — Workers をエッジ層、既存 PHP はオリジンのまま</li>
  </ul>

  <h2>API エンドポイント</h2>
  <ul>
    <li><a href="/api/hello">/api/hello</a> — Worker ランタイム情報</li>
    <li><a href="/api/time">/api/time</a> — Tokyo / UTC タイムスタンプ</li>
    <li><a href="/api/approaches">/api/approaches</a> — 3アプローチの比較データ</li>
  </ul>

  <h2>ソース</h2>
  <p><a href="https://github.com/SuguruOoki/cloudflare-php-demo">github.com/SuguruOoki/cloudflare-php-demo</a></p>
</body>
</html>`;

export default {
  async fetch(req: Request, _env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (url.pathname === '/api/hello') {
      return Response.json({
        message: 'Hello from Cloudflare Workers!',
        note: '本番では php-wasm 経由で PHP が動くよう差し替え可能',
        runtime: 'V8 isolate (Workers)',
        colo: req.cf?.colo ?? 'unknown',
        country: req.cf?.country ?? 'unknown',
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === '/api/time') {
      const now = new Date();
      const tokyo = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(now);
      return Response.json({
        tokyo,
        utc: now.toISOString(),
        unix: Math.floor(now.getTime() / 1000),
      });
    }

    if (url.pathname === '/api/approaches') {
      return Response.json({
        approaches: [
          {
            id: 'A',
            name: 'php-wasm',
            runtime: 'Workers (V8 isolate) + WebAssembly',
            example: 'WordPress Playground',
            best_for: '軽量・WP 系・コールドスタート命',
          },
          {
            id: 'B',
            name: 'Containers + FrankenPHP',
            runtime: 'Cloudflare Containers',
            example: 'Laravel / Symfony',
            best_for: 'フルスタック PHP アプリ（本番向け本命）',
          },
          {
            id: 'C',
            name: 'ハイブリッド',
            runtime: 'Workers + 既存オリジン (EC2/さくら等)',
            example: 'エッジ JWT 検証・キャッシュ',
            best_for: '既存資産を活かした段階移行',
          },
        ],
      });
    }

    return new Response(
      JSON.stringify({
        error: 'Not Found',
        available: ['/', '/api/hello', '/api/time', '/api/approaches'],
      }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    );
  },
};
