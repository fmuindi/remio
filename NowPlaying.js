const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Path to the NowPlaying.txt file
const filePath = path.join('C:', 'RadioDJv2', 'NowPlaying.txt');

// Backend URL
const backendUrl = 'https://remioplay.com/update-now-playing';

setInterval(() => {
    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
            console.error(`Error reading ${filePath}:`, err.message);
            return;
        }

        // Extract artist and song (assuming "Artist - Song Title" format)
        const [artist, title] = data.split(' - ').map((str) => str?.trim());

        // Validate parsed data
        if (!artist || !title) {
            console.error('Invalid data format in NowPlaying.txt:', data);
            return;
        }

        // Send the data to the backend
        axios.post(backendUrl, { artist, title })
            .then(() => console.log('Now playing data sent successfully'))
            .catch((error) => console.error('Error sending now-playing data:', error.message));
    });
}, 5000); // Check every 5 seconds
