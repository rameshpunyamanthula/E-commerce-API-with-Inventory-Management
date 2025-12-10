🚀 E-Commerce API with Inventory Management

A production-ready backend implementing real-time inventory, optimistic locking, Redis caching, job queues, transactional ordering, and background workers.

📌 Table of Contents

Project Overview

Architecture Diagram

ERD (Database Schema)

Cache & Job Queue Flow

Request/Response Full Flow

API Sequence Flow

Tech Stack

Folder Structure

Environment Variables

Setup & Run

API Endpoints

Concurrency & Stress Testing

Screenshots Required

Notes

🧩 Project Overview

This backend system demonstrates:

✅ Core Functionalities

Authentication (JWT)

Role-based access (ADMIN / CUSTOMER)

Product management (CRUD)

Redis Cache-Aside for product listing

Cart system for customers

Transactional order placement

Optimistic locking using version field

Redis job queue (queue:emails)

Background worker sending confirmation emails

Stress testing scripts to simulate high concurrency

The project showcases how to build a robust, fault-tolerant, and scalable API.

🏗 Architecture Diagram

Stored in: docs/architecture.png

![Architecture Diagram](docs/architecture.png)

🗄 ERD (Database Schema)

Stored in: docs/erd.png

![ERD Diagram](docs/erd.png)

🔁 Cache & Job Queue Flow

Stored in: docs/job_queue_flow.png

![Job Queue Flow](docs/job_queue_flow.png)

🔄 Request/Response Full Flow

Stored in: docs/request_response.png

![Request Response Flow](docs/request_response.png)

📜 API Sequence Flow

Stored in: docs/api_sequence.png

![API Sequence Flow](docs/api_sequence.png)

🧰 Tech Stack
Layer	Technology
Backend	Node.js (Express)
Database	PostgreSQL
ORM	Prisma
Cache	Redis
Message Queue	Redis List
Authentication	JWT
Deployment	Docker Compose
Worker	Node.js script
📂 Folder Structure
project/
│  README.md
│  docker-compose.yml
│  package.json
│  .env
│
├─ src/
│  ├─ routes/
│  ├─ controllers/
│  ├─ services/
│  ├─ utils/
│  ├─ workers/
│  └─ index.js
│
├─ prisma/
│  └─ schema.prisma
│
├─ scripts/
│  ├─ run_stress.js
│  ├─ run_stress2.js
│  └─ run_stress2_fixed.js
│
├─ docs/
│  ├─ architecture.png
│  ├─ erd.png
│  ├─ job_queue_flow.png
│  ├─ api_sequence.png
│  └─ request_response.png

🔐 Environment Variables

Create a .env file:

PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce
REDIS_URL=redis://localhost:6379
JWT_SECRET=supersecret

▶ Setup & Run
1. Install dependencies
npm install

2. Start PostgreSQL + Redis
docker-compose up -d

3. Generate Prisma Client
npx prisma generate

4. Apply migrations
npx prisma migrate dev --name init

5. Run API
npm start

📡 API Endpoints
🔐 Auth
Method	Endpoint	Description
POST	/auth/register	Register new user
POST	/auth/login	Login + JWT
📦 Products
Method	Endpoint	Role
GET	/products	Public (cached)
GET	/products/:id	Public
POST	/products	ADMIN
PUT	/products/:id	ADMIN
DELETE	/products/:id	ADMIN
🛒 Cart
Method	Endpoint	Role
POST	/cart/items	CUSTOMER
GET	/cart	CUSTOMER
DELETE	/cart/items/:id	CUSTOMER
🧾 Orders
Method	Endpoint	Role
POST	/orders	CUSTOMER
GET	/orders/:id	CUSTOMER
⚡ Concurrency & Stress Testing

This project includes scripts that simulate high-load concurrent ordering.

Deterministic Test

Admin sets stock to 1

Customer A and B both add product to cart

Both place orders simultaneously

Expected:

One succeeds

One fails (optimistic locking)

Stress Test Script

Run:

node run_stress2_fixed.js


This performs 20 concurrent add + order operations.

🖼 Screenshots Required

Place these in /Screenshots/:

docker-ps.png — Postgres + Redis running

prisma-studio.png — Products table

product-list-cache.png — Cached GET response

create-product.png — Admin product creation

add-to-cart.png — Cart item added

place-order-success.png — Successful order

concurrency-failure.png — Locking failure screenshot

final-product.png — Updated DB row after order

redis-queue.png — Queued email jobs

stress-summary.png — Stress test output

📝 Notes
