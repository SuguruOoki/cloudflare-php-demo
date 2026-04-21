<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Tokyo');
header('Content-Type: application/json; charset=utf-8');

$path = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($path, PHP_URL_PATH) ?: '/';

switch ($path) {
    case '/':
    case '/api/hello':
        echo json_encode([
            'message' => 'Hello from FrankenPHP on Cloudflare Containers!',
            'php_version' => PHP_VERSION,
            'sapi' => PHP_SAPI,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
            'worker_mode' => (bool)($_SERVER['FRANKENPHP_WORKER'] ?? false),
            'timestamp' => date('c'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        break;

    case '/api/time':
        echo json_encode([
            'tokyo' => date('Y-m-d H:i:s'),
            'utc' => gmdate('Y-m-d H:i:s'),
            'unix' => time(),
        ], JSON_PRETTY_PRINT);
        break;

    case '/api/env':
        // Cloudflare Containers のバインディング経由の環境変数を確認
        echo json_encode([
            'has_db_binding' => isset($_SERVER['DB_URL']),
            'has_r2_binding' => isset($_SERVER['R2_BUCKET']),
            'runtime' => getenv('CONTAINER_RUNTIME') ?: 'local',
        ], JSON_PRETTY_PRINT);
        break;

    default:
        http_response_code(404);
        echo json_encode([
            'error' => 'Not Found',
            'available' => ['/api/hello', '/api/time', '/api/env'],
        ]);
}
