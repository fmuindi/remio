const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware to parse JSON and form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// POST route to handle form submission
app.post('/upload', upload.single('song'), async (req, res) => {
    const { name, email, message } = req.body;
    const song = req.file;

    if (!song || path.extname(song.originalname) !== '.mp3') {
        return res.status(400).json({ message: 'Only MP3 files are allowed.' });
    }

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
        host: 'mail.gmx.com',
        port: 587,
        secure: false,
        auth: {
            user: 'jonathan8@gmx.us', // Replace with your GMX email
            pass: 'Mustang@001', // Replace with your GMX email password
        },
    });

    // Read the uploaded file
    const songData = fs.readFileSync(song.path);

    // Create the email
    const mailOptions = {
        from: email,
        to: 'jonathan8@gmx.us', // Replace with your email
        subject: `New Song Submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
        attachments: [
            {
                filename: song.originalname,
                content: songData,
            },
        ],
    };

    // Send the email
    try {
        await transporter.sendMail(mailOptions);
        res.json({ message: 'Song submitted successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Error submitting the song.' });
    } finally {
        // Clean up the uploaded file
        fs.unlinkSync(song.path);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
