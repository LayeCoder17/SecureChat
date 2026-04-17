# SecureChat

Application de messagerie d'entreprise basee sur Laravel + React (Vite).

## Fonctionnalites principales

- Authentification (inscription / connexion / deconnexion) via token
- Conversations privees et de groupe
- Messagerie en temps reel (Echo + Pusher)
- Gestion d'organigramme (departements, roles, recherche utilisateurs)
- Interface amelioree avec bascule **mode clair/sombre**

## Stack technique

- Backend: Laravel 12, Sanctum, Broadcasting
- Frontend: React 19, React Router, TailwindCSS 4, Vite
- Base de donnees: MySQL (compose) ou SQLite (local)

## Lancement local (sans Docker)

```bash
cp .env.example .env
composer install
npm install
php artisan key:generate
php artisan migrate
npm run build
php artisan serve
```

## Lancement avec Docker

### Prerequis
- Docker
- Docker Compose plugin

### Commandes

```bash
docker compose up --build
```

L'application sera disponible sur:
- [http://localhost:8000](http://localhost:8000)

La base MySQL est exposee sur `3307` (hote) -> `3306` (conteneur).

### Arreter

```bash
docker compose down
```

### Arreter et supprimer les volumes

```bash
docker compose down -v
```

## Build et tests

```bash
npm run build
php artisan test
```

## Notes pour depot / rendu

- Les fichiers de containerisation inclus:
  - `Dockerfile`
  - `docker-compose.yml`
  - `.dockerignore`
- Le theme clair/sombre est persiste en localStorage (`securechat-theme`)
