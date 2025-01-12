require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { signup, login } = require('./auth'); // Import signup and login functions
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const session = require('express-session');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library'); // To verify Google ID token
const axios = require('axios'); // For Facebook token verification

const { signup, login } = require('./auth'); // Import signup and login functions

const app = express();
const port = 3000;

// Middleware
app.use(cors({ origin: '*' })); // Allow all origins for testing; restrict in production
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET;

// Test database connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
    } else {
        console.log('Connected to the database.');
        connection.release();
    }
});

// Passport Serialization
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://remioplay.com/auth/google/callback',
}, async (token, tokenSecret, profile, done) => {
    const { id, displayName, emails } = profile;
    const email = emails[0].value;

    try {
        const [user] = await pool.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (!user.length) {
            await pool.promise().query('INSERT INTO users (username, email) VALUES (?, ?)', [displayName, email]);
        }
        const jwtToken = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '1h' });
        done(null, { jwtToken });
    } catch (err) {
        done(err, null);
    }
}));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: 'https://remioplay.com/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails'],
}, async (accessToken, refreshToken, profile, done) => {
    const { id, displayName, emails } = profile;
    const email = emails ? emails[0].value : null;

    try {
        const [user] = await pool.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (!user.length) {
            await pool.promise().query('INSERT INTO users (username, email) VALUES (?, ?)', [displayName, email]);
        }
        const jwtToken = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '1h' });
        done(null, { jwtToken });
    } catch (err) {
        done(err, null);
    }
}));

// Routes for OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

app.get('/auth/google/callback', (req, res, next) => {
    passport.authenticate('google', (err, user) => {
        if (err || !user) {
            return res.redirect('/login');
        }
        res.json({ token: user.jwtToken });
    })(req, res, next);
});

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/auth/facebook/callback', (req, res, next) => {
    passport.authenticate('facebook', (err, user) => {
        if (err || !user) {
            return res.redirect('/login');
        }
        res.json({ token: user.jwtToken });
    })(req, res, next);
});

// POST route to handle Google ID token from frontend
app.post('/auth/google/token', async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'idToken is required' });
    }

    try {
        // Verify the Google ID token
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub, name, email } = payload;

        // Check if user exists in database
        const [user] = await pool.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (!user.length) {
            await pool.promise().query('INSERT INTO users (username, email) VALUES (?, ?)', [name, email]);
        }

        // Create JWT token
        const jwtToken = jwt.sign({ id: sub, email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token: jwtToken });
    } catch (err) {
        console.error('Error verifying Google ID token:', err);
        res.status(500).json({ error: 'Error verifying Google token' });
    }
});

// POST route to handle Facebook access token from frontend
app.post('/auth/facebook/token', async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ error: 'accessToken is required' });
    }

    try {
        // Verify the Facebook access token by calling Facebook Graph API
        const response = await axios.get(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`);
        const { id, name, email } = response.data;

        // Check if user exists in database
        const [user] = await pool.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (!user.length) {
            await pool.promise().query('INSERT INTO users (username, email) VALUES (?, ?)', [name, email]);
        }

        // Create JWT token
        const jwtToken = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token: jwtToken });
    } catch (err) {
        console.error('Error verifying Facebook access token:', err);
        res.status(500).json({ error: 'Error verifying Facebook token' });
    }
});

// Map the routes
app.post('/signup', (req, res) => signup(req, res, pool));
app.post('/login', (req, res) => login(req, res, pool));

// In-memory storage for now-playing data
let nowPlaying = { artist: '', title: '' };

// Endpoint to handle updates from the NowPlaying.js script
app.post('/now-playing', (req, res) => {
    const { artist, title } = req.body;

    if (!artist || !title) {
        return res.status(400).json({ success: false, error: 'Invalid now-playing data.' });
    }

    nowPlaying = { artist, title };
    console.log('Now-playing updated:', nowPlaying);

    const checkQuery = 'SELECT * FROM now_playing_history WHERE artist = ? AND title = ? LIMIT 1';
    pool.query(checkQuery, [artist, title], (err, result) => {
        if (err) {
            console.error('Database error while checking for duplicates:', err.stack);
            return res.status(500).json({ success: false, error: 'Database error.' });
        }

        if (result.length > 0) {
            return res.json({ success: true, message: 'Song already exists in the history.' });
        }

        const insertQuery = 'INSERT INTO now_playing_history (artist, title) VALUES (?, ?)';
        pool.query(insertQuery, [artist, title], (err, result) => {
            if (err) {
                console.error('Error inserting now-playing data into the database:', err.stack);
                return res.status(500).json({ success: false, error: 'Database error.' });
            }
            console.log('Now-playing data saved to database successfully:', result);
            res.json({ success: true, message: 'Now-playing data updated and stored successfully.' });
        });
    });
});

// Endpoint to retrieve the current now-playing data
app.get('/now-playing', (req, res) => {
    res.json(nowPlaying);
});

// Endpoint to retrieve the last 5 now-playing entries
app.get('/now-playing/history', (req, res) => {
    const query = 'SELECT artist, title, timestamp FROM now_playing_history ORDER BY id DESC LIMIT 5';
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching now-playing history from database:', err.stack);
            return res.status(500).json({ success: false, error: 'Database error.' });
        }
        res.json(results);
    });
});

// Endpoint to serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

// Endpoint to handle song requests
app.post('/submit-song-request', (req, res) => {
    const { name, songName } = req.body;

    if (!name || !songName) {
        return res.status(400).json({ success: false, error: 'Name and song title are required.' });
    }

    const query = 'INSERT INTO requests (name, song_title) VALUES (?, ?)';
    pool.query(query, [name, songName], (err, result) => {
        if (err) {
            console.error('Error inserting data into the database:', err.stack);
            return res.status(500).json({ success: false, error: 'Database error.' });
        }
        console.log('Song request submitted successfully:', result);
        res.json({ success: true, message: 'Song request submitted successfully.' });
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'UP' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ success: false, error: 'Internal server error.' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
