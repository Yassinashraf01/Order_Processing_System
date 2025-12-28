const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Validation helper functions
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhone = (phone) => {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
};

const validatePassword = (password) => {
    return password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password);
};

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user.user_id,
            username: user.username,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

const customerController = {

    // 1. Register
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

    // 2. Login - Returns JWT token
    login: async (req, res) => {
        const { username, password } = req.body;

        try {
            if (!username || !password) {
                return res.status(400).json({ error: "Username and password are required" });
            }

            // Get user from database
            const [users] = await db.execute(
                'SELECT user_id, username, password, role, first_name, last_name, email FROM Users WHERE username = ?',
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

            // Generate JWT token
            const token = generateToken(user);

            // Return user info with token
            res.json({
                message: "Login successful",
                token: token,
                user: {
                    userId: user.user_id,
                    username: user.username,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 3. Update Profile - Uses req.user from token
    updateProfile: async (req, res) => {
        const { firstName, lastName, email, phone, address, password } = req.body;
        const userId = req.user.userId; // Get from token

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
            if (phone || address) {
                await db.execute(
                    'UPDATE Customer_Profiles SET phone_number = ?, shipping_address = ? WHERE user_id = ?',
                    [phone, address, userId]
                );
            }

            res.json({ message: "Profile updated successfully" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 4. Add to Cart - Uses userId from token
    addToCart: async (req, res) => {
        const { isbn, quantity } = req.body;
        const userId = req.user.userId; // From token

        try {
            // Validate quantity
            if (!quantity || quantity <= 0) {
                return res.status(400).json({ error: "Invalid quantity" });
            }

            if (!isbn) {
                return res.status(400).json({ error: "ISBN is required" });
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
                return res.status(400).json({
                    error: "Insufficient stock",
                    available: books[0].quantity_in_stock
                });
            }

            // Add to cart or update quantity
            await db.execute(
                'INSERT INTO Shopping_Cart (user_id, ISBN, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
                [userId, isbn, quantity, quantity]
            );

            res.json({ message: "Added to cart successfully" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 5. View Cart - Uses userId from token
    viewCart: async (req, res) => {
        const userId = req.user.userId; // From token

        try {
            const [items] = await db.execute(
                `SELECT c.ISBN, b.title, c.quantity, b.selling_price, 
                 (c.quantity * b.selling_price) as subtotal 
                 FROM Shopping_Cart c 
                 JOIN Books b ON c.ISBN = b.ISBN 
                 WHERE c.user_id = ?`,
                [userId]
            );

            const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

            res.json({
                items: items,
                total: total.toFixed(2)
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 6. Remove from Cart - Uses userId from token
    removeFromCart: async (req, res) => {
        const { isbn } = req.body;
        const userId = req.user.userId;

        try {
            if (!isbn) {
                return res.status(400).json({ error: "ISBN is required" });
            }

            await db.execute(
                'DELETE FROM Shopping_Cart WHERE user_id = ? AND ISBN = ?',
                [userId, isbn]
            );

            res.json({ message: "Item removed from cart successfully" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // New: Clear all items from cart
    clearCart: async (req, res) => {
        const userId = req.user.userId;
        try {
            await db.execute('DELETE FROM Shopping_Cart WHERE user_id = ?', [userId]);
            res.json({ message: "Cart cleared successfully" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 7. Checkout - Uses userId from token
   checkout: async (req, res) => {
    const userId = req.user.userId; // From token
    
    // Validate Visa card format
    const { creditCard, expiryDate } = req.body;
    
    if (!creditCard || !expiryDate) {
        return res.status(400).json({ error: "Credit card and expiry date are required" });
    }
    
    // Validate Visa card number format (16 digits starting with 4)
    const visaRegex = /^4[0-9]{15}$/;
    if (!visaRegex.test(creditCard)) {
        return res.status(400).json({ 
            error: "Invalid Visa card number. Must be 16 digits starting with 4" 
        });
    }
    
    // Validate expiry date format (MM/YY)
    const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!expiryRegex.test(expiryDate)) {
        return res.status(400).json({ 
            error: "Invalid expiry date format. Use MM/YY format" 
        });
    }
    
    // Validate expiry date is not in the past
    const [month, year] = expiryDate.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
    const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed
    
    const expiryYear = parseInt(year);
    const expiryMonth = parseInt(month);
    
    if (expiryYear < currentYear || 
        (expiryYear === currentYear && expiryMonth < currentMonth)) {
        return res.status(400).json({ 
            error: "Card has expired. Please use a valid card" 
        });
    }
    
    // Validate expiry date is not too far in the future (optional, e.g., 10 years max)
    if (expiryYear > currentYear + 10) {
        return res.status(400).json({ 
            error: "Expiry date is too far in the future. Maximum 10 years" 
        });
    }
    
    // Luhn algorithm validation for Visa card
    function validateLuhn(cardNumber) {
        let sum = 0;
        let shouldDouble = false;
        
        // Process from right to left
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i));
            
            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        
        return (sum % 10) === 0;
    }
    
    if (!validateLuhn(creditCard)) {
        return res.status(400).json({ 
            error: "Invalid card number. Please check and try again" 
        });
    }
    
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Get cart items with full column names
        const [cartItems] = await connection.query(
            `SELECT c.ISBN, c.quantity, b.selling_price, b.quantity_in_stock 
             FROM Shopping_Cart c 
             JOIN Books b ON c.ISBN = b.ISBN 
             WHERE c.user_id = ?`,
            [userId]
        );
        
        if (!cartItems || cartItems.length === 0) {
            throw new Error("Cart is empty");
        }
        
        // Calculate total with fallback for property naming
        let total = 0;
        for (const item of cartItems) {
            const qty = item.quantity || item.qty || 0;
            const price = item.selling_price || item.price || 0;
            total += (qty * price);
        }
        
        // Mask credit card for storage (store only last 4 digits)
        const maskedCard = `****-****-****-${creditCard.slice(-4)}`;
        
        // Create sale record with payment info
        const [saleResult] = await connection.query(
            `INSERT INTO Sales (user_id, total_price, payment_method, last_four_digits, expiry_date) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, total, 'VISA', creditCard.slice(-4), expiryDate]
        );
        
        const saleId = saleResult.insertId;
        
        // Process each item
        for (let item of cartItems) {
            // Handling multiple possible property name styles
            const isbn = item.ISBN || item.isbn;
            const qty = item.quantity || item.qty;
            const price = item.selling_price || item.price;
            const stock = item.quantity_in_stock || item.stock;
            
            if (stock < qty) {
                throw new Error(`Insufficient stock for ISBN: ${isbn}`);
            }
            
            // Update stock
            await connection.query(
                'UPDATE Books SET quantity_in_stock = quantity_in_stock - ? WHERE ISBN = ?',
                [qty, isbn]
            );
            
            // Add sale item
            await connection.query(
                'INSERT INTO Sale_Items (sale_id, ISBN, quantity, price) VALUES (?, ?, ?, ?)',
                [saleId, isbn, qty, price]
            );
        }
        
        // Clear cart
        await connection.query('DELETE FROM Shopping_Cart WHERE user_id = ?', [userId]);
        
        await connection.commit();
        
        res.json({ 
            message: "Checkout successful!", 
            saleId: saleId, 
            total: total.toFixed(2),
            paymentMethod: "VISA",
            cardEndingIn: creditCard.slice(-4)
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
},

    // 8. Get Past Orders - Uses userId from token
    getPastOrders: async (req, res) => {
        const userId = req.user.userId; // From token

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

    // 9. Logout - Uses userId from token
    // 9. Logout - Blacklist token and clear cart
    logout: async (req, res) => {
        const userId = req.user.userId; // From token

        try {
            // Get the token from header
            const authHeader = req.headers.authorization;
            const token = authHeader.split(" ")[1];

            // Get token expiration from decoded JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const expiresAt = new Date(decoded.exp * 1000); // Convert to milliseconds

            // Add token to blacklist
            await db.execute(
                'INSERT INTO blacklisted_tokens (token, expires_at) VALUES (?, ?)',
                [token, expiresAt]
            );

            // Clear shopping cart
            await db.execute('DELETE FROM Shopping_Cart WHERE user_id = ?', [userId]);

            res.json({ message: "Logged out successfully and cart cleared" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = customerController;