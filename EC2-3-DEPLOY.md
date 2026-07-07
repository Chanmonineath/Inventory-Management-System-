# EC2-3 Deployment — Inventory & Sales Services

## Deployed By
- Branch: `staging-test`
- EC2 Instance: `EC2-3-Inventory-Sales` | `i-0b5f6aa3bd863e684` | `t3.micro` | `us-east-1a`
- Public IP: `18.232.95.89`

## Service Endpoints

| Service   | URL                           | Port |
|-----------|-------------------------------|------|
| Inventory | http://18.232.95.89:4003      | 4003 |
| Sales     | http://18.232.95.89:4004      | 4004 |

## Internal Route (Sales → Inventory)
Sales calls Inventory directly (no auth required by design):
```
PUT http://inventory:4003/internal/reduce
```
Both containers share the `ims-net` Docker bridge network.

## Deployment Method
- Docker containers run standalone (not docker-compose) on EC2
- Each service built from its own `Dockerfile`
- `.env` files written to remote host only — never committed

## Gateway Owner Handoff (Member A)

Update your `gateway/.env` with:
```
INVENTORY_SERVICE=http://18.232.95.89:4003
SALES_SERVICE=http://18.232.95.89:4004
```

Ports 4003 and 4004 are open inbound (`0.0.0.0/0`) in the EC2-3 security group.

## Verification
```bash
# Both return {"message":"Invalid token"} — confirms auth middleware + MongoDB connection
curl http://18.232.95.89:4003/viewstock -H "Authorization: Bearer dummy"
curl http://18.232.95.89:4004/viewsales  -H "Authorization: Bearer dummy"
```
