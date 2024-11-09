document.addEventListener('DOMContentLoaded', () => {
    // Search Icon Click Focus
    document.querySelector('.search-icon').addEventListener('click', function() {
        const searchBar = document.querySelector('.search-bar');
        searchBar.focus();
    });

    // Hamburger Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navbar = document.querySelector('.navbar');
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navbar.classList.toggle('active');
    });
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navbar.classList.remove('active');
        });
    });

    // Random Number Generation for Listeners and Loved Counts
    function randomInRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    const initialListeners = 249235;
    const initialLoved = 32215;
    const listenersRange = randomInRange(initialListeners - 1000, initialListeners + 1000);
    const lovedRange = randomInRange(initialLoved - 1000, initialLoved + 1000);
    document.getElementById("listeners").textContent = `Listeners: ${listenersRange.toLocaleString()}`;
    document.getElementById("loved").textContent = `Loved: ${lovedRange.toLocaleString()} times`;

    // Audio Controls
    const playButton = document.getElementById('play-button');
    const loveButton = document.getElementById('love-button');
    const refreshButton = document.getElementById('refresh-button');
    const shareButton = document.getElementById('share-button');
    const audioPlayer = document.getElementById('audio');
    let isPlaying = false;

    // Play/Pause Button
    playButton.addEventListener('click', (event) => {
        event.preventDefault();
        const buttonLabel = playButton.querySelector('.button-label');
        const playIcon = playButton.querySelector('.material-icons');
        if (isPlaying) {
            audioPlayer.pause();
            playIcon.textContent = 'play_arrow';
            buttonLabel.textContent = 'Play';
        } else {
            audioPlayer.play();
            playIcon.textContent = 'pause';
            buttonLabel.textContent = 'Pause';
        }
        isPlaying = !isPlaying;
    });

    // Love Button (Toggle Loved State)
    loveButton.addEventListener('click', (event) => {
        event.preventDefault();
        loveButton.classList.toggle('loved');
    });

    // Refresh Button (Reload Audio Stream)
    refreshButton.addEventListener('click', (event) => {
        event.preventDefault();
        audioPlayer.pause();
        audioPlayer.load(); // Reload the stream
        if (isPlaying) {
            audioPlayer.play();
        }
    });

    // Share Button (Web Share API)
    shareButton.addEventListener('click', (event) => {
        event.preventDefault();
        const shareData = {
            title: 'Reminisce Radio',
            text: 'Check out this awesome radio station!',
            url: window.location.href
        };
        if (navigator.share) {
            navigator.share(shareData)
                .then(() => console.log('Successfully shared'))
                .catch((err) => console.error('Error sharing:', err));
        } else {
            const fallbackShare = document.createElement('input');
            fallbackShare.value = window.location.href;
            document.body.appendChild(fallbackShare);
            fallbackShare.select();
            document.execCommand('copy');
            document.body.removeChild(fallbackShare);
            alert('Link copied to clipboard!');
        }
    });

    // Loader for Audio Playback
    const loader = document.getElementById("loader");
    playButton.addEventListener("click", function() {
        loader.style.display = "block";
        audioPlayer.play().then(() => {
            loader.style.display = "none";
        }).catch((error) => {
            loader.style.display = "none";
            console.log("Error playing audio:", error);
        });
    });

    // Load Header Dynamically
    fetch('/public/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-container').innerHTML = data;
        })
        .catch(error => console.error('Error loading header:', error));

    // Scroll-Triggered Fixed Header
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        const scrollPosition = window.scrollY;
        if (scrollPosition > 80) {
            header.classList.add('fixed');
        } else {
            header.classList.remove('fixed');
        }
    });

    // Modal for Song Request
    const overlay = document.getElementById("overlay");
    const formContainer = document.getElementById("form-container");
    const openModalButton = document.getElementById("openRequestModal");
    const closeModalButton = document.getElementById("closeModal");

    openModalButton.onclick = function() {
        overlay.style.display = "flex";
    }
    closeModalButton.onclick = function() {
        overlay.style.display = "none";
    }
    overlay.onclick = function(event) {
        if (!formContainer.contains(event.target)) {
            overlay.style.display = "none";
        }
    }

    document.getElementById('requestForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const name = document.getElementById('name').value.trim();
        const songName = document.getElementById('songName').value.trim();
        const errorMessage = document.getElementById('errorMessage');
        if (!name || !songName) {
            errorMessage.style.display = 'block';
            return;
        }
        errorMessage.style.display = 'none';

        fetch('http://localhost:3000/submit-song-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, songName: songName })
        })
        .then(response => {
            if (response.ok) return response.json();
            else throw new Error('Request failed.');
        })
        .then(data => {
            if (data.success) {
                document.getElementById('userName').textContent = name;
                document.getElementById('songTitle').textContent = songName;
                document.getElementById('requestForm').style.display = 'none';
                document.getElementById('thankYouMessage').style.display = 'block';
            } else {
                console.error('Error:', data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Something went wrong while submitting your request. Please try again.');
        });
    });

    document.getElementById('backButton').addEventListener('click', function() {
        document.getElementById('requestForm').reset();
        document.getElementById('requestForm').style.display = 'block';
        document.getElementById('thankYouMessage').style.display = 'none';
    });
});
