const db = require('../config/db');
const bcrypt = require('bcrypt');

// Validation helper functions (defined outside the object)
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhone = (phone) => {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
};

const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password);
};

const customerController = {

    // 1. Sign Up Logic with Authentication
    register: async (req, res) => {
        const { username, password, firstName, lastName, email, phone, address } = req.body;
        
        try {
            // Validate required fields
            if (!username || !password || !firstName || !lastName || !email || !phone || !address) {
                return res.status(400).json({ error: "All fields are required" });
            }

            // Validate email format
            if (!validateEmail(email)) {
                return res.status(400).json({ error: "Invalid email format" });
            }

            // Validate phone format
            if (!validatePhone(phone)) {
                return res.status(400).json({ error: "Invalid phone number format" });
            }

            // Validate password strength
            if (!validatePassword(password)) {
                return res.status(400).json({ 
                    error: "Password must be at least 8 characters with uppercase, lowercase, and number" 
                });
            }

            // Check if username already exists
            const [existingUsername] = await db.execute(
                'SELECT user_id FROM Users WHERE username = ?',
                [username]
            );
            if (existingUsername.length > 0) {
                return res.status(409).json({ error: "Username already exists" });
            }

            // Check if email already exists
            const [existingEmail] = await db.execute(
                'SELECT user_id FROM Users WHERE email = ?',
                [email]
            );
            if (existingEmail.length > 0) {
                return res.status(409).json({ error: "Email already registered" });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert into the main Users table
            const [userResult] = await db.execute(
                'INSERT INTO Users (username, password, first_name, last_name, email, role) VALUES (?, ?, ?, ?, ?, "CUSTOMER")',
                [username, hashedPassword, firstName, lastName, email]
            );
            
            const userId = userResult.insertId;

            // Insert into the Customer_Profiles table
            await db.execute(
                'INSERT INTO Customer_Profiles (user_id, phone_number, shipping_address) VALUES (?, ?, ?)',
                [userId, phone, address]
            );

            res.status(201).json({ 
                message: "Customer registered successfully",
                userId: userId 
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Login function (you'll need this!)
    login: async (req, res) => {
        const { username, password } = req.body;

        try {
            if (!username || !password) {
                return res.status(400).json({ error: "Username and password are required" });
            }

            // Get user from database
            const [users] = await db.execute(
                'SELECT user_id, username, password, role FROM Users WHERE username = ?',
                [username]
            );

            if (users.length === 0) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            const user = users[0];

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // Return user info (excluding password)
            res.json({ 
                message: "Login successful",
                userId: user.user_id,
                username: user.username,
                role: user.role
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 2. Edit Personal Information with validation
    updateProfile: async (req, res) => {
        const { userId, firstName, lastName, email, phone, address, password } = req.body;
        
        try {
            // Validate email if provided
            if (email && !validateEmail(email)) {
                return res.status(400).json({ error: "Invalid email format" });
            }

            // Validate phone if provided
            if (phone && !validatePhone(phone)) {
                return res.status(400).json({ error: "Invalid phone number format" });
            }

            // Check if email is taken by another user
            if (email) {
                const [existingEmail] = await db.execute(
                    'SELECT user_id FROM Users WHERE email = ? AND user_id != ?',
                    [email, userId]
                );
                if (existingEmail.length > 0) {
                    return res.status(409).json({ error: "Email already in use by another account" });
                }
            }

            // Hash new password if provided
            let hashedPassword = null;
            if (password) {
                if (!validatePassword(password)) {
                    return res.status(400).json({ 
                        error: "Password must be at least 8 characters with uppercase, lowercase, and number" 
                    });
                }
                hashedPassword = await bcrypt.hash(password, 10);
            }

            // Update Users table
            if (hashedPassword) {
                await db.execute(
                    'UPDATE Users SET first_name = ?, last_name = ?, email = ?, password = ? WHERE user_id = ?',
                    [firstName, lastName, email, hashedPassword, userId]
                );
            } else {
                await db.execute(
                    'UPDATE Users SET first_name = ?, last_name = ?, email = ? WHERE user_id = ?',
                    [firstName, lastName, email, userId]
                );
            }

            // Update Customer_Profiles table
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
    addToCart: async (req, res) => {
        const { userId, isbn, quantity } = req.body;
        
        try {
            // Validate quantity
            if (!quantity || quantity <= 0) {
                return res.status(400).json({ error: "Invalid quantity" });
            }

            // Check if book exists and has enough stock
            const [books] = await db.execute(
                'SELECT quantity_in_stock FROM Books WHERE ISBN = ?',
                [isbn]
            );
            
            if (books.length === 0) {
                return res.status(404).json({ error: "Book not found" });
            }

            if (books[0].quantity_in_stock < quantity) {
                return res.status(400).json({ error: "Insufficient stock" });
            }

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
    checkout: async (req, res) => {
        const { userId, creditCard, expiryDate } = req.body;
        
        // Validate credit card
        if (!creditCard || creditCard.length < 16) {
            return res.status(400).json({ error: "Invalid credit card info" });
        }

        // Validate expiry date format (MM/YY)
        const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
        if (!expiryDate || !expiryRegex.test(expiryDate)) {
            return res.status(400).json({ error: "Invalid expiry date format (use MM/YY)" });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [cartItems] = await connection.execute(
                'SELECT c.ISBN, c.quantity, b.selling_price FROM Shopping_Cart c JOIN Books b ON c.ISBN = b.ISBN WHERE c.user_id = ?',
                [userId]
            );

            if (cartItems.length === 0) {
                throw new Error("Cart is empty");
            }

            let total = cartItems.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);

            const [sale] = await connection.execute(
                'INSERT INTO Sales (user_id, total_price) VALUES (?, ?)',
                [userId, total]
            );

            for (let item of cartItems) {
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