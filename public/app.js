// Stage Music - App JavaScript (YouTube Music Style)

// State
let allSongs = [];
let currentSongIndex = -1;
let isPlaying = false;
let isShuffled = false;
let repeatMode = 'off'; // 'off', 'one', 'all'

// DOM Elements
const audioPlayer = document.getElementById('audio-player');
const songsGrid = document.getElementById('songs-grid');
const homeView = document.getElementById('home-view');
const albumsView = document.getElementById('albums-view');
const playerView = document.getElementById('player-view');
const miniPlayer = document.getElementById('mini-player');

// Search
const searchInput = document.getElementById('search-input');

// Mini Player Elements
const miniPlayBtn = document.getElementById('mini-play-btn');
const miniPrevBtn = document.getElementById('mini-prev-btn');
const miniNextBtn = document.getElementById('mini-next-btn');
const miniSongTitle = document.getElementById('mini-song-title');
const miniSongArtist = document.getElementById('mini-song-artist');
const miniAlbumArt = document.getElementById('mini-album-art');
const miniProgressBar = document.getElementById('mini-progress-bar');
const miniProgressFill = document.getElementById('mini-progress-fill');
const miniTime = document.getElementById('mini-time');
const expandPlayerBtn = document.getElementById('expand-player-btn');
const miniVolumeBtn = document.getElementById('mini-volume-btn');

// Player View Elements
const backBtn = document.getElementById('back-btn');
const albumArtImg = document.getElementById('album-art-img');
const songTitleLarge = document.getElementById('song-title-large');
const songArtistLarge = document.getElementById('song-artist-large');
const songLanguageLarge = document.getElementById('song-language-large');
const songCompanyLarge = document.getElementById('song-company-large');
const progressBarLarge = document.getElementById('progress-bar-large');
const progressFillLarge = document.getElementById('progress-fill-large');
const currentTimeLarge = document.getElementById('current-time-large');
const durationTimeLarge = document.getElementById('duration-time-large');
const playBtnLarge = document.getElementById('play-btn-large');
const prevBtnLarge = document.getElementById('prev-btn-large');
const nextBtnLarge = document.getElementById('next-btn-large');
const shuffleBtnLarge = document.getElementById('shuffle-btn-large');
const repeatBtnLarge = document.getElementById('repeat-btn-large');
const volumeSliderLarge = document.getElementById('volume-slider-large');
const musicDirectorValue = document.getElementById('music-director-value');
const composerValue = document.getElementById('composer-value');
const lyricsContentLarge = document.getElementById('lyrics-content-large');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories(); // Load categories first
    await loadTop10();
    await loadAlbumsCarousel();
    await loadLanguageCarousels();
    await loadStats();
    setupEventListeners();
    await checkAuth();

    // Check if login parameter is in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true') {
        showLoginModal();
    }
});

// Check if user is logged in
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const data = await response.json();
            const user = data.user;

            // Hide login button, show appropriate buttons
            const topLoginBtn = document.getElementById('top-login-btn');
            const topProfileBtn = document.getElementById('top-profile-btn');
            const topUploadBtn = document.getElementById('top-upload-btn');
            const topAdminBtn = document.getElementById('top-admin-btn');

            if (topLoginBtn) topLoginBtn.style.display = 'none';

            if (user.role === 'admin') {
                // Admin sees admin panel and upload
                if (topAdminBtn) topAdminBtn.style.display = 'flex';
                if (topUploadBtn) topUploadBtn.style.display = 'flex';
            } else {
                // Creators see profile and upload
                if (topProfileBtn) topProfileBtn.style.display = 'flex';
                if (topUploadBtn) topUploadBtn.style.display = 'flex';
            }

            // Update user menu based on role
            document.getElementById('user-menu-name').textContent = user.full_name || user.username;
            document.getElementById('user-menu-email').textContent = user.email || (user.role === 'admin' ? 'Administrator' : 'Creator');
            document.getElementById('menu-login').style.display = 'none';
            document.getElementById('menu-logout').style.display = 'block';
            document.getElementById('menu-dashboard').style.display = 'block';

            if (user.role === 'admin') {
                // Admin gets admin dashboard
                document.getElementById('menu-dashboard').href = '/admin/dashboard.html';
                document.getElementById('menu-dashboard').innerHTML = '<span>👑 Admin Dashboard</span>';
            } else {
                // Creators get profile
                document.getElementById('menu-dashboard').href = '/dashboard.html';
                document.getElementById('menu-dashboard').innerHTML = '<span>📊 My Profile</span>';
            }

            document.getElementById('menu-upload').style.display = 'block';
            document.getElementById('menu-youtube').style.display = 'block';

            return user;
        }
    } catch (error) {
        // User not logged in, keep default login link
    }
    return null;
}

// Toggle user menu
window.toggleUserMenu = function() {
    const menu = document.getElementById('user-menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};

// Close user menu when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('user-menu');
    const userMenuBtn = document.getElementById('user-menu-btn');
    if (userMenu && !userMenu.contains(e.target) && !userMenuBtn.contains(e.target)) {
        userMenu.style.display = 'none';
    }
});

// Show login modal
window.showLoginModal = function() {
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('register-modal').style.display = 'none';
    document.getElementById('user-menu').style.display = 'none';
};

// Close login modal
window.closeLoginModal = function() {
    document.getElementById('login-modal').style.display = 'none';
};

// Show register modal
window.showRegisterModal = function() {
    document.getElementById('register-modal').style.display = 'flex';
    document.getElementById('login-modal').style.display = 'none';
};

