.PHONY: help up down build rebuild logs logs-app shell artisan migrate migrate-fresh seed composer queue test fresh clean

# Détection auto : docker compose (v2) ou docker-compose (v1)
DC := $(shell docker compose version >/dev/null 2>&1 && echo 'docker compose' || echo 'docker-compose')

help: ## Affiche l'aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Démarre tous les services (detached)
	$(DC) up -d
	@echo ""
	@echo "  ✓ App         → http://localhost:8000"
	@echo "  ✓ Mailpit     → http://localhost:8025"
	@echo "  ✓ Soketi      → ws://localhost:6001"
	@echo "  ✓ MySQL       → localhost:3307"
	@echo "  ✓ Redis       → localhost:6379"

down: ## Arrête tous les services
	$(DC) down

build: ## Build les images
	$(DC) build

rebuild: ## Rebuild sans cache
	$(DC) build --no-cache

logs: ## Logs de tous les services (suit)
	$(DC) logs -f

logs-app: ## Logs de l'app uniquement
	$(DC) logs -f app

shell: ## Shell bash dans le conteneur app
	$(DC) exec app bash

artisan: ## Exécute une commande artisan : make artisan cmd="migrate"
	$(DC) exec app php artisan $(cmd)

migrate: ## Lance les migrations
	$(DC) exec app php artisan migrate

migrate-fresh: ## Recrée la base + migrations + seeds
	$(DC) exec app php artisan migrate:fresh --seed

seed: ## Lance les seeders
	$(DC) exec app php artisan db:seed

composer: ## Exécute composer : make composer cmd="install"
	$(DC) exec app composer $(cmd)

queue: ## Lance un worker de queue
	$(DC) exec app php artisan queue:work

test: ## Lance les tests PHPUnit
	$(DC) exec app php artisan test

fresh: ## Reset complet (supprime volumes)
	$(DC) down -v
	$(DC) up -d --build

clean: ## Nettoie images/volumes orphelins
	$(DC) down -v --remove-orphans
	docker image prune -f
