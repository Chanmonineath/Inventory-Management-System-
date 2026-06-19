const jwt = require("jsonwebtoken");
require("dotenv").config();

function authToken(req, res, next) {
  const header = req?.headers.authorization;
  const token = header && header.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

function authRole(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res
        .status(403)
        .json({ message: "Access denied: insufficient role" });
    next();
  };
}

module.exports = { authToken, authRole };
