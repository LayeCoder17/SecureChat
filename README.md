# SecureChat

Messagerie interne d'entreprise : conversations privées et de groupe, canaux, pièces jointes et messages en temps réel. Ce que chacun peut voir suit l'**organigramme** de l'entreprise : un employé échange avec son service, un directeur avec sa direction et les directions voisines, la direction générale avec tout le monde.

Backend Laravel 13 (API REST protégée par Sanctum), frontend React 19.

## Fonctionnalités

- **Comptes** : inscription, connexion et déconnexion par jeton ; profil, avatar et changement de mot de passe.
- **Conversations** privées (à deux) ou de groupe. Les messages peuvent être modifiés, supprimés et marqués comme lus.
- **Pièces jointes** jusqu'à 10 Mo par fichier.
- **Canaux** publics, que l'on rejoint et quitte librement, ou privés, sur invitation.
- **Annuaire hiérarchique** : départements, rôles (PDG, directeur, chef de service, employé) et recherche de collègues.
- **Temps réel** : les nouveaux messages arrivent sans recharger la page (Laravel Echo + Pusher).
- **Thème clair ou sombre**, mémorisé par le navigateur.

## Sécurité

- **Contrôle d'accès par appartenance.** Être connecté ne suffit pas : il faut être membre de la conversation pour lire ses messages, télécharger ses pièces jointes ou s'abonner à son flux temps réel. Il faut être membre d'un canal privé pour voir ses détails.
- **Organigramme appliqué côté serveur.** La recherche, les profils et la création de conversations respectent la hiérarchie : on ne peut pas démarrer une conversation avec quelqu'un que l'organigramme ne permet pas de joindre.
- **Messages chiffrés au repos.** Le contenu des messages est chiffré dans la base (AES-256 avec la clé `APP_KEY` de Laravel). Une copie de la base ne suffit donc pas à les lire. Ce n'est **pas** un chiffrement de bout en bout : le serveur, qui détient la clé, peut les déchiffrer.
- **Tests automatisés.** Chaque règle ci-dessus est vérifiée par un test (`tests/Feature/ControleAccesTest.php`).

> ⚠️ Conservez la clé `APP_KEY`. Si elle change, les messages déjà enregistrés deviennent illisibles.

## Stack technique

| Couche | Technologies |
|---|---|
| Backend | PHP 8.4, Laravel 13, Sanctum, diffusion d'événements (Pusher) |
| Frontend | React 19, React Router 7, Tailwind CSS 4, Vite 7, Laravel Echo |
| Base de données | MySQL 8 (Docker) ou SQLite (local) |

## Lancement local

Prérequis : PHP 8.4, Composer, Node.js 22.

```bash
cp .env.example .env
composer install
npm install
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
npm run build
php artisan serve
```

L'application est disponible sur http://localhost:8000.

## Lancement avec Docker

Prérequis : Docker et le plugin Docker Compose.

```bash
# Une seule fois : créer la clé qui chiffre les messages, et la garder
echo "APP_KEY=base64:$(openssl rand -base64 32)" > .env

docker compose up -d --build
docker compose exec app php artisan db:seed --force   # comptes de démonstration
```

L'application est disponible sur http://localhost:8000. La base MySQL est exposée sur le port `3307` de la machine. Les pièces jointes sont conservées dans un volume Docker entre deux redémarrages.

Pour arrêter : `docker compose down`. Pour tout supprimer, base comprise : `docker compose down -v`.

Dans cette configuration, les événements temps réel sont seulement écrits dans le journal (`BROADCAST_CONNECTION=log`). Pour les diffuser, renseignez les variables `PUSHER_*` (voir `.env.example`).

## Comptes de démonstration

`php artisan db:seed` crée une entreprise fictive de 28 comptes répartis dans sept départements : direction générale, ressources humaines, finance, informatique, commercial, logistique et juridique. Exemples :

| Compte | Rôle |
|---|---|
| `pdg@securechat.com` | PDG, voit toute l'entreprise |
| `rh@securechat.com` | Directeur des ressources humaines |
| `mamadou@securechat.com` | Employé du service informatique |

Mot de passe de tous les comptes : `password123`. Ces comptes servent **uniquement** à la démonstration locale : ne lancez jamais le seeder sur une installation réelle.

## Tests

```bash
php artisan test
```
