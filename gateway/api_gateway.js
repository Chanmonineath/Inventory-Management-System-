const express = require("express");
const app = express();
const httpProxy = require("http-proxy");
const proxy = httpProxy.createProxyServer();
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

// JWT Middleware
function authToken(req, res, next) {
  const header = req?.headers.authorization;
  const token = header && header.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

// Role Middleware
function authRole(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res
        .status(403)
        .json({ message: "Access denied: insufficient role" });
    next();
  };
}

// Load Balancer — Product Service (round-robin)
const productInstances = [
  process.env.PRODUCT_SERVICE_1,
  process.env.PRODUCT_SERVICE_2,
];
let currentIndex = 0;

// Routes
// Auth — no token needed
app.use("/auth", (req, res) => {
  proxy.web(req, res, { target: process.env.AUTH_SERVICE });
});

// Product — Admin + Staff, load balanced
app.use("/product", authToken, authRole(["Admin", "Staff"]), (req, res) => {
  const target = productInstances[currentIndex];
  currentIndex = (currentIndex + 1) % productInstances.length;
  console.log(`Routing /product to: ${target}`);
  proxy.web(req, res, { target });
});

// Supplier — Admin only
app.use("/supplier", authToken, authRole(["Admin"]), (req, res) => {
  proxy.web(req, res, { target: process.env.SUPPLIER_SERVICE });
});

// Inventory — Admin + Staff
app.use("/inventory", authToken, authRole(["Admin", "Staff"]), (req, res) => {
  proxy.web(req, res, { target: process.env.INVENTORY_SERVICE });
});

// Sales — Admin + Staff
app.use("/sales", authToken, authRole(["Admin", "Staff"]), (req, res) => {
  proxy.web(req, res, { target: process.env.SALES_SERVICE });
});

proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err.message);
  if (!res.headersSent) {
    res.status(502).json({ message: "Upstream service unavailable" });
  }
});

app.listen(4000, () => {
  console.log("API Gateway running on PORT 4000");
});
