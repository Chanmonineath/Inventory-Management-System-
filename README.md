# Inventory Management System

Microservices: **API Gateway** (`gateway/`), **Authentication** (`auth/`), **Inventory** (`inventory/`), **Sales** (`sales/`). Product and Supplier services are owned by other team members and aren't part of this repo yet — `gateway/.env` points at placeholder EC2 addresses for those.

## Architecture

```
Client → gateway (4000) → auth (5002)          [no token required]
                         → product (EC2-2/3)   [Admin, Staff — round robin]   [not yet implemented]
                         → supplier (EC2-2)     [Admin only]                  [not yet implemented]
                         → inventory (4003)     [Admin, Staff]
                         → sales (4004)          [Admin, Staff]
                                ↓
                         sales calls inventory directly (PUT /internal/reduce)
                         to reduce stock when a sale is created
```

The gateway verifies the JWT issued by the auth service and enforces role-based access (Admin/Staff) before proxying to each downstream service.

## Prerequisites

- Node.js 20+ (for running without Docker)
- Docker Desktop + Docker Compose (for running with Docker)
- A MongoDB connection — `auth`, `inventory`, and `sales` each connect to MongoDB via `MONGO_URI` in their own `.env`

## Environment variables

`gateway/.env`
| Var | Purpose |
|---|---|
| `JWT_SECRET` | Must match `auth/.env`'s `JWT_SECRET` — used to verify tokens issued by auth |
| `AUTH_SERVICE` | URL of the auth service |
| `PRODUCT_SERVICE_1` / `PRODUCT_SERVICE_2` | Product service instances for round-robin load balancing (not yet deployed) |
| `SUPPLIER_SERVICE` | Supplier service URL (not yet deployed) |
| `INVENTORY_SERVICE` / `SALES_SERVICE` | Inventory and Sales service URLs — point at `EC2-*-IP` placeholders by default; override to `localhost`/Docker service names for local/Docker testing (see below) |

`auth/.env`, `inventory/.env`, `sales/.env`
| Var | Purpose |
|---|---|
| `JWT_SECRET` | Must match the gateway's, used to sign (auth) or verify (inventory/sales) tokens |
| `MONGO_URI` | MongoDB connection string |
| `INVENTORY_SERVICE_URL` (sales only) | Where sales reaches inventory's internal reduce-stock endpoint; defaults to `http://localhost:4003` |

## Running locally (without Docker)

`gateway/.env` ships with `INVENTORY_SERVICE`/`SALES_SERVICE` pointed at EC2 placeholders, since that's the real deployment target. For local testing on one machine, override them to `localhost` when starting the gateway:

```bash
# Terminal 1
cd auth && npm install && node authentication_service.js     # :5002

# Terminal 2
cd inventory && npm install && node server.js                # :4003

# Terminal 3
cd sales && npm install && node server.js                    # :4004

# Terminal 4
cd gateway && npm install
INVENTORY_SERVICE=http://localhost:4003 SALES_SERVICE=http://localhost:4004 node api_gateway.js   # :4000
```

(On Windows PowerShell: `$env:INVENTORY_SERVICE="http://localhost:4003"; $env:SALES_SERVICE="http://localhost:4004"; node api_gateway.js`)

## Running with Docker Compose

```bash
docker compose up --build
```

This builds and starts all four services. Inside the Docker network, services reach each other by service name instead of `localhost` — this is handled via `environment:` overrides in `docker-compose.yml` (`AUTH_SERVICE=http://auth:5002`, `INVENTORY_SERVICE=http://inventory:4003`, `SALES_SERVICE=http://sales:4004`, `INVENTORY_SERVICE_URL=http://inventory:4003`), so no `.env` file needs editing to test with Docker.

`PRODUCT_SERVICE_1/2` and `SUPPLIER_SERVICE` still point at placeholder EC2 addresses until those services exist.

Stop with `docker compose down`.

## Testing with Postman

All requests go through the gateway on port **4000**.

**Register / Login**
```
POST http://localhost:4000/auth/register
{ "username": "admin1", "password": "Passw0rd!", "role": "Admin" }

POST http://localhost:4000/auth/login
{ "username": "admin1", "password": "Passw0rd!" }
```
Response: `{ "token": "<JWT>" }`. Use it as `Authorization: Bearer <token>` on protected routes.

**Inventory** (Admin unless noted)
```
POST   http://localhost:4000/inventory/addstock      { "productId", "quantity", "warehouseLocation" }
GET    http://localhost:4000/inventory/viewstock?productId=...   (Admin + Staff)
PUT    http://localhost:4000/inventory/updatestock    { "productId", "quantity" }
```

**Sales** (Admin + Staff unless noted)
```
POST   http://localhost:4000/sales/createsale   { "productId", "quantitySold", "totalPrice" }
GET    http://localhost:4000/sales/viewsales?productId=...
DELETE http://localhost:4000/sales/deletesale   { "id" }   (Admin only)
```
`createsale` calls inventory's internal reduce-stock endpoint first, so stock quantity should visibly drop after each sale.

**Role enforcement checks**
| Request | Expected |
|---|---|
| No `Authorization` header | `401 { "message": "No token provided" }` |
| Invalid/garbage token | `403 { "message": "Invalid token" }` |
| Staff token on Admin-only route (`/supplier`, `/inventory/addstock`, `/sales/deletesale`) | `403 { "message": "Access denied: insufficient role" }` |

## Known limitations

- Product and Supplier services aren't implemented in this repo yet, so `/product` and `/supplier` can't be tested end-to-end.
- EC2 deployment hasn't been tested — current verification is local and Docker only.
- Inventory's `PUT /internal/reduce` has no auth check at all (by design, for internal service-to-service use), so it's only safe if the inventory service's network access is actually restricted at the infrastructure level.
- `sales/createsale` reduces inventory stock, then creates the Sale record — if the Sale write fails after stock was already reduced, there's no rollback.
