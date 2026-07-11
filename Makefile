up:
	docker compose up --build

down:
	docker compose down

restart:
	docker compose down
	docker compose up -d

clean:
	@echo "Stopping services and removing the database volume..."
	docker compose down -v
	@echo "Starting the database to trigger initialization..."
	docker compose up db -d
	@echo "Following database initialization logs..."
	docker compose logs db -f