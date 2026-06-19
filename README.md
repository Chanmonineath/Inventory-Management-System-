# Inventory Management System — API Gateway & Authentication

This covers the **API Gateway** and **Authentication** microservices (`gateway/` and `auth/`). The Product, Supplier, Inventory, and Sales services are owned by other team members and are not part of this repo yet — `gateway/.env` points to their placeholder addresses.

## Architecture

```
Client → gateway (4000) → auth (5002)          [no token required]
                         → product (EC2-2/3)   [Admin, Staff — round robin]
                         → supplier (EC2-2)     [Admin only]
                         → inventory (EC2-3)    [Admin, Staff]
                         → sales (EC2-3)        [Admin, Staff]
```

The gateway verifies the JWT issued by the auth service and enforces role-based access (Admin/Staff) before proxying to each downstream service.

## Prerequisites

- Node.js 20+ (for running without Docker)
- Docker Desktop + Docker Compose (for running with Docker)
- A MongoDB connection (the auth service currently points at a MongoDB Atlas cluster — see `auth/dbconnect.js`)

## Environment variables

`gateway/.env`
| Var | Purpose |
|---|---|
| `JWT_SECRET` | Must match `auth/.env`'s `JWT_SECRET` — used to verify tokens issued by auth |
| `AUTH_SERVICE` | URL of the auth service |
| `PRODUCT_SERVICE_1` / `PRODUCT_SERVICE_2` | Product service instances for round-robin load balancing |
| `SUPPLIER_SERVICE` / `INVENTORY_SERVICE` / `SALES_SERVICE` | Downstream service URLs |

`auth/.env`
| Var | Purpose |
|---|---|
| `JWT_SECRET` | Used to sign tokens on login |

## Running locally (without Docker)

```bash
# Terminal 1
cd auth
npm install
node authentication_service.js   # listens on :5002

# Terminal 2
cd gateway
npm install
node api_gateway.js              # listens on :4000
```

## Running with Docker Compose

```bash
docker compose up --build
```

This builds and starts both services:
- `auth` on `localhost:5002`
- `gateway` on `localhost:4000`

Inside the Docker network, the gateway reaches auth at `http://auth:5002` (overridden via `docker-compose.yml`, since `localhost` doesn't work across containers). `PRODUCT_SERVICE_1/2`, `SUPPLIER_SERVICE`, `INVENTORY_SERVICE`, and `SALES_SERVICE` still point at the placeholder EC2 addresses in `gateway/.env` until those services are deployed.

Stop with `docker compose down`.

## Testing with Postman

All requests go through the gateway on port **4000**.

**Register**
```
POST http://localhost:4000/auth/register
Content-Type: application/json

{ "username": "admin1", "password": "Passw0rd!", "role": "Admin" }
```

**Login**
```
POST http://localhost:4000/auth/login
Content-Type: application/json

{ "username": "admin1", "password": "Passw0rd!" }
```
Response: `{ "token": "<JWT>" }`. Use it as `Authorization: Bearer <token>` on protected routes.

**Role enforcement checks**
| Request | Expected |
|---|---|
| No `Authorization` header on `/inventory`, `/product`, `/supplier`, `/sales` | `401 { "message": "No token provided" }` |
| Invalid/garbage token | `403 { "message": "Invalid token" }` |
| Valid Staff token on `/supplier` (Admin-only) | `403 { "message": "Access denied: insufficient role" }` |
| Valid Admin/Staff token on `/product`, `/inventory`, `/sales` | Proxies to the downstream service (will fail until those services are deployed) |

## Known limitations

- Product, Supplier, Inventory, and Sales services aren't implemented in this repo yet, so `/product`, `/supplier`, `/inventory`, `/sales` can't be fully tested end-to-end until they're deployed.
- `auth/dbconnect.js` has the MongoDB Atlas connection string hardcoded rather than read from `.env`.
- The gateway's proxy calls don't have a `proxy.on("error", ...)` handler, so a request to a route whose backend isn't reachable can crash the gateway process rather than returning a clean error.
