// ========================================
// 📱 STAGE MUSIC - MOBILE APP
// YouTube Music Inspired
// ========================================

// State
let allSongs = [];
let currentSong = null;
let isPlaying = false;
let audioPlayer = document.getElementById('audio-player');

// DOM Elements
const miniPlayer = document.getElementById('mini-player');
const fullPlayer = document.getElementById('full-player');
const mainContent = document.getElementById('main-content');

// Mini Player Elements
const miniCover = document.getElementById('mini-cover');
const miniTitle = document.getElementById('mini-title');
const miniArtist = document.getElementById('mini-artist');
const miniPlayBtn = document.getElementById('mini-play-btn');
const miniProgress = document.getElementById('mini-progress');

// Full Player Elements
const albumArt = document.getElementById('album-art');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const playBtnLarge = document.getElementById('play-btn-large');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressFill = document.getElementById('progress-fill');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const minimizeBtn = document.getElementById('minimize-btn');

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    loadSongs();
    setupEventListeners();
    setupBottomNavigation();
});

// ========================================
// DATA LOADING
// ========================================

async function loadSongs() {
    try {
        const response = await fetch('/api/songs');
        const data = await response.json();
        allSongs = data.songs || [];

        renderQuickPicks();
        renderTop10();
        renderAlbums();
        renderCategories();
        renderRecentlyPlayed();
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// ========================================
// RENDER SECTIONS
// ========================================

function renderQuickPicks() {
    const grid = document.getElementById('quick-picks-grid');
    const picks = allSongs.slice(0, 9); // Top 9 songs (3x3 grid)

    grid.innerHTML = picks.map((song, index) => `
        <div class="quick-pick-card" onclick="playSong(${song.id})">
            <img src="${song.cover_image}" alt="${song.title}" class="quick-pick-cover">
            <div class="quick-pick-overlay">
                <div class="quick-pick-title">${song.title}</div>
                <div class="quick-pick-artist">${song.singer || 'Unknown'}</div>
            </div>
        </div>
    `).join('');
}

function renderTop10() {
    const trendingScroll = document.getElementById('trending-scroll');
    const allTrending = allSongs.slice(0, 9); // All 9 songs in horizontal scroll

    console.log('renderTop10: Total songs available:', allSongs.length);
    console.log('renderTop10: Trending songs count:', allTrending.length);

    // All 9 songs in horizontal scroll (YouTube Music style)
    trendingScroll.innerHTML = allTrending.map(song => `
        <div class="song-card" onclick="playSong(${song.id})">
            <img src="${song.cover_image}" alt="${song.title}" class="card-cover">
            <div class="card-info">
                <div class="card-title">${song.title}</div>
                <div class="card-subtitle">${song.singer || 'Unknown'}</div>
            </div>
        </div>
    `).join('');

    // Hide the top3-list section since we're not using it
    const top3List = document.getElementById('top3-list');
    if (top3List) {
        top3List.style.display = 'none';
    }
}

async function renderCategories() {
    try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        const scroll = document.getElementById('categories-scroll');

        const iconMap = {
            'pop': '🎵',
            'romantic': '💖',
            'hiphop': '🎤',
            'devotional': '🙏',
            'gym': '🏋️',
            'trending': '🔥',
            'albums': '💿',
            'haryanvi': '🎻',
            'rajasthani': '🎺',
            'bhojpuri': '🎸'
        };

        scroll.innerHTML = data.categories.map(cat => `
            <div class="category-card" onclick="viewCategory(${cat.id}, '${cat.name}')">
                <div class="category-icon">${iconMap[cat.icon] || '🎵'}</div>
                <div class="category-name">${cat.name}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderRecentlyPlayed() {
    const scroll = document.getElementById('recent-scroll');
    const recent = allSongs.slice(10, 20);

    scroll.innerHTML = recent.map(song => `
        <div class="song-card" onclick="playSong(${song.id})">
            <img src="${song.cover_image}" alt="${song.title}" class="card-cover">
            <div class="card-info">
                <div class="card-title">${song.title}</div>
                <div class="card-subtitle">${song.singer || 'Unknown'}</div>
            </div>
        </div>
    `).join('');
}

async function renderAlbums() {
    try {
        const response = await fetch('/api/albums');
        const data = await response.json();
        const scroll = document.getElementById('albums-scroll');

        if (data.albums && data.albums.length > 0) {
            scroll.innerHTML = data.albums.map(album => `
                <div class="song-card" onclick="viewAlbum(${album.id}, '${escapeHtml(album.name)}')">
                    <img src="${album.cover_image || '/assets/default-cover.jpg'}" alt="${escapeHtml(album.name)}" class="card-cover">
                    <div class="card-info">
                        <div class="card-title">${album.name}</div>
                        <div class="card-subtitle">${album.singer || 'Various Artists'}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading albums:', error);
    }
}

async function viewAlbum(albumId, albumName) {
    try {
        const response = await fetch(`/api/albums/${albumId}`);
        const data = await response.json();

        // Show all songs in album using category view
        showCategoryView(albumName, data.songs || []);
    } catch (error) {
        console.error('Error loading album:', error);
        alert('Error loading album. Please try again.');
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderUpNext() {
    if (!currentSong) return;

    const currentIndex = allSongs.findIndex(s => s.id === currentSong.id);
    const nextSongs = [];

    // Get next 3 songs in queue
    for (let i = 1; i <= 3; i++) {
        const nextIndex = (currentIndex + i) % allSongs.length;
        nextSongs.push(allSongs[nextIndex]);
    }

    const upNextList = document.getElementById('up-next-list');
    upNextList.innerHTML = nextSongs.map(song => `
        <div class="up-next-item" onclick="playSong(${song.id})">
            <img src="${song.cover_image}" alt="${song.title}" class="up-next-cover">
            <div class="up-next-info">
                <div class="up-next-song-title">${song.title}</div>
                <div class="up-next-artist">${song.singer || 'Unknown'}</div>
            </div>
        </div>
    `).join('');
}

// ========================================
// PLAYER FUNCTIONS
// ========================================

function playSong(songId) {
    const song = allSongs.find(s => s.id === songId);
    if (!song) return;

    currentSong = song;

    // Update audio source
    audioPlayer.src = song.audio_file;
    audioPlayer.play();
    isPlaying = true;

    // Update mini player
    miniCover.src = song.cover_image;
    miniTitle.textContent = song.title;
    miniArtist.textContent = song.singer || 'Unknown';
    miniPlayer.style.display = 'flex';
    updatePlayButton(true);

    // Update full player
    albumArt.src = song.cover_image;
    songTitle.textContent = song.title;
    songArtist.textContent = song.singer || 'Unknown';

    // Update up next queue
    renderUpNext();
}

function togglePlay() {
    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
    } else {
        audioPlayer.play();
        isPlaying = true;
    }
    updatePlayButton(isPlaying);
}

function updatePlayButton(playing) {
    const playIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    const pauseIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

    miniPlayBtn.innerHTML = playing ? pauseIcon : playIcon;
    playBtnLarge.innerHTML = playing ? pauseIcon : playIcon;
}

function playNext() {
    if (!currentSong) return;
    const currentIndex = allSongs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % allSongs.length;
    playSong(allSongs[nextIndex].id);
}

function playPrevious() {
    if (!currentSong) return;
    const currentIndex = allSongs.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? allSongs.length - 1 : currentIndex - 1;
    playSong(allSongs[prevIndex].id);
}

// ========================================
// PLAYER UI
// ========================================

function showFullPlayer() {
    fullPlayer.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideFullPlayer() {
    fullPlayer.classList.remove('active');
    document.body.style.overflow = '';
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Mini Player
    miniPlayer.addEventListener('click', (e) => {
        if (e.target !== miniPlayBtn && !miniPlayBtn.contains(e.target)) {
            showFullPlayer();
        }
    });

    miniPlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlay();
    });

    // Full Player Controls
    minimizeBtn.addEventListener('click', hideFullPlayer);
    playBtnLarge.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrevious);

    // Category View Back Button
    const backToHome = document.getElementById('back-to-home');
    if (backToHome) {
        backToHome.addEventListener('click', hideCategoryView);
    }

    // Audio Events
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', playNext);
    audioPlayer.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audioPlayer.duration);
    });

    // Progress Bar Click
    const progressBarContainer = document.getElementById('progress-bar-container');
    progressBarContainer.addEventListener('click', (e) => {
        const rect = progressBarContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = percent * audioPlayer.duration;
    });
}

