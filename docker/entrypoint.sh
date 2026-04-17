#!/bin/bash
set -e

cd /var/www/html

# ============================================================
# 1. Préparation .env (1re fois)
# ============================================================
if [ ! -f .env ]; then
    if [ -f .env.docker ]; then
        cp .env.docker .env
        echo "→ .env créé depuis .env.docker"
    else
        cp .env.example .env
        echo "→ .env créé depuis .env.example"
    fi
fi

# Génère APP_KEY si absente
if ! grep -q "APP_KEY=base64:" .env; then
    php artisan key:generate --force
    echo "→ APP_KEY générée"
fi

# ============================================================
# 2. Permissions
# ============================================================
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache || true

# ============================================================
# 3. Sync des assets front (public/build) depuis l'image
#    → garantit que le volume app_public contient la dernière build
# ============================================================
if [ -d /opt/public-dist ]; then
    echo "→ Synchronisation des assets publics"
    cp -Rn /opt/public-dist/. /var/www/html/public/ 2>/dev/null || true
    # Force mise à jour du build compilé
    if [ -d /opt/public-dist/build ]; then
        rm -rf /var/www/html/public/build
        cp -R /opt/public-dist/build /var/www/html/public/build
    fi
fi

# ============================================================
# 4. Attente MySQL
# ============================================================
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
# 5. Migrations
# ============================================================
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "→ Exécution des migrations"
    php artisan migrate --force
fi

# ============================================================
# 6. Seeds conditionnels (si users vide = 1re installation)
# ============================================================
USER_COUNT=$(php artisan tinker --execute="echo \App\Models\User::count();" 2>/dev/null | tail -1 | tr -d '[:space:]')
if [ "${USER_COUNT:-0}" = "0" ] || [ "${RUN_SEEDERS:-auto}" = "true" ]; then
    echo "→ Base vide → exécution des seeders"
    php artisan db:seed --force || true
else
    echo "→ $USER_COUNT utilisateurs présents → seeders ignorés"
fi

# Storage link
php artisan storage:link 2>/dev/null || true

# ============================================================
# 7. Cache (prod) / Clear (dev)
# ============================================================
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
