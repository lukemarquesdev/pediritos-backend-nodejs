# Services

## Auth Service (implemented in Phase 4)

Owns its PostgreSQL schema and Prisma migrations. It provides registration, login, JWT access tokens, rotating refresh tokens, logout, current-user lookup, one-time email verification, password reset, and CUSTOMER/ADMIN role claims. Passwords use Argon2id. Refresh and action tokens are persisted only as SHA-256 hashes. Verification/reset email requests are written to the transactional outbox; the relay publishes them to RabbitMQ for the Notification Service.

Routes: `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/me`, `POST /v1/auth/email/verify`, `POST /v1/auth/password/forgot`, and `POST /v1/auth/password/reset`.

## Catalog Service (implemented in Phase 4)

Owns a separate PostgreSQL schema and Prisma migrations. Public routes list categories, search/filter/paginate products, and fetch product details. Admin routes create, update, and soft-delete categories/products and require an Auth-issued JWT containing the ADMIN role. Money is represented as integer minor units (for example, centavos), never floating point. Availability is currently an editorial catalog flag; inventory integration is part of the Stock/Order phases.

Routes: `GET /v1/catalog/categories`, `GET /v1/catalog/products`, `GET /v1/catalog/products/:slug`, and `/v1/admin/catalog/{categories,products}` CRUD routes.

| Workspace              | Ownership                                    | Local host port | Current state                                |
| ---------------------- | -------------------------------------------- | --------------: | -------------------------------------------- |
| `api-gateway`          | Public API entry point, auth and routing     |            3000 | Nest scaffold; shared environment validation |
| `auth-service`         | Users, credentials, roles and sessions       |            3001 | Nest scaffold                                |
| `catalog-service`      | Products, categories, price and availability |            3002 | Nest scaffold                                |
| `order-service`        | Orders, order items and saga state           |            3003 | Nest scaffold                                |
| `payment-service`      | Payment attempts and provider abstraction    |            3004 | Nest scaffold                                |
| `stock-service`        | Inventory, reservations and movements        |            3005 | Nest scaffold                                |
| `notification-service` | Event-driven email delivery                  |            3006 | Nest scaffold                                |
| `web`                  | Customer and administrator UI                |               — | Not created yet                              |

The current HTTP route in each scaffold is `GET /`, returning a readiness greeting. Business APIs, authorization, database access, Swagger, and domain migrations are not implemented yet.

Each backend listens on port 3000 inside Compose and is mapped to its host port from `.env`. The API Gateway is the intended public entry point. Direct service ports are exposed for local development only.
