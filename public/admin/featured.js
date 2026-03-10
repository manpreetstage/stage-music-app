let allSongs = [];
let quickPicksSongs = [];
let trendingSongs = [];
let selectedSongId = null;
let currentTab = 'quick-picks';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAllSongs();
    loadQuickPicks();
    loadTrending();
    setupEventListeners();
});

// Tab Switching
function switchTab(tab) {
    currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');

    // Reset selection
    selectedSongId = null;
    document.querySelectorAll('.song-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// Load all songs
async function loadAllSongs() {
    try {
        const response = await fetch('/api/songs');
        const data = await response.json();
        allSongs = data.songs || [];

        displaySongs('quickpicks', allSongs);
        displaySongs('trending', allSongs);
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Load Quick Picks
async function loadQuickPicks() {
    try {
        const response = await fetch('/api/admin/quick-picks');
        const data = await response.json();
        quickPicksSongs = data.songs || [];

        document.getElementById('quickpicks-count').textContent = `(${quickPicksSongs.length}/9)`;

        const list = document.getElementById('quickpicks-list');

        if (quickPicksSongs.length === 0) {
            list.innerHTML = '<div class="empty-state">No Quick Picks yet. Add songs below!</div>';
            return;
        }

        list.innerHTML = quickPicksSongs.map((song, index) => `
            <div class="featured-item">
                <div class="featured-rank">${index + 1}</div>
                <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                     class="featured-cover"
                     onerror="this.src='/assets/default-cover.jpg'">
                <div class="featured-info">
                    <div class="featured-title">${song.title}</div>
                    <div class="featured-artist">${song.artist || song.singer || 'Unknown'}</div>
                </div>
                <button class="remove-btn" onclick="removeQuickPick(${song.id})">Remove</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading quick picks:', error);
    }
}

// Load Trending
async function loadTrending() {
    try {
        const response = await fetch('/api/admin/trending');
        const data = await response.json();
        trendingSongs = data.songs || [];

        document.getElementById('trending-count').textContent = `(${trendingSongs.length}/9)`;

        const list = document.getElementById('trending-list');

        if (trendingSongs.length === 0) {
            list.innerHTML = '<div class="empty-state">No Trending songs yet. Add songs below!</div>';
            return;
        }

        list.innerHTML = trendingSongs.map((song, index) => `
            <div class="featured-item">
                <div class="featured-rank">${index + 1}</div>
                <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                     class="featured-cover"
                     onerror="this.src='/assets/default-cover.jpg'">
                <div class="featured-info">
                    <div class="featured-title">${song.title}</div>
                    <div class="featured-artist">${song.artist || song.singer || 'Unknown'}</div>
                </div>
                <button class="remove-btn" onclick="removeTrending(${song.id})">Remove</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading trending:', error);
    }
}

// Display songs
function displaySongs(section, songs) {
    const grid = document.getElementById(`songs-grid-${section}`);

    if (songs.length === 0) {
        grid.innerHTML = '<div class="empty-state">No songs found</div>';
        return;
    }

    grid.innerHTML = songs.map(song => `
        <div class="song-item" data-song-id="${song.id}" onclick="selectSong('${section}', ${song.id}, event)">
            <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                 class="song-cover"
                 onerror="this.src='/assets/default-cover.jpg'">
            <div class="song-name">${song.title}</div>
            <div class="song-artist">${song.artist || song.singer || 'Unknown'}</div>
        </div>
    `).join('');
}

// Select song
function selectSong(section, songId, event) {
    selectedSongId = songId;

    // Remove selection from all songs in this grid
    const grid = document.getElementById(`songs-grid-${section}`);
    grid.querySelectorAll('.song-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Add selection to clicked item
    event.currentTarget.classList.add('selected');

    // Enable button
    const btn = document.getElementById(`add-btn-${section}`);
    btn.disabled = false;

    // Update status
    const song = allSongs.find(s => s.id === songId);
    if (song) {
        document.getElementById(`status-${section}`).textContent =
            `Selected: ${song.title} - Ready to add!`;
    }
}

// Add to Quick Picks
async function addToQuickPicks() {
    if (!selectedSongId) {
        alert('Please select a song first!');
        return;
    }

    // Check if already in quick picks
    if (quickPicksSongs.find(s => s.id === selectedSongId)) {
        alert('This song is already in Quick Picks!');
        return;
    }

    if (quickPicksSongs.length >= 9) {
        alert('Maximum 9 Quick Picks allowed! Remove a song first.');
        return;
    }

    const btn = document.getElementById('add-btn-quickpicks');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span style="font-size: 1.2em;">⏳</span> Adding...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/admin/quick-picks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                song_id: selectedSongId,
                position: quickPicksSongs.length + 1
            })
        });

        if (response.ok) {
            alert('✅ Song added to Quick Picks!');
            selectedSongId = null;
            document.getElementById('status-quickpicks').textContent = 'Select a song to enable this button';
            await loadQuickPicks();

            // Remove selection
            document.querySelectorAll('#songs-grid-quickpicks .song-item').forEach(item => {
                item.classList.remove('selected');
            });
        } else {
            const data = await response.json();
            alert('❌ Failed: ' + (data.error || 'Unknown error'));
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
        btn.disabled = false;
    }

    btn.innerHTML = originalText;
}

// Add to Trending
async function addToTrending() {
    if (!selectedSongId) {
        alert('Please select a song first!');
        return;
    }

    // Check if already in trending
    if (trendingSongs.find(s => s.id === selectedSongId)) {
        alert('This song is already in Trending!');
        return;
    }

    if (trendingSongs.length >= 9) {
        alert('Maximum 9 Trending songs allowed! Remove a song first.');
        return;
    }

    const btn = document.getElementById('add-btn-trending');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span style="font-size: 1.2em;">⏳</span> Adding...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/admin/trending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                song_id: selectedSongId,
                position: trendingSongs.length + 1
            })
        });

        if (response.ok) {
            alert('✅ Song added to Trending!');
            selectedSongId = null;
            document.getElementById('status-trending').textContent = 'Select a song to enable this button';
            await loadTrending();

            // Remove selection
            document.querySelectorAll('#songs-grid-trending .song-item').forEach(item => {
                item.classList.remove('selected');
            });
        } else {
            const data = await response.json();
            alert('❌ Failed: ' + (data.error || 'Unknown error'));
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
        btn.disabled = false;
    }

    btn.innerHTML = originalText;
}

