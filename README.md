# SecureChat 💬

> **Application de messagerie interne d'entreprise** — Laravel 12 + React 19 + Docker
> Projet académique — Université de Thiès — 2026

---

## ⚡ Démarrage (1 commande)

```bash
docker compose up --build -d
```

Puis ouvrir **http://localhost:8000**.

Tout est automatique : base de données, migrations, comptes de test, build du front.

> 📘 **Évaluateur / Professeur** → lisez **[GUIDE.md](GUIDE.md)** : installation, comptes de test, parcours de test pas à pas.

---

## 🔐 Comptes de test (extrait)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| 🛡️ Admin | `admin@securechat.com` | `admin12345` |
| 👑 PDG | `pdg@securechat.com` | `password123` |
| 👔 Directeur IT | `it@securechat.com` | `password123` |
| 🧑‍💻 Employé (IT) | `mamadou@securechat.com` | `password123` |
| 🧑‍💼 Employé (RH) | `abdou@securechat.com` | `password123` |

👉 **Liste complète** : voir [GUIDE.md](GUIDE.md) ou `database/seeders/DepartmentSeeder.php`

---

## ✨ Fonctionnalités

### 💬 Messagerie
- Authentification sécurisée (Sanctum)
- Conversations privées et de groupe
- **Pièces jointes** (images, PDF, documents)
- **Temps réel** par polling (messages 3 s, liste 5 s)
- **Statut en ligne** (pastille verte)
- Aperçu **style WhatsApp** (nom, heure, dernier message)
- Recherche utilisateurs / filtres département & rôle
- Notifications internes persistées

### 🎨 Interface
- **Mode sombre full black** (style Snapchat, #000 + violet #7c5cff)
- **Mode clair doux** (#f5f5f7)
- Préférence persistée (localStorage)

### 🛡️ Administration (`/admin`)
- **Dashboard** : KPI + graphique 7 jours + répartition rôles/départements
- **Gestion utilisateurs** : CRUD complet
- **Gestion départements** : hiérarchie, codes, membres
- **Supervision conversations** : participants, dernier message, visualisation, suppression

---

## 🧱 Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Laravel 12, Sanctum, Eloquent |
| Frontend | React 19, React Router, TailwindCSS 4, Vite |
| Base de données | MySQL 8 |
| Cache / Queue | Redis 7 |
| Mail (dev) | Mailpit |
| Conteneurs | Docker + Docker Compose |
| Serveur web | Nginx 1.27 |

---

## 📁 Arborescence

```
securechat/
├── app/Http/Controllers/   # Auth, Message, User, Admin, Notification
├── app/Models/             # User, Department, Conversation, Message
├── database/
│   ├── migrations/         # Schéma complet
│   └── seeders/            # Départements + 29 utilisateurs de test
├── resources/
│   ├── js/pages/           # Chat.jsx, Admin.jsx, Login.jsx
│   ├── js/components/
│   └── css/app.css         # Thèmes dark/light
├── routes/api.php          # Endpoints REST
├── docker/
│   ├── entrypoint.sh       # Migrations + seeds auto
│   ├── nginx/
│   └── php/
├── Dockerfile              # Multi-stage (front + PHP)
├── docker-compose.yml      # 5 services
├── GUIDE.md                # 📘 Guide évaluateur
└── README.md
```

---

## 🔌 Endpoints principaux

### Auth
- `POST /api/register` · `POST /api/login` · `POST /api/logout`

### Messagerie
- `GET /api/conversations`
- `GET /api/conversations/{id}/messages`
- `POST /api/conversations/{id}/messages` (avec fichiers)
- `POST /api/user/heartbeat` · `GET /api/users/online`

### Admin (rôle `admin` requis)
- `GET /api/admin/stats`
- `GET|POST|PUT|DELETE /api/admin/users`
- `GET|POST|PUT|DELETE /api/admin/departments`
- `GET|DELETE /api/admin/conversations`

---

## 🛠️ Démarrage sans Docker (développeurs)

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

## 🧪 Tests

```bash
docker compose exec app php artisan test
```

---

## 👤 Auteur

**Abdoulaye Diallo** — Université de Thiès — 2026
`abdoulaye.diallo6@univ-thies.sn`

---

## 📄 Licence

Projet académique — usage éducatif.
