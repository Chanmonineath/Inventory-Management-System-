const mongoose = require("./dbconnect.js");

const SalesSchema = mongoose.Schema(
  {
    productId: { type: String, required: true },
    quantitySold: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    soldBy: { type: String, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("sales", SalesSchema);
