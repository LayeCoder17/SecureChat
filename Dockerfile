FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY resources ./resources
COPY vite.config.js ./
RUN npm run build

FROM composer:2.8 AS vendor-builder
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader

FROM php:8.3-cli-alpine
WORKDIR /var/www/html

RUN apk add --no-cache \
    bash \
    icu-dev \
    oniguruma-dev \
    libzip-dev \
    mysql-client \
    zip \
    unzip \
    git \
    && docker-php-ext-install pdo pdo_mysql mbstring intl zip

COPY --from=vendor-builder /app/vendor ./vendor
COPY . .
COPY --from=frontend-builder /app/public/build ./public/build

RUN cp .env.example .env \
    && php artisan key:generate --force \
    && php artisan storage:link || true

EXPOSE 8000

CMD ["sh", "-c", "php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=8000"]
