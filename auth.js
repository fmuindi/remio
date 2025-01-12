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

// Initialize Passport.js
passport.initialize();

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://remioplay.com'
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
    callbackURL: 'https://remioplay.com'
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
