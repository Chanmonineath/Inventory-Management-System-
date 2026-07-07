#!/bin/bash
# Helper script to deploy the configured Kubernetes resources.

set -e

echo "Applying shared Kubernetes secrets..."
kubectl apply -f secret.yaml

echo "Deploying Authentication service..."
kubectl apply -f auth-service.yaml
kubectl apply -f auth-deployment.yaml

echo "Deploying API Gateway..."
kubectl apply -f gateway-service.yaml
kubectl apply -f gateway-deployment.yaml

echo "Configuring Ingress rules..."
kubectl apply -f ingress.yaml

echo "Done! Auth and Gateway services have been applied. Please ensure downstream services (Product, Supplier, Inventory, Sales) are configured and deployed."
