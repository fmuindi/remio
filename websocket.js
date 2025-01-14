// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const mysql = require('mysql2');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const jwt = require('jsonwebtoken'); // For JWT token validation

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//     cors: {
//         origin: '*',
//     },
// });

// // Middleware
// app.use(cors({ origin: '*' }));
// app.use(bodyParser.json());

// // Environment variables
// const JWT_SECRET = 'f58db9bcb9ff58010b70cda4187f0a231e62678d712368b61cb9a23abcf13e045e33181091f5f2f88600e28d1aed1c133df2a7c35cf7bc2bcf99b6cec9bf0e4ckey';

// // MySQL connection pool
// const pool = mysql.createPool({
//     host: '16.16.247.10',
//     user: 'root',
//     password: 'nightmare',
//     database: 'song_requests',
//     port: 3306,
// });

// // Ensure the `chat_messages` table exists
// const createChatTable = `
// CREATE TABLE IF NOT EXISTS chat_messages (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     username VARCHAR(255) NOT NULL,
//     message TEXT NOT NULL,
//     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// )`;

// pool.query(createChatTable, (err) => {
//     if (err) {
//         console.error('Error creating chat_messages table:', err.stack);
//     } else {
//         console.log('chat_messages table ensured.');
//     }
// });

// // WebSocket setup
// io.on('connection', (socket) => {
//     console.log('A user connected:', socket.id);

//     let authenticatedUser = null;

//     // Handle authentication
//     socket.on('authenticate', ({ username, token }) => {
//         if (!username || !token) {
//             socket.emit('authError', { message: 'Authentication failed: Missing username or token' });
//             return;
//         }

//         try {
//             const decoded = jwt.verify(token, JWT_SECRET_KEY);

//             if (decoded.username !== username) {
//                 socket.emit('authError', { message: 'Authentication failed: Invalid token' });
//                 return;
//             }

//             // Ensure the user exists in the database
//             const checkUserQuery = 'SELECT id FROM users WHERE username = ? LIMIT 1';
//             pool.query(checkUserQuery, [username], (err, results) => {
//                 if (err || results.length === 0) {
//                     socket.emit('authError', { message: 'Authentication failed: User not found' });
//                     return;
//                 }

//                 authenticatedUser = username;
//                 console.log(`User authenticated: ${username}`);
//                 socket.emit('authSuccess', { message: 'Authentication successful' });
//             });
//         } catch (err) {
//             socket.emit('authError', { message: 'Authentication failed: Invalid token' });
//         }
//     });

//     // Handle incoming messages
//     socket.on('sendMessage', ({ username, message }) => {
//         if (!authenticatedUser || authenticatedUser !== username) {
//             socket.emit('error', { message: 'You must authenticate before sending messages.' });
//             return;
//         }

//         if (!message) {
//             socket.emit('error', { message: 'Message content cannot be empty.' });
//             return;
//         }

//         // Save the message to the database
//         const query = 'INSERT INTO chat_messages (username, message) VALUES (?, ?)';
//         pool.query(query, [username, message], (err) => {
//             if (err) {
//                 console.error('Database error while saving message:', err.stack);
//                 return;
//             }

//             // Broadcast the message to all connected clients
//             io.emit('receiveMessage', { username, message });
//             console.log('Message broadcasted:', { username, message });
//         });
//     });

//     // Handle user disconnection
//     socket.on('disconnect', () => {
//         console.log('A user disconnected:', socket.id);
//     });
// });

// // Start the server
// const PORT = 3000;
// server.listen(PORT, () => {
//     console.log(`Server with WebSocket is running on http://localhost:${PORT}`);
// });
