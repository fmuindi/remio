const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Express application
const app = express();
const port = 3000;

// Middleware to handle JSON and form data
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the 'public' directory and root directory both
app.use(express.static('public'));
app.use(express.static(path.join(__dirname)));

// MariaDB connection configuration
const db = mysql.createConnection({
    host: '13.51.204.181',
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

// Route to serve home.html as the default page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

// Create a route to handle the form data submission
app.post('/submit-song-request', (req, res) => {
    const { name, songName } = req.body;

    if (!name || !songName) {
        return res.status(400).json({ success: false, error: 'Name and song title are required.' });
    }

    // Insert form data into the database
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
