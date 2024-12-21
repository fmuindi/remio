const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Path to the NowPlaying.txt file
const filePath = path.join('C:', 'RadioDJv2', 'NowPlaying.txt');

// Backend URL (EC2 server)
const backendUrl = 'http://16.16.247.10:3000/now-playing';

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

        // Send data to the backend on EC2
        axios.post(backendUrl, { artist, title }, { timeout: 5000 })
            .then((response) => console.log('Now playing sent successfully:', response.data))
            .catch((error) => {
                console.error('Error sending now-playing data:', error.message || error);
            });
    });
}, 60000); // Check every 5 seconds
