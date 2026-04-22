/**
 * エッジキャッシュの安全ガード
 *
 * 目的: Worker が誤って認証付きレスポンスを共有キャッシュに保存し、
 *       別ユーザーに同じ応答を返してしまう事故 (= 個人情報漏洩 / 認証バイパス) を防ぐ。
 *
 * 三重ガード:
 *   1. Method ガード     — GET/HEAD 以外 (POST/PUT/DELETE 等) はキャッシュ対象外
 *   2. 認証ヘッダガード   — Authorization / Cookie (Laravel セッション) があれば bypass
 *   3. レスポンスガード   — Cache-Control: private / no-store のレスポンスは保存しない
 *
 * 認証付きでもエッジキャッシュを効かせたいレアケースは、safeCacheKey() で
 * ユーザー ID を cache key に混ぜて分離する。
 */

/**
 * リクエストがキャッシュを bypass すべきか判定する。
 * 迷ったら bypass の保守的ポリシー。
 */
export function shouldBypassCache(request: Request): boolean {
  // 1. Method ガード: 非idempotent メソッドはキャッシュ対象外
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return true;
  }

  // 2-a. Authorization ヘッダがあれば認証付きリクエスト → bypass
  if (request.headers.has('Authorization')) {
    return true;
  }

  // 2-b. Laravel セッションクッキーがあればユーザー紐付きの可能性 → bypass
  const cookie = request.headers.get('Cookie') ?? '';
  if (/laravel_session|session_id|XSRF-TOKEN|remember_web/i.test(cookie)) {
    return true;
  }

  return false;
}

/**
 * 認証付きでも安全にキャッシュしたいケース用。
 * cache key の URL にユーザー ID を混ぜて、他ユーザーと分離する。
 */
export function safeCacheKey(request: Request, userId: string | null): Request {
  if (!userId) return request;
  const url = new URL(request.url);
  url.searchParams.set('__cache_uid', userId);
  return new Request(url.toString(), request);
}

type OriginFetcher = (request: Request) => Promise<Response>;

/**
 * エッジキャッシュ挟み込みのエントリポイント。
 *
 * 安全にキャッシュする場合だけ cache.put() を呼ぶ:
 *   - shouldBypassCache() = true のリクエストはそのままオリジンへ
 *   - レスポンスが Cache-Control: private / no-store を含む場合も保存しない
 *   - 2xx 系のみ保存
 */
export async function withEdgeCache(
  request: Request,
  origin: OriginFetcher
): Promise<Response> {
  if (shouldBypassCache(request)) {
    return origin(request);
  }

  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;

  const res = await origin(request);

  // 3. レスポンスガード: Laravel 側が Cache-Control: private を付けていたら尊重
  const cc = res.headers.get('Cache-Control') ?? '';
  if (/private|no-store|no-cache/i.test(cc)) {
    return res;
  }

  if (res.ok) {
    // clone() しないと body が consume されてユーザーに返せなくなる
    await cache.put(request, res.clone());
  }
  return res;
}
