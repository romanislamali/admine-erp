up:
	docker compose --env-file ./backend/.env up --build

down:
	docker compose --env-file ./backend/.env down

restart:
	docker compose --env-file ./backend/.env down
	docker compose --env-file ./backend/.env up -d

clean:
	@echo "Stopping services and removing the database volume..."
	docker compose --env-file ./backend/.env down -v
	@echo "Starting the database to trigger initialization..."
	docker compose --env-file ./backend/.env up db -d
	@echo "Following database initialization logs..."
	docker compose --env-file ./backend/.env logs db -f