const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for the frontend
app.use(cors({ origin: 'https://remioplay.com' }));

// File path for NowPlaying.txt
const filePath = path.join('C:', 'RadioDJv2', 'NowPlaying.txt');

// Array to store the last 6 played tracks
let lastPlayed = [];

// Function to read and parse the current now-playing data
function updateNowPlaying() {
    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
            console.error(`Error reading ${filePath}:`, err.message);
            return;
        }

        // Extract artist and title from the file content
        const [artist, title] = data.split(' - ').map((str) => str?.trim());

        // Validate parsed data
        if (!artist || !title) {
            console.error('Invalid data format in NowPlaying.txt:', data);
            return;
        }

        // Add the current track to the lastPlayed array
        const currentTrack = { artist, title, timestamp: new Date() };

        // Avoid duplicates by comparing the most recent track
        if (!lastPlayed.length || lastPlayed[0].title !== currentTrack.title) {
            lastPlayed.unshift(currentTrack); // Add to the beginning
            if (lastPlayed.length > 6) {
                lastPlayed.pop(); // Keep only the last 6 tracks
            }
        }
    });
}

// Run updateNowPlaying every 5 seconds
setInterval(updateNowPlaying, 5000);

// Endpoint to fetch the now-playing data
app.get('/now-playing', (req, res) => {
    const nowPlaying = lastPlayed[0] || { artist: 'Unknown Artist', title: 'Unknown Song' };
    res.json(nowPlaying);
});

// Endpoint to fetch the last-played tracks
app.get('/last-played', (req, res) => {
    res.json(lastPlayed.slice(1)); // Exclude the now-playing track
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
