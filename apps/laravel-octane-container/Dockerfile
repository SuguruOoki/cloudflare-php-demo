FROM dunglas/frankenphp:1-php8.4-alpine

# PHP 拡張 + Composer
RUN install-php-extensions \
    pdo_mysql \
    pdo_sqlite \
    redis \
    intl \
    bcmath \
    opcache \
    zip \
    pcntl \
    @composer

WORKDIR /app

# dunglas/frankenphp は /app にデフォルトの placeholder を置いているので、先に空にする
RUN rm -rf /app/* /app/.[!.]* 2>/dev/null || true

# Laravel スケルトン + Octane を導入
RUN composer create-project --prefer-dist laravel/laravel . --no-interaction --no-scripts \
 && composer require laravel/octane --no-interaction --no-scripts

# Sanctum を有効化（routes/api.php / HasApiTokens / migration を publish）
RUN php artisan install:api --no-interaction

# デモ用の上書きファイル（Counter / Provider / User / Bootstrap / Routes / Seeder）
# NOTE: routes/api.php と User.php は install:api のあとに COPY して上書きする
COPY app/Services/RequestCounter.php   app/Services/RequestCounter.php
COPY app/Providers/AppServiceProvider.php app/Providers/AppServiceProvider.php
COPY app/Models/User.php app/Models/User.php
COPY bootstrap/app.php bootstrap/app.php
COPY routes/web.php routes/web.php
COPY routes/api.php routes/api.php
COPY database/seeders/DemoUserSeeder.php database/seeders/DemoUserSeeder.php

# 依存解決 + オートロード最適化
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Octane の FrankenPHP 向けインストール（FrankenPHP バイナリは既に入っているので追加ダウンロード不要）
RUN php artisan octane:install --server=frankenphp --no-interaction || true

# .env をコンテナ向けに調整（SQLite / production）
RUN cp .env.example .env \
 && sed -i 's|^APP_ENV=.*|APP_ENV=production|' .env \
 && sed -i 's|^APP_DEBUG=.*|APP_DEBUG=false|' .env \
 && sed -i 's|^DB_CONNECTION=.*|DB_CONNECTION=sqlite|' .env \
 && sed -i 's|^# *DB_DATABASE=.*|DB_DATABASE=/tmp/database.sqlite|' .env \
 && sed -i 's|^DB_DATABASE=.*|DB_DATABASE=/tmp/database.sqlite|' .env \
 && sed -i 's|^SESSION_DRIVER=.*|SESSION_DRIVER=file|' .env \
 && sed -i 's|^CACHE_STORE=.*|CACHE_STORE=file|' .env \
 && sed -i 's|^QUEUE_CONNECTION=.*|QUEUE_CONNECTION=sync|' .env \
 && printf '\nOCTANE_SERVER=frankenphp\n' >> .env \
 && touch /tmp/database.sqlite \
 && php artisan key:generate --force

# DB 初期化 + デモユーザー投入（Sanctum の personal_access_tokens テーブルも作成される）
RUN php artisan migrate --force \
 && php artisan db:seed --class=DemoUserSeeder --force

# config / view キャッシュ（Octane のベストプラクティス）
# NOTE: route:cache は install:api 後に Sanctum + api.php が解決できず 404 を
# 招くケースがあったため外している。Octane 常駐なので実質的な性能影響は小さい。
RUN php artisan config:cache \
 && (php artisan view:cache || true)

EXPOSE 8080

# Octane を FrankenPHP ランタイムで起動（= Worker モード常駐 = 本物の Octane）
CMD ["php", "artisan", "octane:frankenphp", \
     "--host=0.0.0.0", \
     "--port=8080", \
     "--admin-port=2019", \
     "--workers=4", \
     "--max-requests=500"]
