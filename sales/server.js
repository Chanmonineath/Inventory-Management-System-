const express = require("express");
const app = express();
const axios = require("axios");
require("dotenv").config();

app.use(express.json());

const Sale = require("./sales_schema.js");
const { authToken, authRole } = require("./auth_middleware.js");

const INVENTORY_SERVICE_URL =
  process.env.INVENTORY_SERVICE_URL || "http://localhost:4003";

// POST /createsale — Admin + Staff
// Inter-service call: checks/reduces stock in Inventory Service before recording the sale
app.post(
  "/createsale",
  authToken,
  authRole(["Admin", "Staff"]),
  async (req, res) => {
    try {
      const { productId, quantitySold, totalPrice } = req.body;

      // Call Inventory Service to reduce stock
      await axios.put(`${INVENTORY_SERVICE_URL}/internal/reduce`, {
        productId,
        quantitySold,
      });

      const sale = await Sale.create({
        productId,
        quantitySold,
        totalPrice,
        soldBy: req.user.userId,
        date: new Date(),
      });
      res.json({ message: "Sale created successfully", sale });
    } catch (err) {
      // Bubble up Inventory Service errors (e.g. insufficient stock) as-is
      if (err.response)
        return res.status(err.response.status).json(err.response.data);
      res.status(500).json({ message: err.message });
    }
  },
);

// GET /viewsales — Admin + Staff
app.get(
  "/viewsales",
  authToken,
  authRole(["Admin", "Staff"]),
  async (req, res) => {
    try {
      const { productId } = req.query;
      const filter = productId ? { productId } : {};
      const sales = await Sale.find(filter);
      res.json(sales);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// DELETE /deletesale — Admin only
app.delete("/deletesale", authToken, authRole(["Admin"]), async (req, res) => {
  try {
    const { id } = req.body;
    const deleted = await Sale.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Sale not found" });
    res.json({ message: "Sale deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.SALES_PORT || 4004;
app.listen(PORT, () => {
  console.log(`Sales Service running on PORT ${PORT}`);
});