function updateProgress() {
    if (!audioPlayer.duration) return;

    const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressFill.style.width = percent + '%';
    miniProgress.style.width = percent + '%';
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ========================================
// BOTTOM NAVIGATION
// ========================================

function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active to clicked
            item.classList.add('active');

            // Handle page switching
            const page = item.dataset.page;
            switchPage(page);
        });
    });
}

function switchPage(page) {
    console.log('Switching to:', page);
    // TODO: Implement page switching logic
    // For now, just log
}

// ========================================
// CATEGORY VIEW
// ========================================

async function viewCategory(categoryIdentifier, categoryName) {
    try {
        let categoryId = categoryIdentifier;
        let finalCategoryName = categoryName;

        // If string (like 'haryanvi'), find the category ID
        if (typeof categoryIdentifier === 'string') {
            const response = await fetch('/api/categories');
            const data = await response.json();

            console.log('Looking for category:', categoryIdentifier);
            console.log('Available categories:', data.categories);

            // Try to find by icon first, then by name
            let category = data.categories.find(c => c.icon === categoryIdentifier);

            if (!category) {
                // Try matching by name (case insensitive)
                category = data.categories.find(c =>
                    c.name.toLowerCase().includes(categoryIdentifier.toLowerCase())
                );
            }

            if (category) {
                categoryId = category.id;
                finalCategoryName = category.name;
                console.log('Found category:', category);
            } else {
                console.log('Category not found:', categoryIdentifier);
                alert(`Category "${categoryName}" not found. Please add songs to this category first.`);
                return;
            }
        }

        const response = await fetch(`/api/categories/${categoryId}/songs`);
        const data = await response.json();

        console.log(`Songs in ${finalCategoryName}:`, data.songs);

        // Show all songs in category view
        showCategoryView(finalCategoryName, data.songs || []);
    } catch (error) {
        console.error('Error loading category:', error);
        alert('Error loading category. Please try again.');
    }
}

