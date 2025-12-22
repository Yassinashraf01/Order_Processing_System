const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

//Routes
const adminRoutes = require("./routes/admin");
const bookRoutes = require("./routes/books");
app.use("/api/admin", adminRoutes);
app.use("/api/books", bookRoutes);

// Basic test route
app.get("/", (req, res) => {
  res.json({ 
    message: "Bookstore API is running!",
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bookstore API ready: http://localhost:${PORT}`);
});