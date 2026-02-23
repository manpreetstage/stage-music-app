// Playlists Management JavaScript

let userPlaylists = [];
let currentSongForPlaylist = null;

// Load user's playlists
async function loadUserPlaylists() {
    try {
        const response = await fetch('/api/playlists');
        if (!response.ok) {
            // User not logged in or error
            document.getElementById('user-playlists-section').style.display = 'none';
            document.getElementById('playlist-divider').style.display = 'none';
            return;
        }

        const data = await response.json();
        userPlaylists = data.playlists || [];

        if (userPlaylists.length > 0) {
            document.getElementById('user-playlists-section').style.display = 'block';
            document.getElementById('playlist-divider').style.display = 'block';
            displayUserPlaylists();
        } else {
            document.getElementById('user-playlists-section').style.display = 'none';
            document.getElementById('playlist-divider').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading playlists:', error);
    }
}

// Display user playlists in sidebar
function displayUserPlaylists() {
    const container = document.getElementById('user-playlists-list');
    container.innerHTML = '';

    userPlaylists.forEach(playlist => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'playlist-item';
        item.onclick = (e) => {
            e.preventDefault();
            openPlaylist(playlist.id);
        };

        item.innerHTML = `
            <svg class="playlist-icon" width="20" height="20"><use href="#icon-playlist"></use></svg>
            <span class="playlist-text">${escapeHtml(playlist.name)}</span>
        `;

        container.appendChild(item);
    });
}

// Show create playlist modal
window.showCreatePlaylistModal = function() {
    document.getElementById('create-playlist-modal').style.display = 'flex';
    document.getElementById('playlist-name').value = '';
    document.getElementById('playlist-description').value = '';
    document.getElementById('playlist-public').checked = false;
    document.getElementById('create-playlist-error').style.display = 'none';
    document.getElementById('create-playlist-success').style.display = 'none';
};

// Close create playlist modal
window.closeCreatePlaylistModal = function() {
    document.getElementById('create-playlist-modal').style.display = 'none';
};

// Create playlist form handler
document.addEventListener('DOMContentLoaded', () => {
    const createPlaylistForm = document.getElementById('create-playlist-form');
    if (createPlaylistForm) {
        createPlaylistForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('playlist-name').value.trim();
            const description = document.getElementById('playlist-description').value.trim();
            const isPublic = document.getElementById('playlist-public').checked;

            const submitBtn = document.getElementById('create-playlist-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');
            const errorDiv = document.getElementById('create-playlist-error');
            const successDiv = document.getElementById('create-playlist-success');

            if (!name) {
                errorDiv.textContent = 'Please enter a playlist name';
                errorDiv.style.display = 'block';
                return;
            }

            // Show loading
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline';
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';

            try {
                const response = await fetch('/api/playlists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        description,
                        is_public: isPublic
                    })
                });

                const data = await response.json();

                if (data.success) {
                    successDiv.textContent = 'Playlist created successfully!';
                    successDiv.style.display = 'block';

                    // Reload playlists
                    await loadUserPlaylists();

                    setTimeout(() => {
                        closeCreatePlaylistModal();
                    }, 1500);
                } else {
                    errorDiv.textContent = data.error || 'Failed to create playlist';
                    errorDiv.style.display = 'block';
                    submitBtn.disabled = false;
                    btnText.style.display = 'inline';
                    btnLoader.style.display = 'none';
                }
            } catch (error) {
                console.error('Create playlist error:', error);
                errorDiv.textContent = 'Failed to create playlist. Please try again.';
                errorDiv.style.display = 'block';
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        });
    }
});

// Show add to playlist modal
window.showAddToPlaylistModal = function(songId) {
    currentSongForPlaylist = songId;
    document.getElementById('selected-song-id').value = songId;
    document.getElementById('add-to-playlist-modal').style.display = 'flex';
    document.getElementById('add-to-playlist-error').style.display = 'none';
    document.getElementById('add-to-playlist-success').style.display = 'none';

    loadPlaylistsForSelection();
};

// Close add to playlist modal
window.closeAddToPlaylistModal = function() {
    document.getElementById('add-to-playlist-modal').style.display = 'none';
    currentSongForPlaylist = null;
};

