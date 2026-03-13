// ========================================
// 📱 STAGE MUSIC - MOBILE APP
// YouTube Music Inspired
// ========================================

// State
let allSongs = [];
let currentSong = null;
let isPlaying = false;
let audioPlayer = document.getElementById('audio-player');

// Queue Context (Smart Queue System)
let currentQueue = []; // Current section/playlist songs
let currentQueueIndex = 0; // Current position in queue
let queueContext = null; // { type: 'section'|'category', id: ..., name: ..., language: 'Haryanvi'|'Rajasthani'|'Bhojpuri' }
let isPlayingFromQueue = false;

// Repeat Mode (off, all, one)
let repeatMode = 'off'; // 'off', 'all'

// Shuffle Mode
let isShuffleOn = false;

// Listening Milestone Tracking
let milestonesReached = {
    '30s': false,
    '1min': false,
    '2min': false,
    '3min': false
};

// ========================================
// OVERFLOW MANAGEMENT (Fix scroll freeze)
// ========================================
function updateBodyOverflow() {
    // Check if ANY view is currently open
    const fullPlayer = document.getElementById('full-player');
    const categoryView = document.getElementById('category-view');
    const searchView = document.getElementById('search-view');
    const libraryView = document.getElementById('library-view');
    const profileView = document.getElementById('profile-view');
    const playlistDetailView = document.getElementById('playlist-detail-view');

    const anyModalOpen =
        document.getElementById('playlist-modal')?.classList.contains('active') ||
        document.getElementById('add-to-playlist-modal')?.classList.contains('active') ||
        document.getElementById('login-modal')?.classList.contains('active') ||
        document.getElementById('register-modal')?.classList.contains('active');

    const anyViewOpen =
        fullPlayer?.classList.contains('active') ||
        categoryView?.classList.contains('active') ||
        searchView?.classList.contains('active') ||
        libraryView?.classList.contains('active') ||
        profileView?.classList.contains('active') ||
        playlistDetailView?.classList.contains('active') ||
        anyModalOpen;

    // Set or clear overflow based on state
    if (anyViewOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }

    console.log('🔄 Overflow updated:', anyViewOpen ? 'hidden' : 'auto');
}

// ========================================
// NAVIGATION STACK (History Management)
// ========================================
let navigationStack = []; // Track current view stack
let isNavigating = false; // Prevent duplicate navigation
let currentViewState = { view: 'home' }; // Current visible state

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
// HELPER FUNCTIONS
// ========================================

// Get best available cover image (handles empty strings)
// quality: 'thumb' (150px), 'mobile' (500px), 'full' (original)
function getCoverImage(song, quality = 'thumb') {
    if (quality === 'full') {
        // Return highest quality available
        return song.cover_image || song.cover_mobile || song.cover_thumb || '/assets/placeholder.png';
    } else if (quality === 'mobile') {
        // Return mobile quality (500px)
        return song.cover_mobile || song.cover_image || song.cover_thumb || '/assets/placeholder.png';
    }
    // Default: thumb (150px) for lists
    return song.cover_thumb || song.cover_mobile || song.cover_image || '/assets/placeholder.png';
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Version check
    console.log('🚀 Stage Music v1.4 - Performance Optimized');
    console.log('📅', new Date().toISOString());
    // Register Service Worker for offline support & caching
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/mobile/sw.js')
            .catch(err => console.log('SW registration failed:', err));
    }

    loadSongs();
    setupEventListeners();
    setupBottomNavigation();
    initializeMediaSession(); // Initialize lock screen controls
    setupNavigationHistory(); // Setup browser back button handling
    preloadFirstSong(); // Preload first song for instant play
});

// ========================================
// SAFETY CHECK - Fix stuck overflow
// ========================================
setInterval(() => {
    updateBodyOverflow();
}, 2000); // Check every 2 seconds

// ========================================
// MEMORY CLEANUP ON PAGE UNLOAD
// ========================================
window.addEventListener('beforeunload', () => {
    // Cleanup HLS instance
    if (window.hlsInstance) {
        try {
            window.hlsInstance.removeAllListeners();
            window.hlsInstance.detachMedia();
            window.hlsInstance.destroy();
            window.hlsInstance = null;
        } catch (e) {
            console.warn('Cleanup warning:', e);
        }
    }

    // Pause and clear audio
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.src = '';
        audioPlayer.load();
    }
});

// ========================================
// PERFORMANCE HELPERS
// ========================================

// Lazy loading image helper
function imgTag(src, alt, className, eager = false) {
    const loading = eager ? 'eager' : 'loading="lazy"';
    return `<img src="${src}" alt="${alt}" class="${className}" ${loading}>`;
}

// ========================================
// DATA LOADING
// ========================================

async function loadSongs() {
    try {
        // STEP 1: Load ONLY Quick Picks (9 songs) - FASTEST!
        await renderQuickPicks();

        // STEP 2: Hide loading screen IMMEDIATELY
        hideLoadingScreen();

        // STEP 3: Load first batch of songs in background (non-blocking)
        setTimeout(async () => {
            const cacheTime = Math.floor(Date.now() / 300000);
            const response = await fetch(`/api/songs?limit=15&lite=true&_t=${cacheTime}`, {
                cache: 'default'
            });
            const data = await response.json();
            allSongs = data.songs || [];

            // Render Top 10 first (most important)
            renderTop10();
        }, 100);

        // STEP 4: Load remaining sections progressively
        setTimeout(() => {
            renderCustomSections();
        }, 300);

        setTimeout(() => {
            renderRegionalHits();
        }, 500);

        setTimeout(() => {
            renderAlbums();
            renderCategories();
        }, 800);

        // STEP 5: Load ALL remaining songs last (background)
        setTimeout(() => loadRemaingSongs(), 1500);

    } catch (error) {
        console.error('Error loading songs:', error);
        hideLoadingScreen();
    }
}



// ========================================
// PRELOAD FIRST SONG FOR FAST PLAY
// ========================================

function preloadFirstSong() {
    // Wait a bit for page to load
    setTimeout(() => {
        if (allSongs.length > 0) {
            const firstSong = allSongs[0];
            const audioUrl = firstSong.audio_file_128 || firstSong.audio_file;
            
            console.log('🚀 Preloading first song for instant play:', firstSong.title);
            
            // Create a hidden audio element to preload
            const preloadAudio = new Audio();
            preloadAudio.preload = 'auto';
            preloadAudio.src = audioUrl;
            
            // Start loading but don't play
            preloadAudio.load();
            
            // Clean up after it's loaded
            preloadAudio.addEventListener('canplaythrough', () => {
                console.log('✅ First song preloaded and ready');
                preloadAudio.remove();
            });
        }
    }, 2000); // Wait 2 seconds after page load
}

async function loadRemaingSongs() {
    try {
        const cacheTime = Math.floor(Date.now() / 300000);
        const response = await fetch(`/api/songs?offset=15&lite=true&_t=${cacheTime}`, {
            cache: 'default'
        });
        const data = await response.json();
        const moreSongs = data.songs || [];

        allSongs = [...allSongs, ...moreSongs];

        // Re-render sections with all songs
        renderCustomSections();
        renderRegionalHits();
        renderAlbums();
        renderCategories();
    } catch (error) {
        console.error('Error loading remaining songs:', error);
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 300);
    }
}

// ========================================
// RENDER SECTIONS
// ========================================

function renderQuickPicksHTML(picks, grid) {
    grid.innerHTML = picks.map((song, index) => `
        <div class="quick-pick-card" onclick="playFromQuickPicks(${song.id})">
            <img src="${getCoverImage(song)}"
                 alt="${song.title}"
                 class="quick-pick-cover"
                 loading="${index < 3 ? 'eager' : 'lazy'}"
                 decoding="async">
            <div class="quick-pick-overlay">
                <div class="quick-pick-title">${song.title}</div>
                <div class="quick-pick-artist">${song.singer || 'Unknown'}</div>
            </div>
        </div>
    `).join('');

    // Store for queue
    window.quickPicksQueue = {
        songs: picks,
        context: { type: 'section', name: 'Quick Picks', language: null }
    };
}

