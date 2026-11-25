# Development

## Local prerequisites

- Node.js 24
- pnpm 11.25.0 (Corepack reads the pinned version from `package.json`)
- Docker Desktop with the Compose plugin, for infrastructure and container runs

Copy `.env.example` to `.env` for local-only settings. These defaults are for development and are not deployment credentials.

## Commands

```sh
pnpm install
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm format:check
pnpm docker:up
pnpm docker:down
```

`pnpm dev` starts the seven NestJS workspaces. `pnpm docker:up` builds the seven service images and starts those services plus PostgreSQL, Redis, RabbitMQ, and Mailpit. There is no web workspace yet. Docker runtime validation is pending because Docker is not installed in the current development environment.

## Local tools

- API Gateway: `http://localhost:3000`
- Auth: `http://localhost:3001`
- Catalog: `http://localhost:3002`
- Orders: `http://localhost:3003`
- Payments: `http://localhost:3004`
- Stock: `http://localhost:3005`
- Notifications: `http://localhost:3006`
- RabbitMQ management: `http://localhost:15672`
- Mailpit UI: `http://localhost:8025`

Only each service's root readiness greeting exists at this stage. Swagger is not configured yet.
