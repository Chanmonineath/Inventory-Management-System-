const schema_mongoose = require("mongoose");

const UserSchema = schema_mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["Admin", "Staff"], default: "Staff" },
  },
  { timestamps: true },
);

module.exports = schema_mongoose.model("users", UserSchema);
