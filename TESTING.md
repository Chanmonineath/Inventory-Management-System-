# Testing Guide — Inventory Management System (EC2-3)

## Bug Fix: Legacy MongoDB `id_1` Index

### Problem
All four services (product, supplier, inventory, sales) crashed with:
```
E11000 duplicate key error collection: *_db.* index: id_1 dup key: { id: null }
```
The shared MongoDB Atlas cluster had stale unique indexes on a field called `id` (not `_id`). Every document insert without an explicit `id` field collided on `{ id: null }`.

### Fix Applied
Each service now drops the legacy `id_1` index on startup:
```js
mongoose.connection.once("open", () => {
  Model.collection.dropIndex("id_1")
    .then(() => console.log("Dropped legacy id_1 index"))
    .catch(() => {}); // already gone — safe to ignore
});
```
Files modified: `product/product_service.js`, `supplier/supplier_service.js`, `inventory/server.js`, `sales/server.js`

---

## Local Testing (Docker Compose)

### Prerequisites
- Docker Desktop running
- Ports 4000–4006 free

### Quick Start
```bash
cd ~/Desktop/program/ims-project/repo
git checkout staging-test && git pull

# Create .env files (copy from .env.example, fill in real MONGO_URI and JWT_SECRET)
# Then run:
docker compose up --build -d
sleep 12   # wait for MongoDB connections
```

### Automated Test Script
```bash
chmod +x test_all_endpoints.sh
./test_all_endpoints.sh
```
This script tests the full flow: register → login → CRUD on all services → role enforcement → stock reduction.

### Manual Test (curl)

#### 1. Register Admin
```bash
curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"Passw0rd!","role":"Admin"}'
```

#### 2. Login
```bash
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"Passw0rd!"}'
```
Save the returned `token` value. Use it as `Bearer <token>` in all following requests.

#### 3. Add Product
```bash
curl -s -X POST http://localhost:4000/product/addproduct \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Widget","category":"Parts","price":10,"supplierId":"supp-1"}'
```

#### 4. Add Stock
```bash
curl -s -X POST http://localhost:4000/inventory/addstock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"productId":"<product_id>","quantity":100,"warehouseLocation":"WH-A"}'
```

#### 5. Create Sale (reduces stock automatically)
```bash
curl -s -X POST http://localhost:4000/sales/createsale \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"productId":"<product_id>","quantitySold":10,"totalPrice":100}'
```

#### 6. Verify Stock Decreased
```bash
curl -s http://localhost:4000/inventory/viewstock?productId=<product_id> \
  -H "Authorization: Bearer <token>"
```
Expected: `quantity` should now be `90` (was `100`).

#### 7. Teardown
```bash
docker compose down
```

---

## EC2-3 Remote Testing

### Endpoints
| Service   | URL                          |
|-----------|------------------------------|
| Inventory | http://18.232.95.89:4003     |
| Sales     | http://18.232.95.89:4004     |

### Direct Service Test (no gateway)
```bash
# Should return {"message":"No token provided"} — confirms service is alive
curl http://18.232.95.89:4003/viewstock
curl http://18.232.95.89:4004/viewsales

# With a valid Bearer token (obtained from auth service):
curl http://18.232.95.89:4003/viewstock \
  -H "Authorization: Bearer <token>"
```

### Through Gateway (once Member A updates gateway/.env)
Replace `localhost:4000` with the gateway's public IP in all curl commands above.

---

## Verified Test Results (2026-07-07)

### Local Docker Compose — Full Pass ✅

```
=== Registering Admin user ===
Admin Reg response: {"message":"User registered successfully",...}

=== Registering Staff user ===
Staff Reg response: {"message":"User registered successfully",...}

=== Adding Product (Staff should be allowed) ===
Product Add response: {"message":"Product created successfully!","product":{"name":"Super Widget",...}}

=== Adding Supplier as Staff (Should fail - Admin only) ===
Supplier Add (Staff) status code (expected 403): 403 ✅

=== Adding Supplier as Admin (Should succeed) ===
Supplier Add response: {"message":"Supplier created successfully!",...}

=== Adding Stock as Admin (Admin only) ===
Stock Add response: {"message":"Stock added successfully","stock":{"quantity":150,...}}

=== Creating Sale as Staff (Staff allowed) ===
Sale Create response: {"message":"Sale created successfully",...}

=== Stock Reduction Verification ===
Quantity Before: 150 | Quantity After: 120
PASS: Stock correctly reduced! ✅

=== Deleting Sale as Staff (Should fail) ===
Delete Sale (Staff) status code (expected 403): 403 ✅

=== Deleting Sale as Admin (Should succeed) ===
Delete Sale response: {"message":"Sale deleted successfully"} ✅

=== ALL ENDPOINT TESTS PASSED SUCCESSFULLY! ===
```

### Role-Based Access Control Summary

| Action | Admin | Staff | No Token |
|--------|-------|-------|----------|
| Register/Login | ✅ | ✅ | ✅ (no auth needed) |
| Add/Search/Delete Product | ✅ | ✅ | 401 |
| Add/Search/Delete Supplier | ✅ | 403 | 401 |
| Add Stock | ✅ | 403 | 401 |
| View Stock | ✅ | ✅ | 401 |
| Create Sale | ✅ | ✅ | 401 |
| View Sales | ✅ | ✅ | 401 |
| Delete Sale | ✅ | 403 | 401 |

### Inter-Service Communication
- Sales → Inventory `PUT /internal/reduce`: **Working** ✅
- Stock correctly decremented on every sale creation
- No auth on internal route (by design)
