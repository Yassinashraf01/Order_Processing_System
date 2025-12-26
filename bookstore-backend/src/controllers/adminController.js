// Import database connection
const db = require("../config/db");

// addBook
// Purpose: Add new book with threshold and validation
const addBook = async (req, res) => {
  try {
    const {
      ISBN,
      title,
      publisher_id,
      publication_year,
      selling_price,
      category,
      threshold,
      author_names
    } = req.body;

    // 1️⃣ Required fields (publisher_id is REQUIRED)
    if (!ISBN || !title || !publisher_id || !selling_price || !category) {
      return res.status(400).json({
        error: "Missing required fields: ISBN, title, publisher_id, selling_price, category"
      });
    }

    // 2️⃣ Validate ISBN (13 digits)
    if (!/^\d{13}$/.test(ISBN)) {
      return res.status(400).json({
        error: "ISBN must be exactly 13 digits"
      });
    }

    // 3️⃣ Check ISBN uniqueness
    const [existingBook] = await db.query(
      "SELECT ISBN FROM Books WHERE ISBN = ?",
      [ISBN]
    );
    if (existingBook.length > 0) {
      return res.status(400).json({
        error: "Book with this ISBN already exists"
      });
    }

    // 4️⃣ Validate category
    const validCategories = ['Science', 'Art', 'Religion', 'History', 'Geography'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    // 5️⃣ Validate selling price
    const price = parseFloat(selling_price);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        error: "Selling price must be a positive number"
      });
    }

    // 6️⃣ Validate threshold
    const bookThreshold = parseInt(threshold);

    if (threshold === undefined || threshold === null) {
      return res.status(400).json({
        error: "Threshold is required"
      });
    }

    if (isNaN(bookThreshold) || bookThreshold < 1) {
      return res.status(400).json({
        error: "Threshold must be a positive integer greater than zero"
      });
    }


    // 7️⃣ Validate publisher existence (MANDATORY)
    const [publisher] = await db.query(
      "SELECT publisher_id FROM Publishers WHERE publisher_id = ?",
      [publisher_id]
    );

    if (publisher.length === 0) {
      return res.status(400).json({
        error: "Publisher not found"
      });
    }

    // 8️⃣ Transaction start
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Insert book
      await connection.query(
        `INSERT INTO Books 
         (ISBN, title, publisher_id, publication_year, selling_price, category, quantity_in_stock, threshold)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          ISBN,
          title,
          publisher_id,
          publication_year || null,
          price,
          category,
          bookThreshold
        ]
      );

      // Insert authors if provided
      if (author_names && Array.isArray(author_names) && author_names.length > 0) {
        for (const authorName of author_names) {
          const trimmedName = authorName.trim();
          if (!trimmedName) continue;

          const [existingAuthor] = await connection.query(
            "SELECT author_id FROM Authors WHERE author_name = ?",
            [trimmedName]
          );

          let authorId;
          if (existingAuthor.length > 0) {
            authorId = existingAuthor[0].author_id;
          } else {
            const [newAuthor] = await connection.query(
              "INSERT INTO Authors (author_name) VALUES (?)",
              [trimmedName]
            );
            authorId = newAuthor.insertId;
          }

          await connection.query(
            "INSERT INTO Book_Authors (ISBN, author_id) VALUES (?, ?)",
            [ISBN, authorId]
          );
        }
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Book added successfully",
        book: {
          ISBN,
          title,
          category,
          threshold: bookThreshold,
          initial_stock: 0
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error("Add book error:", error);
    res.status(500).json({
      error: "Failed to add book",
      details: error.message
    });
  }
};
module.exports = { addBook };


// 2. Modify Existing Books 
// Update book quantity (Admin)
// Admin can ONLY decrease quantity (sell books)
// Increasing quantity is ONLY allowed via confirmOrder
const updateBook = async (req, res) => {
  const { ISBN } = req.params;
  const { quantity_in_stock } = req.body;

  try {
    // 1️⃣ Check if book exists and get current data
    const [books] = await db.query(
      "SELECT quantity_in_stock, threshold FROM Books WHERE ISBN = ?",
      [ISBN]
    );

    if (books.length === 0) {
      return res.status(404).json({
        error: "Book not found"
      });
    }

    // 2️⃣ quantity_in_stock must be provided
    if (quantity_in_stock === undefined || quantity_in_stock === null) {
      return res.status(400).json({
        error: "quantity_in_stock is required"
      });
    }

    const newQuantity = parseInt(quantity_in_stock);
    const currentQuantity = books[0].quantity_in_stock;
    const threshold = books[0].threshold;

    // 3️⃣ Validate number
    if (isNaN(newQuantity) || newQuantity < 0) {
      return res.status(400).json({
        error: "Quantity must be zero or a positive number"
      });
    }

    // 4️⃣ ❌ BLOCK ANY MANUAL INCREASE (ALWAYS)
    if (newQuantity > currentQuantity) {
      return res.status(400).json({
        error: "You can't add quantity manually. You must wait for the publisher order and confirm it when it arrives."
      });
    }

    // 5️⃣ ❌ If stock is already below threshold → no selling allowed
    if (currentQuantity < threshold) {
      return res.status(400).json({
        error: `Stock is already below the threshold (${threshold}). You cannot sell more copies. Please wait for the publisher order.`
      });
    }

    // 6️⃣ If no actual change
    if (newQuantity === currentQuantity) {
      return res.status(400).json({
        error: "No change detected in quantity"
      });
    }

    // 7️⃣ Update quantity (this is a SELL operation)
    await db.query(
      "UPDATE Books SET quantity_in_stock = ? WHERE ISBN = ?",
      [newQuantity, ISBN]
    );

    // 8️⃣ Response message
    let message = `Book quantity decreased from ${currentQuantity} to ${newQuantity}.`;

    // If stock crossed threshold → trigger fires automatically
    if (newQuantity < threshold) {
      message += " Stock is now below threshold. An automatic publisher order has been placed.";
    }

    return res.status(200).json({
      success: true,
      message,
      updated: {
        ISBN,
        previous_quantity: currentQuantity,
        new_quantity: newQuantity,
        threshold
      }
    });

  } catch (error) {
    console.error("Update book error:", error);

    // 9️⃣ Trigger safety (negative stock)
    if (
      error.sqlState === '45000' ||
      error.code === 'ER_SIGNAL_EXCEPTION' ||
      error.message.includes('negative stock')
    ) {
      return res.status(400).json({
        error: "Cannot update book: quantity cannot be negative"
      });
    }

    return res.status(500).json({
      error: "Update failed",
      details: error.message
    });
  }
};


// 4. Confirm Orders
// Purpose: Receive quantity and update stock 
const confirmOrder = async (req, res) => {
  const { order_id } = req.params;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Check if order exists and is still Pending
    const [order] = await connection.query(
      "SELECT ISBN, quantity_ordered FROM Orders_From_Publisher WHERE order_id = ? AND status = 'Pending'",
      [order_id]
    );

    if (order.length === 0) {
      return res.status(404).json({ error: "Order not found or already confirmed" });
    }

    const { ISBN, quantity_ordered } = order[0];

    // 2. Automatically add quantity to book's stock 
    await connection.query(
      "UPDATE Books SET quantity_in_stock = quantity_in_stock + ? WHERE ISBN = ?",
      [quantity_ordered, ISBN]
    );

    // 3. Update status to Confirmed
    await connection.query(
      "UPDATE Orders_From_Publisher SET status = 'Confirmed', confirmed_date = NOW() WHERE order_id = ?",
      [order_id]
    );

    await connection.commit();
    res.json({ success: true, message: "Order confirmed and stock updated" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Confirmation failed", details: error.message });
  } finally {
    connection.release();
  }


};

module.exports = { addBook, updateBook, confirmOrder };