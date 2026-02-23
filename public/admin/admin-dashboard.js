// Admin Dashboard JavaScript

// Check authentication and ensure admin role
async function checkAdminAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            // Not authenticated, redirect to login
            window.location.href = '/';
            return null;
        }
        const data = await response.json();

        // Check if user is admin
        if (data.user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = '/dashboard.html';
            return null;
        }

        return data.user;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
        return null;
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('/api/songs');
        const data = await response.json();

        const songs = data.songs || [];

        // Calculate stats
        const totalSongs = songs.length;
        const languages = [...new Set(songs.map(s => s.language).filter(Boolean))];
        const pendingApproval = songs.filter(s => !s.is_approved).length;

        // Update UI
        document.getElementById('total-songs').textContent = totalSongs;
        document.getElementById('total-languages').textContent = languages.length;
        document.getElementById('pending-songs').textContent = pendingApproval;

        // Load users count
        await loadUsersCount();
    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

// Load users count
async function loadUsersCount() {
    try {
        // Since we don't have a dedicated users API yet, we'll estimate from songs
        const response = await fetch('/api/songs');
        const data = await response.json();
        const songs = data.songs || [];
        const uniqueUsers = [...new Set(songs.map(s => s.user_id).filter(Boolean))];
        document.getElementById('total-users').textContent = uniqueUsers.length + 1; // +1 for admin
    } catch (error) {
        console.error('Failed to load users count:', error);
        document.getElementById('total-users').textContent = '1';
    }
}

// Load all songs (from all users)
async function loadAllSongs(filterLanguage = '') {
    const loadingEl = document.getElementById('loading');
    const songsContainer = document.getElementById('songs-container');
    const noSongsEl = document.getElementById('no-songs');

    loadingEl.style.display = 'block';
    songsContainer.innerHTML = '';
    noSongsEl.style.display = 'none';

    try {
        const response = await fetch('/api/songs');
        const data = await response.json();

        let songs = data.songs || [];

        // Filter by language if specified
        if (filterLanguage) {
            songs = songs.filter(song => song.language === filterLanguage);
        }

        loadingEl.style.display = 'none';

        if (songs.length === 0) {
            noSongsEl.style.display = 'block';
            return;
        }

        // Display songs
        songs.forEach(song => {
            const songCard = createSongCard(song);
            songsContainer.appendChild(songCard);
        });
    } catch (error) {
        console.error('Failed to load songs:', error);
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
    const userName = song.user_id ? `User #${song.user_id}` : 'Unknown';

    card.innerHTML = `
        <img src="${coverUrl}" alt="${song.title}" class="song-cover" onerror="this.src='/assets/default-cover.jpg'">
        <div class="song-info">
            <div class="song-title">${song.title}</div>
            <div class="song-artist">${song.artist}</div>
            <div class="song-user-info">Uploaded by: <strong>${userName}</strong></div>
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

// Edit song function (admin can edit any song)
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
        document.getElementById('edit-artist').value = song.artist;
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
                        window.location.reload();
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

// Delete song function (admin can delete any song)
window.deleteSong = async function(songId, songTitle) {
    if (!confirm(`Are you sure you want to delete "${songTitle}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/songs/${songId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert('Song deleted successfully!');
            // Reload songs and stats
            const filterLanguage = document.getElementById('filter-language').value;
            await loadAllSongs(filterLanguage);
            await loadStatistics();
        } else {
            alert(data.error || 'Failed to delete song');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete song. Please try again.');
    }
};

// Load all users
async function loadAllUsers() {
    const loadingEl = document.getElementById('users-loading');
    const tbody = document.getElementById('users-tbody');

    loadingEl.style.display = 'block';
    tbody.innerHTML = '';

    try {
        // Get all songs to count per user
        const songsResponse = await fetch('/api/songs');
        const songsData = await songsResponse.json();
        const songs = songsData.songs || [];

        // Count songs per user
        const songsByUser = {};
        songs.forEach(song => {
            const userId = song.user_id || 0;
            songsByUser[userId] = (songsByUser[userId] || 0) + 1;
        });

        // Mock users data (in production, you'd fetch from /api/users)
        const users = [
            {
                id: 1,
                username: 'admin',
                full_name: 'Administrator',
                email: 'admin@stagemusic.com',
                role: 'admin',
                is_active: 1,
                created_at: '2025-01-01'
            }
        ];

        // Add mock users based on song user_ids
        const uniqueUserIds = [...new Set(songs.map(s => s.user_id).filter(id => id && id !== 1))];
        uniqueUserIds.forEach(userId => {
            users.push({
                id: userId,
                username: `user${userId}`,
                full_name: `User ${userId}`,
                email: `user${userId}@stagemusic.com`,
                role: 'user',
                is_active: 1,
                created_at: '2025-01-15'
            });
        });

        loadingEl.style.display = 'none';

        // Display users
        users.forEach(user => {
            const row = document.createElement('tr');
            const songCount = songsByUser[user.id] || 0;
            const joinDate = new Date(user.created_at).toLocaleDateString();
            const roleClass = user.role === 'admin' ? 'role-admin' : 'role-user';
            const statusClass = user.is_active ? 'status-active' : 'status-inactive';
            const statusText = user.is_active ? 'Active' : 'Inactive';

            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.full_name}</td>
                <td>${user.email}</td>
                <td><span class="user-role ${roleClass}">${user.role.toUpperCase()}</span></td>
                <td>${songCount}</td>
                <td>${joinDate}</td>
                <td><span class="user-status ${statusClass}">${statusText}</span></td>
            `;

            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to load users:', error);
        loadingEl.style.display = 'none';
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #e74c3c;">Failed to load users. Please try again.</td></tr>';
    }
}

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
    const filterLanguage = document.getElementById('filter-language').value;
    await loadAllSongs(filterLanguage);
    await loadStatistics();
});

// Refresh users button
document.getElementById('refresh-users').addEventListener('click', async () => {
    await loadAllUsers();
});

// Filter language change
document.getElementById('filter-language').addEventListener('change', async (e) => {
    const filterLanguage = e.target.value;
    await loadAllSongs(filterLanguage);
});

// Initialize admin dashboard
(async function init() {
    const user = await checkAdminAuth();
    if (user) {
        // Display admin name
        document.getElementById('user-name').textContent = user.full_name || user.username;

        // Load all data
        await loadStatistics();
        await loadAllSongs();
        await loadAllUsers();
    }
})();
