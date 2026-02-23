// Dashboard JavaScript

// Check authentication and load user data
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            // Not authenticated, redirect to main page with login modal
            window.location.href = '/';
            return null;
        }
        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/';
        return null;
    }
}

// Load user's songs
async function loadMySongs(userId) {
    console.log('🎵 Loading songs for user ID:', userId);

    const loadingEl = document.getElementById('loading');
    const songsContainer = document.getElementById('songs-container');
    const noSongsEl = document.getElementById('no-songs');

    loadingEl.style.display = 'block';
    songsContainer.innerHTML = '';
    noSongsEl.style.display = 'none';

    try {
        const response = await fetch('/api/songs');
        const data = await response.json();
        console.log('📦 Fetched all songs:', data.songs.length);

        // Filter songs by user_id
        const mySongs = data.songs.filter(song => song.user_id === userId);
        console.log('✅ Filtered my songs:', mySongs.length, 'songs for user', userId);

        loadingEl.style.display = 'none';

        if (mySongs.length === 0) {
            console.log('⚠️ No songs found for this user');
            noSongsEl.style.display = 'block';
            return;
        }

        // Display songs
        mySongs.forEach(song => {
            console.log('🎶 Creating card for song:', song.title);
            const songCard = createSongCard(song);
            songsContainer.appendChild(songCard);
        });
        console.log('✅ All song cards created successfully');
    } catch (error) {
        console.error('❌ Failed to load songs:', error);
        loadingEl.style.display = 'none';
        songsContainer.innerHTML = '<p style="color: #e74c3c; text-align: center;">Failed to load songs. Please try again.</p>';
    }
}

// Create song card element
function createSongCard(song) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.songId = song.id;

    const coverUrl = song.cover_image || '/assets/default-cover.jpg';

    card.innerHTML = `
        <img src="${coverUrl}" alt="${song.title}" class="song-cover" onerror="this.src='/assets/default-cover.jpg'">
        <div class="song-info">
            <div class="song-title">${song.title}</div>
            <div class="song-artist">${song.singer}</div>
            <div class="song-meta">
                <span class="song-language">${song.language || 'Unknown'}</span>
                <div class="song-actions">
                    <button class="btn-edit" onclick="editSong(${song.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteSong(${song.id}, '${song.title}')">Delete</button>
                </div>
            </div>
        </div>
    `;

    return card;
}

// Edit song function
window.editSong = async function(songId) {
    try {
        // Fetch song details
        const response = await fetch('/api/songs');
        const data = await response.json();
        const song = data.songs.find(s => s.id === songId);

        if (!song) {
            alert('Song not found');
            return;
        }

        // Populate modal with song data
        document.getElementById('edit-song-id').value = song.id;
        document.getElementById('edit-title').value = song.title;
        document.getElementById('edit-artist').value = song.singer;
        document.getElementById('edit-language').value = song.language || '';
        document.getElementById('edit-company').value = song.company || '';
        document.getElementById('edit-music-director').value = song.music_director || '';
        document.getElementById('edit-composer').value = song.composer || '';
        document.getElementById('edit-lyrics').value = song.lyrics || '';
        document.getElementById('current-cover-img').src = song.cover_image || '/assets/default-cover.jpg';

        // Show modal
        document.getElementById('edit-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading song:', error);
        alert('Failed to load song details');
    }
};

// Close edit modal
window.closeEditModal = function() {
    document.getElementById('edit-modal').style.display = 'none';
    document.getElementById('edit-error').style.display = 'none';
    document.getElementById('edit-success').style.display = 'none';
};

// Handle edit form submission
document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const songId = document.getElementById('edit-song-id').value;
            const title = document.getElementById('edit-title').value.trim();
            const artist = document.getElementById('edit-artist').value.trim();
            const language = document.getElementById('edit-language').value;
            const company = document.getElementById('edit-company').value.trim();
            const musicDirector = document.getElementById('edit-music-director').value.trim();
            const composer = document.getElementById('edit-composer').value.trim();
            const lyrics = document.getElementById('edit-lyrics').value.trim();
            const coverFile = document.getElementById('edit-cover').files[0];

            const submitBtn = document.getElementById('edit-submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');
            const errorDiv = document.getElementById('edit-error');
            const successDiv = document.getElementById('edit-success');

            if (!title || !artist || !language) {
                errorDiv.textContent = 'Please fill all required fields';
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
                // Use FormData to support file upload
                const formData = new FormData();
                formData.append('title', title);
                formData.append('artist', artist);
                formData.append('language', language);
                formData.append('company', company);
                formData.append('music_director', musicDirector);
                formData.append('composer', composer);
                formData.append('lyrics', lyrics);

                // Add cover image if selected
                if (coverFile) {
                    formData.append('cover', coverFile);
                }

                const response = await fetch(`/api/songs/${songId}`, {
                    method: 'PUT',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    successDiv.textContent = 'Song updated successfully!';
                    successDiv.style.display = 'block';

                    setTimeout(() => {
                        closeEditModal();
                        // Reload songs
                        const user = checkAuth();
                        if (user) {
                            window.location.reload();
                        }
                    }, 1500);
                } else {
                    errorDiv.textContent = data.error || 'Failed to update song';
                    errorDiv.style.display = 'block';
                    submitBtn.disabled = false;
                    btnText.style.display = 'inline';
                    btnLoader.style.display = 'none';
                }
            } catch (error) {
                console.error('Update error:', error);
                errorDiv.textContent = 'Failed to update song. Please try again.';
                errorDiv.style.display = 'block';
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        });
    }
});

// Delete song function
window.deleteSong = async function(songId, songTitle) {
    if (!confirm(`Are you sure you want to delete "${songTitle}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/songs/${songId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert('Song deleted successfully!');
            // Reload songs
            const user = await checkAuth();
            if (user) {
                loadMySongs(user.id);
            }
        } else {
            alert(data.error || 'Failed to delete song');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete song. Please try again.');
    }
};

// Logout function
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
    }
});

// Refresh songs button
document.getElementById('refresh-songs').addEventListener('click', async () => {
    const user = await checkAuth();
    if (user) {
        loadMySongs(user.id);
    }
});

// Initialize dashboard
(async function init() {
    console.log('🚀 Initializing creator dashboard...');
    const user = await checkAuth();
    console.log('👤 User data:', user);

    if (user) {
        // Display user name
        document.getElementById('user-name').textContent = user.full_name || user.username;
        console.log('✅ User authenticated:', user.username, '| ID:', user.id, '| Role:', user.role);

        // Load user's songs
        loadMySongs(user.id);
    } else {
        console.log('❌ No user data, redirect should happen');
    }
})();
