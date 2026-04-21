<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Tokyo');
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path   = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

switch (true) {
    case $path === '/' || $path === '/api/hello':
        echo json_encode([
            'message'         => 'Hello from FrankenPHP on Cloudflare Containers!',
            'php_version'     => PHP_VERSION,
            'sapi'            => PHP_SAPI,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
            'worker_mode'     => (bool)($_SERVER['FRANKENPHP_WORKER'] ?? false),
            'timestamp'       => date('c'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        break;

    case $path === '/api/time':
        echo json_encode([
            'tokyo' => date('Y-m-d H:i:s'),
            'utc'   => gmdate('Y-m-d H:i:s'),
            'unix'  => time(),
        ], JSON_PRETTY_PRINT);
        break;

    case $path === '/api/env':
        echo json_encode([
            'has_db_binding' => isset($_SERVER['DB_URL']),
            'has_r2_binding' => isset($_SERVER['R2_BUCKET']),
            'runtime'        => getenv('CONTAINER_RUNTIME') ?: 'local',
        ], JSON_PRETTY_PRINT);
        break;

    // ----------------------------------------------------------------
    // スライド紹介機能: Queue Consumer からの委譲エンドポイント
    //
    // Worker の queue() ハンドラがここに HTTP POST で投げる。
    // 実プロダクトでは PDF 生成・一括メール・レポート生成等が入る場所。
    // 処理時間枠は Queue Consumer 由来で CPU 最大 5分 / wall 15分 使える。
    // ----------------------------------------------------------------
    case $path === '/process' && $method === 'POST':
        $raw = file_get_contents('php://input') ?: '{}';
        $job = json_decode($raw, true) ?? [];

        // ここで重い処理を実行する想定（今はログに残すだけ）
        error_log(sprintf('[process] job=%s kind=%s', $job['jobId'] ?? '?', $job['kind'] ?? '?'));

        echo json_encode([
            'status'    => 'processed',
            'job_id'    => $job['jobId'] ?? null,
            'kind'      => $job['kind'] ?? null,
            'worker_pid' => getmypid(),
            'processed_at' => date('c'),
        ], JSON_PRETTY_PRINT);
        break;

    // ----------------------------------------------------------------
    // 利用可能なデモエンドポイントのディレクトリ
    // ----------------------------------------------------------------
    case $path === '/api/demos':
        echo json_encode([
            'available' => [
                'GET  /api/hello'     => 'FrankenPHP の稼働確認',
                'GET  /api/time'      => 'Tokyo / UTC タイムスタンプ',
                'GET  /api/env'       => 'Container バインディング確認',
                'POST /api/enqueue'   => 'Queue にジョブ投入（Worker 側で処理）',
                'POST /api/send-mail' => 'Cloudflare Email Service で送信（Worker 側）',
                'POST /process'       => 'Queue Consumer から呼ばれる実処理（直接叩かない想定）',
            ],
            'note' => '/api/enqueue と /api/send-mail は Worker 側の処理なので、Container には届かない',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(404);
        echo json_encode([
            'error'     => 'Not Found',
            'path'      => $path,
            'method'    => $method,
            'see'       => '/api/demos',
        ]);
}
