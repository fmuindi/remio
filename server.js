const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path'); // Required to handle file paths

// Express application
const app = express();
const port = 3000;

// Middleware to handle JSON and form data
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve home.html from the root folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));  // Serve 'home.html' from the root folder
});

// MariaDB connection configuration
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',  // Ensure this is the correct password for your DB
    database: 'song_requests'
});

// Connect to the MariaDB database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MariaDB database.');
});

// Create a route to handle the form data submission
app.post('/submit-song-request', (req, res) => {
    const { name, songName } = req.body;

    if (!name || !songName) {
        return res.status(400).json({ success: false, error: 'Name and song title are required.' });
    }

    const query = 'INSERT INTO requests (name, song_title) VALUES (?, ?)';
    db.query(query, [name, songName], (err, results) => {
        if (err) {
            console.error('Error inserting data into the database:', err);
            return res.status(500).json({ success: false, error: 'Database error.' });
        }
        res.json({ success: true, message: 'Song request submitted successfully.' });
    });
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
