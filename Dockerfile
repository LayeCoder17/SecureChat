# syntax=docker/dockerfile:1.6

# ============================================================
# 1. Build des assets front (Vite)
# ============================================================
FROM node:22-alpine AS frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY resources ./resources
COPY vite.config.js ./
RUN npm run build

# ============================================================
# 2. Installation des dépendances PHP
# ============================================================
FROM composer:2.8 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --optimize-autoloader

# ============================================================
# 3. Image finale (PHP-FPM + extensions)
# ============================================================
FROM php:8.4-fpm-alpine AS app

WORKDIR /var/www/html

# Dépendances système (persistantes) + build deps (temporaires)
RUN set -eux; \
    apk add --no-cache \
        bash \
        curl \
        git \
        mariadb-client \
        libpng \
        libzip \
        icu-libs \
        oniguruma \
        shadow \
        su-exec \
        supervisor \
        unzip \
        zip; \
    apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        icu-dev \
        libpng-dev \
        libzip-dev \
        oniguruma-dev; \
    docker-php-ext-install -j"$(nproc)" \
        bcmath \
        exif \
        gd \
        intl \
        mbstring \
        pcntl \
        pdo_mysql \
        zip; \
    pecl install redis; \
    docker-php-ext-enable redis; \
    apk del --no-network --purge .build-deps; \
    rm -rf /var/cache/apk/* /tmp/*

# Configuration PHP pour la prod (memory, upload)
COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-app.ini

# Copie du code
COPY . /var/www/html
COPY --from=vendor /app/vendor /var/www/html/vendor
COPY --from=frontend /app/public/build /var/www/html/public/build

# Entrypoint
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Utilisateur non-root (UID 1000 aligné avec un dev Linux courant)
RUN addgroup -g 1000 app \
    && adduser -D -u 1000 -G app -s /bin/bash app \
    && chown -R app:app /var/www/html

USER app

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
