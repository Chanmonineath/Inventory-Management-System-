# Inventory Management System

Microservices: **API Gateway** (`gateway/`), **Authentication** (`auth/`), **Product** (`product/`), **Supplier** (`supplier/`), **Inventory** (`inventory/`), **Sales** (`sales/`). All six are now in this repo.

## Architecture

```
Client → gateway (4000) → auth (5002)        [no token required]
                         → product (4001)     [Admin, Staff — round robin across 2 instances]
                         → supplier (4002)    [Admin only]
                         → inventory (4003)   [Admin, Staff]
                         → sales (4004)        [Admin, Staff]
                                ↓
                         sales calls inventory directly (PUT /internal/reduce)
                         to reduce stock when a sale is created
```

The gateway verifies the JWT issued by the auth service and enforces role-based access (Admin/Staff) before proxying to each downstream service. `product`, `supplier`, `inventory`, and `sales` also verify the JWT and role themselves (defense in depth), so they're protected even if reached directly, bypassing the gateway.

## Prerequisites

- Node.js 20+ (for running without Docker)
- Docker Desktop + Docker Compose (for running with Docker)
- A MongoDB connection — `auth`, `product`, `supplier`, `inventory`, and `sales` each connect via `MONGO_URI` in their own `.env`

## Environment variables

`gateway/.env`
| Var | Purpose |
|---|---|
| `JWT_SECRET` | Must match every other service's `JWT_SECRET` — used to verify tokens issued by auth |
| `AUTH_SERVICE` | URL of the auth service |
| `PRODUCT_SERVICE_1` / `PRODUCT_SERVICE_2` | Two product service instances for round-robin load balancing |
| `SUPPLIER_SERVICE` / `INVENTORY_SERVICE` / `SALES_SERVICE` | Downstream service URLs |

All of the above point at `EC2-*-IP` placeholders by default (the real deployment target) — for local/Docker testing, override via shell env vars or `docker-compose.yml`'s `environment:` block rather than editing `.env` directly.

`auth/.env`, `product/.env`, `supplier/.env`, `inventory/.env`, `sales/.env`
| Var | Purpose |
|---|---|
| `JWT_SECRET` | Must match the gateway's, used to sign (auth) or verify (everyone else) tokens |
| `MONGO_URI` | MongoDB connection string |
| `PORT` | Listen port (product/supplier only — inventory/sales use `INVENTORY_PORT`/`SALES_PORT`) |
| `INVENTORY_SERVICE_URL` (sales only) | Where sales reaches inventory's internal reduce-stock endpoint; defaults to `http://localhost:4003` |

## Running locally (without Docker)

```bash
# Terminal 1
cd auth && npm install && node authentication_service.js     # :5002

# Terminal 2
cd product && npm install && node product_service.js         # :4001

# Terminal 3
cd supplier && npm install && node supplier_service.js       # :4002

# Terminal 4
cd inventory && npm install && node server.js                # :4003

# Terminal 5
cd sales && npm install && node server.js                    # :4004

# Terminal 6
cd gateway && npm install
PRODUCT_SERVICE_1=http://localhost:4001 PRODUCT_SERVICE_2=http://localhost:4001 \
SUPPLIER_SERVICE=http://localhost:4002 INVENTORY_SERVICE=http://localhost:4003 \
SALES_SERVICE=http://localhost:4004 node api_gateway.js       # :4000
```

(On Windows PowerShell, set each with `$env:NAME="value";` before `node api_gateway.js`.) To see real round-robin behavior locally, run a second product instance on another port (e.g. `PORT=4006 node product_service.js`) and point `PRODUCT_SERVICE_2` at it instead.

## Running with Docker Compose

```bash
docker compose up --build
```

This builds and starts all seven containers (`auth`, `product1`, `product2`, `supplier`, `inventory`, `sales`, `gateway`). Inside the Docker network, services reach each other by service name instead of `localhost` — handled via `environment:` overrides in `docker-compose.yml`, so no `.env` file needs editing to test with Docker. `product1`/`product2` are two containers built from the same `product/` image, giving the gateway's load balancer two real targets to alternate between.

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

**Product** (Admin + Staff)
```
POST   http://localhost:4000/product/addproduct        { "name", "category", "price", "supplierId" }
GET    http://localhost:4000/product/searchproduct?name=...
DELETE http://localhost:4000/product/deleteproduct/:id
```

**Supplier** (Admin only)
```
POST   http://localhost:4000/supplier/addsupplier       { "name", "contact", "address" }
GET    http://localhost:4000/supplier/searchsupplier?name=...
DELETE http://localhost:4000/supplier/deletesupplier/:id
```

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
| Staff token on an Admin-only route (`/supplier`, `/inventory/addstock`, `/sales/deletesale`) | `403 { "message": "Access denied: insufficient role" }` |
| Same checks sent directly to a service's own port, bypassing the gateway | Same `401`/`403` results — each service enforces auth independently |

## Known limitations

- EC2 deployment hasn't been tested — current verification is local and Docker only.
- Inventory's `PUT /internal/reduce` has no auth check at all (by design, for internal service-to-service use), so it's only safe if the inventory service's network access is actually restricted at the infrastructure level.
- `sales/createsale` reduces inventory stock, then creates the Sale record — if the Sale write fails after stock was already reduced, there's no rollback.
- `product`/`supplier`'s `searchproduct`/`searchsupplier` build a `RegExp` directly from the `name` query param with no escaping — a crafted value could throw or behave oddly.
