# Database

Auth and Catalog each have a separate Prisma schema, migration history, and logical database. Run `pnpm --filter auth-service db:migrate:deploy` and `pnpm --filter catalog-service db:migrate:deploy` to apply committed migrations. The Auth seed always creates CUSTOMER and ADMIN roles; it creates or updates an administrator only when both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set. The password must contain at least 12 characters and is stored as an Argon2id hash.

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
