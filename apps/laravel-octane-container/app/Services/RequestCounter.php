<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Octane worker 内で生き続ける singleton。
 * 同じ worker プロセスが複数リクエストを捌く Octane の特性を可視化するためのカウンタ。
 */
class RequestCounter
{
    private int $count = 0;

    public function increment(): int
    {
        return ++$this->count;
    }

    public function current(): int
    {
        return $this->count;
    }
}