async function renderQuickPicks() {
    const grid = document.getElementById('quick-picks-grid');

    // INSTANT LOAD: Show cached data immediately (for repeat visitors)
    const cached = localStorage.getItem('quickPicks');
    if (cached) {
        try {
            const picks = JSON.parse(cached);
            renderQuickPicksHTML(picks, grid);
        } catch (e) {
            console.error('Cache parse error:', e);
        }
    }

    try {
        // Fetch fresh data with cache-busting
        const response = await fetch(`/api/quick-picks?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });

        const data = await response.json();
        const picks = data.songs || allSongs.slice(0, 9);

        // Update cache for next visit
        localStorage.setItem('quickPicks', JSON.stringify(picks));
        localStorage.setItem('quickPicksTime', Date.now());

        // Re-render with fresh data
        renderQuickPicksHTML(picks, grid);

        // Store for queue
        window.quickPicksQueue = {
            songs: picks,
            context: { type: 'section', name: 'Quick Picks', language: null }
        };
    } catch (error) {
        console.error('Error loading quick picks:', error);
        // Fallback
        const picks = allSongs.slice(0, 9);
        window.quickPicksQueue = {
            songs: picks,
            context: { type: 'section', name: 'Quick Picks', language: null }
        };
        grid.innerHTML = picks.map((song, index) => `
            <div class="quick-pick-card" onclick="playFromQuickPicks(${song.id})">
                <img src="${getCoverImage(song)}" alt="${song.title}" class="quick-pick-cover" loading="eager">
                <div class="quick-pick-overlay">
                    <div class="quick-pick-title">${song.title}</div>
                    <div class="quick-pick-artist">${song.singer || 'Unknown'}</div>
                </div>
            </div>
        `).join('');
    }
}

async function renderTop10() {
    const trendingGrid = document.getElementById('trending-grid');

    try {
        // Fetch from new Trending API with cache-busting
        const response = await fetch(`/api/trending?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json();
        const allTrending = data.songs || allSongs.slice(0, 9);

        console.log('renderTop10: Trending songs count:', allTrending.length);

        // Store for queue
        window.trendingQueue = {
            songs: allTrending,
            context: { type: 'section', name: 'Trending', language: null }
        };

        // Vertical list with horizontal cards
        trendingGrid.innerHTML = allTrending.map(song => `
            <div class="trending-card" onclick="playFromTrending(${song.id})">
                <img src="${getCoverImage(song)}" alt="${escapeHtml(song.title)}" class="trending-cover" loading="lazy">
                <div style="flex: 1; min-width: 0;">
                    <div class="trending-title">${escapeHtml(song.title)}</div>
                    <div class="trending-artist">${escapeHtml(song.singer || 'Unknown')}</div>
                </div>
            </div>
        `).join('');

        // Track Trending section viewed
        if (window.tracker) {
            window.tracker.trackTrendingSectionViewed();
        }
    } catch (error) {
        console.error('Error loading trending:', error);
        // Fallback to first 9 songs
        const allTrending = allSongs.slice(0, 9);
        window.trendingQueue = {
            songs: allTrending,
            context: { type: 'section', name: 'Trending', language: null }
        };
        trendingGrid.innerHTML = allTrending.map(song => `
            <div class="trending-card" onclick="playFromTrending(${song.id})">
                <img src="${getCoverImage(song)}" alt="${escapeHtml(song.title)}" class="trending-cover" loading="lazy">
                <div style="flex: 1; min-width: 0;">
                    <div class="trending-title">${escapeHtml(song.title)}</div>
                    <div class="trending-artist">${escapeHtml(song.singer || 'Unknown')}</div>
                </div>
            </div>
        `).join('');

        // Track Trending section viewed (fallback)
        if (window.tracker) {
            window.tracker.trackTrendingSectionViewed();
        }
    }
}

async function renderCustomSections() {
    const scroll = document.getElementById('custom-sections-scroll');

    try {
        // Fetch custom sections with cache-busting
        const sectionsResponse = await fetch(`/api/custom-sections?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        const sectionsData = await sectionsResponse.json();
        const sections = sectionsData.sections || [];

        if (sections.length === 0) {
            scroll.innerHTML = '<p style="color: #888; padding: 20px;">No custom sections available</p>';
            return;
        }

        // Fetch song counts for each section
        const sectionsWithCounts = await Promise.all(
            sections.map(async (section) => {
                try {
                    const response = await fetch(`/api/custom-sections/${section.id}/songs`);
                    const data = await response.json();
                    return { ...section, count: data.songs.length };
                } catch (error) {
                    return { ...section, count: 0 };
                }
            })
        );

        scroll.innerHTML = sectionsWithCounts.map(section => {
            // If section has cover_image, use image instead of icon
            if (section.cover_image) {
                return `
                    <div class="custom-section-card custom-section-with-image"
                         onclick="viewCustomSection(${section.id}, '${escapeHtml(section.name)}')">
                        <img src="${section.cover_image}" alt="${escapeHtml(section.name)}" class="custom-section-cover-image">
                        <div class="custom-section-overlay">
                            <div class="custom-section-name">${escapeHtml(section.name)}</div>
                            <div class="custom-section-count">${section.count} songs</div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="custom-section-card custom-section-${section.id}"
                         onclick="viewCustomSection(${section.id}, '${escapeHtml(section.name)}')">
                        <div class="custom-section-icon">${section.icon}</div>
                        <div class="custom-section-name">${escapeHtml(section.name)}</div>
                        <div class="custom-section-count">${section.count} songs</div>
                    </div>
                `;
            }
        }).join('');

        // Track Music Collection section viewed
        if (window.tracker) {
            window.tracker.trackMusicCollectionViewed();
        }

    } catch (error) {
        console.error('Error loading custom sections:', error);
        scroll.innerHTML = '<p style="color: #888; padding: 20px;">Error loading sections</p>';
    }
}

// View custom section (like category view)
async function viewCustomSection(sectionId, sectionName) {
    try {
        // Track custom section click
        if (window.tracker) {
            window.tracker.trackCustomSectionClicked(sectionId, sectionName);
        }

        // Force fresh data from server with cache-busting
        const response = await fetch(`/api/custom-sections/${sectionId}/songs?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json();
        const songs = data.songs || [];

        console.log(`📋 ${sectionName} songs loaded (${songs.length}):`, songs.map(s => s.title));

        // Detect language from songs
        let language = null;
        if (songs.length > 0 && songs[0].language) {
            // Check if all songs have the same language
            const firstLang = songs[0].language;
            const allSameLang = songs.every(s => s.language === firstLang);
            if (allSameLang) {
                language = firstLang;
            }
        }

        // Use existing category view
        showCategoryView(sectionName, songs, language);
    } catch (error) {
        console.error('❌ Error loading section songs:', error);
        console.error('Section ID:', sectionId, 'Name:', sectionName);
        console.error('Error details:', error.message, error.stack);

        // Show user-friendly error
        categoryContent.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: var(--text-secondary);">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <div style="font-size: 16px; margin-bottom: 8px;">Failed to load songs</div>
                <div style="font-size: 12px; color: var(--text-tertiary);">${error.message || 'Unknown error'}</div>
                <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: var(--accent-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

async function renderCategories() {
    try {
        const response = await fetch(`/api/categories?t=${Date.now()}`);
        const data = await response.json();
        const scroll = document.getElementById('categories-scroll');

        console.log('🔍 Categories loaded:', data.categories.length);
        console.log('🔍 Regional categories:', data.categories.filter(c => c.cover_image).map(c => ({name: c.name, hasCover: !!c.cover_image})));

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

        scroll.innerHTML = data.categories.map(cat => {
            // If category has cover_image, use it; otherwise use icon
            if (cat.cover_image) {
                console.log('✅ Using cover image for:', cat.name, cat.cover_image);
                return `
                    <div class="category-card category-card-with-image" onclick="viewCategory(${cat.id}, '${cat.name}')">
                        <img src="${cat.cover_image}" alt="${cat.name}" class="category-cover-image">
                        <div class="category-name-overlay">${cat.name}</div>
                    </div>
                `;
            } else {
                return `
                    <div class="category-card" onclick="viewCategory(${cat.id}, '${cat.name}')">
                        <div class="category-icon">${iconMap[cat.icon] || '🎵'}</div>
                        <div class="category-name">${cat.name}</div>
                    </div>
                `;
            }
        }).join('');
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Regional Hits - Update counts
function renderRegionalHits() {
    const haryanviCount = allSongs.filter(s => s.language === 'Haryanvi').length;
    const rajasthaniCount = allSongs.filter(s => s.language === 'Rajasthani').length;
    const bhojpuriCount = allSongs.filter(s => s.language === 'Bhojpuri').length;

    const haryanviEl = document.getElementById('haryanvi-count');
    const rajasthaniEl = document.getElementById('rajasthani-count');
    const bhojpuriEl = document.getElementById('bhojpuri-count');

    if (haryanviEl) haryanviEl.textContent = `${haryanviCount} Songs`;
    if (rajasthaniEl) rajasthaniEl.textContent = `${rajasthaniCount} Songs`;
    if (bhojpuriEl) bhojpuriEl.textContent = `${bhojpuriCount} Songs`;

    // Track Regional Hits section viewed
    if (window.tracker) {
        window.tracker.trackRegionalHitsViewed();
    }
}

// View full language category
async function viewLanguageCategory(language) {
    const categoryName = `${language} Songs`;

    // Map language to category ID
    const categoryIds = {
        'Haryanvi': 7,
        'Rajasthani': 10,
        'Bhojpuri': 8
    };

    const categoryId = categoryIds[language];

    // Track Regional Hits category click
    if (window.tracker) {
        window.tracker.trackRegionalHitsCategory(language, categoryId);
    }

    // Show loading state immediately
    const categoryView = document.getElementById('category-view');
    const categoryTitle = document.getElementById('category-view-title');
    const categoryContent = document.getElementById('category-content');

    categoryTitle.textContent = categoryName;
    categoryContent.innerHTML = `
        <div class="category-loading">
            <div class="spinner"></div>
            <div style="margin-top: 12px; color: var(--text-secondary);">Loading songs...</div>
        </div>
    `;

    categoryView.classList.add('active');
    updateBodyOverflow();

    if (!categoryId) {
        console.error('Unknown language category:', language);
        // Fallback to filtering allSongs
        const languageSongs = allSongs.filter(s => s.language === language);
        showCategoryView(categoryName, languageSongs, null, 'category', null, true); // skipHistory = true
        return;
    }

    try {
        // Load songs from category API in correct position order
        console.log(`🔍 Fetching ${categoryName} from API...`);
        const response = await fetch(`/api/categories/${categoryId}/songs?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });

        console.log(`📡 API Response status:`, response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`📦 API Response data:`, data);

        const songs = data.songs || [];
        console.log(`📋 ${categoryName} loaded from API:`, songs.length, 'songs in admin order');

        // Show songs in category view (skipHistory = true since already open)
        console.log(`🎨 Rendering ${songs.length} songs in category view...`);
        showCategoryView(categoryName, songs, null, 'category', null, true);
        console.log(`✅ Category view rendered successfully`);
    } catch (error) {
        console.error('❌ Error loading category songs:', error);
        console.error('Language:', language, 'Category ID:', categoryId);
        console.error('Error details:', error.message);

        // Fallback to filtering allSongs (offline mode)
        console.log('📴 Using offline mode - filtering from local songs');
        const languageSongs = allSongs.filter(s => s.language === language);
        console.log(`Found ${languageSongs.length} songs locally for ${language}`);

        if (languageSongs.length > 0) {
            showCategoryView(categoryName, languageSongs, null, 'category', null, true);
        } else {
            // No songs found even locally
            categoryContent.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">🎵</div>
                    <div style="font-size: 16px; margin-bottom: 8px;">No ${language} songs found</div>
                    <button onclick="window.history.back()" style="margin-top: 20px; padding: 10px 20px; background: var(--bg-tertiary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Go Back
                    </button>
                </div>
            `;
        }
    }
}

// Temporarily disabled
/*
function renderRecentlyPlayed() {
    const scroll = document.getElementById('recent-scroll');
    const recent = allSongs.slice(10, 20);

    scroll.innerHTML = recent.map(song => `
        <div class="song-card" onclick="playSong(${song.id})">
            <img src="${getCoverImage(song)}" alt="${song.title}" class="card-cover">
            <div class="card-info">
                <div class="card-title">${song.title}</div>
                <div class="card-subtitle">${song.singer || 'Unknown'}</div>
            </div>
        </div>
    `).join('');
}
*/

async function renderAlbums() {
    try {
        const response = await fetch(`/api/albums?t=${Date.now()}`);
        const data = await response.json();
        const container = document.getElementById('albums-by-language');

        if (data.albums && data.albums.length > 0) {
            // Only show albums with songs
            const albumsWithSongs = data.albums.filter(album => album.song_count > 0);

            // Group albums by language
            const albumsByLanguage = {};
            albumsWithSongs.forEach(album => {
                const lang = album.language || 'Other';
                if (!albumsByLanguage[lang]) {
                    albumsByLanguage[lang] = [];
                }
                albumsByLanguage[lang].push(album);
            });

            // Define language order: Haryanvi → Rajasthani → Bhojpuri → Others
            const languageOrder = ['Haryanvi', 'Rajasthani', 'Bhojpuri'];
            const sortedLanguages = Object.keys(albumsByLanguage).sort((a, b) => {
                const indexA = languageOrder.indexOf(a);
                const indexB = languageOrder.indexOf(b);

                // If both are in the priority list, sort by their position
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                // If only A is in the list, it comes first
                if (indexA !== -1) return -1;
                // If only B is in the list, it comes first
                if (indexB !== -1) return 1;
                // If neither is in the list, sort alphabetically
                return a.localeCompare(b);
            });

            // Render each language section in sorted order
            container.innerHTML = sortedLanguages.map(language => {
                const albums = albumsByLanguage[language];

                return `
                    <section class="section">
                        <div class="section-header">
                            <h2 class="section-title">${language} Albums</h2>
                        </div>
                        <div class="horizontal-scroll">
                            ${albums.map(album => `
                                <div class="album-card-small" onclick="viewAlbum(${album.id}, '${escapeHtml(album.title)}')">
                                    <img src="${album.cover_image || '/assets/default-cover.jpg'}" alt="${escapeHtml(album.title)}" class="album-cover-small">
                                    <div class="album-title-small">${escapeHtml(album.title)}</div>
                                    <div class="album-subtitle-small">${album.song_count} songs</div>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading albums:', error);
    }
}

async function viewAlbum(albumId, albumName) {
    try {
        const response = await fetch(`/api/albums/${albumId}`);
        const data = await response.json();
        const album = data.album;
        const songs = data.songs || [];

        // Detect language from album data for queue context
        let language = null;
        if (album && album.language) {
            language = album.language;
        } else if (songs.length > 0 && songs[0].language) {
            language = songs[0].language;
        }

        // Track album click with language
        if (window.tracker) {
            window.tracker.trackAlbumClicked(albumId, albumName, language);
        }

        // Show all songs in album using category view
        showCategoryView(albumName, songs, language, 'album', albumId);
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

    const upNextList = document.getElementById('up-next-list');
    let nextSongs = [];

    // Smart Queue: Show songs from current queue
    if (isPlayingFromQueue && currentQueue.length > 0) {
        // Get remaining songs in queue (up to 10)
        const remainingSongs = currentQueue.slice(currentQueueIndex + 1, currentQueueIndex + 11);
        nextSongs = remainingSongs;

        // Add language indicator if queue will continue with random songs
        if (remainingSongs.length < 10 && queueContext && queueContext.language) {
            upNextList.innerHTML = nextSongs.map(song => `
                <div class="up-next-item" onclick="playSong(${song.id})">
                    <img src="${getCoverImage(song)}" alt="${song.title}" class="up-next-cover">
                    <div class="up-next-info">
                        <div class="up-next-song-title">${song.title}</div>
                        <div class="up-next-artist">${song.singer || 'Unknown'}</div>
                    </div>
                </div>
            `).join('') + `
                <div class="up-next-info-banner">
                    <div style="text-align: center; padding: 16px; color: var(--text-secondary); font-size: 0.9em;">
                        🔄 After this, random ${queueContext.language} songs will play
                    </div>
                </div>
            `;
            return;
        }
    } else {
        // Default: Show next 3 songs from all songs
        const currentIndex = allSongs.findIndex(s => s.id === currentSong.id);
        for (let i = 1; i <= 3; i++) {
            const nextIndex = (currentIndex + i) % allSongs.length;
            nextSongs.push(allSongs[nextIndex]);
        }
    }

    upNextList.innerHTML = nextSongs.map(song => `
        <div class="up-next-item" onclick="playSong(${song.id})">
            <img src="${getCoverImage(song)}" alt="${song.title}" class="up-next-cover">
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

// Play song with queue context (Smart Queue System)
function playSongFromQueue(songId, queue, context) {
    const song = queue.find(s => s.id === songId);
    if (!song) return;

    // Set up queue context
    currentQueue = queue;
    currentQueueIndex = queue.findIndex(s => s.id === songId);
    queueContext = context;
    isPlayingFromQueue = true;

    console.log('🎵 Playing from queue:', context.name, '| Language:', context.language);
    console.log('Queue size:', currentQueue.length, 'songs');

    // Play the song
    playSong(songId);
}

// Helper to play from category view (used by onclick in HTML)
function playSongFromCategoryView(songId, index) {
    if (window.currentCategoryQueue) {
        playSongFromQueue(songId, window.currentCategoryQueue.songs, window.currentCategoryQueue.context);
    } else {
        playSong(songId);
    }
}

// Helper to play from Quick Picks
function playFromQuickPicks(songId) {
    if (window.quickPicksQueue) {
        playSongFromQueue(songId, window.quickPicksQueue.songs, window.quickPicksQueue.context);
    } else {
        playSong(songId);
    }
}

// Helper to play from Trending
function playFromTrending(songId) {
    // Track trending song click
    if (window.tracker && window.trendingQueue) {
        const song = window.trendingQueue.songs.find(s => s.id === songId);
        const position = window.trendingQueue.songs.findIndex(s => s.id === songId);
        if (song) {
            window.tracker.trackTrendingSongClicked(songId, song.title, position);
        }
    }

    if (window.trendingQueue) {
        playSongFromQueue(songId, window.trendingQueue.songs, window.trendingQueue.context);
    } else {
        playSong(songId);
    }
}

// ========================================
// HLS-AWARE AUDIO PLAYER
// ========================================
function loadAudioSource(song) {
    const audioPlayer = document.getElementById('audio-player');

    // Priority: HLS > Optimized (128k) > Original
    if (song.hls_master_url && song.has_hls) {
        // Use HLS.js for adaptive streaming
        if (Hls.isSupported()) {
            console.log('🎵 Loading HLS stream:', song.hls_master_url);

            // Destroy existing HLS instance if any (with proper cleanup)
            if (window.hlsInstance) {
                try {
                    window.hlsInstance.removeAllListeners();
                    window.hlsInstance.detachMedia();
                    window.hlsInstance.destroy();
                } catch (e) {
                    console.warn('HLS cleanup warning:', e);
                } finally {
                    window.hlsInstance = null;
                }
            }

            // Add cache busting timestamp
            const cacheBuster = Date.now();
            const hlsUrlWithCache = song.hls_master_url + '?v=' + cacheBuster;

            const hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 30, // Reduced from 90 to save memory
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                maxBufferSize: 60 * 1000 * 1000, // 60MB max
                maxBufferHole: 0.5,
                xhrSetup: function(xhr, url) {
                    // Add cache buster to all HLS requests
                    if (url.indexOf('?') === -1 && url.indexOf('.m3u8') !== -1) {
                        xhr.open('GET', url + '?v=' + cacheBuster, true);
                    }
                }
            });

            hls.loadSource(hlsUrlWithCache);
            hls.attachMedia(audioPlayer);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('✅ HLS manifest parsed, quality levels:', hls.levels.length);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.log('🔄 HLS error, falling back to standard audio:', data.type);
                    hls.destroy();
                    audioPlayer.src = song.audio_file_128 || song.audio_file;
                }
            });

            // Track quality level switches
            hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                const level = hls.levels[data.level];
                console.log('📊 Switched to quality:', level.bitrate / 1000 + 'kbps');
            });

            window.hlsInstance = hls;

        } else if (audioPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (iOS Safari)
            console.log('🎵 Loading HLS (native):', song.hls_master_url);
            audioPlayer.src = song.hls_master_url;

        } else {
            // No HLS support, use fallback
            console.log('📻 No HLS support, using standard audio');
            audioPlayer.src = song.audio_file_128 || song.audio_file;
        }

    } else {
        // No HLS available, use standard audio
        audioPlayer.src = song.audio_file_128 || song.audio_file;
    }
}

// Regular playSong (without queue context)
function playSong(songId) {
    const song = allSongs.find(s => s.id === songId);
    if (!song) return;

    currentSong = song;

    // Reset listening milestones for new song
    milestonesReached = {
        '30s': false,
        '1min': false,
        '2min': false,
        '3min': false
    };

    // Show loading indicators
    showAudioLoading();

    // Load audio source (HLS-aware)
    loadAudioSource(song);

    // Android-compatible play with error handling
    const playPromise = audioPlayer.play();
    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                isPlaying = true;
                console.log('✅ Playing:', song.title);
                hideAudioLoading(); // Hide loader when playing
            })
            .catch(error => {
                console.error('❌ Play failed:', error);
                isPlaying = false;
                hideAudioLoading(); // Hide loader on error
                // Silently fail - no alert shown
            });
    } else {
        isPlaying = true;
        hideAudioLoading();
    }

    // Track play history
    trackPlayHistory(song.id);

    // Track RudderStack event
    if (window.tracker) {
        const source = queueContext ? queueContext.name : 'direct';
        const position = isPlayingFromQueue ? currentQueueIndex : 0;
        window.tracker.trackSongPlay(song, source, position);

        // Increment songs played counter for session tracking
        window.tracker.incrementSongsPlayed();

        // Additional tracking for album songs
        if (queueContext && queueContext.type === 'album') {
            window.tracker.trackAlbumSongPlayed(
                song.id,
                song.title,
                queueContext.id,
                queueContext.name,
                queueContext.language
            );
        }
    }

    // Update mini player
    miniCover.src = getCoverImage(song, 'thumb');
    miniTitle.textContent = song.title;
    miniArtist.textContent = song.singer || 'Unknown';
    miniPlayer.style.display = 'flex';
    updatePlayButton(true);

    // Update full player - use mobile quality (better resolution)
    albumArt.src = getCoverImage(song, 'mobile');
    songTitle.textContent = song.title;
    songArtist.textContent = song.singer || 'Unknown';

    // Update Media Session (lock screen / notification)
    updateMediaSession(song);

    // Update up next queue
    renderUpNext();
}



// ========================================
// AUDIO LOADING INDICATORS
// ========================================

function showAudioLoading() {
    // Show loading overlay
    const overlay = document.getElementById('audio-loading');
    if (overlay) overlay.classList.add('active');

    // Show spinner in play buttons
    const miniBtn = document.getElementById('mini-play-btn');
    const miniSpinner = document.getElementById('mini-spinner');
    if (miniBtn) miniBtn.classList.add('loading');
    if (miniSpinner) miniSpinner.classList.add('active');

    const fullBtn = document.getElementById('play-btn-large');
    const fullSpinner = document.getElementById('full-spinner');
    if (fullBtn) fullBtn.classList.add('loading');
    if (fullSpinner) fullSpinner.classList.add('active');

    console.log('⏳ Loading audio...');
}

function hideAudioLoading() {
    // Hide loading overlay
    const overlay = document.getElementById('audio-loading');
    if (overlay) overlay.classList.remove('active');

    // Hide spinner in play buttons
    const miniBtn = document.getElementById('mini-play-btn');
    const miniSpinner = document.getElementById('mini-spinner');
    if (miniBtn) miniBtn.classList.remove('loading');
    if (miniSpinner) miniSpinner.classList.remove('active');

    const fullBtn = document.getElementById('play-btn-large');
    const fullSpinner = document.getElementById('full-spinner');
    if (fullBtn) fullBtn.classList.remove('loading');
    if (fullSpinner) fullSpinner.classList.remove('active');
}

function hideAudioLoading() {
    // Hide loading overlay
    const overlay = document.getElementById('audio-loading');
    if (overlay) overlay.classList.remove('active');

    // Hide spinner in play buttons
    const miniBtn = document.getElementById('mini-play-btn');
    const miniSpinner = document.getElementById('mini-spinner');
    if (miniBtn) miniBtn.classList.remove('loading');
    if (miniSpinner) miniSpinner.classList.remove('active');

    const fullBtn = document.getElementById('play-btn-large');
    const fullSpinner = document.getElementById('full-spinner');
    if (fullBtn) fullBtn.classList.remove('loading');
    if (fullSpinner) fullSpinner.classList.remove('active');

    console.log('✅ Audio loaded');
}

function togglePlay() {
    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;

        // Track pause event
        if (window.tracker && currentSong) {
            window.tracker.trackSongPause(
                currentSong,
                audioPlayer.currentTime,
                audioPlayer.duration
            );
        }
    } else {
        audioPlayer.play();
        isPlaying = true;
    }
    updatePlayButton(isPlaying);

    // Update Media Session playback state
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
}

function updatePlayButton(playing) {
    const playIcon = `<div class="play-btn-ring"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>`;
    const pauseIcon = `<div class="play-btn-ring"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg></div>`;

    miniPlayBtn.innerHTML = playing ? pauseIcon : playIcon;
    
    const playBtnLarge = document.getElementById('play-btn-large');
    if (playing) {
        playBtnLarge.innerHTML = pauseIcon + '<div class="loading-spinner" id="full-spinner"></div>';
        playBtnLarge.classList.add('playing');
    } else {
        playBtnLarge.innerHTML = playIcon + '<div class="loading-spinner" id="full-spinner"></div>';
        playBtnLarge.classList.remove('playing');
    }
}

function toggleRepeat() {
    // Cycle through: off -> all -> off
    if (repeatMode === 'off') {
        repeatMode = 'all';
    } else {
        repeatMode = 'off';
    }

    updateRepeatButton();
    console.log('🔁 Repeat mode:', repeatMode);

    // Track repeat toggle
    if (window.tracker) {
        window.tracker.trackRepeatToggled(repeatMode);
    }
}

function updateRepeatButton() {
    const repeatBtn = document.getElementById('repeat-btn');
    if (!repeatBtn) return;

    // 2 states: off (normal) and all (loop)
    const repeatOffIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
    </svg>
    <span class="repeat-badge">✕</span>`;

    const repeatAllIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
    </svg>
    <span class="repeat-badge">1</span>`;

    if (repeatMode === 'off') {
        repeatBtn.innerHTML = repeatOffIcon;
        repeatBtn.classList.remove('active');
    } else {
        repeatBtn.innerHTML = repeatAllIcon;
        repeatBtn.classList.add('active');
    }
}

function toggleShuffle() {
    // Toggle shuffle
    isShuffleOn = !isShuffleOn;
    
    updateShuffleButton();
    console.log('🔀 Shuffle:', isShuffleOn ? 'ON' : 'OFF');
    
    // If turning on, shuffle the current queue
    if (isShuffleOn && currentQueue.length > 0) {
        shuffleCurrentQueue();
    }
    
    // Track shuffle toggle
    if (window.tracker) {
        window.tracker.trackEvent('shuffle_toggled', {
            is_shuffle_on: isShuffleOn
        });
    }
}

function updateShuffleButton() {
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (!shuffleBtn) return;
    
    if (isShuffleOn) {
        shuffleBtn.classList.add('active');
    } else {
        shuffleBtn.classList.remove('active');
    }
}

function shuffleCurrentQueue() {
    if (!currentQueue || currentQueue.length <= 1) return;
    
    // Fisher-Yates shuffle
    for (let i = currentQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentQueue[i], currentQueue[j]] = [currentQueue[j], currentQueue[i]];
    }
    
    // Find current song position in shuffled queue
    if (currentSong) {
        const currentIndex = currentQueue.findIndex(s => s.id === currentSong.id);
        if (currentIndex > 0) {
            currentQueueIndex = currentIndex;
        }
    }
    
    console.log('🔀 Queue shuffled, current index:', currentQueueIndex);
}

async function playNext() {
    if (!currentSong) return;

    // Track skip event
    if (window.tracker && currentSong) {
        window.tracker.trackSongSkipped(currentSong, 'next');
    }

    // Repeat All - repeat same song
    if (repeatMode === 'all') {
        console.log('🔁 Repeat: Replaying same song');
        audioPlayer.currentTime = 0;
        audioPlayer.play().catch(e => console.log('Play failed:', e));
        return;
    }

    // Smart Queue System
    if (isPlayingFromQueue && currentQueue.length > 0) {
        // If shuffle is on, pick random song
        if (isShuffleOn) {
            const randomIndex = Math.floor(Math.random() * currentQueue.length);
            currentQueueIndex = randomIndex;
        } else {
            currentQueueIndex++;
        }

        // If still in queue, play next song
        if (currentQueueIndex < currentQueue.length) {
            const nextSong = currentQueue[currentQueueIndex];
            console.log('▶️ Playing next in queue:', nextSong.title);
            playSong(nextSong.id);
            return;
        }

        // Queue finished - check repeat mode
        if (repeatMode === 'all') {
            // Loop back to start of queue
            console.log('🔁 Repeat All: Looping to start of queue');
            currentQueueIndex = 0;
            playSong(currentQueue[0].id);
            return;
        }

        // Queue finished - load random songs from same language (only if not repeat mode)
        if (queueContext && queueContext.language) {
            console.log('🔄 Queue complete! Loading random', queueContext.language, 'songs...');
            const randomSongs = await loadRandomSongsByLanguage(queueContext.language);

            if (randomSongs && randomSongs.length > 0) {
                // Update queue with random songs
                currentQueue = randomSongs;
                currentQueueIndex = 0;
                queueContext = {
                    type: 'random',
                    name: `Random ${queueContext.language} Songs`,
                    language: queueContext.language
                };
                playSong(randomSongs[0].id);
                return;
            }
        }

        // Fallback: reset to all songs if no language context
        isPlayingFromQueue = false;
    }

    // Default behavior: play from all songs
    const currentIndex = allSongs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % allSongs.length;
    playSong(allSongs[nextIndex].id);
}

// Load random songs by language for infinite playback
async function loadRandomSongsByLanguage(language) {
    try {
        // Get all songs from albums of this language with cache-busting
        const response = await fetch(`/api/albums?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json();
        const albums = data.albums || [];

        // Filter albums by language
        const languageAlbums = albums.filter(album =>
            album.language && album.language.toLowerCase() === language.toLowerCase()
        );

        if (languageAlbums.length === 0) {
            console.log('No albums found for language:', language);
            return [];
        }

        // Collect all songs from these albums
        let allLanguageSongs = [];
        for (const album of languageAlbums) {
            const albumResponse = await fetch(`/api/albums/${album.id}/songs`);
            const albumData = await albumResponse.json();
            if (albumData.songs) {
                allLanguageSongs = allLanguageSongs.concat(albumData.songs);
            }
        }

        // Shuffle songs for random playback
        const shuffled = allLanguageSongs.sort(() => Math.random() - 0.5);
        console.log(`✅ Loaded ${shuffled.length} random ${language} songs`);
        return shuffled;
    } catch (error) {
        console.error('Error loading random songs:', error);
        return [];
    }
}

function playPrevious() {
    if (!currentSong) return;

    // Track skip event
    if (window.tracker && currentSong) {
        window.tracker.trackSongSkipped(currentSong, 'previous');
    }

    // Smart Queue System - play previous from queue
    if (isPlayingFromQueue && currentQueue.length > 0) {
        currentQueueIndex--;

        // If still in queue, play previous song
        if (currentQueueIndex >= 0) {
            const prevSong = currentQueue[currentQueueIndex];
            console.log('⏮️ Playing previous in queue:', prevSong.title);
            playSong(prevSong.id);
            return;
        }

        // If at start of queue, loop to end if repeat is on
        if (repeatMode === 'all') {
            currentQueueIndex = currentQueue.length - 1;
            const lastSong = currentQueue[currentQueueIndex];
            console.log('🔁 Looping to end of queue:', lastSong.title);
            playSong(lastSong.id);
            return;
        }

        // Otherwise stay at first song
        currentQueueIndex = 0;
        return;
    }

    // Default behavior: play from all songs
    const currentIndex = allSongs.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? allSongs.length - 1 : currentIndex - 1;
    playSong(allSongs[prevIndex].id);
}

// ========================================
// PLAYER UI
// ========================================

function showFullPlayer(skipHistory = false) {
    fullPlayer.classList.add('active');
    updateBodyOverflow(); // Centralized overflow management

    // Push to navigation history (unless coming from back button)
    if (!skipHistory) {
        pushNavigationState('player');
    }

    // Track mini player expansion
    if (window.tracker) {
        window.tracker.trackMiniPlayerExpanded();
    }
}

function hideFullPlayer() {
    fullPlayer.classList.remove('active');
    updateBodyOverflow();

    // Track full player minimized
    if (window.tracker) {
        window.tracker.trackFullPlayerMinimized();
    }
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

    // Full Player Controls - Use browser back for minimize
    minimizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.back();
    });
    playBtnLarge.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrevious);

    // Repeat button
    const repeatBtn = document.getElementById('repeat-btn');
    if (repeatBtn) {
        repeatBtn.addEventListener('click', toggleRepeat);
        updateRepeatButton(); // Initialize button state
    }

    // Shuffle button
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', toggleShuffle);
        updateShuffleButton(); // Initialize button state
    }

    // Add to Playlist button in full player
    const addToPlaylistBtn = document.getElementById('add-current-to-playlist-btn');
    if (addToPlaylistBtn) {
        addToPlaylistBtn.addEventListener('click', () => {
            console.log('🎵 Add to Playlist clicked!');
            console.log('Current song:', currentSong);
            if (currentSong && currentSong.id) {
                console.log('Opening playlist modal for song ID:', currentSong.id);
                showAddToPlaylistModal(currentSong.id);
            } else {
                console.error('No current song!');
                alert('No song is currently playing');
            }
        });
    } else {
        console.error('❌ Add to Playlist button not found!');
    }

    // Category View Back Button - Use browser back
    const backToHome = document.getElementById('back-to-home');
    if (backToHome) {
        backToHome.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }

    // Search
    setupSearchListeners();

    // Playlists
    setupPlaylistListeners();

    // Authentication
    setupAuthListeners();

    // Audio Events
    
    // Audio loading events
    audioPlayer.addEventListener('loadstart', () => {
        console.log('📥 Loading started...');
        showAudioLoading();
    });

    audioPlayer.addEventListener('canplay', () => {
        console.log('✅ Can play - hiding loader');
        hideAudioLoading();
    });

    audioPlayer.addEventListener('playing', () => {
        console.log('▶️ Playing - hiding loader');
        hideAudioLoading();
    });

    audioPlayer.addEventListener('waiting', () => {
        console.log('⏳ Buffering...');
        showAudioLoading();
    });

    audioPlayer.addEventListener('error', () => {
        console.log('❌ Audio error');
        hideAudioLoading();
    });

    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', () => {
        // Track song completion
        if (window.tracker && currentSong) {
            window.tracker.trackSongComplete(currentSong);
        }
        playNext();
    });
    audioPlayer.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audioPlayer.duration);
    });

    // Progress Bar Seek (Click and Drag)
    setupProgressBarSeek();
}

function updateProgress() {
    if (!audioPlayer.duration) return;

    const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressFill.style.width = percent + '%';
    miniProgress.style.width = percent + '%';
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);

    // Update thumb position
    const progressThumb = document.getElementById('progress-thumb');
    if (progressThumb) {
        progressThumb.style.left = percent + '%';
    }

    // Track listening milestones - 4 separate events
    if (window.tracker && currentSong) {
        const currentTime = audioPlayer.currentTime;
        const duration = audioPlayer.duration;

        // 30 seconds milestone
        if (!milestonesReached['30s'] && currentTime >= 30) {
            milestonesReached['30s'] = true;
            window.tracker.trackSong30sListened(currentSong, currentTime, duration);
        }

        // 1 minute milestone
        if (!milestonesReached['1min'] && currentTime >= 60) {
            milestonesReached['1min'] = true;
            window.tracker.trackSong1minListened(currentSong, currentTime, duration);
        }

        // 2 minutes milestone
        if (!milestonesReached['2min'] && currentTime >= 120) {
            milestonesReached['2min'] = true;
            window.tracker.trackSong2minListened(currentSong, currentTime, duration);
        }

        // 3 minutes milestone
        if (!milestonesReached['3min'] && currentTime >= 180) {
            milestonesReached['3min'] = true;
            window.tracker.trackSong3minListened(currentSong, currentTime, duration);
        }
    }
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Progress Bar Seek - Click and Drag functionality
function setupProgressBarSeek() {
    const progressBarContainer = document.getElementById('progress-bar-container');
    const progressThumb = document.getElementById('progress-thumb');
    let isDragging = false;
    let wasPlaying = false;

    function seek(e) {
        if (!audioPlayer.duration) return;

        const rect = progressBarContainer.getBoundingClientRect();
        let clientX;

        // Handle both mouse and touch events
        if (e.type.includes('touch')) {
            clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX;
        } else {
            clientX = e.clientX;
        }

        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = percent * audioPlayer.duration;

        // Update audio time
        audioPlayer.currentTime = newTime;

        // Update UI immediately
        progressFill.style.width = (percent * 100) + '%';
        progressThumb.style.left = (percent * 100) + '%';
        currentTimeEl.textContent = formatTime(newTime);
    }

    function startDrag(e) {
        isDragging = true;
        wasPlaying = isPlaying;

        // Pause during drag for smooth seeking
        if (isPlaying) {
            audioPlayer.pause();
        }

        progressThumb.classList.add('dragging');
        seek(e);

        // Prevent default to avoid text selection
        e.preventDefault();
    }

    function drag(e) {
        if (!isDragging) return;
        seek(e);
    }

    function endDrag(e) {
        if (!isDragging) return;

        isDragging = false;
        progressThumb.classList.remove('dragging');

        // Resume playback if it was playing before
        if (wasPlaying) {
            audioPlayer.play().catch(e => console.log('Play failed:', e));
        }
    }

    // Mouse events
    progressBarContainer.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    // Touch events for mobile
    progressBarContainer.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);

    // Click to seek (single tap)
    progressBarContainer.addEventListener('click', (e) => {
        if (!isDragging) {
            seek(e);
        }
    });
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

let searchTimeout = null;

function showSearchView() {
    const searchView = document.getElementById('search-view');
    searchView.classList.add('active');
    updateBodyOverflow();

    // Push to navigation history
    pushNavigationState('search');

    // Focus on search input
    setTimeout(() => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
    }, 100);
}

function hideSearchView() {
    const searchView = document.getElementById('search-view');
    searchView.classList.remove('active');
    updateBodyOverflow();

    // Clear search input and reset states
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    document.getElementById('search-empty').style.display = 'flex';
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('search-loading').style.display = 'none';
    document.getElementById('search-no-results').style.display = 'none';
    document.getElementById('clear-search').style.display = 'none';
}

async function performSearch(query) {
    if (!query || query.trim().length === 0) {
        // Show empty state
        document.getElementById('search-empty').style.display = 'flex';
        document.getElementById('search-results').style.display = 'none';
        document.getElementById('search-loading').style.display = 'none';
        document.getElementById('search-no-results').style.display = 'none';
        return;
    }

    // Show loading state
    document.getElementById('search-empty').style.display = 'none';
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('search-loading').style.display = 'flex';
    document.getElementById('search-no-results').style.display = 'none';

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        // Hide loading
        document.getElementById('search-loading').style.display = 'none';

        const resultsCount = data.results ? data.results.length : 0;

        // Track search event
        if (window.tracker) {
            window.tracker.trackSearch(query, resultsCount);
        }

        if (data.results && data.results.length > 0) {
            showSearchResults(data.results);
        } else {
            // Track no results
            if (window.tracker) {
                window.tracker.trackSearchNoResults(query);
            }
            // Show no results
            document.getElementById('search-no-results').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error searching:', error);
        document.getElementById('search-loading').style.display = 'none';
        document.getElementById('search-no-results').style.display = 'flex';
    }
}

function showSearchResults(results) {
    const resultsCount = document.getElementById('results-count');
    const resultsList = document.getElementById('search-results-list');
    const resultsContainer = document.getElementById('search-results');

    resultsCount.textContent = `${results.length} result${results.length === 1 ? '' : 's'}`;

    resultsList.innerHTML = results.map(song => `
        <div class="search-result-item" onclick="playSong(${song.id})">
            <img src="${getCoverImage(song)}" alt="${song.title}" class="search-result-cover">
            <div class="search-result-info">
                <div class="search-result-title">${song.title}</div>
                <div class="search-result-artist">${song.singer || 'Unknown'}</div>
            </div>
            <div class="search-result-more">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
            </div>
        </div>
    `).join('');

    resultsContainer.style.display = 'block';
}

function setupSearchListeners() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const closeSearchBtn = document.getElementById('close-search');
    const searchBtn = document.getElementById('search-btn');

    // Search button in top bar
    if (searchBtn) {
        searchBtn.addEventListener('click', showSearchView);
    }

    // Close search button - Use browser back
    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }

    // Search input with debounce
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;

            // Show/hide clear button
            if (clearSearchBtn) {
                clearSearchBtn.style.display = query.length > 0 ? 'block' : 'none';
            }

            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            // Debounce search by 300ms
            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 300);
        });

        // Prevent form submission on Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }

    // Clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            document.getElementById('search-empty').style.display = 'flex';
            document.getElementById('search-results').style.display = 'none';
            document.getElementById('search-loading').style.display = 'none';
            document.getElementById('search-no-results').style.display = 'none';
            searchInput.focus();
        });
    }
}

