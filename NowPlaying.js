const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Path to the NowPlaying.txt file
const filePath = path.join('C:', 'RadioDJv2', 'NowPlaying.txt');

// Backend URL (updated to use HTTPS domain)
const backendUrl = process.env.BACKEND_URL || 'https://remioplay.com/now-playing';

setInterval(() => {
    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
            console.error(`Error reading ${filePath}:`, err.message);
            return;
        }

        // Extract song and artist (assuming "Artist - Song Title" format)
        const [artist, title] = data.split(' - ').map((str) => str?.trim());

        // Validate parsed data
        if (!artist || !title) {
            console.error('Invalid data format in NowPlaying.txt:', data);
            return;
        }

        // Send data to the backend
        axios.post(backendUrl, { artist, title }, { timeout: 5000 })
            .then((response) => console.log('Now playing sent successfully:', response.data))
            .catch((error) => {
                console.error('Error sending now-playing data:', error.message || error);
            });
    });
}, 5000); // Check every 5 seconds
