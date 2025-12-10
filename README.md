# E‑Commerce API with Inventory Management

> Backend project implementing product catalog, real-time inventory, optimistic locking, transactional order placement, Redis caching, and background job queueing.

---

## Project overview

This project provides a REST API for an e-commerce backend that demonstrates: transactional order processing, optimistic locking to avoid oversell, cache-aside product listing using Redis, JWT-based auth with ADMIN/CUSTOMER roles, and an asynchronous job queue (Redis list) for background tasks (order confirmation emails).

Key features:

* JWT auth (REGISTER / LOGIN) with ADMIN and CUSTOMER roles
* Admin product CRUD with cache invalidation
* Public product listing with cache-aside pattern and filtering/sorting
* Customer cart endpoints
* Transactional order placement with optimistic locking (product `version` field)
* Background job enqueuing to Redis (`queue:emails`)
* Scripts for concurrency & stress testing

---

## Architecture (Mermaid)

```mermaid
flowchart LR
  Client -->|HTTP| API[Express API]
  subgraph API Layer
    API --> Controllers
    Controllers --> Services
    Services --> Repositories
  end
  Repositories -->|SQL| Postgres[(PostgreSQL)]
  Controllers -->|cache| Redis[(Redis)]
  Redis -->|queue| Worker[Worker Process]
  Worker -->|send email| SMTP[SMTP / Email Service]

  style API fill:#f9f,stroke:#333,stroke-width:1px
```

> You can copy the mermaid block into any mermaid renderer (e.g., VS Code mermaid preview or Mermaid Live Editor) to export PNG/SVG.

---

## ERD (Mermaid)

```mermaid
erDiagram
  USERS ||--o{ CARTS : has
  USERS ||--o{ ORDERS : places
  CARTS ||--o{ CART_ITEMS : contains
  ORDERS ||--o{ ORDER_ITEMS : contains
  PRODUCTS ||--o{ CART_ITEMS : referenced
  PRODUCTS ||--o{ ORDER_ITEMS : referenced

  USERS {
    int id PK
    string email
    string passwordHash
    string role
    datetime createdAt
  }
  PRODUCTS {
    int id PK
    string name
    string description
    string category
    decimal price
    int stockQuantity
    int version
    datetime createdAt
    datetime updatedAt
  }
  CARTS {
    int id PK
    int userId FK
    datetime updatedAt
  }
  CART_ITEMS {
    int id PK
    int cartId FK
    int productId FK
    int quantity
  }
  ORDERS {
    int id PK
    int userId FK
    decimal totalAmount
    string status
    datetime createdAt
  }
  ORDER_ITEMS {
    int id PK
    int orderId FK
    int productId FK
    int quantity
    decimal priceSnapshot
  }
```

---

## File / Code Organization

* `src/index.js` - app bootstrap, middleware, routes
* `src/routes/*` - express routes
* `src/controllers/*` - controllers (HTTP layer)
* `src/services/*` - business logic (if present)
* `src/utils/*` - helpers (redis client, jwt, etc.)
* `prisma/schema.prisma` - DB schema
* `docker-compose.yml` - Postgres + Redis
* `run_stress2_fixed.js`, `run_stress.js` - stress test scripts

---

## Environment variables

Create a `.env` file in project root with the following (example values):

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce
REDIS_URL=redis://localhost:6379
JWT_SECRET=change_this_secret
```

> Update `DATABASE_URL` and `REDIS_URL` to match your docker-compose or hosting environment.

---

## Docker (local dev)

`docker-compose.yml` should start:

* `postgres:15` (port 5432)
* `redis:7` (port 6379)

Example:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ecommerce
    ports:
      - 5432:5432
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - 6379:6379

volumes:
  pgdata:
```

---

## Setup & Run (development)

1. Install dependencies

```bash
npm install
```

2. Generate Prisma client (if you change schema)

```bash
npx prisma generate
```

3. Run database migrations (if you have migrations)

```bash
npx prisma migrate dev --name init
```

4. Start Docker containers (Postgres + Redis)

```bash
docker-compose up -d
```

5. Start server (nodemon recommended)

