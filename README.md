# 🛒 Pediritos

A **microservices-based ordering platform** built with **Node.js, TypeScript, and NestJS**.

The project uses a **monorepo architecture** to centralize services and shared libraries, making development, maintenance, standardization, and future scaling easier.

---

## 🏗️ Architecture

Pediritos is composed of multiple microservices, each responsible for a specific business domain.

```text
                         ┌─────────────────┐
                         │    Frontend     │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   API Gateway   │
                         └────────┬────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
      │    Auth     │      │   Catalog   │      │    Order    │
      │   Service   │      │   Service   │      │   Service   │
      └─────────────┘      └─────────────┘      └──────┬──────┘
                                                        │
                         ┌──────────────────────────────┼──────────────┐
                         │                              │              │
                         ▼                              ▼              ▼
                  ┌─────────────┐              ┌─────────────┐ ┌─────────────┐
                  │   Payment   │              │    Stock    │ │Notification │
                  │   Service   │              │   Service   │ │   Service   │
                  └─────────────┘              └─────────────┘ └─────────────┘
```

---

## 📁 Project Structure

```text
pediritos/
│
├── apps/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── catalog-service/
│   ├── order-service/
│   ├── payment-service/
│   ├── stock-service/
│   └── notification-service/
│
├── packages/
│   ├── common/
│   ├── config/
│   ├── logger/
│   ├── messaging/
│   └── contracts/
│
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
└── README.md
```

### Applications

| Service | Responsibility |
|---|---|
| `api-gateway` | Entry point for external requests |
| `auth-service` | Authentication and authorization |
| `catalog-service` | Products, categories, and catalog management |
| `order-service` | Order creation and management |
| `payment-service` | Payment processing |
| `stock-service` | Inventory management |
| `notification-service` | Notification delivery |

### Shared Packages

| Package | Responsibility |
|---|---|
| `common` | Shared utilities and common resources |
| `config` | Shared configuration |
| `logger` | Standardized logging |
| `messaging` | Communication between services |
| `contracts` | Shared DTOs, types, and contracts |

---

## 🚀 Technologies

### Backend

- Node.js
- TypeScript
- NestJS

### Monorepo

- pnpm
- Turborepo

### Infrastructure

- Docker
- Docker Compose
- PostgreSQL
- Redis
- Message Broker

### Code Quality

- ESLint
- Prettier
- Jest
- TypeScript

---

## 📦 Prerequisites

Before running the project, make sure you have the following installed:

- Node.js
- pnpm
- Docker
- Docker Compose
- Git

Check your installed versions:

```bash
node --version
pnpm --version
docker --version
```

---

## ⚙️ Installation

Clone the repository:

```bash
git clone <REPOSITORY_URL>
```

Navigate to the project directory:

```bash
cd pediritos
```

Install dependencies:

```bash
pnpm install
```

---

## 🔧 Configuration

Create the required environment files based on the provided examples:

```text
.env.example
```

Configure the environment variables required by each service.

> Never commit `.env` files containing credentials, secrets, or sensitive information.

---

## ▶️ Running the Project

Start all services in development mode:

```bash
pnpm dev
```

Build all applications and packages:

```bash
pnpm build
```

Run the test suite:

```bash
pnpm test
```

Run ESLint:

```bash
pnpm lint
```

Format the code:

```bash
pnpm format
```

---

## 🧩 Running a Specific Service

You can run an individual service using pnpm filters.

For example:

```bash
pnpm --filter api-gateway dev
```

Or:

```bash
pnpm --filter auth-service dev
```

---

## 🏎️ Turborepo

Pediritos uses **Turborepo** to orchestrate tasks across the monorepo.

Common commands include:

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
```

Turborepo allows tasks to be executed efficiently through:

- Parallel execution
- Task dependency management
- Local caching
- Incremental builds
- Reusing previous task results

This becomes increasingly valuable as the number of applications and packages grows.

---

## 📜 Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start services in development mode |
| `pnpm build` | Build applications and packages |
| `pnpm test` | Run tests |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format the codebase |
| `pnpm install` | Install dependencies |

---

## 🔐 Authentication

Authentication is handled by:

```text
auth-service
```

The service will be responsible for:

- User registration
- User login
- Password hashing
- Token generation
- Authentication validation
- Authorization
- Role-based access control

---

## 🛍️ Order Flow

A simplified order flow looks like this:

```text
Customer
   │
   ▼