// Close register modal
window.closeRegisterModal = function() {
    document.getElementById('register-modal').style.display = 'none';
};

// Handle login form
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const submitBtn = document.getElementById('login-submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');
            const errorDiv = document.getElementById('login-error');
            const successDiv = document.getElementById('login-success');

            if (!username || !password) {
                errorDiv.textContent = 'Please fill all fields';
                errorDiv.style.display = 'block';
                return;
            }

            // Show loading
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline';
            errorDiv.style.display = 'none';

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    successDiv.textContent = 'Login successful!';
                    successDiv.style.display = 'block';

                    setTimeout(() => {
                        closeLoginModal();
                        window.location.reload();
                    }, 1000);
                } else {
                    errorDiv.textContent = data.error || 'Login failed';
                    errorDiv.style.display = 'block';
                    submitBtn.disabled = false;
                    btnText.style.display = 'inline';
                    btnLoader.style.display = 'none';
                }
            } catch (error) {
                console.error('Login error:', error);
                errorDiv.textContent = 'Login failed. Please try again.';
                errorDiv.style.display = 'block';
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        });
    }

    // Handle register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const full_name = document.getElementById('register-fullname').value.trim();
            const username = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            const submitBtn = document.getElementById('register-submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');
            const errorDiv = document.getElementById('register-error');
            const successDiv = document.getElementById('register-success');

            // Validation
            if (!full_name || !username || !email || !password) {
                errorDiv.textContent = 'Please fill all fields';
                errorDiv.style.display = 'block';
                return;
            }

            if (password.length < 6) {
                errorDiv.textContent = 'Password must be at least 6 characters';
                errorDiv.style.display = 'block';
                return;
            }

            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
                return;
            }

            // Show loading
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline';
            errorDiv.style.display = 'none';

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ full_name, username, email, password })
                });

                const data = await response.json();

                if (data.success) {
                    successDiv.textContent = 'Account created! Please login.';
                    successDiv.style.display = 'block';

                    setTimeout(() => {
                        closeRegisterModal();
                        showLoginModal();
                    }, 2000);
                } else {
                    errorDiv.textContent = data.error || 'Registration failed';
                    errorDiv.style.display = 'block';
                    submitBtn.disabled = false;
                    btnText.style.display = 'inline';
                    btnLoader.style.display = 'none';
                }
            } catch (error) {
                console.error('Registration error:', error);
                errorDiv.textContent = 'Registration failed. Please try again.';
                errorDiv.style.display = 'block';
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        });
    }
});

// Logout function
window.logoutUser = async function() {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
            window.location.reload();
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
    }
};

// Load songs from API
// Load albums
async function loadAlbums() {
    try {
        const response = await fetch('/api/albums');
        const data = await response.json();
        const albums = data.albums || [];

        if (albums.length > 0) {
            document.getElementById('albums-section').style.display = 'block';
            displayAlbums(albums);
        }
    } catch (error) {
        console.error('Error loading albums:', error);
    }
}