// ========================================
// PLAYLIST MANAGEMENT
// ========================================

let currentPlaylistId = null;
let currentSongForPlaylist = null;
let currentUser = null;

// Library View Functions
async function showLibraryView() {
    const libraryView = document.getElementById('library-view');
    libraryView.classList.add('active');
    updateBodyOverflow();

    // Push to navigation history
    pushNavigationState('library');

    // Check authentication
    await checkAuthAndLoadPlaylists();
}

function hideLibraryView() {
    const libraryView = document.getElementById('library-view');
    libraryView.classList.remove('active');
    updateBodyOverflow();
}

async function checkAuthAndLoadPlaylists() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            document.getElementById('library-login-prompt').style.display = 'none';
            document.getElementById('library-playlists').style.display = 'block';
            await loadUserPlaylists();
        } else {
            currentUser = null;
            document.getElementById('library-login-prompt').style.display = 'flex';
            document.getElementById('library-playlists').style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        document.getElementById('library-login-prompt').style.display = 'flex';
        document.getElementById('library-playlists').style.display = 'none';
    }
}

async function loadUserPlaylists() {
    try {
        const response = await fetch('/api/playlists');
        if (!response.ok) throw new Error('Failed to load playlists');

        const data = await response.json();
        renderPlaylists(data.playlists || []);
    } catch (error) {
        console.error('Error loading playlists:', error);
        document.getElementById('library-empty').style.display = 'flex';
        document.getElementById('playlists-grid').innerHTML = '';
    }
}

