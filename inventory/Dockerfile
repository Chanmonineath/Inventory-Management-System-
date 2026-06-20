# ---- Base image ----
FROM node:20-alpine

# ---- Working directory inside the container ----
WORKDIR /app

# ---- Install dependencies first (better layer caching) ----
COPY package*.json ./
RUN npm install --omit=dev

# ---- Copy the rest of the service source ----
COPY . .

# ---- Inventory service listens on this port (matches INVENTORY_PORT in .env) ----
EXPOSE 4003

# ---- Start the service ----
CMD ["node", "server.js"]
