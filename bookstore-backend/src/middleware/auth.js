const jwt = require("jsonwebtoken");
const db = require("../config/db"); // ✅ Fixed path (was "./src/config/db")

const authMiddleware = {

    verifyToken: async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ error: "No token provided" });
            }

            const token = authHeader.split(" ")[1];

            // Check if token is blacklisted
            const [rows] = await db.execute(
                "SELECT * FROM blacklisted_tokens WHERE token = ?",
                [token]
            );

            if (rows.length > 0) {
                return res.status(401).json({ error: "Token has been revoked. Please login again." });
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            next();
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: "Token expired. Please login again." });
            }
            return res.status(401).json({ error: "Invalid token" });
        }
    },

    isCustomer: (req, res, next) => {
        if (req.user.role !== "CUSTOMER") {
            return res.status(403).json({ error: "Customer access only" });
        }
        next();
    },

    isAdmin: (req, res, next) => {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "You are not an admin" });
        }
        next();
    }

};

module.exports = authMiddleware;