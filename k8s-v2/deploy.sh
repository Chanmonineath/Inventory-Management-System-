#!/bin/bash
# Helper script to deploy the configured Kubernetes resources.

set -e

# Determine secret file to use
SECRET_FILE="secret.yaml"
USE_MOCK=false

# Optimized argument parsing
while [[ $# -gt 0 ]]; do
  case $1 in
    -m|--mock)
      USE_MOCK=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

if [ "$USE_MOCK" = true ]; then
  SECRET_FILE="mock-secret.yaml"
  echo "⚠️ Using mock secrets (mock-secret.yaml)..."
elif [ ! -f "secret.yaml" ]; then
  echo "⚠️ secret.yaml not found. Falling back to mock-secret.yaml..."
  SECRET_FILE="mock-secret.yaml"
  USE_MOCK=true
else
  echo "🔒 Using production secrets (secret.yaml)..."
fi

if [ ! -f "$SECRET_FILE" ]; then
  echo "❌ Error: Neither secret.yaml nor mock-secret.yaml could be found!"
  exit 1
fi

# Deploy database first if in mock mode
if [ "$USE_MOCK" = true ] && [ -f "mock-mongodb.yaml" ]; then
  echo "📦 Deploying mock MongoDB cluster (mock-mongodb.yaml)..."
  kubectl apply -f mock-mongodb.yaml
fi

echo "Applying Kubernetes secrets from $SECRET_FILE..."
kubectl apply -f "$SECRET_FILE"

echo "Deploying Authentication service..."
kubectl apply -f auth-service.yaml
kubectl apply -f auth-deployment.yaml

echo "Deploying API Gateway..."
kubectl apply -f gateway-service.yaml
kubectl apply -f gateway-deployment.yaml

echo "Configuring Ingress rules..."
kubectl apply -f ingress.yaml

echo "Done! Auth, Gateway, and dependencies have been applied using $SECRET_FILE."
