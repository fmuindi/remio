const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Path to NowPlaying.txt file
const filePath = path.join('C:', 'RadioDJv2', 'NowPlaying.txt');

// Backend URL (EC2 server)
const backendUrl = 'http://16.16.247.10:3000/now-playing';

let lastSong = '';

setInterval(() => {
    // Check if the file exists before reading
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
            console.error(`Error reading ${filePath}:`, err.message);
            return;
        }

        // Validate file content
        if (!data || !data.includes(' - ')) {
            console.error('Invalid or empty data in NowPlaying.txt:', data);
            return;
        }

        // Extract artist and song title
        const [artist, title] = data.split(' - ').map(str => str?.trim());

        // Ensure valid extracted values
        if (!artist || !title) {
            console.error('Malformed song data:', data);
            return;
        }

        // Check if the song has changed to avoid redundant API calls
        const currentSong = `${artist} - ${title}`;
        if (currentSong === lastSong) return;

        lastSong = currentSong; // Update last sent song

        // Send data to the backend server
        axios.post(backendUrl, { artist, title }, { timeout: 10000 })
            .then(response => console.log('Now playing sent successfully:', response.data))
            .catch(error => {
                if (error.response) {
                    console.error(`Server error (${error.response.status}):`, error.response.data);
                } else if (error.code === 'ECONNABORTED') {
                    console.error('Request timeout: Server took too long to respond');
                } else {
                    console.error('Error sending now-playing data:', error.message || error);
                }
            });
    });
}, 10000); // Runs every 10 seconds
