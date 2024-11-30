const fs = require('fs');
const axios = require('axios');

// Path to the NowPlaying.txt file
const path = 'C:\\RadioDJv2\\NowPlaying.txt';

setInterval(() => {
    fs.readFile(path, 'utf-8', (err, data) => {
        if (err) {
            console.error('Error reading NowPlaying.txt:', err);
            return;
        }

        // Extract song and artist (assuming "Artist - Song Title" format)
        const [artist, title] = data.split(' - ');

        // Validate parsed data
        if (!artist || !title) {
            console.error('Invalid data format in NowPlaying.txt');
            return;
        }

        // Send data to the backend
        axios
            .post('http://16.16.247.10:3000/now-playing', { artist, title })
            .then((response) => console.log('Now playing sent successfully:', response.data))
            .catch((error) => console.error('Error sending now-playing data:', error));
    });
}, 5000); // Check every 5 seconds
