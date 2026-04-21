<?php

use App\Services\RequestCounter;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'message' => 'Laravel Octane on Cloudflare Containers',
    'try' => [
        '/api/hello',
        '/api/octane',
    ],
]));

Route::get('/api/hello', function (RequestCounter $counter) {
    return response()->json([
        'message' => 'Hello from Laravel Octane on Cloudflare Containers!',
        'laravel_version' => app()->version(),
        'php_version' => PHP_VERSION,
        'octane_server' => config('octane.server'),
        // Octane の persistence を可視化: 同じ worker を何度叩いたか
        'request_count_this_worker' => $counter->increment(),
        'worker_pid' => getmypid(),
        'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::get('/api/octane', function () {
    return response()->json([
        'octane_active' => config('octane.server') !== null,
        'octane_server' => config('octane.server'),
        'worker_pid' => getmypid(),
        'listener' => gethostname(),
    ]);
});