// Display albums in grid
function displayAlbums(albums) {
    const albumsGrid = document.getElementById('albums-grid');

    if (albums.length === 0) {
        albumsGrid.innerHTML = '<div class="loading-state"><p>No albums found</p></div>';
        return;
    }

    albumsGrid.innerHTML = albums.map(album => `
        <div class="album-card" onclick="viewAlbum(${album.id})">
            <div class="album-card-art">
                <img src="${album.cover_image || '/assets/default-cover.jpg'}"
                     alt="${album.title}"
                     onerror="this.src='/assets/default-cover.jpg'">
                <div class="album-card-overlay">
                    <button class="album-play-btn" onclick="event.stopPropagation(); playAlbum(${album.id})">
                        <svg width="24" height="24"><use href="#icon-play"></use></svg>
                    </button>
                </div>
            </div>
            <div class="album-card-info">
                <div class="album-card-title">${album.title}</div>
                <div class="album-card-artist">${album.artist}</div>
                <div class="album-card-meta">
                    <span class="album-card-songs">${album.song_count || 0} songs</span>
                    ${album.language ? `<span class="album-card-dot">•</span><span class="album-card-language">${album.language}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Load Top 10 / Trending Songs
async function loadTop10() {
    try {
        const response = await fetch('/api/top10');
        const data = await response.json();
        const songs = data.songs || [];

        if (songs.length > 0) {
            document.getElementById('top10-section').style.display = 'block';

            // Update featured count info
            if (data.featured > 0) {
                document.getElementById('featured-count').textContent =
                    `${data.featured} Featured • ${data.trending || 0} Trending`;
            } else {
                document.getElementById('featured-count').textContent = 'Auto-generated from most played';
            }

            displayTop10(songs);
        }
    } catch (error) {
        console.error('Error loading top 10:', error);
    }
}

// Display Top 10 songs
function displayTop10(songs) {
    const top10Grid = document.getElementById('top10-grid');

    if (songs.length === 0) {
        top10Grid.innerHTML = '<div class="loading-state"><p>No trending songs yet</p></div>';
        return;
    }

    top10Grid.innerHTML = songs.map((song, index) => {
        const isFeatured = song.source === 'featured';
        const rank = index + 1;
        const playCount = song.play_count || 0;

        return `
            <div class="top10-song-card ${isFeatured ? 'featured' : ''}" onclick="playTop10Song(${index})">
                <div class="top10-rank ${isFeatured ? 'featured' : ''}">${rank}</div>
                <div class="top10-song-art">
                    <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                         alt="${song.title}"
                         onerror="this.src='/assets/default-cover.jpg'">
                    <div class="top10-song-overlay">
                        <button class="top10-play-btn">
                            <svg width="32" height="32"><use href="#icon-play"></use></svg>
                        </button>
                    </div>
                </div>
                <div class="top10-song-info">
                    <div class="top10-song-title">${song.title}</div>
                    <div class="top10-song-artist">${song.artist || song.singer || 'Unknown'}</div>
                    <div class="top10-song-meta">
                        <span class="top10-play-count">${playCount} plays</span>
                        ${song.language ? `<span>•</span><span>${song.language}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Store top10 songs globally for playback
    window.top10Songs = songs;
}

// Play song from top 10
function playTop10Song(index) {
    if (!window.top10Songs || index < 0 || index >= window.top10Songs.length) return;
    allSongs = window.top10Songs;
    playSong(index);
}

// Load albums carousel for home page
async function loadAlbumsCarousel() {
    try {
        const response = await fetch('/api/albums');
        const data = await response.json();
        const albums = data.albums || [];

        if (albums.length > 0) {
            document.getElementById('albums-section').style.display = 'block';
            displayAlbumsCarousel(albums);
        }
    } catch (error) {
        console.error('Error loading albums carousel:', error);
    }
}

// Display albums in carousel
function displayAlbumsCarousel(albums) {
    const albumsCarousel = document.getElementById('albums-carousel');

    if (albums.length === 0) {
        albumsCarousel.innerHTML = '<div class="loading-state"><p>No albums found</p></div>';
        return;
    }

    albumsCarousel.innerHTML = albums.map(album => `
        <div class="album-card" onclick="viewAlbum(${album.id})">
            <div class="album-card-art">
                <img src="${album.cover_image || '/assets/default-cover.jpg'}"
                     alt="${album.title}"
                     onerror="this.src='/assets/default-cover.jpg'">
                <div class="album-card-overlay">
                    <button class="album-play-btn" onclick="event.stopPropagation(); playAlbum(${album.id})">
                        <svg width="24" height="24"><use href="#icon-play"></use></svg>
                    </button>
                </div>
            </div>
            <div class="album-card-info">
                <div class="album-card-title">${album.title}</div>
                <div class="album-card-artist">${album.artist}</div>
                <div class="album-card-meta">
                    <span class="album-card-songs">${album.song_count || 0} songs</span>
                    ${album.language ? `<span class="album-card-dot">•</span><span class="album-card-language">${album.language}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Load language-specific carousels
async function loadLanguageCarousels() {
    const languages = ['Haryanvi', 'Rajasthani', 'Bhojpuri', 'Gujarati'];

    for (const language of languages) {
        await loadLanguageCarousel(language);
    }
}

// Load carousel for specific language
async function loadLanguageCarousel(language) {
    try {
        const response = await fetch('/api/songs');
        const data = await response.json();
        const allSongs = data.songs || [];

        // Filter songs by language
        const languageSongs = allSongs.filter(song =>
            song.language && song.language.toLowerCase() === language.toLowerCase()
        );

        if (languageSongs.length > 0) {
            const sectionId = language.toLowerCase() + '-section';
            const carouselId = language.toLowerCase() + '-carousel';

            document.getElementById(sectionId).style.display = 'block';
            displaySongsCarousel(carouselId, languageSongs);
        }
    } catch (error) {
        console.error(`Error loading ${language} carousel:`, error);
    }
}

// Display songs in carousel
function displaySongsCarousel(carouselId, songs) {
    const carousel = document.getElementById(carouselId);

    if (songs.length === 0) {
        carousel.innerHTML = '<div class="loading-state"><p>No songs found</p></div>';
        return;
    }

    carousel.innerHTML = songs.map((song, index) => `
        <div class="song-card" onclick="playSongFromCarousel('${carouselId}', ${index})">
            <div class="song-card-art">
                <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                     alt="${song.title}"
                     onerror="this.src='/assets/default-cover.jpg'">
                <div class="song-card-overlay">
                    <button class="play-btn">
                        <svg width="24" height="24"><use href="#icon-play"></use></svg>
                    </button>
                </div>
            </div>
            <div class="song-card-info">
                <div class="song-card-title">${song.title}</div>
                <div class="song-card-artist">${song.artist}</div>
                <div class="song-card-meta">
                    ${song.language ? `<span class="song-card-language">${song.language}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Play song from carousel
function playSongFromCarousel(carouselId, songIndex) {
    const carousel = document.getElementById(carouselId);
    const language = carouselId.replace('-carousel', '');

    // Get all songs of this language
    fetch('/api/songs')
        .then(response => response.json())
        .then(data => {
            const languageSongs = data.songs.filter(song =>
                song.language && song.language.toLowerCase() === language.toLowerCase()
            );
            allSongs = languageSongs;
            playSong(songIndex);
        })
        .catch(error => console.error('Error playing song:', error));
}

// Scroll carousel horizontally
window.scrollCarousel = function(carouselId, direction) {
    const carousel = document.getElementById(carouselId);
    const scrollAmount = 400; // Scroll by 400px
    carousel.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}

// Load albums into dedicated albums view
async function loadAlbumsView() {
    const albumsGridDedicated = document.getElementById('albums-grid-dedicated');

    // Show loading state
    albumsGridDedicated.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading albums...</p></div>';

    try {
        const response = await fetch('/api/albums');
        const data = await response.json();
        const albums = data.albums || [];

        if (albums.length === 0) {
            albumsGridDedicated.innerHTML = '<div class="loading-state"><p>No albums found</p></div>';
            return;
        }

        albumsGridDedicated.innerHTML = albums.map(album => `
            <div class="album-card" onclick="viewAlbumInDedicatedView(${album.id})">
                <div class="album-card-art">
                    <img src="${album.cover_image || '/assets/default-cover.jpg'}"
                         alt="${album.title}"
                         onerror="this.src='/assets/default-cover.jpg'">
                    <div class="album-card-overlay">
                        <button class="album-play-btn" onclick="event.stopPropagation(); playAlbum(${album.id})">
                            <svg width="24" height="24"><use href="#icon-play"></use></svg>
                        </button>
                    </div>
                </div>
                <div class="album-card-info">
                    <div class="album-card-title">${album.title}</div>
                    <div class="album-card-artist">${album.artist}</div>
                    <div class="album-card-meta">
                        <span class="album-card-songs">${album.song_count || 0} songs</span>
                        ${album.language ? `<span class="album-card-dot">•</span><span class="album-card-language">${album.language}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading albums:', error);
        albumsGridDedicated.innerHTML = '<div class="loading-state"><p>Error loading albums</p></div>';
    }
}

// View album (show all songs in the album)
async function viewAlbum(albumId) {
    try {
        const response = await fetch(`/api/albums/${albumId}`);
        const data = await response.json();

        if (data.album && data.songs) {
            // Filter allSongs to only show songs from this album
            const albumSongs = data.songs;
            allSongs = albumSongs; // Temporarily set to album songs
            displaySongs(albumSongs);

            // Scroll to songs section
            document.getElementById('songs-grid').scrollIntoView({ behavior: 'smooth' });

            // Update section title
            document.querySelector('.section-title').textContent = `${data.album.title} - ${data.album.artist}`;
        }
    } catch (error) {
        console.error('Error loading album:', error);
        alert('Failed to load album');
    }
}

// View album in dedicated albums view
async function viewAlbumInDedicatedView(albumId) {
    const albumSongsSection = document.getElementById('album-songs-section');
    const albumSongsGrid = document.getElementById('album-songs-grid');
    const albumDetailsTitle = document.getElementById('album-details-title');

    // Show loading state
    albumSongsGrid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading songs...</p></div>';
    albumSongsSection.style.display = 'block';

    // Hide albums grid
    document.querySelector('#albums-grid-dedicated').parentElement.style.display = 'none';

    try {
        const response = await fetch(`/api/albums/${albumId}`);
        const data = await response.json();

        if (data.album && data.songs) {
            // Update title
            albumDetailsTitle.textContent = `${data.album.title} - ${data.album.artist}`;

            // Display songs
            const songs = data.songs;
            if (songs.length === 0) {
                albumSongsGrid.innerHTML = '<div class="loading-state"><p>No songs in this album</p></div>';
                return;
            }

            albumSongsGrid.innerHTML = songs.map((song, index) => `
                <div class="song-card" onclick="playSongFromAlbumView(${index}, ${albumId})">
                    <div class="song-card-art">
                        <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                             alt="${song.title}"
                             onerror="this.src='/assets/default-cover.jpg'">
                        <div class="song-card-overlay">
                            <button class="play-btn">
                                <svg width="24" height="24"><use href="#icon-play"></use></svg>
                            </button>
                        </div>
                    </div>
                    <div class="song-card-info">
                        <div class="song-card-title">${song.title}</div>
                        <div class="song-card-artist">${song.artist}</div>
                        <div class="song-card-meta">
                            ${song.language ? `<span class="song-card-language">${song.language}</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            // Scroll to top of album songs section
            albumSongsSection.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error loading album:', error);
        albumSongsGrid.innerHTML = '<div class="loading-state"><p>Error loading album songs</p></div>';
    }
}

// Play song from album view in dedicated albums page
async function playSongFromAlbumView(songIndex, albumId) {
    try {
        const response = await fetch(`/api/albums/${albumId}`);
        const data = await response.json();

        if (data.songs && data.songs.length > 0) {
            allSongs = data.songs;
            playSong(songIndex);
        }
    } catch (error) {
        console.error('Error playing song:', error);
    }
}

// Show all albums (back button handler)
function showAllAlbums() {
    const albumSongsSection = document.getElementById('album-songs-section');
    const albumsGridContainer = document.querySelector('#albums-grid-dedicated').parentElement;

    // Hide album songs section
    albumSongsSection.style.display = 'none';

    // Show albums grid
    albumsGridContainer.style.display = 'block';
}

// Play entire album
async function playAlbum(albumId) {
    try {
        const response = await fetch(`/api/albums/${albumId}`);
        const data = await response.json();

        if (data.songs && data.songs.length > 0) {
            allSongs = data.songs;
            playSong(0);
        }
    } catch (error) {
        console.error('Error playing album:', error);
    }
}

async function loadSongs(language = null) {
    try {
        const response = await fetch('/api/songs');
        const data = await response.json();
        allSongs = data.songs || [];

        let filteredSongs = allSongs;
        if (language && language !== 'All') {
            filteredSongs = allSongs.filter(song => song.language === language);
        }

        displaySongs(filteredSongs);
    } catch (error) {
        console.error('Error loading songs:', error);
        songsGrid.innerHTML = '<p style="color: #aaa; text-align: center;">Failed to load songs</p>';
    }
}

// Display songs in grid
function displaySongs(songs) {
    if (songs.length === 0) {
        songsGrid.innerHTML = '<div class="loading-state"><p>No songs found</p></div>';
        return;
    }

    songsGrid.innerHTML = songs.map((song, index) => `
        <div class="song-card" data-index="${index}">
            <div class="song-card-art" onclick="playSong(${allSongs.indexOf(song)})">
                <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                     alt="${song.title}"
                     onerror="this.src='/assets/default-cover.jpg'">
                <button class="song-card-play" onclick="event.stopPropagation(); playSong(${allSongs.indexOf(song)})">
                    ▶️
                </button>
            </div>
            <div class="song-card-info">
                <div class="song-card-title" onclick="playSong(${allSongs.indexOf(song)})">${song.title}</div>
                <div class="song-card-artist">${song.singer || song.artist}</div>
                <div class="song-card-meta">
                    <span class="song-card-language">${song.language || 'Unknown'}</span>
                </div>
                <div class="song-card-actions">
                    <button class="btn-add-to-playlist" onclick="event.stopPropagation(); showAddToPlaylistModal(${song.id})">
                        <svg width="16" height="16"><use href="#icon-add"></use></svg>
                        Add to Playlist
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Load statistics
async function loadStats() {
    try {
        const [songsResponse, albumsResponse] = await Promise.all([
            fetch('/api/stats'),
            fetch('/api/albums')
        ]);

        const songsData = await songsResponse.json();
        const albumsData = await albumsResponse.json();

        document.getElementById('total-songs').textContent = songsData.stats.total || 0;
        document.getElementById('total-albums').textContent = albumsData.albums?.length || 0;
        document.getElementById('total-plays').textContent = songsData.stats.totalPlays || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Play song
window.playSong = function(index) {
    if (index < 0 || index >= allSongs.length) return;

    currentSongIndex = index;
    const song = allSongs[index];

    // Set audio source
    audioPlayer.src = song.audio_file;
    audioPlayer.load();
    audioPlayer.play();
    isPlaying = true;

    // Update mini player
    miniSongTitle.textContent = song.title;
    miniSongArtist.textContent = song.singer || song.artist;
    miniAlbumArt.querySelector('img').src = song.cover_image || '/assets/default-cover.jpg';
    miniPlayBtn.innerHTML = '⏸️';

    // Update player view
    albumArtImg.src = song.cover_image || '/assets/default-cover.jpg';
    songTitleLarge.textContent = song.title;
    songArtistLarge.textContent = song.singer || song.artist;
    songLanguageLarge.textContent = song.language || 'Unknown';
    songCompanyLarge.textContent = song.company || 'Unknown';
    musicDirectorValue.textContent = song.music_director || '-';
    composerValue.textContent = song.composer || '-';
    lyricsContentLarge.textContent = song.lyrics || 'No lyrics available';
    playBtnLarge.innerHTML = '<span class="control-icon">⏸️</span>';

    // Show mini player and player view
    miniPlayer.style.display = 'block';
    showPlayerView();

    // Update queue display
    updateQueue();

    // Update play count
    updatePlayCount(song.id);
};

// Update queue display
async function updateQueue() {
    const queueList = document.getElementById('queue-list');

    if (!queueList) return;

    const currentSong = allSongs[currentSongIndex];
    let upcomingSongs = [];

    // If current song is from an album, load all album songs
    if (currentSong && currentSong.album_id) {
        try {
            const response = await fetch(`/api/albums/${currentSong.album_id}`);
            const data = await response.json();

            if (data.songs) {
                // Find current song position in album
                const currentPosInAlbum = data.songs.findIndex(s => s.id === currentSong.id);

                // Get remaining songs from album
                for (let i = currentPosInAlbum + 1; i < data.songs.length; i++) {
                    const albumSong = data.songs[i];
                    const indexInAll = allSongs.findIndex(s => s.id === albumSong.id);
                    if (indexInAll !== -1) {
                        upcomingSongs.push({ ...albumSong, queueIndex: indexInAll, fromAlbum: true });
                    }
                }

                // Show album title in queue
                if (upcomingSongs.length > 0) {
                    const queueTitle = document.querySelector('.queue-title');
                    if (queueTitle) {
                        queueTitle.textContent = `Up Next - ${data.album.title}`;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading album songs:', error);
        }
    }

    // If no album songs or not enough, add regular queue
    if (upcomingSongs.length < 10) {
        const queueTitle = document.querySelector('.queue-title');
        if (queueTitle) {
            queueTitle.textContent = 'Up Next';
        }

        for (let i = currentSongIndex + 1; i < allSongs.length && upcomingSongs.length < 10; i++) {
            if (!upcomingSongs.find(s => s.queueIndex === i)) {
                upcomingSongs.push({ ...allSongs[i], queueIndex: i });
            }
        }

        // If repeat all is on and we're near the end, add songs from beginning
        if (repeatMode === 'all' && upcomingSongs.length < 10) {
            for (let i = 0; i < currentSongIndex && upcomingSongs.length < 10; i++) {
                if (!upcomingSongs.find(s => s.queueIndex === i)) {
                    upcomingSongs.push({ ...allSongs[i], queueIndex: i });
                }
            }
        }
    }

    if (upcomingSongs.length === 0) {
        queueList.innerHTML = '<div class="queue-empty">No more songs in queue</div>';
        return;
    }

    queueList.innerHTML = upcomingSongs.map((song, index) => `
        <div class="queue-item" onclick="playSong(${song.queueIndex})">
            <div class="queue-item-number">${index + 1}</div>
            <div class="queue-item-art">
                <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                     alt="${song.title}"
                     onerror="this.src='/assets/default-cover.jpg'">
            </div>
            <div class="queue-item-info">
                <div class="queue-item-title">${song.title}${song.fromAlbum ? ' <span class="album-badge">Album</span>' : ''}</div>
                <div class="queue-item-artist">${song.singer || song.artist}</div>
            </div>
            <div class="queue-item-duration">${song.duration || ''}</div>
            <button class="queue-item-play" onclick="event.stopPropagation(); playSong(${song.queueIndex})">
                <svg width="16" height="16"><use href="#icon-play"></use></svg>
            </button>
        </div>
    `).join('');
}

// Show player view
function showPlayerView() {
    homeView.style.display = 'none';
    playerView.style.display = 'block';
    miniPlayer.style.display = 'none';
}

// Show home view
function showHomeView() {
    homeView.style.display = 'block';
    playerView.style.display = 'none';
    miniPlayer.style.display = 'block';
}

// Switch between content views (home, albums, explore, library)
function switchContentView(viewName) {
    // Hide all content views
    const allViews = document.querySelectorAll('.content-view');
    allViews.forEach(view => {
        view.style.display = 'none';
    });

    // Show selected view
    const selectedView = document.getElementById(viewName + '-view');
    if (selectedView) {
        selectedView.style.display = 'block';
    }

    // Auto-minimize player when switching views
    if (playerView.style.display === 'block') {
        playerView.style.display = 'none';
        miniPlayer.style.display = 'block';
    }

    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeMenuItem = document.querySelector(`.menu-item[data-view="${viewName}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }

    // Load data based on view
    if (viewName === 'albums') {
        loadAlbumsView();
    } else if (viewName === 'home') {
        // Show carousels, hide filtered section
        showHomeCarousels();
    }
}

// Show home carousels
function showHomeCarousels() {
    const carouselsContainer = document.getElementById('carousels-container');
    const filteredSection = document.getElementById('filtered-songs-section');

    if (carouselsContainer) carouselsContainer.style.display = 'block';
    if (filteredSection) filteredSection.style.display = 'none';

    // Reset language filter active state
    document.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('active'));
}

// Show filtered songs by language
async function showFilteredSongs(language) {
    const carouselsContainer = document.getElementById('carousels-container');
    const filteredSection = document.getElementById('filtered-songs-section');
    const filteredGrid = document.getElementById('filtered-songs-grid');
    const filteredTitle = document.getElementById('filtered-section-title');
    const filteredSubtitle = document.getElementById('filtered-section-subtitle');

    // Hide carousels, show filtered section
    if (carouselsContainer) carouselsContainer.style.display = 'none';
    if (filteredSection) filteredSection.style.display = 'block';

    // Show loading state
    filteredGrid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading songs...</p></div>';

    try {
        const response = await fetch('/api/songs');
        const data = await response.json();
        let songs = data.songs || [];

        // Filter by language if specified
        if (language) {
            songs = songs.filter(song =>
                song.language && song.language.toLowerCase() === language.toLowerCase()
            );
            filteredTitle.textContent = `${language} Songs`;
            filteredSubtitle.textContent = `${songs.length} songs available`;
        } else {
            filteredTitle.textContent = 'All Songs';
            filteredSubtitle.textContent = `${songs.length} songs available`;
        }

        // Display filtered songs
        if (songs.length === 0) {
            filteredGrid.innerHTML = '<div class="loading-state"><p>No songs found</p></div>';
            return;
        }

        allSongs = songs; // Update global songs array

        filteredGrid.innerHTML = songs.map((song, index) => `
            <div class="song-card" onclick="playSong(${index})">
                <div class="song-card-art">
                    <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                         alt="${song.title}"
                         onerror="this.src='/assets/default-cover.jpg'">
                    <div class="song-card-overlay">
                        <button class="play-btn">
                            <svg width="24" height="24"><use href="#icon-play"></use></svg>
                        </button>
                    </div>
                </div>
                <div class="song-card-info">
                    <div class="song-card-title">${song.title}</div>
                    <div class="song-card-artist">${song.artist}</div>
                    <div class="song-card-meta">
                        ${song.language ? `<span class="song-card-language">${song.language}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading filtered songs:', error);
        filteredGrid.innerHTML = '<div class="loading-state"><p>Error loading songs</p></div>';
    }
}

// Toggle play/pause
function togglePlayPause() {
    if (currentSongIndex === -1) return;

    if (isPlaying) {
        audioPlayer.pause();
        miniPlayBtn.innerHTML = '▶️';
        playBtnLarge.innerHTML = '<span class="control-icon">▶️</span>';
    } else {
        audioPlayer.play();
        miniPlayBtn.innerHTML = '⏸️';
        playBtnLarge.innerHTML = '<span class="control-icon">⏸️</span>';
    }
    isPlaying = !isPlaying;
}

// Play next song
function playNext() {
    if (allSongs.length === 0) return;

    if (isShuffled) {
        currentSongIndex = Math.floor(Math.random() * allSongs.length);
    } else {
        currentSongIndex = (currentSongIndex + 1) % allSongs.length;
    }

    playSong(currentSongIndex);
}

// Play previous song
function playPrev() {
    if (allSongs.length === 0) return;

    if (audioPlayer.currentTime > 3) {
        audioPlayer.currentTime = 0;
    } else {
        currentSongIndex = (currentSongIndex - 1 + allSongs.length) % allSongs.length;
        playSong(currentSongIndex);
    }
}

// Toggle shuffle
function toggleShuffle() {
    isShuffled = !isShuffled;
    shuffleBtnLarge.style.color = isShuffled ? 'var(--stage-red)' : 'var(--text-primary)';
}

// Toggle repeat
function toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentIndex + 1) % modes.length];

    if (repeatMode === 'off') {
        repeatBtnLarge.style.color = 'var(--text-primary)';
        repeatBtnLarge.innerHTML = '<span class="control-icon">🔁</span>';
    } else if (repeatMode === 'all') {
        repeatBtnLarge.style.color = 'var(--stage-red)';
        repeatBtnLarge.innerHTML = '<span class="control-icon">🔁</span>';
    } else {
        repeatBtnLarge.style.color = 'var(--stage-red)';
        repeatBtnLarge.innerHTML = '<span class="control-icon">🔂</span>';
    }
}

// Update play count
async function updatePlayCount(songId) {
    try {
        await fetch(`/api/songs/${songId}/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating play count:', error);
    }
}

// Format time
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Setup event listeners
function setupEventListeners() {
    // Mini player controls
    miniPlayBtn.addEventListener('click', togglePlayPause);
    miniPrevBtn.addEventListener('click', playPrev);
    miniNextBtn.addEventListener('click', playNext);
    expandPlayerBtn.addEventListener('click', showPlayerView);

    // Player view controls
    backBtn.addEventListener('click', showHomeView);
    playBtnLarge.addEventListener('click', togglePlayPause);
    prevBtnLarge.addEventListener('click', playPrev);
    nextBtnLarge.addEventListener('click', playNext);
    shuffleBtnLarge.addEventListener('click', toggleShuffle);
    repeatBtnLarge.addEventListener('click', toggleRepeat);

    // Volume controls
    volumeSliderLarge.addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value / 100;
    });

    // Audio player events
    audioPlayer.addEventListener('timeupdate', () => {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        miniProgressFill.style.width = progress + '%';
        progressFillLarge.style.width = progress + '%';
        miniTime.textContent = formatTime(audioPlayer.currentTime);
        currentTimeLarge.textContent = formatTime(audioPlayer.currentTime);
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        durationTimeLarge.textContent = formatTime(audioPlayer.duration);
    });

    audioPlayer.addEventListener('ended', () => {
        if (repeatMode === 'one') {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        } else if (repeatMode === 'all' || currentSongIndex < allSongs.length - 1) {
            playNext();
        } else {
            isPlaying = false;
            miniPlayBtn.innerHTML = '▶️';
            playBtnLarge.innerHTML = '<span class="control-icon">▶️</span>';
        }
    });

    // Progress bar click
    miniProgressBar.addEventListener('click', (e) => {
        const rect = miniProgressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = percent * audioPlayer.duration;
    });

    progressBarLarge.addEventListener('click', (e) => {
        const rect = progressBarLarge.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = percent * audioPlayer.duration;
    });

    // Language filter
    document.querySelectorAll('.playlist-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = item.dataset.lang;

            // Switch to home view if not already there
            switchContentView('home');

            // Show filtered songs
            showFilteredSongs(lang === 'All' ? null : lang);

            // Update active state
            document.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Navigation menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = item.dataset.view;
            if (viewName) {
                switchContentView(viewName);
            }
        });
    });

    // Search
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();
            if (query) {
                const filtered = allSongs.filter(song =>
                    song.title.toLowerCase().includes(query) ||
                    song.artist.toLowerCase().includes(query) ||
                    (song.composer && song.composer.toLowerCase().includes(query))
                );
                displaySongs(filtered);
            } else {
                displaySongs(allSongs);
            }
        }, 300);
    });

    // Menu toggle for mobile
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    // Open/close sidebar
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Auto-close sidebar when menu item clicked
    const menuItems = document.querySelectorAll('.menu-item, .playlist-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    });

    // Close sidebar when clicking outside (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Set initial volume
    audioPlayer.volume = 0.7;
}

// ==================== CATEGORIES SYSTEM ====================

let currentCategoryView = null;

// Load and display categories
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        
        if (data.categories && data.categories.length > 0) {
            document.getElementById('categories-section').style.display = 'block';
            displayCategories(data.categories);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Display categories grid
function displayCategories(categories) {
    const grid = document.getElementById('categories-grid');
    
    grid.innerHTML = categories.map(cat => `
        <div class="category-card" onclick="viewCategory(${cat.id}, '${cat.name.replace(/'/g, "\\'")}', '${cat.icon}', '${cat.description}')">
            <div class="category-icon icon-${cat.icon}"></div>
            <div class="category-name">${cat.name}</div>
            <div class="category-description">${cat.description}</div>
        </div>
    `).join('');
}

// View category songs
async function viewCategory(categoryId, categoryName, categoryIcon, categoryDesc) {
    try {
        const response = await fetch(`/api/categories/${categoryId}/songs`);
        const data = await response.json();

        // Store category data for reload
        window.currentCategoryData = { name: categoryName, icon: categoryIcon, description: categoryDesc };

        // Hide other sections
        document.getElementById('categories-section').style.display = 'none';
        document.getElementById('top10-section').style.display = 'none';
        document.getElementById('carousels-container').style.display = 'none';

        // Auto-minimize player when viewing category
        if (playerView.style.display === 'block') {
            playerView.style.display = 'none';
            miniPlayer.style.display = 'block';
        }

        // Show category view
        await showCategoryView(categoryId, categoryName, categoryIcon, categoryDesc, data.songs);
        
    } catch (error) {
        console.error('Error loading category songs:', error);
        alert('Error loading category. Please try again.');
    }
}

// Display category songs view
async function showCategoryView(categoryId, name, icon, desc, songs) {
    currentCategoryView = categoryId;
    
    const mainContent = document.querySelector('.main-content');
    
    // Check if user is admin
    const isAdmin = document.body.dataset.isAdmin === 'true';
    
    // Get all songs for add functionality
    let allSongs = [];
    if (isAdmin) {
        try {
            const response = await fetch('/api/songs');
            const data = await response.json();
            allSongs = data.songs || [];
        } catch (error) {
            console.error('Error loading all songs:', error);
        }
    }
    
    // Filter out songs already in category
    const songIds = new Set(songs.map(s => s.id));
    const availableSongs = allSongs.filter(s => !songIds.has(s.id));
    
    // Create category view HTML
    const categoryHTML = `
        <div class="category-view active" id="category-view-${categoryId}">
            <button class="category-back-btn" onclick="closeCategoryView()">
                <svg width="20" height="20"><use href="#icon-back"></use></svg>
                Back to Browse
            </button>
            
            <div class="category-header">
                <div class="category-icon icon-${icon}" style="width:100px;height:100px;font-size:3em;margin:0;"></div>
                <div class="category-header-info">
                    <h1>${name}</h1>
                    <p>${desc} • ${songs.length} songs</p>
                </div>
            </div>
            
            <div class="songs-grid">
                ${songs.length > 0 ? songs.map((song, index) => `
                    <div class="song-card">
                        <div class="song-art" onclick="playCategorySong(${categoryId}, ${index})">
                            <img src="${song.cover_image || '/assets/default-cover.jpg'}" alt="${song.title}">
                            <div class="song-overlay">
                                <button class="play-btn">
                                    <svg width="32" height="32"><use href="#icon-play"></use></svg>
                                </button>
                            </div>
                        </div>
                        <div class="song-info">
                            <div class="song-title">${song.title}</div>
                            <div class="song-artist">${song.singer || 'Unknown Artist'}</div>
                        </div>
                        ${isAdmin ? `
                            <button class="remove-from-category-btn" onclick="removeSongFromCategory(${categoryId}, ${song.id}, event)" title="Remove from category">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M2 0L0 2l6 6-6 6 2 2 6-6 6 6 2-2-6-6 6-6-2-2-6 6z"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                `).join('') : '<p style="text-align:center;padding:40px;color:var(--text-secondary)">No songs in this category yet.</p>'}
            </div>
            
            ${isAdmin && availableSongs.length > 0 ? `
                <div class="add-songs-section">
                    <h3>Add More Songs</h3>
                    <input type="text" class="search-songs-input" id="search-category-songs" placeholder="Search songs to add..." onkeyup="filterCategorySongs()">
                    <div class="available-songs-grid" id="available-songs-grid">
                        ${availableSongs.slice(0, 20).map(song => `
                            <div class="song-card available-song-card" data-title="${song.title.toLowerCase()}" data-singer="${(song.singer || '').toLowerCase()}">
                                <div class="song-art">
                                    <img src="${song.cover_image || '/assets/default-cover.jpg'}" alt="${song.title}">
                                </div>
                                <div class="song-info">
                                    <div class="song-title">${song.title}</div>
                                    <div class="song-artist">${song.singer || 'Unknown Artist'}</div>
                                </div>
                                <button class="add-to-category-btn" onclick="addSongToCategory(${categoryId}, ${song.id}, event)">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M8 0v16M0 8h16" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    Add
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Insert before carousels container
    const existingCategoryView = document.querySelector('.category-view');
    if (existingCategoryView) {
        existingCategoryView.remove();
    }
    
    mainContent.insertAdjacentHTML('afterbegin', categoryHTML);
    
    // Store category songs and all songs for playback and management
    window[`category_${categoryId}_songs`] = songs;
    window[`category_${categoryId}_available`] = availableSongs;
}

// Play song from category
function playCategorySong(categoryId, index) {
    const songs = window[`category_${categoryId}_songs`];
    if (songs && songs[index]) {
        playQueue(songs, index);
    }
}

// Close category view
function closeCategoryView() {
    const categoryView = document.querySelector('.category-view');
    if (categoryView) {
        categoryView.remove();
    }

    // Show main sections again
    document.getElementById('categories-section').style.display = 'block';
    document.getElementById('top10-section').style.display = 'block';
    document.getElementById('carousels-container').style.display = 'block';

    // Auto-minimize player when going back home
    if (playerView.style.display === 'block') {
        playerView.style.display = 'none';
        miniPlayer.style.display = 'block';
    }

    currentCategoryView = null;
}


// Add song to category from category view
async function addSongToCategory(categoryId, songId, event) {
    event.stopPropagation();
    
    try {
        const response = await fetch(`/api/categories/${categoryId}/songs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: songId })
        });
        
        if (response.ok) {
            // Reload category view
            const cat = window.currentCategoryData;
            if (cat) {
                viewCategory(categoryId, cat.name, cat.icon, cat.description);
            }
        } else {
            alert('Error adding song to category');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding song to category');
    }
}

// Remove song from category
async function removeSongFromCategory(categoryId, songId, event) {
    event.stopPropagation();
    
    if (!confirm('Remove this song from category?')) return;
    
    try {
        const response = await fetch(`/api/categories/${categoryId}/songs/${songId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Reload category view
            const cat = window.currentCategoryData;
            if (cat) {
                viewCategory(categoryId, cat.name, cat.icon, cat.description);
            }
        } else {
            alert('Error removing song');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error removing song');
    }
}

// Filter available songs by search
function filterCategorySongs() {
    const query = document.getElementById('search-category-songs').value.toLowerCase();
    const cards = document.querySelectorAll('.available-song-card');
    
    cards.forEach(card => {
        const title = card.dataset.title;
        const singer = card.dataset.singer;
        
        if (title.includes(query) || singer.includes(query)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

