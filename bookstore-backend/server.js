const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./src/config/db"); // Ensures database connection is established

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Essential for reading Customer registration & checkout data 

// Routes
const adminRoutes = require("./src/routes/admin");
const bookRoutes = require("./src/routes/books");
const customerRoutes = require("./src/routes/customerRoutes"); // Fixed path

app.use("/api/admin", adminRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/customer", customerRoutes);

// Basic test route
app.get("/", (req, res) => {
  res.json({
    message: "Bookstore API is running!",
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.message.includes("negative stock")) {
    res.status(400).json({ error: "Order failed: Not enough copies in stock." });
  } else {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bookstore API ready: http://localhost:${PORT}`);
});