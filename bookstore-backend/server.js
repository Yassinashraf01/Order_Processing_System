const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./src/config/db"); // Ensures database connection is established

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Essential for reading Customer registration & checkout data 
app.use(express.urlencoded({ extended: true })); // For form data parsing

// Routes
const adminRoutes = require("./src/routes/admin");
const bookRoutes = require("./src/routes/books");
const customerRoutes = require("./src/routes/customerRoutes");

app.use("/api/admin", adminRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/customer", customerRoutes);

// Basic test route
app.get("/", (req, res) => {
  res.json({
    message: "Bookstore API is running!",
    status: "OK",
    timestamp: new Date().toISOString(),
    endpoints: {
      admin: "/api/admin",
      books: "/api/books",
      customer: "/api/customer"
    }
  });
});

// 404 handler - Must be AFTER all routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});

// Error handling middleware - Must be LAST
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.message.includes("negative stock")) {
    return res.status(400).json({ error: "Order failed: Not enough copies in stock." });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired. Please login again." });
  }

  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Bookstore API ready: http://localhost:${PORT}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📍 Available endpoints:`);
  console.log(`   Admin:    http://localhost:${PORT}/api/admin`);
  console.log(`   Books:    http://localhost:${PORT}/api/books`);
  console.log(`   Customer: http://localhost:${PORT}/api/customer`);
  console.log(`\n✅ Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Closing HTTP server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 SIGINT received. Closing HTTP server...');
  process.exit(0);
});