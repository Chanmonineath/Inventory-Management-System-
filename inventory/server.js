const express = require("express");
const app = express();
require("dotenv").config();

app.use(express.json());

const Inventory = require("./inventory_schema.js");
const { authToken, authRole } = require("./auth_middleware.js");

// POST /addstock — Admin only
app.post("/addstock", authToken, authRole(["Admin"]), async (req, res) => {
  try {
    const { productId, quantity, warehouseLocation } = req.body;
    const stock = await Inventory.create({
      productId,
      quantity,
      warehouseLocation,
      lastUpdated: new Date(),
    });
    res.json({ message: "Stock added successfully", stock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /viewstock — Admin + Staff
app.get(
  "/viewstock",
  authToken,
  authRole(["Admin", "Staff"]),
  async (req, res) => {
    try {
      const { productId } = req.query;
      const filter = productId ? { productId } : {};
      const stock = await Inventory.find(filter);
      res.json(stock);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// PUT /updatestock — Admin only (also used internally by Sales Service)
app.put("/updatestock", authToken, authRole(["Admin"]), async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const stock = await Inventory.findOneAndUpdate(
      { productId },
      { quantity, lastUpdated: new Date() },
      { new: true },
    );
    if (!stock) return res.status(404).json({ message: "Stock record not found" });
    res.json({ message: "Stock updated successfully", stock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Internal route — no role check, used only by Sales Service to reduce stock
app.put("/internal/reduce", async (req, res) => {
  try {
    const { productId, quantitySold } = req.body;
    const stock = await Inventory.findOne({ productId });
    if (!stock) return res.status(404).json({ message: "Product not in stock" });
    if (stock.quantity < quantitySold)
      return res.status(400).json({ message: "Insufficient stock" });

    stock.quantity -= quantitySold;
    stock.lastUpdated = new Date();
    await stock.save();
    res.json({ message: "Stock reduced successfully", stock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.INVENTORY_PORT || 4003;
app.listen(PORT, () => {
  console.log(`Inventory Service running on PORT ${PORT}`);
});
