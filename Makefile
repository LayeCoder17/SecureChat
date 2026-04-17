.PHONY: help up down build rebuild logs shell artisan composer npm test fresh clean

help: ## Affiche l'aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Démarre tous les services (detached)
	docker compose up -d
	@echo ""
	@echo "  ✓ App         → http://localhost:8000"
	@echo "  ✓ Mailpit     → http://localhost:8025"
	@echo "  ✓ Soketi      → ws://localhost:6001"
	@echo "  ✓ MySQL       → localhost:3307"
	@echo "  ✓ Redis       → localhost:6379"

down: ## Arrête tous les services
	docker compose down

build: ## Build les images
	docker compose build

rebuild: ## Rebuild sans cache
	docker compose build --no-cache

logs: ## Logs de tous les services (suit)
	docker compose logs -f

logs-app: ## Logs de l'app uniquement
	docker compose logs -f app

shell: ## Shell bash dans le conteneur app
	docker compose exec app bash

artisan: ## Exécute une commande artisan : make artisan cmd="migrate"
	docker compose exec app php artisan $(cmd)

migrate: ## Lance les migrations
	docker compose exec app php artisan migrate

migrate-fresh: ## Recrée la base + migrations + seeds
	docker compose exec app php artisan migrate:fresh --seed

seed: ## Lance les seeders
	docker compose exec app php artisan db:seed

composer: ## Exécute composer : make composer cmd="install"
	docker compose exec app composer $(cmd)

queue: ## Lance un worker de queue
	docker compose exec app php artisan queue:work

test: ## Lance les tests PHPUnit
	docker compose exec app php artisan test

fresh: down ## Reset complet (supprime volumes)
	docker compose down -v
	docker compose up -d --build

clean: ## Nettoie images/volumes orphelins
	docker compose down -v --remove-orphans
	docker image prune -f
