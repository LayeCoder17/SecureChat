#!/bin/bash
set -e

cd /var/www/html

# ============================================================
# Préparation au premier lancement
# ============================================================

# .env : si absent, on le crée depuis .env.docker ou .env.example
if [ ! -f .env ]; then
    if [ -f .env.docker ]; then
        cp .env.docker .env
        echo "→ .env créé depuis .env.docker"
    else
        cp .env.example .env
        echo "→ .env créé depuis .env.example"
    fi
fi

# Génère la clé si vide
if ! grep -q "APP_KEY=base64:" .env; then
    php artisan key:generate --force
    echo "→ APP_KEY générée"
fi

# Permissions (au cas où un volume monté est root)
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache || true

# Attendre que MySQL soit prêt
if [ -n "$DB_HOST" ]; then
    echo "→ Attente de la base $DB_HOST:$DB_PORT..."
    for i in $(seq 1 30); do
        if mysqladmin ping -h"$DB_HOST" -P"${DB_PORT:-3306}" -u"$DB_USERNAME" -p"$DB_PASSWORD" --silent 2>/dev/null; then
            echo "→ Base OK"
            break
        fi
        sleep 2
    done
fi

# ============================================================
# Migrations + seeds (la 1re fois seulement)
# ============================================================
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "→ Exécution des migrations"
    php artisan migrate --force
fi

if [ "${RUN_SEEDERS:-false}" = "true" ]; then
    echo "→ Exécution des seeders"
    php artisan db:seed --force || true
fi

# Storage link
php artisan storage:link 2>/dev/null || true

# Cache config/routes/views (prod uniquement)
if [ "${APP_ENV}" = "production" ]; then
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
else
    php artisan config:clear
    php artisan route:clear
    php artisan view:clear
fi

echo "→ Démarrage : $@"
exec "$@"
