const mongoose = require("./dbconnect.js");

const InventorySchema = mongoose.Schema(
  {
    productId: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    warehouseLocation: { type: String, required: true },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("inventory", InventorySchema);
