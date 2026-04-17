# SecureChat

Application de messagerie interne d'entreprise — **Laravel 12 + React 19 + MySQL + Docker**.

Interface inspirée de WhatsApp / Snapchat avec mode sombre full black, thème clair doux, administration complète et organigramme hiérarchique.

---

## ✨ Fonctionnalités

### Messagerie
- Authentification par token (Laravel Sanctum)
- Conversations privées et de groupe
- Envoi de **pièces jointes** (images, PDF, documents)
- Aperçu des conversations **style WhatsApp** (nom + heure, dernier message, préfixe « Vous: »)
- **Statut en ligne** (heartbeat 30 s, pastille verte/grise)
- Mise à jour **temps réel** par polling (messages 3 s, conversations 5 s)
- Recherche utilisateurs avec filtres par département / rôle
- Notifications internes persistées en base

### Thème
- **Mode sombre full black** style Snapchat (#000, accent violet #7c5cff)
- **Mode clair doux** (#f5f5f7)
- Préférence persistée en `localStorage` (`securechat-theme`)

### Administration
- Tableau de bord avec **KPI** (utilisateurs, messages 24 h / 7 j, conversations, utilisateurs actifs)
- Graphique **barres messages 7 derniers jours**
- Répartition par **rôle** et **département**
- Gestion complète des **utilisateurs** (CRUD, rôles, affectation département)
- Gestion des **départements** (hiérarchie parent/enfant, code, membres)
- Supervision des **conversations** (participants, dernier message, visualisation, suppression)
- Comptes admin isolés, redirection automatique vers `/admin`

---

## 🧱 Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Laravel 12, Sanctum, Eloquent, Broadcasting |
| Frontend | React 19, React Router, TailwindCSS 4, Vite |
| Base de données | MySQL 8 (Docker) ou SQLite (local) |
| Cache / Queue | Redis |
| WebSocket | Soketi (optionnel, polling utilisé par défaut) |
| Mail (dev) | Mailpit |
| Conteneurs | Docker + Docker Compose |

---

## 🚀 Démarrage rapide (Docker — recommandé)

### Prérequis
- Docker Desktop ou Docker Engine + plugin Compose

### Lancement

```bash
cp .env.docker .env
docker compose up --build -d
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
npm install && npm run build
docker compose cp ./public/build/. app:/var/www/html/public/build/
```

### Services exposés

| Service | URL / Port |
|---------|------------|
| Application | http://localhost:8000 |
| Mailpit (mails de test) | http://localhost:8025 |
| MySQL | localhost:3307 |
| Redis | localhost:6380 |
| Soketi (WebSocket) | localhost:6001 |

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@securechat.com` | `admin12345` |
| PDG | `pdg@securechat.com` | `password123` |

---

## 🛠️ Démarrage local (sans Docker)

```bash
cp .env.example .env
composer install
npm install
php artisan key:generate
php artisan migrate --seed
npm run build
php artisan serve
```

---

## 🔄 Mise à jour après modification du front

```bash
git pull origin dockerisation
npm run build
docker compose cp ./public/build/. app:/var/www/html/public/build/
```

Si migrations ajoutées :
```bash
docker compose exec app php artisan migrate
```

---

## 📁 Structure principale

```
securechat/
├── app/
│   ├── Http/Controllers/        # Auth, Message, User, Admin, Notification
│   └── Models/                  # User, Department, Conversation, Message, Notification
├── database/migrations/         # Schéma (users, depts, conv, messages, notifs)
├── resources/
│   ├── js/pages/               # Chat.jsx, Admin.jsx, Login.jsx, Register.jsx
│   ├── js/components/          # AttachmentItem, etc.
│   └── css/app.css             # Thèmes dark/light
├── routes/api.php              # Endpoints REST
├── docker/                     # Config nginx, php-fpm
├── Dockerfile
└── docker-compose.yml
```

---

## 🔌 Endpoints principaux

### Authentification
- `POST /api/register` — inscription
- `POST /api/login` — connexion (retourne token Sanctum)
- `POST /api/logout` — déconnexion

### Messagerie
- `GET /api/conversations` — liste des conversations de l'utilisateur
- `GET /api/conversations/{id}/messages` — messages d'une conversation
- `POST /api/conversations/{id}/messages` — envoi (avec fichiers)
- `POST /api/user/heartbeat` — signalement présence
- `GET /api/users/online` — utilisateurs en ligne

### Notifications
- `GET /api/notifications` — liste
- `POST /api/notifications/{id}/read` — marquer lue
- `POST /api/notifications/read-all` — tout marquer lu

### Admin (rôle `admin` requis)
- `GET /api/admin/stats` — KPI + série 7 jours
- `GET /api/admin/users` · `POST` · `PUT /{id}` · `DELETE /{id}`
- `GET /api/admin/departments` · CRUD
- `GET /api/admin/conversations` — liste supervisée
- `GET /api/admin/conversations/{id}` — détail + 50 derniers messages
- `DELETE /api/admin/conversations/{id}`

---

## 🧪 Tests

```bash
php artisan test
```

---

## 🧰 Commandes utiles

```bash
# Logs applicatifs
docker compose logs -f app

# Shell dans le conteneur app
docker compose exec app bash

# Reset base de données
docker compose exec app php artisan migrate:fresh --seed

# Arrêt complet + suppression volumes
docker compose down -v
```

---

## 📝 Notes

- Le **WebSocket Pusher** est désactivé par défaut (`echo = null`) — le polling HTTP est utilisé pour garantir la compatibilité.
- Pilote MySQL : utiliser `like` (pas `ilike`) dans les recherches.
- L'ENUM `role` inclut : `admin`, `pdg`, `manager`, `employee`.
- Les utilisateurs `admin` sont redirigés automatiquement vers `/admin` depuis `resources/js/app.jsx`.

---

## 👤 Auteur

**Abdoulaye Diallo** — Université de Thiès, Sénégal
Projet académique — 2026

---

## 📄 Licence

Usage académique.
