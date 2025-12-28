// Import database connection
const db = require("../config/db");

// ==========================================
// Global Search (Title, ISBN, Author)
// ==========================================
const globalSearch = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({
                error: "Search query is required"
            });
        }

        const [books] = await db.query(
            `SELECT 
        b.ISBN,
        b.title,
        b.publication_year,
        b.selling_price,
        b.category,
        b.quantity_in_stock,
        p.name AS publisher_name,
        GROUP_CONCAT(a.author_name SEPARATOR ', ') AS authors,
        CASE 
          WHEN b.quantity_in_stock > 0 THEN 'Available'
          ELSE 'Out of Stock'
        END AS availability
      FROM Books b
      LEFT JOIN Publishers p ON b.publisher_id = p.publisher_id
      LEFT JOIN Book_Authors ba ON b.ISBN = ba.ISBN
      LEFT JOIN Authors a ON ba.author_id = a.author_id
      WHERE b.title LIKE ? OR b.ISBN LIKE ? OR a.author_name LIKE ? OR p.name LIKE ? OR b.category LIKE ?
      GROUP BY b.ISBN, b.title, b.publication_year, b.selling_price, 
               b.category, b.quantity_in_stock, p.name`,
            [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
        );

        res.json({
            success: true,
            count: books.length,
            books: books
        });

    } catch (error) {
        console.error("Global search error:", error);
        res.status(500).json({
            error: "Failed to perform global search",
            details: error.message
        });
    }
};

// ==========================================
// Search by ISBN
// ==========================================
const searchByISBN = async (req, res) => {
    try {
        const { isbn } = req.params;

        const [books] = await db.query(
            `SELECT 
        b.ISBN,
        b.title,
        b.publication_year,
        b.selling_price,
        b.category,
        b.quantity_in_stock,
        b.threshold,
        p.name AS publisher_name,
        p.address AS publisher_address,
        p.telephone AS publisher_telephone,
        GROUP_CONCAT(a.author_name SEPARATOR ', ') AS authors,
        CASE 
          WHEN b.quantity_in_stock > 0 THEN 'Available'
          ELSE 'Out of Stock'
        END AS availability
      FROM Books b
      LEFT JOIN Publishers p ON b.publisher_id = p.publisher_id
      LEFT JOIN Book_Authors ba ON b.ISBN = ba.ISBN
      LEFT JOIN Authors a ON ba.author_id = a.author_id
      WHERE b.ISBN = ?
      GROUP BY b.ISBN, b.title, b.publication_year, b.selling_price, 
               b.category, b.quantity_in_stock, b.threshold,
               p.name, p.address, p.telephone`,
            [isbn]
        );

        if (books.length === 0) {
            return res.status(404).json({
                error: "Book not found"
            });
        }

        res.json({
            success: true,
            book: books[0]
        });

    } catch (error) {
        console.error("Search by ISBN error:", error);
        res.status(500).json({
            error: "Failed to search for book",
            details: error.message
        });
    }
};

// ==========================================
// Search by Title
// ==========================================
const searchByTitle = async (req, res) => {
    try {
        const { title } = req.query;

        if (!title) {
            return res.status(400).json({
                error: "Title parameter is required"
            });
        }

        const [books] = await db.query(
            `SELECT 
        b.ISBN,
        b.title,
        b.publication_year,
        b.selling_price,
        b.category,
        b.quantity_in_stock,
        p.name AS publisher_name,
        GROUP_CONCAT(a.author_name SEPARATOR ', ') AS authors,
        CASE 
          WHEN b.quantity_in_stock > 0 THEN 'Available'
          ELSE 'Out of Stock'
        END AS availability
      FROM Books b
      LEFT JOIN Publishers p ON b.publisher_id = p.publisher_id
      LEFT JOIN Book_Authors ba ON b.ISBN = ba.ISBN
      LEFT JOIN Authors a ON ba.author_id = a.author_id
      WHERE b.title LIKE ?
      GROUP BY b.ISBN, b.title, b.publication_year, b.selling_price, 
               b.category, b.quantity_in_stock, p.name`,
            [`%${title}%`]
        );

        res.json({
            success: true,
            count: books.length,
            books: books
        });

    } catch (error) {
        console.error("Search by title error:", error);
        res.status(500).json({
            error: "Failed to search for books",
            details: error.message
        });
    }
};

// ==========================================
// Search by Category
// ==========================================
const searchByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        const validCategories = ['Science', 'Art', 'Religion', 'History', 'Geography'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
            });
        }

        const [books] = await db.query(
            `SELECT 
        b.ISBN,
        b.title,
        b.publication_year,
        b.selling_price,
        b.category,
        b.quantity_in_stock,
        p.name AS publisher_name,
        GROUP_CONCAT(a.author_name SEPARATOR ', ') AS authors,
        CASE 
          WHEN b.quantity_in_stock > 0 THEN 'Available'
          ELSE 'Out of Stock'
        END AS availability
      FROM Books b
      LEFT JOIN Publishers p ON b.publisher_id = p.publisher_id
      LEFT JOIN Book_Authors ba ON b.ISBN = ba.ISBN
      LEFT JOIN Authors a ON ba.author_id = a.author_id
      WHERE b.category = ?
      GROUP BY b.ISBN, b.title, b.publication_year, b.selling_price, 
               b.category, b.quantity_in_stock, p.name`,
            [category]
        );

        res.json({
            success: true,
            category: category,
            count: books.length,
            books: books
        });

    } catch (error) {
        console.error("Search by category error:", error);
        res.status(500).json({
            error: "Failed to search for books",
            details: error.message
        });
    }
};

