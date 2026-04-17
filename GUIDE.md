# 📘 Guide d'évaluation — SecureChat

Bienvenue. Ce document guide l'évaluateur pour **installer, lancer et tester** l'application en quelques minutes.

---

## 🚀 Installation (une seule commande)

### Prérequis
- **Docker Desktop** (Windows/Mac) ou **Docker Engine + plugin Compose** (Linux)
- 4 Go de RAM disponibles

### Lancement

À la racine du projet (où se trouve `docker-compose.yml`), exécuter :

```bash
docker compose up --build -d
```

> ⏱️ Le premier démarrage prend ~3 à 5 minutes (téléchargement des images + build front + migrations + seeds).
> Les démarrages suivants sont quasi instantanés.

Tout est **automatique** : création de la base, migrations, seed des utilisateurs/départements, build du front. Vous n'avez **rien à faire d'autre**.

### Vérifier que tout est lancé

```bash
docker compose ps
```

Vous devriez voir 5 services `running` :

| Conteneur | Service |
|-----------|---------|
| `securechat_app` | Application Laravel (PHP-FPM) |
| `securechat_nginx` | Serveur web (port **8000**) |
| `securechat_db` | MySQL 8 |
| `securechat_redis` | Cache / sessions |
| `securechat_mailpit` | Boîte mail de test |

### Ouvrir l'application

👉 **http://localhost:8000**

---

## 🔐 Comptes de test

L'application est livrée avec **des utilisateurs pré-créés** pour tester chaque rôle.

> 🔑 Mot de passe commun à tous (sauf admin) : **`password123`**

### 🛡️ Administrateur (gestion plateforme)

| Email | Mot de passe |
|-------|--------------|
| `admin@securechat.com` | `admin12345` |

→ Accès au **tableau de bord d'administration** (`/admin`) : statistiques, gestion utilisateurs, départements, conversations.

### 👔 Direction

| Rôle | Email | Département |
|------|-------|-------------|
| PDG | `pdg@securechat.com` | Direction Générale |
| Directeur Général | `dg@securechat.com` | Direction Générale |
| Directrice RH | `rh@securechat.com` | Ressources Humaines |
| Directeur Financier | `fin@securechat.com` | Finance |
| Directeur SI | `it@securechat.com` | Informatique |
| Directrice Commerciale | `com@securechat.com` | Commercial |
| Directeur Logistique | `log@securechat.com` | Logistique |
| Directrice Juridique | `jur@securechat.com` | Juridique |

### 👷 Chefs de service

| Email | Département |
|-------|-------------|
| `chef.recrutement@securechat.com` | RH |
| `chef.compta@securechat.com` | Finance |
| `chef.dev@securechat.com` | IT |
| `chef.ventes@securechat.com` | Commercial |
| `chef.production@securechat.com` | Logistique |

### 🧑‍💼 Employés (exemples)

| Email | Département | Poste |
|-------|-------------|-------|
| `abdou@securechat.com` | RH | Chargé RH |
| `babacar@securechat.com` | Finance | Comptable |
| `mamadou@securechat.com` | IT | Dev Backend |
| `aminata@securechat.com` | IT | Dev Frontend |
| `lamine@securechat.com` | Commercial | Commercial |
| `rama@securechat.com` | Juridique | Juriste |

> 📋 Liste complète : voir `database/seeders/DepartmentSeeder.php`

---

## 🧪 Parcours de test recommandé

### 1️⃣ Tester l'authentification
1. Ouvrir http://localhost:8000
2. Se connecter avec `admin@securechat.com` / `admin12345`
3. Vous êtes automatiquement redirigé vers `/admin`

### 2️⃣ Tester l'administration
Depuis le compte admin (`/admin`) :
- **Dashboard** : consulter les KPI (utilisateurs, messages, conversations)
- **Utilisateurs** : créer / modifier / supprimer un utilisateur
- **Départements** : voir la hiérarchie, ajouter un département
- **Conversations** : superviser les échanges (lecture des 50 derniers messages)
- Bascule **thème clair / sombre** dans l'en-tête

### 3️⃣ Tester la messagerie
1. Se déconnecter
2. Ouvrir **un autre navigateur** (ou fenêtre privée) et se connecter avec par ex. `mamadou@securechat.com` / `password123`
3. Dans l'onglet 1, reconnectez-vous avec `aminata@securechat.com` / `password123`
4. Lancer une conversation entre les deux → les messages s'affichent en **temps réel** (polling 3 s)
5. Tester :
   - Envoi de **pièce jointe** (icône trombone)
   - **Pastille verte** de présence
   - Aperçu **style WhatsApp** dans la liste des conversations
   - Thème **sombre full black** (Snapchat-like)

### 4️⃣ Tester la hiérarchie (organigramme)
- Se connecter en tant que PDG (`pdg@securechat.com`)
- Consulter l'organigramme complet
- Rechercher un utilisateur par nom / département / rôle

---

## 🔧 Commandes utiles pour l'évaluateur

| Action | Commande |
|--------|----------|
| Voir les logs | `docker compose logs -f app` |
| Shell dans l'app | `docker compose exec app bash` |
| Rejouer les seeds | `docker compose exec app php artisan db:seed --force` |
| Reset complet | `docker compose down -v && docker compose up --build -d` |
| Arrêt simple | `docker compose down` |
| Tests unitaires | `docker compose exec app php artisan test` |

---

## 🌐 Services & Ports

| URL | Usage |
|-----|-------|
| http://localhost:8000 | **Application** |
| http://localhost:8025 | **Mailpit** (tous les emails envoyés arrivent ici) |
| localhost:3307 | MySQL (user: `securechat` / pass: `securechat`) |
| localhost:6380 | Redis |

---

## ❓ Problèmes connus

### Port 8000 déjà utilisé
Modifier dans `docker-compose.yml`, service `nginx` :
```yaml
ports:
  - "8080:80"   # au lieu de 8000:80
```

### Les assets front ne chargent pas
Supprimer le volume et relancer :
```bash
docker compose down -v
docker compose up --build -d
```

### Réinitialiser la base
```bash
docker compose exec app php artisan migrate:fresh --seed
```

---

## 📬 Contact

**Abdoulaye Diallo**
Université de Thiès — 2026
`abdoulaye.diallo6@univ-thies.sn`

---

## ✅ Check-list d'évaluation

- [ ] `docker compose up --build -d` démarre sans erreur
- [ ] http://localhost:8000 affiche la page de connexion
- [ ] Connexion admin → accès au dashboard `/admin`
- [ ] Connexion employé → accès au chat
- [ ] Envoi de message visible sur 2 navigateurs
- [ ] Envoi de pièce jointe fonctionne
- [ ] Bascule thème clair / sombre
- [ ] Admin peut créer/modifier/supprimer un utilisateur
- [ ] Admin peut superviser une conversation
