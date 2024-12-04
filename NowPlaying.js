const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage for now-playing data
let nowPlaying = { artist: 'Unknown Artist', title: 'Unknown Song' };

// In-memory storage for the last 6 played tracks
const lastPlayed = [];

// POST endpoint to update the current "Now Playing" track
app.post('/now-playing', (req, res) => {
    const { artist, title } = req.body;

    if (!artist || !title) {
        return res.status(400).json({ error: 'Both artist and title are required.' });
    }

    // Update the current now-playing track
    nowPlaying = { artist, title };

    // Add the track to the last played history
    lastPlayed.unshift({ artist, title, timestamp: new Date().toISOString() });

    // Keep only the last 6 entries
    if (lastPlayed.length > 6) {
        lastPlayed.pop();
    }

    res.status(200).json({ message: 'Now playing updated successfully.', nowPlaying, lastPlayed });
});

// GET endpoint to fetch the current "Now Playing" track
app.get('/now-playing', (req, res) => {
    res.json(nowPlaying);
});

// GET endpoint to fetch the last 6 played tracks
app.get('/last-played', (req, res) => {
    res.json(lastPlayed);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
