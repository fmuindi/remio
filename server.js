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
const helmet = require('helmet'); // Helmet for security headers

const app = express();
const port = 3000;

// Helmet CSP Configuration with more comprehensive sources
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], // Allow resources from the same origin
        scriptSrc: [
          "'self'", // Allow inline scripts and from the same origin
          "https://apis.google.com", // Google API
          "https://www.gstatic.com", // Google Static Content
          "https://accounts.google.com", // Google OAuth
          "https://connect.facebook.net", // Facebook API
          "https://cdn.jsdelivr.net", // Allow external resources from CDN
          "https://code.iconify.design", // Iconify
          "https://cdnjs.cloudflare.com" // Allow external CDNs like Cloudflare (optional)
        ],
        styleSrc: [
          "'self'", // Allow styles from the same origin
          "https://fonts.googleapis.com", // Allow Google Fonts
          "https://fonts.gstatic.com" // Google Fonts static content
        ],
        imgSrc: [
          "'self'", // Allow images from the same origin
          "https://www.google.com", // Allow images from Google
          "https://www.gstatic.com" // Google Static Images
        ],
        connectSrc: [
          "'self'", // Allow connections to the same origin
          "https://api.yourservice.com", // External API connections
        ],
        fontSrc: [
          "'self'", // Allow fonts from the same origin
          "https://fonts.gstatic.com" // Google Fonts
        ],
        objectSrc: ["'none'"], // Block Flash, Java applets, etc.
        frameSrc: ["'self'", "https://www.youtube.com"], // Allow embedding YouTube videos
        childSrc: ["'none'"], // Block nested browsing contexts (e.g., iframe)
        formAction: ["'self'"], // Allow forms to be submitted only to the same origin
        frameAncestors: ["'none'"], // Prevent framing of the site
        upgradeInsecureRequests: [], // Upgrade all HTTP requests to HTTPS
      },
    },
  })
);

// Middleware setup
app.use(cors({ origin: '*' })); // Allow all origins for testing; restrict in production
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// MySQL connection pool setup
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

// Routes
app.post('/signup', (req, res) => signup(req, res, pool));
app.post('/login', (req, res) => login(req, res, pool));

// Passport Serialization
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// OAuth strategies (Google and Facebook) setup
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'https://remioplay.com/auth/google/callback',
    },
    async (token, tokenSecret, profile, done) => {
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
    }
  )
);

// Facebook OAuth Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: 'https://remioplay.com/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'emails'],
    },
    async (accessToken, refreshToken, profile, done) => {
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
    }
  )
);

// OAuth Routes
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

// Google and Facebook token verification endpoints
app.post('/auth/google/token', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken is required' });

  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { sub, name, email } = payload;

    const [user] = await pool.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user.length) {
      await pool.promise().query('INSERT INTO users (username, email) VALUES (?, ?)', [name, email]);
    }

    const jwtToken = jwt.sign({ id: sub, email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: jwtToken });
  } catch (err) {
    console.error('Error verifying Google ID token:', err);
    res.status(500).json({ error: 'Error verifying Google token' });
  }
});

// Facebook token verification endpoint
app.post('/auth/facebook/token', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: 'accessToken is required' });

  try {
    const response = await axios.get(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`);
    const { id, name, email } = response.data;

    const [user] = await pool.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user.length) {
      await pool.promise().query('INSERT INTO users (username, email) VALUES (?, ?)', [name, email]);
    }

    const jwtToken = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: jwtToken });
  } catch (err) {
    console.error('Error verifying Facebook access token:', err);
    res.status(500).json({ error: 'Error verifying Facebook token' });
  }
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).send('Page Not Found');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