// Load playlists for selection
async function loadPlaylistsForSelection() {
    const container = document.getElementById('playlists-list');
    container.innerHTML = '<p style="text-align: center; color: #888;">Loading...</p>';

    try {
        const response = await fetch('/api/playlists');
        if (!response.ok) {
            container.innerHTML = '<p style="text-align: center; color: #e74c3c;">Please login to create playlists</p>';
            return;
        }

        const data = await response.json();
        const playlists = data.playlists || [];

        if (playlists.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">No playlists yet. Create one!</p>';
            return;
        }

        container.innerHTML = '';
        playlists.forEach(playlist => {
            const item = document.createElement('div');
            item.className = 'playlist-select-item';
            item.onclick = () => addSongToPlaylist(playlist.id);

            item.innerHTML = `
                <svg width="24" height="24"><use href="#icon-playlist"></use></svg>
                <div class="playlist-select-info">
                    <div class="playlist-select-name">${escapeHtml(playlist.name)}</div>
                    <div class="playlist-select-count">${playlist.song_count || 0} songs</div>
                </div>
            `;

            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading playlists:', error);
        container.innerHTML = '<p style="text-align: center; color: #e74c3c;">Error loading playlists</p>';
    }
}

// Add song to playlist
async function addSongToPlaylist(playlistId) {
    const songId = currentSongForPlaylist;
    if (!songId) return;

    const errorDiv = document.getElementById('add-to-playlist-error');
    const successDiv = document.getElementById('add-to-playlist-success');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    try {
        const response = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            successDiv.textContent = 'Song added to playlist!';
            successDiv.style.display = 'block';

            setTimeout(() => {
                closeAddToPlaylistModal();
            }, 1500);
        } else {
            errorDiv.textContent = data.error || 'Failed to add song';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error adding song to playlist:', error);
        errorDiv.textContent = 'Failed to add song. Please try again.';
        errorDiv.style.display = 'block';
    }
}

// Create playlist from add modal
window.createPlaylistFromAdd = function() {
    closeAddToPlaylistModal();
    showCreatePlaylistModal();
};

// Open playlist view
async function openPlaylist(playlistId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}`);
        if (!response.ok) {
            alert('Failed to load playlist');
            return;
        }

        const data = await response.json();
        showPlaylistView(data.playlist, data.songs);
    } catch (error) {
        console.error('Error opening playlist:', error);
        alert('Error loading playlist');
    }
}

// Show playlist view
function showPlaylistView(playlist, songs) {
    // Hide main content
    document.getElementById('home-view').style.display = 'none';

    // Create or get playlist view
    let playlistView = document.getElementById('playlist-view');
    if (!playlistView) {
        playlistView = document.createElement('div');
        playlistView.id = 'playlist-view';
        playlistView.className = 'content-view';
        document.getElementById('main-content').appendChild(playlistView);
    }

    playlistView.style.display = 'block';
    playlistView.innerHTML = `
        <div class="playlist-view-container">
            <div class="playlist-header-section">
                <button class="back-btn" onclick="closePlaylistView()">← Back</button>
                <div class="playlist-info-header">
                    <div class="playlist-cover">
                        <svg width="80" height="80"><use href="#icon-playlist"></use></svg>
                    </div>
                    <div class="playlist-details">
                        <h1 class="playlist-title">${escapeHtml(playlist.name)}</h1>
                        <p class="playlist-description">${escapeHtml(playlist.description || 'No description')}</p>
                        <div class="playlist-meta">
                            <span>${songs.length} songs</span>
                            ${playlist.is_public ? '<span>• Public</span>' : '<span>• Private</span>'}
                        </div>
                        <div class="playlist-actions">
                            ${songs.length > 0 ? `<button class="btn-play-all" onclick="playPlaylist(${playlist.id})">
                                <svg width="20" height="20"><use href="#icon-play"></use></svg>
                                Play All
                            </button>` : ''}
                            <button class="btn-secondary" onclick="editPlaylist(${playlist.id})">
                                <svg width="18" height="18"><use href="#icon-edit"></use></svg>
                                Edit
                            </button>
                            <button class="btn-danger" onclick="deletePlaylist(${playlist.id})">
                                <svg width="18" height="18"><use href="#icon-delete"></use></svg>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="playlist-songs-section">
                <h2>Songs</h2>
                ${songs.length === 0 ? `
                    <div class="empty-playlist">
                        <svg width="64" height="64" style="opacity: 0.3;"><use href="#icon-music"></use></svg>
                        <p>No songs in this playlist yet</p>
                        <p style="color: #888; font-size: 0.9em;">Add songs from the main library</p>
                    </div>
                ` : `
                    <div class="playlist-songs-list">
                        ${songs.map((song, index) => `
                            <div class="playlist-song-item">
                                <div class="playlist-song-number">${index + 1}</div>
                                <div class="playlist-song-cover">
                                    <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                                         alt="${escapeHtml(song.title)}"
                                         onerror="this.src='/assets/default-cover.jpg'">
                                </div>
                                <div class="playlist-song-info">
                                    <div class="playlist-song-title">${escapeHtml(song.title)}</div>
                                    <div class="playlist-song-artist">${escapeHtml(song.singer)}</div>
                                </div>
                                <div class="playlist-song-language">${song.language || 'Unknown'}</div>
                                <div class="playlist-song-actions">
                                    <button class="icon-btn" onclick="playFromPlaylist(${index}, ${playlist.id})" title="Play">
                                        <svg width="20" height="20"><use href="#icon-play"></use></svg>
                                    </button>
                                    <button class="icon-btn" onclick="removeSongFromPlaylist(${playlist.id}, ${song.id})" title="Remove">
                                        <svg width="20" height="20"><use href="#icon-delete"></use></svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;

    // Store current playlist songs for playback
    window.currentPlaylistSongs = songs;
}

// Close playlist view
window.closePlaylistView = function() {
    const playlistView = document.getElementById('playlist-view');
    if (playlistView) {
        playlistView.style.display = 'none';
    }
    document.getElementById('home-view').style.display = 'block';
};

// Play entire playlist
window.playPlaylist = function(playlistId) {
    if (window.currentPlaylistSongs && window.currentPlaylistSongs.length > 0) {
        // Set all songs as the current queue
        if (typeof allSongs !== 'undefined') {
            window.allSongs = window.currentPlaylistSongs;
        }
        // Play first song
        if (typeof playSong === 'function') {
            playSong(0);
        }
    }
};

// Play song from playlist
window.playFromPlaylist = function(index, playlistId) {
    if (window.currentPlaylistSongs && window.currentPlaylistSongs[index]) {
        // Set playlist songs as current queue
        if (typeof allSongs !== 'undefined') {
            window.allSongs = window.currentPlaylistSongs;
        }
        // Play the selected song
        if (typeof playSong === 'function') {
            playSong(index);
        }
    }
};

// Remove song from playlist
window.removeSongFromPlaylist = async function(playlistId, songId) {
    if (!confirm('Remove this song from the playlist?')) {
        return;
    }

    try {
        const response = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            // Reload playlist view
            openPlaylist(playlistId);
        } else {
            alert(data.error || 'Failed to remove song');
        }
    } catch (error) {
        console.error('Error removing song:', error);
        alert('Error removing song from playlist');
    }
};

// Edit playlist
window.editPlaylist = async function(playlistId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}`);
        const data = await response.json();
        const playlist = data.playlist;

        // Show edit modal
        document.getElementById('playlist-name').value = playlist.name;
        document.getElementById('playlist-description').value = playlist.description || '';
        document.getElementById('playlist-public').checked = playlist.is_public === 1;

        // Store playlist ID for update
        window.editingPlaylistId = playlistId;

        // Change form handler to update instead of create
        const form = document.getElementById('create-playlist-form');
        const modal = document.getElementById('create-playlist-modal');
        modal.querySelector('.modal-header h2').textContent = 'Edit Playlist';

        form.onsubmit = async function(e) {
            e.preventDefault();
            await updatePlaylist(playlistId);
        };

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading playlist for edit:', error);
        alert('Error loading playlist');
    }
};

// Update playlist
async function updatePlaylist(playlistId) {
    const name = document.getElementById('playlist-name').value.trim();
    const description = document.getElementById('playlist-description').value.trim();
    const isPublic = document.getElementById('playlist-public').checked;

    const submitBtn = document.getElementById('create-playlist-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    const errorDiv = document.getElementById('create-playlist-error');
    const successDiv = document.getElementById('create-playlist-success');

    if (!name) {
        errorDiv.textContent = 'Please enter a playlist name';
        errorDiv.style.display = 'block';
        return;
    }

    submitBtn.disabled = true;
    btnText.textContent = 'Updating...';
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    try {
        const response = await fetch(`/api/playlists/${playlistId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, is_public: isPublic })
        });

        const data = await response.json();

        if (data.success) {
            successDiv.textContent = 'Playlist updated!';
            successDiv.style.display = 'block';

            await loadUserPlaylists();

            setTimeout(() => {
                closeCreatePlaylistModal();
                btnText.textContent = 'Create Playlist';
                // Reset form handler
                resetCreatePlaylistForm();
                // Reload playlist view
                openPlaylist(playlistId);
            }, 1500);
        } else {
            errorDiv.textContent = data.error || 'Failed to update playlist';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    } catch (error) {
        console.error('Update error:', error);
        errorDiv.textContent = 'Failed to update playlist';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Delete playlist
window.deletePlaylist = async function(playlistId) {
    if (!confirm('Are you sure you want to delete this playlist? This cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/playlists/${playlistId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert('Playlist deleted successfully');
            await loadUserPlaylists();
            closePlaylistView();
        } else {
            alert(data.error || 'Failed to delete playlist');
        }
    } catch (error) {
        console.error('Error deleting playlist:', error);
        alert('Error deleting playlist');
    }
};

// Reset create playlist form
function resetCreatePlaylistForm() {
    const form = document.getElementById('create-playlist-form');
    const modal = document.getElementById('create-playlist-modal');
    modal.querySelector('.modal-header h2').textContent = 'Create New Playlist';
    document.getElementById('create-playlist-btn').querySelector('.btn-text').textContent = 'Create Playlist';

    // Reset to original create handler
    form.onsubmit = null;
    window.editingPlaylistId = null;
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize playlists when user is logged in
if (typeof initApp !== 'undefined') {
    const originalInit = initApp;
    initApp = function() {
        originalInit();
        loadUserPlaylists();
    };
} else {
    // If initApp doesn't exist, just load playlists
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            loadUserPlaylists();
        }, 1000);
    });
}