// Remove from Quick Picks
async function removeQuickPick(songId) {
    if (!confirm('Remove this song from Quick Picks?')) return;

    try {
        const response = await fetch(`/api/admin/quick-picks/${songId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadQuickPicks();
        } else {
            alert('Failed to remove song');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error removing song');
    }
}

// Remove from Trending
async function removeTrending(songId) {
    if (!confirm('Remove this song from Trending?')) return;

    try {
        const response = await fetch(`/api/admin/trending/${songId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadTrending();
        } else {
            alert('Failed to remove song');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error removing song');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add buttons
    document.getElementById('add-btn-quickpicks').addEventListener('click', addToQuickPicks);
    document.getElementById('add-btn-trending').addEventListener('click', addToTrending);

    // Search boxes
    document.getElementById('search-quickpicks').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = query
            ? allSongs.filter(song =>
                song.title.toLowerCase().includes(query) ||
                (song.artist && song.artist.toLowerCase().includes(query)) ||
                (song.singer && song.singer.toLowerCase().includes(query))
            )
            : allSongs;
        displaySongs('quickpicks', filtered);
    });

    document.getElementById('search-trending').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = query
            ? allSongs.filter(song =>
                song.title.toLowerCase().includes(query) ||
                (song.artist && song.artist.toLowerCase().includes(query)) ||
                (song.singer && song.singer.toLowerCase().includes(query))
            )
            : allSongs;
        displaySongs('trending', filtered);
    });
}