function renderPlaylists(playlists) {
    const grid = document.getElementById('playlists-grid');
    const emptyState = document.getElementById('library-empty');

    if (playlists.length === 0) {
        emptyState.style.display = 'flex';
        grid.innerHTML = '';
    } else {
        emptyState.style.display = 'none';
        grid.innerHTML = playlists.map(playlist => `
            <div class="playlist-card" onclick="viewPlaylistDetail(${playlist.id})">
                <div class="playlist-icon">🎵</div>
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-count">${playlist.song_count || 0} songs</div>
            </div>
        `).join('');
    }
}

// Playlist Detail Functions
async function viewPlaylistDetail(playlistId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}`);
        if (!response.ok) throw new Error('Failed to load playlist');

        const data = await response.json();
        showPlaylistDetailView(data.playlist, data.songs || []);
    } catch (error) {
        console.error('Error loading playlist:', error);
        alert('Error loading playlist. Please try again.');
    }
}

function showPlaylistDetailView(playlist, songs) {
    currentPlaylistId = playlist.id;

    // Track playlist viewed
    if (window.tracker) {
        window.tracker.trackPlaylistViewed(playlist.id, playlist.name);
    }

    const view = document.getElementById('playlist-detail-view');
    const content = document.getElementById('playlist-detail-content');
    const header = document.getElementById('playlist-detail-title-header');

    header.textContent = playlist.name;

    content.innerHTML = `
        <div class="playlist-hero">
            <div class="playlist-hero-icon">🎵</div>
            <h1 class="playlist-hero-title">${playlist.name}</h1>
            ${playlist.description ? `<p class="playlist-hero-desc">${playlist.description}</p>` : ''}
            <div class="playlist-hero-stats">${songs.length} songs</div>
            ${songs.length > 0 ? `
                <div class="playlist-actions">
                    <button class="btn-play-all" onclick="playPlaylist(${playlist.id})">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        Play All
                    </button>
                </div>
            ` : ''}
        </div>

        <div class="playlist-songs-section">
            ${songs.length > 0 ? `
                <div class="playlist-songs-header">Songs</div>
                ${songs.map(song => `
                    <div class="playlist-song-item">
                        <img src="${getCoverImage(song)}" alt="${song.title}" class="playlist-song-cover" onclick="playSong(${song.id})">
                        <div class="playlist-song-info" onclick="playSong(${song.id})">
                            <div class="playlist-song-title">${song.title}</div>
                            <div class="playlist-song-artist">${song.singer || 'Unknown'}</div>
                        </div>
                        <button class="playlist-song-remove" onclick="removeSongFromPlaylist(${playlist.id}, ${song.id})">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            ` : `
                <div class="playlist-empty">
                    <div style="font-size: 48px; margin-bottom: 16px;">🎵</div>
                    <div>No songs in this playlist yet</div>
                    <div style="margin-top: 8px; font-size: 12px;">Add songs from the home screen</div>
                </div>
            `}
        </div>
    `;

    view.classList.add('active');
    updateBodyOverflow();
}

