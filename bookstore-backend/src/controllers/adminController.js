// Import database connection
const db = require("../config/db");

// addBook
// Purpose: Add new book with threshold and validation
const addBook = async (req, res) => {
  try {
    const {
      ISBN,
      Title,
      title,
      Category,
      category,
      PublisherName,
      publisher_name,
      publisher_id,
      PublicationYear,
      publication_year,
      Price,
      selling_price,
      StockQuantity,
      initial_stock,
      threshold,
      Authors,
      author_names
    } = req.body;

    // Map fields from different possible naming conventions (Frontend vs Backend)
    const finalISBN = ISBN;
    const finalTitle = title || Title;
    const finalCategory = category || Category;
    const finalPrice = selling_price || Price;
    const finalYear = publication_year || PublicationYear;
    const finalStock = initial_stock || StockQuantity || 0;
    const finalThreshold = threshold || 10; // Default threshold of 10

    // Handle Authors (string from frontend to array for backend)
    let finalAuthors = author_names || [];
    if (!finalAuthors.length && Authors) {
      finalAuthors = Authors.split(',').map(a => a.trim());
    }

    // 1️⃣ Required fields check
    if (!finalISBN || !finalTitle || !finalCategory || !finalPrice) {
      return res.status(400).json({
        error: "Missing required fields: ISBN, title, price, category"
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 2️⃣ Resolve Publisher
      let finalPublisherId = publisher_id;
      const pubName = publisher_name || PublisherName;

      if (!finalPublisherId && pubName) {
        const [existingPub] = await connection.query(
          "SELECT publisher_id FROM Publishers WHERE name = ?",
          [pubName]
        );

        if (existingPub.length > 0) {
          finalPublisherId = existingPub[0].publisher_id;
        } else {
          // Create new publisher if not found
          const [newPub] = await connection.query(
            "INSERT INTO Publishers (name) VALUES (?)",
            [pubName]
          );
          finalPublisherId = newPub.insertId;
        }
      }

      if (!finalPublisherId) {
        throw new Error("Publisher information is missing (ID or Name required)");
      }

      // 3️⃣ Check ISBN uniqueness
      const [existingBook] = await connection.query(
        "SELECT ISBN FROM Books WHERE ISBN = ?",
        [finalISBN]
      );
      if (existingBook.length > 0) {
        throw new Error("Book with this ISBN already exists");
      }

      // 4️⃣ Insert book
      await connection.query(
        `INSERT INTO Books 
         (ISBN, title, publisher_id, publication_year, selling_price, category, quantity_in_stock, threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalISBN,
          finalTitle,
          finalPublisherId,
          finalYear || null,
          finalPrice,
          finalCategory,
          finalStock,
          finalThreshold
        ]
      );

      // 5️⃣ Insert authors
      if (finalAuthors.length > 0) {
        for (const authorName of finalAuthors) {
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
            [finalISBN, authorId]
          );
        }
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Book added successfully!",
        book: { ISBN: finalISBN, title: finalTitle }
      });

    } catch (error) {
      await connection.rollback();
      return res.status(400).json({ error: error.message });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error("Add book error:", error);
    res.status(500).json({ error: "Internal server error" });
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
        error: "Quantity in stock is less than threshold...Publisher order is waiting for confirmation"
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
      message += " Quantity in stock is less than threshold...Publisher order is waiting for confirmation";
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
// a) Total sales for books in the previous month
const getSalesPreviousMonth = async (req, res) => {
  try {
    const [result] = await db.query(`
      SELECT 
        DATE_FORMAT(sale_date, '%Y-%m') as month,
        COUNT(*) as total_orders,
        SUM(total_price) as total_sales
      FROM Sales
      WHERE YEAR(sale_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND MONTH(sale_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
      GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
    `);

    if (result.length === 0) {
      return res.status(404).json({
        message: "No sales found for previous month"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        month: result[0].month,
        total_orders: result[0].total_orders,
        total_sales: parseFloat(result[0].total_sales)
      }
    });

  } catch (error) {
    console.error("Get previous month sales error:", error);
    return res.status(500).json({
      error: "Failed to get sales data",
      details: error.message
    });
  }
};

// b) Total sales for books on a certain day
const getSalesByDate = async (req, res) => {
  const { date } = req.query; // Format: YYYY-MM-DD

  try {
    if (!date) {
      return res.status(400).json({
        error: "Date is required. Format: YYYY-MM-DD"
      });
    }

    const [result] = await db.query(`
      SELECT 
        ? as sale_day,
        COUNT(*) as total_orders,
        SUM(total_price) as total_sales
      FROM Sales
      WHERE DATE(sale_date) = ?
      GROUP BY DATE(sale_date)
    `, [date, date]);

    if (result.length === 0) {
      return res.status(404).json({
        message: `No sales found for ${date}`
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        date: result[0].sale_day,
        total_orders: result[0].total_orders,
        total_sales: parseFloat(result[0].total_sales)
      }
    });

  } catch (error) {
    console.error("Get sales by date error:", error);
    return res.status(500).json({
      error: "Failed to get sales data",
      details: error.message
    });
  }
};
// c) Top 5 Customers (For the Last 3 Months)
const getTop5Customers = async (req, res) => {
  try {
    const [result] = await db.query(`
      SELECT 
        u.user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(s.sale_id) as total_orders,
        SUM(s.total_price) as total_spent
      FROM Users u
      JOIN Sales s ON u.user_id = s.user_id
      WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      GROUP BY u.user_id, u.username, u.first_name, u.last_name, u.email
      ORDER BY total_spent DESC
      LIMIT 5
    `);

    if (result.length === 0) {
      return res.status(404).json({
        message: "No customer data found for the last 3 months"
      });
    }

    return res.status(200).json({
      success: true,
      data: result.map(customer => ({
        user_id: customer.user_id,
        username: customer.username,
        full_name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        total_orders: customer.total_orders,
        total_spent: parseFloat(customer.total_spent)
      }))
    });

  } catch (error) {
    console.error("Get top 5 customers error:", error);
    return res.status(500).json({
      error: "Failed to get top customers",
      details: error.message
    });
  }
};

// d) Top 10 Selling Books (For the Last 3 Months)
const getTop10Books = async (req, res) => {
  try {
    const [result] = await db.query(`
      SELECT 
        b.ISBN,
        b.title,
        b.category,
        b.selling_price,
        SUM(si.quantity) as total_sold,
        SUM(si.quantity * si.price) as total_revenue
      FROM Books b
      JOIN Sale_Items si ON b.ISBN = si.ISBN
      JOIN Sales s ON si.sale_id = s.sale_id
      WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      GROUP BY b.ISBN, b.title, b.category, b.selling_price
      ORDER BY total_sold DESC
      LIMIT 10
    `);

    if (result.length === 0) {
      return res.status(404).json({
        message: "No sales data found for the last 3 months"
      });
    }

    return res.status(200).json({
      success: true,
      data: result.map(book => ({
        ISBN: book.ISBN,
        title: book.title,
        category: book.category,
        selling_price: parseFloat(book.selling_price),
        total_sold: book.total_sold,
        total_revenue: parseFloat(book.total_revenue)
      }))
    });

  } catch (error) {
    console.error("Get top 10 books error:", error);
    return res.status(500).json({
      error: "Failed to get top selling books",
      details: error.message
    });
  }
};

// e) Total Number of Times a Specific Book Has Been Ordered
const getBookOrderCount = async (req, res) => {
  const { ISBN } = req.params;

  try {
    // Check if book exists
    const [book] = await db.query(
      "SELECT ISBN, title FROM Books WHERE ISBN = ?",
      [ISBN]
    );

    if (book.length === 0) {
      return res.status(404).json({
        error: "Book not found"
      });
    }

    // Count orders from publisher
    const [orderCount] = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(quantity_ordered) as total_quantity_ordered,
        SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_orders
      FROM Orders_From_Publisher
      WHERE ISBN = ?
    `, [ISBN]);

    return res.status(200).json({
      success: true,
      book: {
        ISBN: book[0].ISBN,
        title: book[0].title
      },
      orders: {
        total_orders: orderCount[0].total_orders,
        total_quantity_ordered: orderCount[0].total_quantity_ordered || 0,
        confirmed_orders: orderCount[0].confirmed_orders,
        pending_orders: orderCount[0].pending_orders
      }
    });

  } catch (error) {
    console.error("Get book order count error:", error);
    return res.status(500).json({
      error: "Failed to get order count",
      details: error.message
    });
  }
};

// f) Get all pending publisher orders
const getPendingOrders = async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.order_id, o.ISBN, b.title, o.quantity_ordered, o.order_date
      FROM Orders_From_Publisher o
      JOIN Books b ON o.ISBN = b.ISBN
      WHERE o.status = 'Pending'
      ORDER BY o.order_date DESC
    `);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders", details: error.message });
  }
};

module.exports = {
  addBook,
  updateBook,
  confirmOrder,
  getSalesPreviousMonth,
  getSalesByDate,
  getTop5Customers,
  getTop10Books,
  getBookOrderCount,
  getPendingOrders
};