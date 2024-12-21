const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

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

    // Insert the now-playing data into the MySQL table
    const query = 'INSERT INTO now_playing_history (artist, title) VALUES (?, ?)';
    pool.query(query, [artist, title], (err, result) => {
        if (err) {
            console.error('Error inserting now-playing data into the database:', err.stack);
            return res.status(500).json({ success: false, error: 'Database error.' });
        }
        console.log('Now-playing data saved to database successfully:', result);
    });

    res.json({ success: true, message: 'Now-playing data updated and stored successfully.' });
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

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
