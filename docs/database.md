# Database

PostgreSQL is configured for local development through `docker-compose.yml`. The initialization script creates logical databases:

- `pediritos_auth`
- `pediritos_catalog`
- `pediritos_orders`
- `pediritos_payments`
- `pediritos_stock`
- `pediritos_notifications`

Each service receives only its own database URL. The API Gateway receives the auth database URL only to satisfy the current shared environment schema; it must not query that database and this requirement should be removed when gateway configuration is split from service configuration.

Prisma schemas, migrations, seeds, outbox tables, and processed-event tables have not been created yet. The `db:migrate` and `db:seed` root scripts are placeholders that invoke workspace scripts when those are added.

PostgreSQL data is stored in the `postgres-data` volume. For a fresh initialization, the configured logical databases are created automatically. The init script only runs when PostgreSQL initializes an empty data volume.
