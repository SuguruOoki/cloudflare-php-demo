import { PHP } from '@php-wasm/universal';

export interface Env {
  CACHE: KVNamespace;
}

const INDEX_PHP = `<?php
header('Content-Type: application/json; charset=utf-8');

$path = $_SERVER['REQUEST_URI'] ?? '/';

if ($path === '/api/hello') {
    echo json_encode([
        'message' => 'Hello from PHP on Cloudflare Workers!',
        'php_version' => PHP_VERSION,
        'sapi' => PHP_SAPI,
        'timestamp' => date('c'),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($path === '/api/time') {
    date_default_timezone_set('Asia/Tokyo');
    echo json_encode([
        'tokyo' => date('Y-m-d H:i:s'),
        'utc' => gmdate('Y-m-d H:i:s'),
        'unix' => time(),
    ], JSON_PRETTY_PRINT);
    exit;
}

if ($path === '/api/phpinfo') {
    header('Content-Type: text/html; charset=utf-8');
    phpinfo();
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not Found', 'available' => [
    '/api/hello',
    '/api/time',
    '/api/phpinfo',
]]);
`;

async function runPhp(requestUri: string): Promise<{ body: Uint8Array; headers: Record<string, string>; status: number }> {
  const php = await PHP.load('8.3');
  php.writeFile('/index.php', INDEX_PHP);

  const result = await php.run({
    scriptPath: '/index.php',
    serverParams: {
      REQUEST_METHOD: 'GET',
      REQUEST_URI: requestUri,
      HTTP_HOST: 'cloudflare-php-demo',
    },
  });

  return {
    body: result.bytes,
    headers: result.headers ?? {},
    status: result.httpStatusCode ?? 200,
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/') {
      return new Response(
        `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>PHP on Cloudflare Workers</title>
<style>body{font-family:system-ui;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.6}</style>
</head><body>
<h1>PHP on Cloudflare Workers</h1>
<p>php-wasm で PHP 8.3 が Worker 上で動いています。</p>
<ul>
  <li><a href="/api/hello">/api/hello</a> - Hello World + PHP バージョン</li>
  <li><a href="/api/time">/api/time</a> - Tokyo / UTC タイムスタンプ</li>
  <li><a href="/api/phpinfo">/api/phpinfo</a> - phpinfo() の出力</li>
</ul>
</body></html>`,
        { headers: { 'content-type': 'text/html; charset=utf-8' } }
      );
    }

    try {
      const { body, headers, status } = await runPhp(url.pathname);
      return new Response(body, { status, headers });
    } catch (err) {
      console.error('PHP execution failed:', err);
      return new Response(
        JSON.stringify({ error: 'PHP execution failed', detail: String(err) }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  },
};
