const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');

// JWT secret key (ensure it's stored securely in a .env file for production)
const JWT_SECRET = process.env.JWT_SECRET || 'f58db9bcb9ff58010b70cda4187f0a231e62678d712368b61cb9a23abcf13e045e33181091f5f2f88600e28d1aed1c133df2a7c35cf7bc2bcf99b6cec9bf0e4c';

// MySQL connection pool
const pool = mysql.createPool({
    host: '16.16.247.10',
    user: 'root',
    password: 'nightmare',
    database: 'song_requests',
    port: 3306
});

// Helper function to query MySQL with Promises
const queryDB = (query, params) => {
    return new Promise((resolve, reject) => {
        pool.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// Sign-Up Function
const signup = async (req, res) => {
    const { username, email, password } = req.body;

    // Input validation
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        // Check if the email already exists
        const existingUser = await queryDB('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into the database
        await queryDB('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
        res.status(201).json({ message: 'User registered successfully.' });
    } catch (err) {
        console.error('Error during signup:', err);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
};

// Login Function
const login = async (req, res) => {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        // Fetch user from the database
        const users = await queryDB('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const user = users[0];

        // Compare the hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
};

// Middleware to Authenticate JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Token is missing.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Invalid token:', err);
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }

        req.user = user; // Attach the decoded token payload to the request
        next();
    });
};

module.exports = {
    signup,
    login,
    authenticateToken
};
