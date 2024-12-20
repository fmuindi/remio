const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// MySQL connection
const db = mysql.createConnection({
    host: '16.16.247.10', // MySQL is running on the same EC2 instance
    user: 'root', // Your MySQL username
    password: 'nightmare', // Your MySQL password
    database: 'song_requests', // Your database name
    port: 3306 // Default MySQL port
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
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

    res.json({ success: true, message: 'Now-playing data updated successfully.' });
});

// Endpoint to retrieve the current now-playing data
app.get('/now-playing', (req, res) => {
    res.json(nowPlaying);
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
    db.query(query, [name, songName], (err, result) => {
        if (err) {
            console.error('Error inserting data into the database:', err);
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
