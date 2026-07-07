# Semi-Final Release Notes — EC2-3 Inventory + Sales

## What was done

### Task 1 — Git Identity & Auth
- Configured git user email: 2024088srang@aupp.edu.kh
- Generated ED25519 SSH key and added to GitHub (account: khadana)
- SSH authenticated via port 443 (github.com fallback)

### Task 2 — Repository Cloned
- Cloned https://github.com/Chanmonineath/Inventory-Management-System-.git
- Verified: auth/, inventory/, sales/, product/, supplier/, gateway/, docker-compose.yml

### Task 3 — Branch Created
- Created `staging-test` off `main`
- Pushed to origin as tracking branch

### Task 4 — Local Docker Compose Verification
- Created `.env.example` templates for all 6 microservices (no real secrets committed)
- Ran full Docker Compose smoke test locally (all 7 containers)
- Smoke test sequence: register admin → login → addstock → createsale → viewstock
- Confirmed stock quantity decreased: 100 → 90 after sale on prod-001

### Task 5 — EC2-3 Provisioned (by human)
- Instance: EC2-3-Inventory-Sales | i-0b5f6aa3bd863e684
- Type: t3.micro | Region: us-east-1a | OS: Ubuntu 22.04 LTS
- Ports open: 22 (SSH), 4003, 4004

### Task 6 — Services Deployed on EC2-3
- Installed Docker on EC2, cloned repo to staging-test branch
- Built and ran `inventory-service` on :4003 and `sales-service` on :4004
- Created `ims-net` Docker bridge so sales → inventory internal/reduce works
- Both services connected to MongoDB Atlas
- `.env` files written to remote only, never committed

### Task 7 — Gateway Handoff
- Added EC2-3-DEPLOY.md with gateway owner (Member A) instructions
- Inventory: http://18.232.95.89:4003
- Sales:     http://18.232.95.89:4004

## Pending
- Task 8: E2E test through real gateway (waiting on Member A)
- Task 9: Merge to main (blocked until Task 8 passes)
