const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']); // Forces Cloudflare and Google DNS

const mongoose = require("mongoose");
require("dotenv").config();

const uri = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
}
run();

module.exports = mongoose;
