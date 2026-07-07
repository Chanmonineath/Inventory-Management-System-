# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-07

### Added
- Created `k8s-v2/` containing Kubernetes manifests:
  - `auth-deployment.yaml` and `auth-service.yaml` for Authentication service deployment.
  - `gateway-deployment.yaml` and `gateway-service.yaml` for the API Gateway routing service.
  - `ingress.yaml` to route external traffic on `aupp.com` to the API Gateway.
  - `secret.yaml` for managing common environment secrets (e.g. `JWT_SECRET`).
  - `deploy.sh` script placeholder for deployment automation.

### Git Sync Info (Recent Commits)
- `a2a239b` Merge pull request #2 from Chanmonineath/member-a-k8s-v2
- `8873d32` Add Member A k8s v2: secret, auth, gateway, ingress (no-namespace version)
- `3cb034e` commit changes
- `dd8f875` Remove gateway env override that broke multi-EC2 deployment
- `a911643` updated

### Blockers / Waiting on Team
- **Product, Supplier, Inventory, Sales Teams**: Missing Deployment & Service manifests for downstream microservices.
- **Credentials/Secrets**: Missing production environment secrets and database connection strings (`MONGO_URI`, `JWT_SECRET`) from respective microservice owners.