function showCategoryView(categoryName, songs) {
    const categoryView = document.getElementById('category-view');
    const categoryTitle = document.getElementById('category-view-title');
    const categoryContent = document.getElementById('category-content');

    categoryTitle.textContent = categoryName;

    if (songs.length === 0) {
        categoryContent.innerHTML = `
            <div class="category-empty">
                <div style="font-size: 48px; margin-bottom: 16px;">🎵</div>
                <div>No songs in ${categoryName} yet</div>
            </div>
        `;
    } else {
        categoryContent.innerHTML = `
            <div class="category-songs-list">
                ${songs.map(song => `
                    <div class="category-song-item" onclick="playSong(${song.id})">
                        <img src="${song.cover_image}" alt="${song.title}" class="category-song-cover">
                        <div class="category-song-info">
                            <div class="category-song-title">${song.title}</div>
                            <div class="category-song-artist">${song.singer || 'Unknown'}</div>
                        </div>
                        <div class="category-song-more">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                            </svg>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    categoryView.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideCategoryView() {
    const categoryView = document.getElementById('category-view');
    categoryView.classList.remove('active');
    document.body.style.overflow = '';
}

// ========================================
// TOUCH GESTURES (Future Enhancement)
// ========================================

let touchStartY = 0;
let touchEndY = 0;

miniPlayer.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].screenY;
});

miniPlayer.addEventListener('touchend', (e) => {
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
});

function handleSwipe() {
    const swipeDistance = touchStartY - touchEndY;

    // Swipe up to expand player
    if (swipeDistance > 50) {
        showFullPlayer();
    }
}

// Swipe down on full player to minimize
fullPlayer.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].screenY;
});

fullPlayer.addEventListener('touchend', (e) => {
    touchEndY = e.changedTouches[0].screenY;
    const swipeDistance = touchEndY - touchStartY;

    // Swipe down to minimize
    if (swipeDistance > 100) {
        hideFullPlayer();
    }
});

// ========================================
// UTILITIES
// ========================================

// Prevent pull-to-refresh on iOS
document.body.addEventListener('touchmove', (e) => {
    if (fullPlayer.classList.contains('active')) {
        e.preventDefault();
    }
}, { passive: false });

console.log('🎵 Stage Music Mobile - Ready!');
