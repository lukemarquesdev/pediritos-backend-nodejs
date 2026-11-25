# Services

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