function hidePlaylistDetailView() {
    const view = document.getElementById('playlist-detail-view');
    view.classList.remove('active');
    updateBodyOverflow();
    currentPlaylistId = null;
}

async function playPlaylist(playlistId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}`);
        if (!response.ok) throw new Error('Failed to load playlist');

        const data = await response.json();
        const songs = data.songs || [];

        // Track playlist played
        if (window.tracker && data.playlist) {
            window.tracker.trackPlaylistPlayed(playlistId, data.playlist.name);
        }

        if (songs.length > 0) {
            playSong(songs[0].id);
        }
    } catch (error) {
        console.error('Error playing playlist:', error);
    }
}

async function removeSongFromPlaylist(playlistId, songId) {
    if (!confirm('Remove this song from the playlist?')) return;

    try {
        const response = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to remove song');

        // Track song removed from playlist
        if (window.tracker) {
            const song = allSongs.find(s => s.id === songId);
            window.tracker.trackSongRemovedFromPlaylist(
                songId,
                playlistId,
                song ? song.title : null
            );
        }

        // Reload playlist detail
        await viewPlaylistDetail(playlistId);
    } catch (error) {
        console.error('Error removing song:', error);
        alert('Error removing song. Please try again.');
    }
}

// Create/Edit Playlist Modal Functions
function showCreatePlaylistMobile() {
    const modal = document.getElementById('playlist-modal');
    const title = document.getElementById('playlist-modal-title');
    const submitBtn = document.getElementById('playlist-submit-btn');

    title.textContent = 'Create Playlist';
    submitBtn.textContent = 'Create';

    document.getElementById('playlist-name-mobile').value = '';
    document.getElementById('playlist-desc-mobile').value = '';
    document.getElementById('playlist-public-mobile').checked = false;

    modal.classList.add('active');
    updateBodyOverflow();
}

function closePlaylistModal() {
    const modal = document.getElementById('playlist-modal');
    modal.classList.remove('active');
    updateBodyOverflow();
}

async function handlePlaylistFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('playlist-name-mobile').value.trim();
    const description = document.getElementById('playlist-desc-mobile').value.trim();
    const isPublic = document.getElementById('playlist-public-mobile').checked;

    if (!name) {
        alert('Please enter a playlist name');
        return;
    }

    try {
        console.log('📝 Creating playlist:', { name, description, is_public: isPublic });

        const response = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                description,
                is_public: isPublic ? 1 : 0
            })
        });

        console.log('📡 Response status:', response.status);

        if (response.status === 401) {
            alert('Please sign in to create playlists');
            closePlaylistModal();
            showMobileLogin();
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Server error:', errorData);
            throw new Error(errorData.error || 'Failed to create playlist');
        }

        const data = await response.json();
        console.log('✅ Playlist created:', data);

        // Track playlist creation
        if (window.tracker && data.playlist) {
            window.tracker.trackPlaylistCreate(
                data.playlist.id,
                data.playlist.name,
                data.playlist.is_public === 1
            );
        }

        closePlaylistModal();
        await loadUserPlaylists();

        // If we have a song waiting to be added, add it now
        if (currentSongForPlaylist) {
            await addToPlaylist(data.playlist.id, currentSongForPlaylist);
            currentSongForPlaylist = null;
        }
    } catch (error) {
        console.error('❌ Error creating playlist:', error);
        alert('Error creating playlist: ' + error.message);
    }
}

// Add to Playlist Modal Functions
async function showAddToPlaylistModal(songId) {
    console.log('📝 showAddToPlaylistModal called with songId:', songId);
    currentSongForPlaylist = songId;

    // Check if user is logged in
    try {
        console.log('Checking authentication...');
        const authResponse = await fetch('/api/auth/me');
        console.log('Auth response status:', authResponse.status);

        if (!authResponse.ok) {
            console.log('User not logged in');
            alert('Please sign in to add songs to playlists');
            showMobileLogin();
            return;
        }

        console.log('User logged in, fetching playlists...');

        const playlistsResponse = await fetch('/api/playlists');
        if (!playlistsResponse.ok) throw new Error('Failed to load playlists');

        const data = await playlistsResponse.json();
        const playlists = data.playlists || [];
        console.log('Playlists loaded:', playlists.length);

        const modal = document.getElementById('add-to-playlist-modal');
        const list = document.getElementById('playlist-select-list');
        console.log('Modal element:', modal ? 'Found' : 'NOT FOUND');
        console.log('List element:', list ? 'Found' : 'NOT FOUND');

        if (playlists.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: var(--space-xxl); color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">🎵</div>
                    <div>You don't have any playlists yet</div>
                </div>
            `;
        } else {
            list.innerHTML = playlists.map(playlist => `
                <div class="playlist-select-item" onclick="addToPlaylist(${playlist.id}, ${songId})">
                    <div class="playlist-select-icon">🎵</div>
                    <div class="playlist-select-info">
                        <div class="playlist-select-name">${playlist.name}</div>
                        <div class="playlist-select-count">${playlist.song_count || 0} songs</div>
                    </div>
                </div>
            `).join('');
        }

        console.log('Adding active class to modal...');
        modal.classList.add('active');
        updateBodyOverflow();
        console.log('✅ Modal should be visible now!');
    } catch (error) {
        console.error('❌ Error loading playlists:', error);
        alert('Error loading playlists: ' + error.message);
    }
}