// ==========================================
// Search by Author
// ==========================================
const searchByAuthor = async (req, res) => {
    try {
        const { author } = req.query;

        if (!author) {
            return res.status(400).json({
                error: "Author parameter is required"
            });
        }

        const [books] = await db.query(
            `SELECT DISTINCT
        b.ISBN,
        b.title,
        b.publication_year,
        b.selling_price,
        b.category,
        b.quantity_in_stock,
        p.name AS publisher_name,
        GROUP_CONCAT(DISTINCT a2.author_name SEPARATOR ', ') AS authors,
        CASE 
          WHEN b.quantity_in_stock > 0 THEN 'Available'
          ELSE 'Out of Stock'
        END AS availability
      FROM Books b
      LEFT JOIN Publishers p ON b.publisher_id = p.publisher_id
      LEFT JOIN Book_Authors ba ON b.ISBN = ba.ISBN
      LEFT JOIN Authors a ON ba.author_id = a.author_id
      LEFT JOIN Book_Authors ba2 ON b.ISBN = ba2.ISBN
      LEFT JOIN Authors a2 ON ba2.author_id = a2.author_id
      WHERE a.author_name LIKE ?
      GROUP BY b.ISBN, b.title, b.publication_year, b.selling_price, 
               b.category, b.quantity_in_stock, p.name`,
            [`%${author}%`]
        );

        res.json({
            success: true,
            count: books.length,
            books: books
        });

    } catch (error) {
        console.error("Search by author error:", error);
        res.status(500).json({
            error: "Failed to search for books",
            details: error.message
        });
    }
};

// ==========================================
// Search by Publisher
// ==========================================
const searchByPublisher = async (req, res) => {
    try {
        const { publisher } = req.query;

        if (!publisher) {
            return res.status(400).json({
                error: "Publisher parameter is required"
            });
        }

        const [books] = await db.query(
            `SELECT 
        b.ISBN,
        b.title,
        b.publication_year,
        b.selling_price,
        b.category,
        b.quantity_in_stock,
        p.name AS publisher_name,
        GROUP_CONCAT(a.author_name SEPARATOR ', ') AS authors,
        CASE 
          WHEN b.quantity_in_stock > 0 THEN 'Available'
          ELSE 'Out of Stock'
        END AS availability
      FROM Books b
      LEFT JOIN Publishers p ON b.publisher_id = p.publisher_id
      LEFT JOIN Book_Authors ba ON b.ISBN = ba.ISBN
      LEFT JOIN Authors a ON ba.author_id = a.author_id
      WHERE p.name LIKE ?
      GROUP BY b.ISBN, b.title, b.publication_year, b.selling_price, 
               b.category, b.quantity_in_stock, p.name`,
            [`%${publisher}%`]
        );

        res.json({
            success: true,
            count: books.length,
            books: books
        });

    } catch (error) {
        console.error("Search by publisher error:", error);
        res.status(500).json({
            error: "Failed to search for books",
            details: error.message
        });
    }
};

// ==========================================
// Get All Books (Optional - for browsing)
// ==========================================
const getAllBooks = async (req, res) => {
    try {
        const [books] = await db.query(
            `SELECT 
        b.ISBN,
        b.title,
        b.publication_year,
        b.selling_price,
        b.category,
        b.quantity_in_stock,
        p.name AS publisher_name,
        GROUP_CONCAT(a.author_name SEPARATOR ', ') AS authors,
        CASE 
          WHEN b.quantity_in_stock > 0 THEN 'Available'
          ELSE 'Out of Stock'
        END AS availability
      FROM Books b
      LEFT JOIN Publishers p ON b.publisher_id = p.publisher_id
      LEFT JOIN Book_Authors ba ON b.ISBN = ba.ISBN
      LEFT JOIN Authors a ON ba.author_id = a.author_id
      GROUP BY b.ISBN, b.title, b.publication_year, b.selling_price, 
               b.category, b.quantity_in_stock, p.name
      ORDER BY b.title`
        );

        res.json({
            success: true,
            count: books.length,
            books: books
        });

    } catch (error) {
        console.error("Get all books error:", error);
        res.status(500).json({
            error: "Failed to retrieve books",
            details: error.message
        });
    }
};

// Export all functions
module.exports = {
    globalSearch,
    searchByISBN,
    searchByTitle,
    searchByCategory,
    searchByAuthor,
    searchByPublisher,
    getAllBooks
};