API Gateway
   │
   ▼
Order Service
   │
   ├──────────────► Catalog Service
   │
   ├──────────────► Stock Service
   │
   └──────────────► Payment Service
                         │
                         ▼
                      Payment
                         │
                         ▼
                Notification Service
```

Communication between services may be handled through:

- **Synchronous communication**, using HTTP;
- **Asynchronous communication**, using messaging and events.

---

## 🧪 Testing

The project uses automated tests to ensure the reliability and quality of each service.

Run all tests:

```bash
pnpm test
```

Run tests for a specific service:

```bash
pnpm --filter auth-service test
```

New features should include appropriate tests.

---

## 📐 Architecture Principles

The Pediritos project follows these principles:

- Separation of concerns
- SOLID principles
- Clean Code
- Domain-Driven Design (DDD)
- Microservices architecture
- Automated testing
- Strong typing with TypeScript
- Reusable shared packages
- Low coupling between services
- High cohesion within each service

---

## 🌳 Branching Strategy

The project follows a Git branching strategy similar to:

```text
main
 │
 ├── develop
 │    │
 │    ├── feature/auth
 │    ├── feature/catalog
 │    ├── feature/orders
 │    └── feature/payment
 │
 └── hotfix/*
```

Commit messages should follow a consistent convention:

```text
feat: add user registration
fix: correct order validation
refactor: improve payment service
test: add auth service tests
chore: configure turborepo
docs: update README
```

---

## 🔒 Security

The following files and directories should never be committed:

```text
.env
.env.*
*.pem
*.key
secrets/
node_modules/
```

Credentials, tokens, private keys, passwords, and other sensitive information must be managed through environment variables or an appropriate secrets-management solution.

---

## 🗺️ Roadmap

### Phase 1 — Foundation

- [x] Create monorepo
- [x] Configure pnpm
- [x] Configure Turborepo
- [ ] Create microservices
- [ ] Create shared packages
- [ ] Configure TypeScript
- [ ] Configure ESLint
- [ ] Configure Prettier
- [ ] Configure standardized scripts

### Phase 2 — Infrastructure

- [ ] Docker Compose
- [ ] PostgreSQL
- [ ] Redis
- [ ] Message Broker
- [ ] Observability
- [ ] Centralized configuration

### Phase 3 — Authentication

- [ ] User registration
- [ ] Login
- [ ] JWT authentication
- [ ] Refresh tokens
- [ ] Authorization
- [ ] Guards

### Phase 4 — Catalog

- [ ] Products
- [ ] Categories
- [ ] Search
- [ ] Pagination
- [ ] CRUD operations

### Phase 5 — Orders

- [ ] Shopping cart
- [ ] Order creation
- [ ] Order status
- [ ] Order history
- [ ] Domain events

### Phase 6 — Payments

- [ ] Payment gateway integration
- [ ] Payment processing
- [ ] Webhooks
- [ ] Idempotency

### Phase 7 — Inventory

- [ ] Inventory management
- [ ] Product reservation
- [ ] Stock deduction
- [ ] Inventory events

### Phase 8 — Notifications

- [ ] Email notifications
- [ ] Order notifications
- [ ] Event-driven notifications

### Phase 9 — Production

- [ ] CI/CD
- [ ] Containerization
- [ ] Monitoring
- [ ] Centralized logging
- [ ] Metrics
- [ ] Production deployment

---

## 📄 License

This project is currently under development.

The license will be defined at a later stage.

---

## 👨‍💻 Development

Pediritos is a project focused on learning and applying modern software engineering concepts, including:

- Microservices
- Software architecture
- Node.js
- NestJS
- TypeScript
- Monorepos
- Event-driven architecture
- Messaging
- Containers
- Observability
- DevOps