function closeAddToPlaylistModal() {
    const modal = document.getElementById('add-to-playlist-modal');
    modal.classList.remove('active');
    updateBodyOverflow();
    currentSongForPlaylist = null;
}

async function addToPlaylist(playlistId, songId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
            method: 'POST'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to add song');
        }

        // Track song added to playlist
        if (window.tracker) {
            const song = allSongs.find(s => s.id === songId);
            window.tracker.trackSongAddedToPlaylist(
                songId,
                playlistId,
                song ? song.title : null
            );
        }

        closeAddToPlaylistModal();
        alert('Song added to playlist!');
    } catch (error) {
        console.error('Error adding to playlist:', error);
        if (error.message.includes('already exists')) {
            alert('This song is already in the playlist');
        } else {
            alert('Error adding song. Please try again.');
        }
    }
}

function createNewPlaylistFromAdd() {
    closeAddToPlaylistModal();
    showCreatePlaylistMobile();
}

// Setup playlist event listeners
function setupPlaylistListeners() {
    // Create playlist button
    const createBtn = document.getElementById('create-playlist-mobile-btn');
    if (createBtn) {
        createBtn.addEventListener('click', showCreatePlaylistMobile);
    }

    // Playlist form submit
    const form = document.getElementById('playlist-form-mobile');
    if (form) {
        form.addEventListener('submit', handlePlaylistFormSubmit);
    }

    // Back from library
    const backFromLibrary = document.getElementById('back-from-library');
    if (backFromLibrary) {
        backFromLibrary.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }

    // Back from playlist detail
    const backBtn = document.getElementById('back-from-playlist');
    if (backBtn) {
        backBtn.addEventListener('click', hidePlaylistDetailView);
    }
}

