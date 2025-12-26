
const db = require("./src/config/db");

async function test() {
  try {
    // Test basic query
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    console.log("✅ Database connected! Result:", rows[0].result);
    
    // Check bookstore_db exists
    const [dbs] = await db.query("SHOW DATABASES LIKE 'bookstore_db'");
    if (dbs.length > 0) {
      console.log("✅ Database 'bookstore_db' exists");
      
      // Check tables
      const [tables] = await db.query("SHOW TABLES FROM bookstore_db");
      console.log("📊 Tables found:", tables.map(t => Object.values(t)[0]));
    } else {
      console.log("❌ Database 'bookstore_db' NOT found");
    }
    // Add this inside your try block to check for your specific Part 2 tables
  const [customerTable] = await db.query("SHOW TABLES LIKE 'Customer_Profiles'");
  if (customerTable.length > 0) {
      console.log("✅ Part 2: 'Customer_Profiles' table is ready!");
  } else {
      console.log("⚠️ Part 2: 'Customer_Profiles' table is missing. Run your SQL script!");
}

const [cartTable] = await db.query("SHOW TABLES LIKE 'Shopping_Cart'");
if (cartTable.length > 0) {
    console.log("✅ Part 2: 'Shopping_Cart' table is ready!");
}
    
  } catch (error) {
    console.error("❌ Database connection FAILED:", error.message);
    console.log("\nCheck these:");
    console.log("1. Is MySQL running in XAMPP?");
    console.log("2. Is password empty in .env?");
    console.log("3. Check .env file content");
  }
}

test();