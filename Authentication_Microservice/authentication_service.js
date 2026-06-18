const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const UserModel = require("./people_schema.js");
const dbconnect = require("./dbconnect.js");

// POST /register
app.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ username, passwordHash, role });
    res.json({ message: "User registered successfully", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await UserModel.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(5002, () => {
  console.log("Authentication Service running on PORT 5002");
});
