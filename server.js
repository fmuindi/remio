const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');  // Add this line to import fs

const https = require('https');  // Import https module

const app = express();
const port = 3000;

// Path to SSL certificates
const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/remioplay.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/remioplay.com/cert.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/remioplay.com/chain.pem')  // Optional: Include if needed
};

// Middleware
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// MySQL connection pool
const pool = mysql.createPool({
    host: '16.16.247.10',
    user: 'root',
    password: 'nightmare',
    database: 'song_requests',
    port: 3306
});

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

    // Check if the song already exists in the now_playing_history table
    const checkQuery = 'SELECT * FROM now_playing_history WHERE artist = ? AND title = ? LIMIT 1';
    pool.query(checkQuery, [artist, title], (err, result) => {
        if (err) {
            console.error('Database error while checking for duplicates:', err.stack);
            return res.status(500).json({ success: false, error: 'Database error.' });
        }

        // If the song already exists, do not insert again
        if (result.length > 0) {
            return res.json({ success: true, message: 'Song already exists in the history.' });
        }

        // If no record exists, insert the new data
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

// Start the HTTPS server
https.createServer(options, app).listen(port, () => {
    console.log(`Server is running on https://localhost:${port}`);
});