// ========================================
// PROFILE & AUTHENTICATION
// ========================================

// Profile View Functions
async function showProfileView() {
    const profileView = document.getElementById('profile-view');
    profileView.classList.add('active');
    updateBodyOverflow();

    // Push to navigation history
    pushNavigationState('profile');

    // Track profile viewed
    if (window.tracker) {
        window.tracker.trackProfileViewed();
    }

    // Check authentication and load profile
    await loadUserProfile();
}

function hideProfileView() {
    const profileView = document.getElementById('profile-view');
    profileView.classList.remove('active');
    updateBodyOverflow();
}

async function loadUserProfile() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            document.getElementById('profile-guest').style.display = 'none';
            document.getElementById('profile-user').style.display = 'block';

            // Load user data
            await Promise.all([
                loadUserStats(),
                loadRecentlyPlayed()
            ]);

            renderProfileData(currentUser);
        } else {
            currentUser = null;
            document.getElementById('profile-guest').style.display = 'flex';
            document.getElementById('profile-user').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('profile-guest').style.display = 'flex';
        document.getElementById('profile-user').style.display = 'none';
    }
}

async function loadUserStats() {
    try {
        const response = await fetch('/api/user/stats');
        if (response.ok) {
            const data = await response.json();
            const stats = data.stats || {};

            document.getElementById('stat-playlists').textContent = stats.playlists || 0;
            document.getElementById('stat-songs').textContent = stats.songs_saved || 0;
            document.getElementById('stat-plays').textContent = stats.total_plays || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentlyPlayed() {
    try {
        const response = await fetch('/api/recently-played?limit=10');
        if (response.ok) {
            const data = await response.json();
            const songs = data.songs || [];

            const scroll = document.getElementById('profile-recent-scroll');
            const section = document.getElementById('profile-recent-section');

            if (songs.length > 0) {
                section.style.display = 'block';
                scroll.innerHTML = songs.map(song => `
                    <div class="song-card" onclick="playSong(${song.id})">
                        <img src="${getCoverImage(song)}" alt="${song.title}" class="card-cover">
                        <div class="card-info">
                            <div class="card-title">${song.title}</div>
                            <div class="card-subtitle">${song.singer || 'Unknown'}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                section.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading recently played:', error);
    }
}

function renderProfileData(user) {
    document.getElementById('profile-name').textContent = user.full_name || user.username;
    document.getElementById('profile-email').textContent = user.email;
}

function goToLibrary() {
    hideProfileView();

    // Switch to library tab
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(nav => nav.classList.remove('active'));
    const libraryNav = document.querySelector('[data-page="library"]');
    if (libraryNav) libraryNav.classList.add('active');

    switchPage('library');
}

// Authentication Modal Functions
function showMobileLogin() {
    const modal = document.getElementById('login-modal');
    modal.classList.add('active');
    updateBodyOverflow();
}

function closeMobileLogin() {
    const modal = document.getElementById('login-modal');
    modal.classList.remove('active');
    updateBodyOverflow();

    // Clear form
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-message').style.display = 'none';
}

function showMobileRegister() {
    const modal = document.getElementById('register-modal');
    modal.classList.add('active');
    updateBodyOverflow();
}

function closeMobileRegister() {
    const modal = document.getElementById('register-modal');
    modal.classList.remove('active');
    updateBodyOverflow();

    // Clear form
    document.getElementById('register-username').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-fullname').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-message').style.display = 'none';
}

function switchToRegister() {
    closeMobileLogin();
    showMobileRegister();
}

function switchToLogin() {
    closeMobileRegister();
    showMobileLogin();
}

async function handleMobileLogin(e) {
    e.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const messageEl = document.getElementById('login-message');

    if (!username || !password) {
        messageEl.textContent = 'Please enter username and password';
        messageEl.className = 'modal-message error';
        messageEl.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = 'Login successful!';
            messageEl.className = 'modal-message success';
            messageEl.style.display = 'block';

            currentUser = data.user;

            // Track login event
            if (window.tracker) {
                window.tracker.trackLogin('email');
                if (data.user && data.user.id) {
                    window.tracker.identify(data.user.id, {
                        username: data.user.username,
                        email: data.user.email,
                        full_name: data.user.full_name
                    });
                }
            }

            setTimeout(() => {
                closeMobileLogin();
                // Reload current view if on library or profile
                const activeNav = document.querySelector('.nav-item.active');
                const activePage = activeNav ? activeNav.dataset.page : 'home';
                if (activePage === 'library') {
                    checkAuthAndLoadPlaylists();
                } else if (activePage === 'profile') {
                    loadUserProfile();
                }
            }, 1000);
        } else {
            // Track login failure
            if (window.tracker) {
                window.tracker.trackLoginFailed(data.error || 'Login failed');
            }

            messageEl.textContent = data.error || 'Login failed';
            messageEl.className = 'modal-message error';
            messageEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);

        // Track login error
        if (window.tracker) {
            window.tracker.trackLoginFailed(error.message);
        }

        messageEl.textContent = 'An error occurred. Please try again.';
        messageEl.className = 'modal-message error';
        messageEl.style.display = 'block';
    }
}

async function handleMobileRegister(e) {
    e.preventDefault();

    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const fullName = document.getElementById('register-fullname').value.trim();
    const password = document.getElementById('register-password').value;
    const messageEl = document.getElementById('register-message');

    if (!username || !email || !fullName || !password) {
        messageEl.textContent = 'Please fill in all fields';
        messageEl.className = 'modal-message error';
        messageEl.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, full_name: fullName, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = 'Account created successfully!';
            messageEl.className = 'modal-message success';
            messageEl.style.display = 'block';

            currentUser = data.user;

            // Track signup event
            if (window.tracker && data.user && data.user.id) {
                window.tracker.trackSignup(data.user.id, 'email', {
                    username: data.user.username,
                    email: data.user.email,
                    full_name: data.user.full_name
                });
            }

            setTimeout(() => {
                closeMobileRegister();
                // Reload current view if on library or profile
                const activeNav = document.querySelector('.nav-item.active');
                const activePage = activeNav ? activeNav.dataset.page : 'home';
                if (activePage === 'library') {
                    checkAuthAndLoadPlaylists();
                } else if (activePage === 'profile') {
                    loadUserProfile();
                }
            }, 1000);
        } else {
            // Track signup failure
            if (window.tracker) {
                window.tracker.trackSignupFailed(data.error || 'Registration failed');
            }

            messageEl.textContent = data.error || 'Registration failed';
            messageEl.className = 'modal-message error';
            messageEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Registration error:', error);

        // Track signup error
        if (window.tracker) {
            window.tracker.trackSignupFailed(error.message);
        }

        messageEl.textContent = 'An error occurred. Please try again.';
        messageEl.className = 'modal-message error';
        messageEl.style.display = 'block';
    }
}

async function handleMobileLogout() {
    if (!confirm('Are you sure you want to logout?')) return;

    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });

        if (response.ok) {
            // Track logout event
            if (window.tracker) {
                window.tracker.trackLogout();
            }

            currentUser = null;

            // Show guest state
            document.getElementById('profile-guest').style.display = 'flex';
            document.getElementById('profile-user').style.display = 'none';
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
}

// Setup auth event listeners
function setupAuthListeners() {
    // Login form
    const loginForm = document.getElementById('login-form-mobile');
    if (loginForm) {
        loginForm.addEventListener('submit', handleMobileLogin);
    }

    // Register form
    const registerForm = document.getElementById('register-form-mobile');
    if (registerForm) {
        registerForm.addEventListener('submit', handleMobileRegister);
    }

    // Back from profile - Use browser back
    const backFromProfile = document.getElementById('back-from-profile');
    if (backFromProfile) {
        backFromProfile.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }
}

// Track play history
async function trackPlayHistory(songId) {
    try {
        await fetch('/api/play-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: songId })
        });
    } catch (error) {
        console.error('Error tracking play:', error);
    }
}

// ========================================
// MEDIA SESSION API (Lock Screen Controls)
// ========================================

function initializeMediaSession() {
    if ('mediaSession' in navigator) {
        console.log('📱 Media Session API available');

        // Set up action handlers
        navigator.mediaSession.setActionHandler('play', () => {
            console.log('Media Session: Play');
            togglePlay();
        });

        navigator.mediaSession.setActionHandler('pause', () => {
            console.log('Media Session: Pause');
            togglePlay();
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
            console.log('Media Session: Previous');
            playPrevious();
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
            console.log('Media Session: Next');
            playNext();
        });

        // Optional: Seek handlers (if browser supports)
        try {
            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                audioPlayer.currentTime = Math.max(audioPlayer.currentTime - (details.seekOffset || 10), 0);
            });

            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                audioPlayer.currentTime = Math.min(audioPlayer.currentTime + (details.seekOffset || 10), audioPlayer.duration);
            });

            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.fastSeek && 'fastSeek' in audioPlayer) {
                    audioPlayer.fastSeek(details.seekTime);
                } else {
                    audioPlayer.currentTime = details.seekTime;
                }
            });
        } catch (error) {
            console.log('Seek actions not supported');
        }

        console.log('✅ Media Session handlers registered');
    } else {
        console.log('⚠️ Media Session API not available');
    }
}

function updateMediaSession(song) {
    if ('mediaSession' in navigator && song) {
        console.log('📱 Updating Media Session:', song.title);

        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: song.singer || 'Unknown Artist',
            album: song.album || 'Stage Music',
            artwork: [
                {
                    src: getCoverImage(song),
                    sizes: '512x512',
                    type: 'image/jpeg'
                },
                {
                    src: getCoverImage(song),
                    sizes: '256x256',
                    type: 'image/jpeg'
                },
                {
                    src: getCoverImage(song),
                    sizes: '128x128',
                    type: 'image/jpeg'
                },
                {
                    src: getCoverImage(song),
                    sizes: '96x96',
                    type: 'image/jpeg'
                }
            ]
        });

        // Update playback state
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

        console.log('✅ Media Session updated');
    }
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

    // Track screen view
    if (window.tracker) {
        window.tracker.trackScreenViewed(page);
        // Increment pages viewed for session tracking
        window.tracker.incrementPagesViewed();
    }

    // Hide all full-screen views
    hideSearchView();
    hideCategoryView();
    hideLibraryView();
    hidePlaylistDetailView();
    hideProfileView();

    // Show main content only for home
    mainContent.style.display = page === 'home' ? 'block' : 'none';

    switch(page) {
        case 'home':
            // Main content visible, nothing else to do
            break;
        case 'search':
            showSearchView();
            break;
        case 'library':
            showLibraryView();
            break;
        case 'profile':
            showProfileView();
            break;
    }
}

// ========================================
// CATEGORY VIEW
// ========================================

async function viewCategory(categoryIdentifier, categoryName) {
    try {
        let categoryId = categoryIdentifier;
        let finalCategoryName = categoryName;

        // Track category click
        if (window.tracker) {
            window.tracker.trackCategoryClicked(categoryIdentifier, categoryName);
        }

        // If string (like 'haryanvi'), find the category ID
        if (typeof categoryIdentifier === 'string') {
            const response = await fetch(`/api/categories?t=${Date.now()}`);
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

function showCategoryView(categoryName, songs, languageOverride = null, contextType = 'category', contextId = null, skipHistory = false) {
    const categoryView = document.getElementById('category-view');
    const categoryTitle = document.getElementById('category-view-title');
    const categoryContent = document.getElementById('category-content');

    categoryTitle.textContent = categoryName;

    // Detect language from category name or use override
    let language = languageOverride;

    if (!language) {
        const nameLower = categoryName.toLowerCase();
        if (nameLower.includes('haryanvi')) {
            language = 'Haryanvi';
        } else if (nameLower.includes('rajasthani')) {
            language = 'Rajasthani';
        } else if (nameLower.includes('bhojpuri')) {
            language = 'Bhojpuri';
        }

        // Try to detect from first song if still no language
        if (!language && songs.length > 0 && songs[0].language) {
            language = songs[0].language;
        }
    }

    // Store songs in window for queue access
    window.currentCategoryQueue = {
        songs: songs,
        context: {
            type: contextType,
            name: categoryName,
            language: language,
            id: contextId
        }
    };

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
                ${songs.map((song, index) => `
                    <div class="category-song-item" onclick="playSongFromCategoryView(${song.id}, ${index})">
                        <img src="${getCoverImage(song)}" alt="${song.title}" class="category-song-cover" loading="${index < 10 ? 'eager' : 'lazy'}">
                        <div class="category-song-info">
                            <div class="category-song-title">${song.title}</div>
                            <div class="category-song-artist">${song.singer || 'Unknown'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    categoryView.classList.add('active');
    updateBodyOverflow();

    // Push to navigation history (unless coming from back button)
    if (!skipHistory) {
        pushNavigationState('category', {
            categoryName,
            songs,
            language,
            contextType,
            contextId
        });
    }
}

function hideCategoryView() {
    const categoryView = document.getElementById('category-view');
    categoryView.classList.remove('active');
    updateBodyOverflow();
}

// ========================================
// NAVIGATION HISTORY MANAGEMENT
// ========================================

function setupNavigationHistory() {
    console.log('🔧 Setting up navigation history...');

    // Initialize with home state - this ensures we have a starting point
    history.replaceState({ view: 'home' }, '');

    // Add a marker state so we know when we've reached the start
    history.pushState({ view: 'home', isStart: true }, '');

    // Handle browser/device back button
    window.addEventListener('popstate', (event) => {
        if (isNavigating) {
            console.log('⏭️ Already navigating, skip');
            return;
        }

        const state = event.state;
        console.log('🔙 BACK pressed! State:', state);

        isNavigating = true;

        // CRITICAL for Android: Stop event propagation
        if (event) {
            event.stopPropagation();
            event.stopImmediatePropagation();
        }

        // Check what's currently visible
        const isPlayerOpen = fullPlayer.classList.contains('active');
        const isCategoryOpen = document.getElementById('category-view')?.classList.contains('active');
        const isSearchOpen = document.getElementById('search-view')?.classList.contains('active');
        const isLibraryOpen = document.getElementById('library-view')?.classList.contains('active');
        const isProfileOpen = document.getElementById('profile-view')?.classList.contains('active');

        console.log('📱 Player:', isPlayerOpen, 'Category:', isCategoryOpen, 'Search:', isSearchOpen, 'Library:', isLibraryOpen, 'Profile:', isProfileOpen);

        if (isPlayerOpen) {
            // Close player, keep underlying view open
            console.log('→ Closing player');
            fullPlayer.classList.remove('active');

            // Check if there's a view underneath that needs overflow hidden
            const hasUnderlyingView = isCategoryOpen || isSearchOpen || isLibraryOpen || isProfileOpen;
            if (!hasUnderlyingView) {
                updateBodyOverflow(); // Only reset if no view underneath
            }

            navigationStack.pop();
        } else if (isSearchOpen) {
            // Close search view, go back to home
            console.log('→ Closing search');
            hideSearchView();
            updateBottomNav('home');
            navigationStack.pop();
        } else if (isLibraryOpen) {
            // Close library view, go back to home
            console.log('→ Closing library');
            hideLibraryView();
            updateBottomNav('home');
            navigationStack.pop();
        } else if (isProfileOpen) {
            // Close profile view, go back to home
            console.log('→ Closing profile');
            hideProfileView();
            updateBottomNav('home');
            navigationStack.pop();
        } else if (isCategoryOpen) {
            // Close category, go to home
            console.log('→ Closing category');
            const categoryView = document.getElementById('category-view');
            categoryView.classList.remove('active');
            updateBodyOverflow();
            navigationStack.pop();
        } else {
            // On home - ALWAYS stay in app (critical for Android)
            console.log('→ On home, preventing app exit');
            // Push forward to prevent exit
            history.pushState({ view: 'home', isStart: true }, '');
            navigationStack = ['home']; // Reset stack
        }

        setTimeout(() => { isNavigating = false; }, 150);
    });

    // ============================================
    // FLUTTER APP BACK BUTTON HANDLER
    // Listen for back button event from Flutter app
    // ============================================
    window.addEventListener('appbackbutton', (event) => {
        console.log('📱 Flutter back button pressed!');
        
        if (isNavigating) {
            console.log('⏭️ Already navigating, skip');
            return;
        }

        isNavigating = true;

        // Check what's currently visible
        const isPlayerOpen = fullPlayer.classList.contains('active');
        const isCategoryOpen = document.getElementById('category-view')?.classList.contains('active');
        const isSearchOpen = document.getElementById('search-view')?.classList.contains('active');
        const isLibraryOpen = document.getElementById('library-view')?.classList.contains('active');
        const isProfileOpen = document.getElementById('profile-view')?.classList.contains('active');

        console.log('📱 Player:', isPlayerOpen, 'Category:', isCategoryOpen, 'Search:', isSearchOpen);

        if (isPlayerOpen) {
            console.log('→ Closing player');
            fullPlayer.classList.remove('active');
            const hasUnderlyingView = isCategoryOpen || isSearchOpen || isLibraryOpen || isProfileOpen;
            if (!hasUnderlyingView) {
                updateBodyOverflow();
            }
            navigationStack.pop();
        } else if (isSearchOpen) {
            console.log('→ Closing search');
            hideSearchView();
            updateBottomNav('home');
            navigationStack.pop();
        } else if (isLibraryOpen) {
            console.log('→ Closing library');
            hideLibraryView();
            updateBottomNav('home');
            navigationStack.pop();
        } else if (isProfileOpen) {
            console.log('→ Closing profile');
            hideProfileView();
            updateBottomNav('home');
            navigationStack.pop();
        } else if (isCategoryOpen) {
            console.log('→ Closing category');
            const categoryView = document.getElementById('category-view');
            categoryView.classList.remove('active');
            updateBodyOverflow();
            navigationStack.pop();
        } else {
            // On home - tell Flutter to exit
            console.log('→ On home, telling Flutter to exit');
            if (window.Flutter && window.Flutter.postMessage) {
                window.Flutter.postMessage('backPressed', {});
            }
        }

        setTimeout(() => { isNavigating = false; }, 150);
    });

    console.log('✅ Navigation history ready');
}

function pushNavigationState(view, data = {}) {
    navigationStack.push(view);
    const state = { view, data, stack: [...navigationStack] };
    history.pushState(state, '');
    console.log('📍 Pushed state:', view, 'Stack:', navigationStack);
}

function updateBottomNav(page) {
    // Update bottom navigation active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(nav => {
        if (nav.dataset.page === page) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });
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

// ========================================
// HLS CLEANUP
// ========================================
// Cleanup HLS instance on page unload
window.addEventListener('beforeunload', () => {
    if (window.hlsInstance) {
        console.log('🧹 Cleaning up HLS instance');
        window.hlsInstance.destroy();
    }
});

console.log('🎵 Stage Music Mobile - Ready!');
