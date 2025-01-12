require('dotenv').config();  // Load .env file

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// JWT secret key (now securely loaded from the .env file)
const JWT_SECRET = process.env.JWT_SECRET;

// MySQL connection pool (credentials loaded from the .env file)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
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
// Initialize Passport.js
passport.initialize();

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://remioplay.com/auth/google/callback'
}, async (token, tokenSecret, profile, done) => {
    const { id, displayName, emails } = profile;
    const email = emails[0].value;

    // Check if the user already exists
    let user = await queryDB('SELECT * FROM users WHERE email = ?', [email]);
    if (user.length === 0) {
        // New user, insert into the database
        await queryDB('INSERT INTO users (username, email) VALUES (?, ?)', [displayName, email]);
        user = await queryDB('SELECT * FROM users WHERE email = ?', [email]);
    }

    // Generate JWT token
    const userData = user.length > 0 ? user[0] : { id: id, username: displayName, email };
    const jwtToken = jwt.sign({ id: userData.id, username: userData.username }, JWT_SECRET, { expiresIn: '1h' });
    return done(null, { token: jwtToken });
}));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: 'https://remioplay.com/auth/facebook/callback'
}, async (accessToken, refreshToken, profile, done) => {
    const { id, displayName, emails } = profile;
    const email = emails ? emails[0].value : null;

    // Check if the user exists
    let user = await queryDB('SELECT * FROM users WHERE email = ?', [email]);
    if (user.length === 0) {
        // New user, insert into the database
        await queryDB('INSERT INTO users (username, email) VALUES (?, ?)', [displayName, email]);
        user = await queryDB('SELECT * FROM users WHERE email = ?', [email]);
    }

    // Generate JWT token
    const userData = user.length > 0 ? user[0] : { id: id, username: displayName, email };
    const jwtToken = jwt.sign({ id: userData.id, username: userData.username }, JWT_SECRET, { expiresIn: '1h' });
    return done(null, { token: jwtToken });
}));

// Routes for Google and Facebook OAuth
const googleAuth = (req, res, next) => {
    passport.authenticate('google', { scope: ['email'] })(req, res, next);
};

const googleCallback = (req, res) => {
    passport.authenticate('google', { failureRedirect: '/login' }, (err, user) => {
        if (err || !user) {
            return res.status(500).json({ error: 'Google login failed' });
        }
        res.json({ token: user.token });
    })(req, res);
};

const facebookAuth = (req, res, next) => {
    passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
};

const facebookCallback = (req, res) => {
    passport.authenticate('facebook', { failureRedirect: '/login' }, (err, user) => {
        if (err || !user) {
            return res.status(500).json({ error: 'Facebook login failed' });
        }
        res.json({ token: user.token });
    })(req, res);
};

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Token is missing.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

module.exports = {
    googleAuth,
    googleCallback,
    facebookAuth,
    facebookCallback,
    authenticateToken
};
