<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Octane worker 内で生き続けるカウンタ。
 * 同じ worker プロセスが複数リクエストを捌く Octane の特性を可視化する。
 *
 * static property で実装する理由:
 *   Laravel は Octane でも一部の container バインディングをリクエスト間でフラッシュ
 *   するため、singleton のインスタンスプロパティでは毎回リセットされることがある。
 *   class-level static ならプロセス（= worker）が生きる限り確実に保持される。
 */
class RequestCounter
{
    private static int $count = 0;

    public function increment(): int
    {
        return ++self::$count;
    }

    public function current(): int
    {
        return self::$count;
    }
}
