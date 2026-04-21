FROM dunglas/frankenphp:1-php8.3-alpine

# PHP 拡張（Laravel や一般的な PHP アプリの最低限）
RUN install-php-extensions \
    pdo_mysql \
    pdo_sqlite \
    redis \
    intl \
    bcmath \
    opcache \
    zip

WORKDIR /app

# 依存関係を先にコピーしてキャッシュ効率を上げる
COPY composer.json ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts \
    || true

COPY . .

# FrankenPHP の Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# ポート (Cloudflare Containers は 8080 を標準で受ける)
EXPOSE 8080

# 本番では Worker モード（Octane 相当）を有効化したいなら以下
# ENV FRANKENPHP_CONFIG="worker ./public/index.php"

CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
