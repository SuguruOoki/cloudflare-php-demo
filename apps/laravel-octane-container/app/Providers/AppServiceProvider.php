<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\RequestCounter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Octane 下では singleton がリクエストを跨いで生き続ける（= worker persistence）。
     * 通常の php-fpm では毎リクエストで破棄されるのと対照的。
     */
    public function register(): void
    {
        $this->app->singleton(RequestCounter::class);
    }

    public function boot(): void
    {
        //
    }
}
