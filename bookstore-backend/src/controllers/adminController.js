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

    //Check required fields exist
    if (!ISBN || !title || !selling_price || !category) {
      return res.status(400).json({ 
        error: "Missing required fields: ISBN, title, selling_price, category are required" 
      });
    }

    //Validate ISBN is 13 digits
    if (!/^\d{13}$/.test(ISBN)) {
      return res.status(400).json({ 
        error: "ISBN must be exactly 13 digits" 
      });
    }

    // 2c: Check if ISBN already exists in database
    const [existingBook] = await db.query(
      "SELECT ISBN FROM Books WHERE ISBN = ?", 
      [ISBN]
    );
    if (existingBook.length > 0) {
      return res.status(400).json({ 
        error: "Book with this ISBN already exists" 
      });
    }

    const validCategories = ['Science', 'Art', 'Religion', 'History', 'Geography'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
      });
    }

    const price = parseFloat(selling_price);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ 
        error: "Selling price must be a positive number" 
      });
    }

    const bookThreshold = threshold ? parseInt(threshold) : 10;
    if (bookThreshold < 1) {
      return res.status(400).json({ 
        error: "Threshold must be at least 1" 
      });
    }

    // 2g: Validate publisher exists (if provided)
    if (publisher_id) {
      const [publisher] = await db.query(
        "SELECT publisher_id FROM Publishers WHERE publisher_id = ?", 
        [publisher_id]
      );
      if (publisher.length === 0) {
        return res.status(400).json({ 
          error: "Publisher ID does not exist" 
        });
      }
    }

    //Inserting into the db

    
    const connection = await db.getConnection();
    
    try {
     
      await connection.beginTransaction();

      
      await connection.query(
        `INSERT INTO Books (ISBN, title, publisher_id, publication_year, 
         selling_price, category, quantity_in_stock, threshold) 
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [ISBN, title, publisher_id || null, publication_year || null, 
         price, category, bookThreshold]
      );

      
      if (author_names && Array.isArray(author_names) && author_names.length > 0) {
        for (const authorName of author_names) {
          const trimmedName = authorName.trim();
          if (trimmedName === '') continue;

          //Check if author already exists
          const [existingAuthor] = await connection.query(
            "SELECT author_id FROM Authors WHERE author_name = ?",
            [trimmedName]
          );

          let authorId;
          if (existingAuthor.length > 0) {
            //Use existing author
            authorId = existingAuthor[0].author_id;
          } else {
            //Create new author
            const [newAuthor] = await connection.query(
              "INSERT INTO Authors (author_name) VALUES (?)",
              [trimmedName]
            );
            authorId = newAuthor.insertId;
          }

          //Link 
          await connection.query(
            "INSERT INTO Book_Authors (ISBN, author_id) VALUES (?, ?)",
            [ISBN, authorId]
          );
        }
      }

      //(save everything)
      await connection.commit();
      
      
      res.status(201).json({ 
        success: true, 
        message: "Book added successfully",
        book: {
          ISBN,
          title,
          threshold: bookThreshold, 
          category,
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

//Export the function so other files can use it mm
module.exports = { addBook };


// 2. Modify Existing Books
// Purpose: Update book details or manual stock adjustments [cite: 30, 33, 34]
const updateBook = async (req, res) => {
  const { ISBN } = req.params;
  const { title, selling_price, category, threshold, quantity_in_stock } = req.body;

  try {
    // Requirements state admin must search/find book first [cite: 33]
    const [book] = await db.query("SELECT ISBN FROM Books WHERE ISBN = ?", [ISBN]);
    if (book.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    await db.query(
      `UPDATE Books SET 
        title = COALESCE(?, title), 
        selling_price = COALESCE(?, selling_price), 
        category = COALESCE(?, category), 
        threshold = COALESCE(?, threshold),
        quantity_in_stock = COALESCE(?, quantity_in_stock)
       WHERE ISBN = ?`,
      [title, selling_price, category, threshold, quantity_in_stock, ISBN]
    );

    res.json({ success: true, message: "Book updated successfully" });
  } catch (error) {
    // Catches the 'SIGNAL' from the trigger if stock becomes negative [cite: 35, 36]
    res.status(400).json({ error: "Update failed", details: error.message });
  }
};

// 4. Confirm Orders
// Purpose: Receive quantity and update stock [cite: 42, 43, 44]
const confirmOrder = async (req, res) => {
  const { order_id } = req.params;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Check if order exists and is still Pending [cite: 43]
    const [order] = await connection.query(
      "SELECT ISBN, quantity_ordered FROM Orders_From_Publisher WHERE order_id = ? AND status = 'Pending'", 
      [order_id]
    );

    if (order.length === 0) {
      return res.status(404).json({ error: "Order not found or already confirmed" });
    }

    const { ISBN, quantity_ordered } = order[0];

    // 2. Automatically add quantity to book's stock [cite: 44]
    await connection.query(
      "UPDATE Books SET quantity_in_stock = quantity_in_stock + ? WHERE ISBN = ?",
      [quantity_ordered, ISBN]
    );

    // 3. Update status to Confirmed [cite: 44]
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