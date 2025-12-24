const db = require('../config/db');

const customerController = {
    // 1. Sign Up Logic
    // Requirement: provide username, password, names, email, phone, and shipping address 
    register: async (req, res) => {
        const { username, password, firstName, lastName, email, phone, address } = req.body;
        try {
            // Insert into the main Users table
            const [userResult] = await db.execute(
                'INSERT INTO Users (username, password, first_name, last_name, email, role) VALUES (?, ?, ?, ?, ?, "CUSTOMER")',
                [username, password, firstName, lastName, email]
            );
            
            const userId = userResult.insertId;

            // Insert into the Customer_Profiles table (to keep Admin profile clean)
            await db.execute(
                'INSERT INTO Customer_Profiles (user_id, phone_number, shipping_address) VALUES (?, ?, ?)',
                [userId, phone, address]
            );

            res.status(201).json({ message: "Customer registered successfully" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 2. Edit Personal Information
    // Requirement: Edit personal info including password 
    updateProfile: async (req, res) => {
        const { userId, firstName, lastName, email, phone, address, password } = req.body;
        try {
            await db.execute(
                'UPDATE Users SET first_name = ?, last_name = ?, email = ?, password = ? WHERE user_id = ?',
                [firstName, lastName, email, password, userId]
            );
            await db.execute(
                'UPDATE Customer_Profiles SET phone_number = ?, shipping_address = ? WHERE user_id = ?',
                [phone, address, userId]
            );
            res.json({ message: "Profile updated successfully" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 3. Search for Books
    // Requirement: Search by any attribute (ISBN, title, category, author, publisher) 
    search: async (req, res) => {
        const { keyword, category } = req.query;
        let query = `
            SELECT b.*, p.name as publisher_name, GROUP_CONCAT(a.author_name) as authors
            FROM Books b
            JOIN Publishers p ON b.publisher_id = p.publisher_id
            JOIN Book_Authors ba ON b.ISBN = ba.ISBN
            JOIN Authors a ON ba.author_id = a.author_id
            WHERE (b.title LIKE ? OR b.ISBN = ? OR p.name LIKE ? OR a.author_name LIKE ?)
        `;
        const params = [`%${keyword}%`, keyword, `%${keyword}%`, `%${keyword}%` ];

        if (category) {
            query += ' AND b.category = ?';
            params.push(category);
        }
        query += ' GROUP BY b.ISBN';

        try {
            const [books] = await db.execute(query, params);
            res.json(books);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 4. Manage Shopping Cart (Add)
    // Requirement: Add books to cart [cite: 72]
    addToCart: async (req, res) => {
        const { userId, isbn, quantity } = req.body;
        try {
            await db.execute(
                'INSERT INTO Shopping_Cart (user_id, ISBN, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
                [userId, isbn, quantity, quantity]
            );
            res.json({ message: "Added to cart" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 5. View Cart
    // Requirement: View items, individual prices, and total prices [cite: 73, 74]
    viewCart: async (req, res) => {
        const { userId } = req.params;
        try {
            const [items] = await db.execute(
                'SELECT c.ISBN, b.title, c.quantity, b.selling_price, (c.quantity * b.selling_price) as subtotal ' +
                'FROM Shopping_Cart c JOIN Books b ON c.ISBN = b.ISBN WHERE c.user_id = ?',
                [userId]
            );
            res.json(items);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 6. Check Out (The Transaction)
    // Requirement: Validate card, deduct stock, and update sales [cite: 79, 82, 83, 84]
    checkout: async (req, res) => {
        const { userId, creditCard, expiryDate } = req.body;
        
        if (!creditCard || creditCard.length < 16) {
            return res.status(400).json({ error: "Invalid credit card info" });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [cartItems] = await connection.execute(
                'SELECT c.ISBN, c.quantity, b.selling_price FROM Shopping_Cart c JOIN Books b ON c.ISBN = b.ISBN WHERE c.user_id = ?',
                [userId]
            );

            if (cartItems.length === 0) throw new Error("Cart is empty");

            let total = cartItems.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);

            const [sale] = await connection.execute(
                'INSERT INTO Sales (user_id, total_price) VALUES (?, ?)',
                [userId, total]
            );

            for (let item of cartItems) {
                // This triggers 'before_book_update' to prevent negative stock [cite: 35, 36]
                await connection.execute(
                    'UPDATE Books SET quantity_in_stock = quantity_in_stock - ? WHERE ISBN = ?',
                    [item.quantity, item.ISBN]
                );
                
                await connection.execute(
                    'INSERT INTO Sale_Items (sale_id, ISBN, quantity, price) VALUES (?, ?, ?, ?)',
                    [sale.insertId, item.ISBN, item.quantity, item.selling_price]
                );
            }

            await connection.execute('DELETE FROM Shopping_Cart WHERE user_id = ?', [userId]);
            await connection.commit();
            res.json({ message: "Checkout successful!", saleId: sale.insertId });
        } catch (error) {
            await connection.rollback();
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // 7. View Past Orders
    // Requirement: View order details (no, date, ISBN, names, total) [cite: 85, 86]
    getPastOrders: async (req, res) => {
        const { userId } = req.params;
        try {
            const [orders] = await db.execute(`
                SELECT s.sale_id as order_no, s.sale_date as order_date, s.total_price,
                       si.ISBN, b.title as book_name, si.quantity, si.price
                FROM Sales s
                JOIN Sale_Items si ON s.sale_id = si.sale_id
                JOIN Books b ON si.ISBN = b.ISBN
                WHERE s.user_id = ?
                ORDER BY s.sale_date DESC
            `, [userId]);
            res.json(orders);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 8. Logout
    // Requirement: Logout removes all items from the current cart [cite: 87, 88]
    logout: async (req, res) => {
        const { userId } = req.body;
        try {
            await db.execute('DELETE FROM Shopping_Cart WHERE user_id = ?', [userId]);
            res.json({ message: "Logged out and cart cleared" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = customerController;