```bash
npx nodemon src/index.js
# or
node src/index.js
```

---

## API Endpoints (summary)

### Auth

* `POST /auth/register` — body: `{ email, password }`
* `POST /auth/login` — body: `{ email, password }` — returns `{ token }`

### Products

* `GET /products` — public, supports `?category=&sort=price_asc|price_desc&page=&limit=` (cache-aside)
* `GET /products/:id` — public
* `POST /products` — ADMIN only — create product
* `PUT /products/:id` — ADMIN only — update product (invalidates cache)
* `DELETE /products/:id` — ADMIN only — delete product (invalidates cache)

### Cart (CUSTOMER)

* `POST /cart/items` — add `{ productId, quantity }`
* `GET /cart` — view cart
* `DELETE /cart/items/:id` — remove item

### Orders (CUSTOMER)

* `POST /orders` — place order from cart (transactional)
* `GET /orders/:id` — get order details

---

## Testing (important flows)

### Manual happy path

1. Register/login as admin — create products
2. Register/login as customer — add to cart, place order
3. Check `GET /products` for cache hits
4. `node checkProduct.js` to inspect DB row

### Concurrency test (deterministic)

1. Set product stock to `1` as admin
2. Add same product to cart for customer A and B
3. In two terminals, run `POST /orders` for each token at (nearly) the same time

   * One should succeed, the other should fail with a concurrent update/insufficient stock error

### Stress test (fast)

* Use `run_stress2_fixed.js` (already in repo) to run `N` parallel add+order attempts (script uses your tokens). Example:

```bash
node run_stress2_fixed.js
```

---

## Background worker (example)

A small worker that consumes `queue:emails` from Redis and sends emails (or logs them) is recommended. Basic pseudo-code:

```js
const { redis } = require('./src/utils/redisClient');
(async function worker(){
  while(true){
    const job = await redis.rpop('queue:emails');
    if(!job){ await sleep(1000); continue; }
    const payload = JSON.parse(job);
    // send email (or simulate)
    console.log('Send email for order', payload.orderId);
  }
})();
```

---

## Screenshots checklist (exact images to capture for submission)

Capture these in this order (filenames suggested):

1. `docker-ps.png` — `docker ps` showing Postgres + Redis containers running
2. `prisma-studio.png` — Prisma Studio showing products table (or `psql` result)
3. `product-list-cache.png` — `curl /products` returning `source: cache` and a cached JSON
4. `create-product.png` — admin `POST /products` response (product created)
5. `add-to-cart.png` — `POST /cart/items` (customer) response
6. `place-order-success.png` — successful `POST /orders` response (201)
7. `concurrency-failure.png` — the failing `POST /orders` showing concurrent update/insufficient stock error (500/409)
8. `final-product.png` — `node checkProduct.js` output showing final `stockQuantity` and `version`
9. `redis-queue.png` — `node ... redis.lrange('queue:emails',0,200)` output
10. `stress-summary.png` — `run_stress2_fixed.js` summary output

> Use high-resolution screenshots. For CLI screenshots, use `cmd`/`terminal` with larger font and include the full command and output.

---

## How to push to GitHub (quick)

```bash
git add .
git commit -m "E-commerce API with inventory, optimistic locking, Redis cache and queue"
git branch -M main
git remote add origin <your_repo_url>
git push -u origin main
```

---

## Notes & Production considerations

* Use a real email provider or transactional email service for production jobs (SendGrid, SES, etc.)
* For high-throughput, consider shifting to row-level SELECT FOR UPDATE or using a queuing mechanism to serialize inventory updates per product
* Add monitoring and metrics for queue length and failed transactions
* Harden JWT secret and rotate keys in production

---

## Contact / Support

If you want, I can:

* generate `architecture.png` and `erd.png` (Mermaid -> export instructions)
* prepare the final `README.md` file commit and push commands
* create the worker file and a sample `Dockerfile` for the worker

Say one of: `EXPORT_DIAGRAMS`, `COMMIT_README`, `CREATE_WORKER`, or `ALL_ARTIFACTS` and I’ll do the next single action.
