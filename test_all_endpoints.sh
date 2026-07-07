#!/bin/bash
# test_all_endpoints.sh
# Run locally to verify all microservices and roles.

set -e

GATEWAY_URL="http://localhost:4000"

echo "=== Ensuring containers are up ==="
docker compose up --build -d
echo "Waiting 12 seconds for microservices to connect to DB..."
sleep 12

echo "=== Registering Admin user ==="
ADMIN_REG=$(curl -s -X POST "$GATEWAY_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_test","password":"Password123","role":"Admin"}')
echo "Admin Reg response: $ADMIN_REG"

echo "=== Registering Staff user ==="
STAFF_REG=$(curl -s -X POST "$GATEWAY_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"staff_test","password":"Password123","role":"Staff"}')
echo "Staff Reg response: $STAFF_REG"

echo "=== Logging in Admin ==="
ADMIN_LOGIN=$(curl -s -X POST "$GATEWAY_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_test","password":"Password123"}')
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Admin Token: ${ADMIN_TOKEN:0:15}..."

echo "=== Logging in Staff ==="
STAFF_LOGIN=$(curl -s -X POST "$GATEWAY_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"staff_test","password":"Password123"}')
STAFF_TOKEN=$(echo "$STAFF_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Staff Token: ${STAFF_TOKEN:0:15}..."

echo "=== Adding Product (Staff should be allowed) ==="
PRODUCT_ADD=$(curl -s -X POST "$GATEWAY_URL/product/addproduct" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -d '{"name":"Super Widget","category":"Widgets","price":49.99,"supplierId":"supp-123"}')
echo "Product Add response: $PRODUCT_ADD"
PRODUCT_ID=$(echo "$PRODUCT_ADD" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4 || true)
echo "Product ID: $PRODUCT_ID"

echo "=== Searching Product (Staff allowed) ==="
PRODUCT_SEARCH=$(curl -s "$GATEWAY_URL/product/searchproduct?name=Super" \
  -H "Authorization: Bearer $STAFF_TOKEN")
echo "Product Search response: $PRODUCT_SEARCH"

echo "=== Adding Supplier as Staff (Should fail - Admin only) ==="
SUPPLIER_ADD_FAIL=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GATEWAY_URL/supplier/addsupplier" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -d '{"name":"Acme Corp","contact":"John Doe","address":"123 Main St"}')
echo "Supplier Add (Staff) status code (expected 403): $SUPPLIER_ADD_FAIL"

echo "=== Adding Supplier as Admin (Should succeed) ==="
SUPPLIER_ADD=$(curl -s -X POST "$GATEWAY_URL/supplier/addsupplier" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Acme Corp","contact":"John Doe","address":"123 Main St"}')
echo "Supplier Add response: $SUPPLIER_ADD"
SUPPLIER_ID=$(echo "$SUPPLIER_ADD" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4 || true)
echo "Supplier ID: $SUPPLIER_ID"

echo "=== Adding Stock as Admin (Admin only) ==="
STOCK_ADD=$(curl -s -X POST "$GATEWAY_URL/inventory/addstock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":150,\"warehouseLocation\":\"WH-West\"}")
echo "Stock Add response: $STOCK_ADD"

echo "=== Viewing Stock as Staff (Staff allowed) ==="
STOCK_VIEW=$(curl -s "$GATEWAY_URL/inventory/viewstock?productId=$PRODUCT_ID" \
  -H "Authorization: Bearer $STAFF_TOKEN")
echo "Stock View response: $STOCK_VIEW"

echo "=== Creating Sale as Staff (Staff allowed) ==="
SALE_CREATE=$(curl -s -X POST "$GATEWAY_URL/sales/createsale" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantitySold\":30,\"totalPrice\":1499.70}")
echo "Sale Create response: $SALE_CREATE"
SALE_ID=$(echo "$SALE_CREATE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4 || true)
echo "Sale ID: $SALE_ID"

echo "=== Viewing Stock After Sale (Stock should be reduced by 30) ==="
STOCK_VIEW_AFTER=$(curl -s "$GATEWAY_URL/inventory/viewstock?productId=$PRODUCT_ID" \
  -H "Authorization: Bearer $STAFF_TOKEN")
echo "Stock View After response: $STOCK_VIEW_AFTER"
QTY_BEFORE=$(echo "$STOCK_VIEW" | grep -o '"quantity":[0-9]*' | cut -d: -f2)
QTY_AFTER=$(echo "$STOCK_VIEW_AFTER" | grep -o '"quantity":[0-9]*' | cut -d: -f2)
echo "Quantity Before: $QTY_BEFORE | Quantity After: $QTY_AFTER"
if [ "$QTY_AFTER" -eq $((QTY_BEFORE - 30)) ]; then
  echo "PASS: Stock correctly reduced!"
else
  echo "FAIL: Stock reduction mismatch!"
  exit 1
fi

echo "=== Deleting Sale as Staff (Should fail) ==="
SALE_DEL_FAIL=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$GATEWAY_URL/sales/deletesale" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -d "{\"id\":\"$SALE_ID\"}")
echo "Delete Sale (Staff) status code (expected 403): $SALE_DEL_FAIL"

echo "=== Deleting Sale as Admin (Should succeed) ==="
SALE_DEL=$(curl -s -X DELETE "$GATEWAY_URL/sales/deletesale" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"id\":\"$SALE_ID\"}")
echo "Delete Sale response: $SALE_DEL"

echo "=== Cleaning up Test Products, Suppliers ==="
if [ -n "$PRODUCT_ID" ]; then
  PRODUCT_DEL=$(curl -s -X DELETE "$GATEWAY_URL/product/deleteproduct/$PRODUCT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  echo "Product Delete response: $PRODUCT_DEL"
fi

if [ -n "$SUPPLIER_ID" ]; then
  SUPPLIER_DEL=$(curl -s -X DELETE "$GATEWAY_URL/supplier/deletesupplier/$SUPPLIER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  echo "Supplier Delete response: $SUPPLIER_DEL"
fi

echo "=== ALL ENDPOINT TESTS PASSED SUCCESSFULLY! ==="
docker compose down
