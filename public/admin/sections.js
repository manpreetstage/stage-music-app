let allSongs = [];
let allSections = [];
let currentSection = null;
let selectedSongId = null;

// ========================================
// TOAST NOTIFICATION SYSTEM
// ========================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showSuccessToast(message) {
    showToast(`${message}<br><small style="opacity:0.8;">Refresh mobile app to see changes</small>`, 'success');
}

function showErrorToast(message) {
    showToast(message, 'error');
}

// Section configuration
const builtInSections = [
    { id: 'quick-picks', name: 'Quick Picks', icon: '⚡', type: 'builtin', limit: 9 },
    { id: 'trending', name: 'Trending', icon: '🔥', type: 'builtin', limit: 9 }
];

// Regional category IDs (from categories table)
const regionalCategoryIds = {
    haryanvi: 7,
    rajasthani: 10,
    bhojpuri: 8
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
});

// ========================================
// AUTHENTICATION FUNCTIONS
// ========================================

async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/me');

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Logged in as:', data.user.username);

            // Hide login overlay, show content
            document.getElementById('login-required-overlay').style.display = 'none';
            document.getElementById('upload-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'block';

            // Load admin content
            loadAllSections();
            loadAllSongs();
        } else {
            // Not logged in, show login overlay
            showLoginOverlay();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginOverlay();
    }
}

function showLoginOverlay() {
    document.getElementById('login-required-overlay').style.display = 'flex';
    document.getElementById('upload-btn').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
}

async function handleAdminLogin(event) {
    event.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            console.log('✅ Login successful');
            errorDiv.style.display = 'none';

            // Hide overlay, show content
            document.getElementById('login-required-overlay').style.display = 'none';
            document.getElementById('upload-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'block';

            // Load admin content
            loadAllSections();
            loadAllSongs();
        } else {
            const data = await response.json();
            errorDiv.textContent = '❌ ' + (data.error || 'Login failed');
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = '❌ Login error: ' + error.message;
        errorDiv.style.display = 'block';
    }
}

async function handleLogout() {
    if (!confirm('Logout karna hai?')) return;

    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (response.ok) {
            console.log('✅ Logged out');
            location.reload(); // Reload page to show login overlay
        } else {
            alert('❌ Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('❌ Logout error');
    }
}

// Load all sections: built-in, custom, and regional
async function loadAllSections() {
    try {
        // Fetch custom sections
        const customResponse = await fetch('/api/custom-sections');
        const customData = await customResponse.json();
        const customSections = (customData.sections || []).map(s => ({
            ...s,
            id: `custom-${s.id}`,
            customId: s.id,
            type: 'custom',
            limit: null
        }));

        // Fetch regional categories
        const categoriesResponse = await fetch('/api/categories');
        const categoriesData = await categoriesResponse.json();
        const regionalSections = categoriesData.categories
            .filter(cat => [7, 8, 10].includes(cat.id)) // Haryanvi, Bhojpuri, Rajasthani
            .map(cat => ({
                id: `regional-${cat.id}`,
                name: cat.name,
                icon: cat.icon === 'haryanvi' ? '🎻' : cat.icon === 'rajasthani' ? '🎺' : '🎸',
                type: 'regional',
                categoryId: cat.id,
                limit: null
            }));

        // Add album sections
        const albumSections = [
            { id: 'albums-haryanvi', name: 'Haryanvi Albums', icon: '💿', type: 'albums', language: 'Haryanvi', limit: null },
            { id: 'albums-rajasthani', name: 'Rajasthani Albums', icon: '📀', type: 'albums', language: 'Rajasthani', limit: null },
            { id: 'albums-bhojpuri', name: 'Bhojpuri Albums', icon: '🎵', type: 'albums', language: 'Bhojpuri', limit: null }
        ];

        // Merge all sections: built-in, custom, regional, albums
        allSections = [...builtInSections, ...customSections, ...regionalSections, ...albumSections];
        renderTabs();

        if (allSections.length > 0) {
            switchTab(allSections[0].id);
        }
    } catch (error) {
        console.error('Error loading sections:', error);
        allSections = builtInSections;
        renderTabs();
        switchTab(builtInSections[0].id);
    }
}

// Render tabs
function renderTabs() {
    const tabsContainer = document.getElementById('tabs-container');
    const tabsContent = document.getElementById('tabs-content');

    // Create tab buttons
    tabsContainer.innerHTML = allSections.map(section => `
        <button class="tab-btn" id="tab-btn-${section.id}" onclick="switchTab('${section.id}')">
            ${section.icon} ${section.name}
        </button>
    `).join('');

    // Create tab content areas
    tabsContent.innerHTML = allSections.map(section => {
        // Album sections have different UI
        if (section.type === 'albums') {
            return `
                <div class="tab-content" id="tab-${section.id}">
                    <div class="info-box">
                        <strong>${section.icon} ${section.name}:</strong>
                        Albums ko drag karke reorder kar sakte ho. Order change karne se mobile app pe album ka order change ho jayega.
                    </div>

                    <div class="section">
                        <h2 class="section-title">📌 Current Albums (<span id="count-${section.id}">0</span>)</h2>
                        <div class="songs-list" id="list-${section.id}">
                            <div class="empty-state">Loading...</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Regular sections (songs)
        return `
            <div class="tab-content" id="tab-${section.id}">
                <div class="info-box">
                    <strong>${section.icon} ${section.name}:</strong>
                    ${section.limit ? `Maximum ${section.limit} songs.` : 'Unlimited songs.'}
                    Sirf aapke selected songs hi dikhenge.
                </div>

                <div class="section">
                    <h2 class="section-title">📌 Current Songs (<span id="count-${section.id}">0</span>${section.limit ? `/${section.limit}` : ''})</h2>
                    <div class="songs-list" id="list-${section.id}">
                        <div class="empty-state">Loading...</div>
                    </div>
                </div>

                <div class="section">
                    <h2 class="section-title">➕ Add Song</h2>
                    <input type="text" class="search-box" id="search-${section.id}" placeholder="Search songs...">
                    <div class="hint-box">👇 Song select karo, phir green button click karo</div>
                    <div class="songs-grid" id="grid-${section.id}">
                        <div class="empty-state">Loading...</div>
                    </div>
                    <div class="add-btn-container">
                        <button class="add-btn" id="add-btn-${section.id}" disabled>
                            ➕ Add to ${section.name}
                        </button>
                        <div class="selection-status" id="status-${section.id}">Select a song</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Setup listeners
    allSections.forEach(section => setupSectionListeners(section.id));
}

// Switch tab
function switchTab(sectionId) {
    currentSection = sectionId;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-btn-${sectionId}`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${sectionId}`).classList.add('active');

    loadSectionSongs(sectionId);
    displaySongs(sectionId, allSongs);
    selectedSongId = null;
}

// Load all songs
async function loadAllSongs() {
    try {
        const response = await fetch('/api/songs');
        const data = await response.json();
        allSongs = data.songs || [];
        allSections.forEach(section => displaySongs(section.id, allSongs));
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Load section songs or albums
async function loadSectionSongs(sectionId) {
    const section = allSections.find(s => s.id === sectionId);
    if (!section) return;

    try {
        // Handle album sections differently
        if (section.type === 'albums') {
            const endpoint = `/api/admin/albums/${section.language}`;
            const response = await fetch(endpoint);
            const data = await response.json();
            const albums = data.albums || [];

            document.getElementById(`count-${sectionId}`).textContent = albums.length;
            const list = document.getElementById(`list-${sectionId}`);

            if (albums.length === 0) {
                list.innerHTML = '<div class="empty-state">No albums yet</div>';
                return;
            }

            list.innerHTML = albums.map((album, index) => `
                <div class="song-item-list" draggable="true" data-album-id="${album.id}" data-section-id="${sectionId}">
                    <div class="drag-handle">⋮⋮</div>
                    <div class="song-number">${index + 1}</div>
                    <img src="${album.cover_image || '/assets/default-cover.jpg'}" class="song-cover-small" onerror="this.src='/assets/default-cover.jpg'">
                    <div class="song-info-small">
                        <div class="song-title-small">${album.title}</div>
                        <div class="song-artist-small">${album.artist || 'Unknown'} • ${album.song_count || 0} songs</div>
                    </div>
                    <button class="btn-edit" onclick="editAlbum(${album.id}, '${sectionId}'); event.stopPropagation();">✏️ Edit</button>
                    <button class="remove-btn" onclick="deleteAlbum(${album.id}, '${album.title.replace(/'/g, "\\'")}', '${sectionId}'); event.stopPropagation();">🗑️ Delete</button>
                </div>
            `).join('');

            setupDragAndDrop(list, sectionId);
            return;
        }

        // Handle song sections (existing logic)
        let endpoint;
        if (section.type === 'builtin') {
            endpoint = `/api/admin/${sectionId}`;
        } else if (section.type === 'custom') {
            endpoint = `/api/admin/custom-sections/${section.customId}/songs`;
        } else if (section.type === 'regional') {
            endpoint = `/api/categories/${section.categoryId}/songs`;
        }

        const response = await fetch(endpoint);
        const data = await response.json();
        const songs = data.songs || [];

        document.getElementById(`count-${sectionId}`).textContent = songs.length;
        const list = document.getElementById(`list-${sectionId}`);

        if (songs.length === 0) {
            list.innerHTML = '<div class="empty-state">No songs yet</div>';
            return;
        }

        list.innerHTML = songs.map((song, index) => `
            <div class="song-item-list" draggable="true" data-song-id="${song.id}" data-section-id="${sectionId}">
                <div class="drag-handle">⋮⋮</div>
                <div class="song-number">${index + 1}</div>
                <img src="${song.cover_image || '/assets/default-cover.jpg'}" class="song-cover-small" onerror="this.src='/assets/default-cover.jpg'">
                <div class="song-info-small">
                    <div class="song-title-small">${song.title}</div>
                    <div class="song-artist-small">${song.artist || song.singer || 'Unknown'}</div>
                </div>
                <button class="edit-btn" onclick="openEditModal(${song.id}, event)">Edit</button>
                <button class="remove-btn" onclick="removeSong('${sectionId}', ${song.id}, event)">Remove</button>
            </div>
        `).join('');

        setupDragAndDrop(list, sectionId);
    } catch (error) {
        console.error('Error loading section songs:', error);
    }
}

// Display songs
function displaySongs(sectionId, songs) {
    const grid = document.getElementById(`grid-${sectionId}`);
    if (!grid) return;

    if (songs.length === 0) {
        grid.innerHTML = '<div class="empty-state">No songs</div>';
        return;
    }

    grid.innerHTML = songs.map(song => `
        <div class="song-item" onclick="selectSong('${sectionId}', ${song.id}, event)">
            <img src="${song.cover_image || '/assets/default-cover.jpg'}" class="song-cover" onerror="this.src='/assets/default-cover.jpg'">
            <div class="song-name">${song.title}</div>
            <div class="song-artist">${song.artist || song.singer || 'Unknown'}</div>
        </div>
    `).join('');
}

// Select song
function selectSong(sectionId, songId, event) {
    selectedSongId = songId;
    const grid = document.getElementById(`grid-${sectionId}`);
    grid.querySelectorAll('.song-item').forEach(item => item.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    document.getElementById(`add-btn-${sectionId}`).disabled = false;
    const song = allSongs.find(s => s.id === songId);
    if (song) {
        document.getElementById(`status-${sectionId}`).textContent = `Selected: ${song.title}`;
    }
}

// Add song
async function addSong(sectionId) {
    if (!selectedSongId) {
        showErrorToast('Please select a song first!');
        return;
    }

    const section = allSections.find(s => s.id === sectionId);
    if (!section) {
        console.error('Section not found:', sectionId);
        showErrorToast('Section not found');
        return;
    }

    const btn = document.getElementById(`add-btn-${sectionId}`);
    btn.innerHTML = '⏳ Adding...';
    btn.disabled = true;

    try {
        let endpoint;
        if (section.type === 'builtin') {
            endpoint = `/api/admin/${sectionId}`;
        } else if (section.type === 'custom') {
            endpoint = `/api/admin/custom-sections/${section.customId}/songs`;
        } else if (section.type === 'regional') {
            endpoint = `/api/categories/${section.categoryId}/songs`;
        }

        console.log('Adding song:', { sectionId, songId: selectedSongId, endpoint, sectionType: section.type });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: selectedSongId })
        });

        const data = await response.json();
        console.log('Response:', response.status, data);

        if (response.ok) {
            showSuccessToast(`Song added to ${section.name}!`);
            selectedSongId = null;
            document.getElementById(`status-${sectionId}`).textContent = 'Select a song';
            await loadSectionSongs(sectionId);
            document.querySelectorAll(`#grid-${sectionId} .song-item`).forEach(i => i.classList.remove('selected'));
        } else {
            showErrorToast(`Failed: ${data.error || 'Unknown error'}`);
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error adding song:', error);
        showErrorToast(`Error: ${error.message}`);
        btn.disabled = false;
    }
    btn.innerHTML = `➕ Add to ${section.name}`;
}

// Remove song
async function removeSong(sectionId, songId, event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!confirm('Remove this song?')) return;

    const section = allSections.find(s => s.id === sectionId);

    try {
        let endpoint;
        if (section.type === 'builtin') {
            endpoint = `/api/admin/${sectionId}/${songId}`;
        } else if (section.type === 'custom') {
            endpoint = `/api/admin/custom-sections/${section.customId}/songs/${songId}`;
        } else if (section.type === 'regional') {
            endpoint = `/api/categories/${section.categoryId}/songs/${songId}`;
        }

        const response = await fetch(endpoint, { method: 'DELETE' });
        if (response.ok) {
            showSuccessToast(`Song removed from ${section.name}!`);
            await loadSectionSongs(sectionId);
        } else {
            showErrorToast('Failed to remove song');
        }
    } catch (error) {
        console.error('Error removing song:', error);
        showErrorToast('Error removing song');
    }
}

// Drag & Drop
function setupDragAndDrop(listElement, sectionId) {
    const items = listElement.querySelectorAll('.song-item-list');
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragleave', handleDragLeave);
    });
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.currentTarget;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(i => i.classList.remove('drag-over'));
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget;
    if (target !== draggedElement) target.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    const target = e.currentTarget;
    target.classList.remove('drag-over');

    if (draggedElement !== target) {
        const list = target.parentNode;
        const sectionId = target.dataset.sectionId;

        if (target.previousSibling === draggedElement) {
            list.insertBefore(draggedElement, target);
        } else {
            list.insertBefore(draggedElement, target.nextSibling);
        }

        updateSongNumbers(list);
        await saveNewOrder(list, sectionId);
    }
    return false;
}

function updateSongNumbers(list) {
    const items = list.querySelectorAll('.song-item-list');
    items.forEach((item, index) => {
        const numberDiv = item.querySelector('.song-number');
        if (numberDiv) numberDiv.textContent = index + 1;
    });
}

async function saveNewOrder(list, sectionId) {
    const section = allSections.find(s => s.id === sectionId);
    const items = list.querySelectorAll('.song-item-list');

    console.log('💾 Saving order for:', {
        sectionId,
        sectionName: section?.name,
        sectionType: section?.type,
        categoryId: section?.categoryId,
        customId: section?.customId,
        itemsCount: items.length
    });

    try {
        let endpoint;
        let body;

        // Handle album sections
        if (section.type === 'albums') {
            const albumIds = Array.from(items).map(item => parseInt(item.dataset.albumId));
            endpoint = `/api/admin/albums/${section.language}/reorder`;
            body = JSON.stringify({ albumIds });
        } else {
            // Handle song sections
            const songIds = Array.from(items).map(item => parseInt(item.dataset.songId));

            if (section.type === 'builtin') {
                endpoint = `/api/admin/${sectionId}/reorder`;
            } else if (section.type === 'custom') {
                endpoint = `/api/admin/custom-sections/${section.customId}/reorder`;
            } else if (section.type === 'regional') {
                endpoint = `/api/categories/${section.categoryId}/reorder`;
            }

            body = JSON.stringify({ songIds });
        }

        console.log('📡 Calling API:', { endpoint, songCount: JSON.parse(body).songIds?.length || JSON.parse(body).albumIds?.length });

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: body
        });

        const result = await response.json();
        console.log('✅ API Response:', response.status, result);

        if (response.ok) {
            showSuccessToast(`✅ ${section.name} order saved!`);
        } else {
            showErrorToast(`Failed: ${result.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('❌ Error saving order:', error);
        showErrorToast(`Error: ${error.message}`);
    }
}

// Setup listeners
function setupSectionListeners(sectionId) {
    const btn = document.getElementById(`add-btn-${sectionId}`);
    if (btn) btn.addEventListener('click', () => addSong(sectionId));

    const search = document.getElementById(`search-${sectionId}`);
    if (search) {
        search.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = query
                ? allSongs.filter(s =>
                    s.title.toLowerCase().includes(query) ||
                    (s.artist && s.artist.toLowerCase().includes(query)) ||
                    (s.singer && s.singer.toLowerCase().includes(query))
                )
                : allSongs;
            displaySongs(sectionId, filtered);
        });
    }
}

// ========================================
// EDIT SONG FUNCTIONS
// ========================================

// Open edit modal and populate with song data
async function openEditModal(songId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    try {
        // Fetch song details
        const response = await fetch(`/api/songs/${songId}`);
        const data = await response.json();
        const song = data.song;

        // Populate form fields
        document.getElementById('edit-song-id').value = song.id;
        document.getElementById('edit-title').value = song.title || '';
        document.getElementById('edit-singer').value = song.singer || '';
        document.getElementById('edit-artist').value = song.artist || '';
        document.getElementById('edit-lyricist').value = song.lyricist || '';
        document.getElementById('edit-music-director').value = song.music_director || '';
        document.getElementById('edit-composer').value = song.composer || '';
        document.getElementById('edit-producer').value = song.producer || '';
        document.getElementById('edit-language').value = song.language || '';
        document.getElementById('edit-cover-image').value = song.cover_image || '';
        document.getElementById('edit-audio-file').value = song.audio_file || '';

        // Show modal
        document.getElementById('edit-modal').style.display = 'flex';

        // Setup file input listeners
        setupFileInputListeners();
    } catch (error) {
        console.error('Error loading song details:', error);
        alert('Error loading song details');
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    document.getElementById('edit-song-form').reset();

    // Remove any file size indicators
    const sizeIndicators = document.querySelectorAll('.file-size-indicator');
    sizeIndicators.forEach(el => el.remove());
}

// Show file size when selected
function setupFileInputListeners() {
    const coverInput = document.getElementById('edit-cover-file');
    const audioInput = document.getElementById('edit-audio-file-input');

    if (coverInput) {
        coverInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                let message = `Selected: ${file.name} (${sizeMB} MB)`;

                // Remove old indicator
                const oldIndicator = coverInput.parentElement.querySelector('.file-size-indicator');
                if (oldIndicator) oldIndicator.remove();

                // Add new indicator
                const indicator = document.createElement('div');
                indicator.className = 'file-size-indicator';
                indicator.style.cssText = 'color: #28a745; font-size: 0.9em; margin-top: 4px;';

                if (sizeMB > 5) {
                    message += ' ⚠️ Large file - will be compressed';
                    indicator.style.color = '#ffc107';
                }

                indicator.textContent = message;
                coverInput.parentElement.appendChild(indicator);
            }
        });
    }

    if (audioInput) {
        audioInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                let message = `Selected: ${file.name} (${sizeMB} MB)`;

                // Remove old indicator
                const oldIndicator = audioInput.parentElement.querySelector('.file-size-indicator');
                if (oldIndicator) oldIndicator.remove();

                // Add new indicator
                const indicator = document.createElement('div');
                indicator.className = 'file-size-indicator';
                indicator.style.cssText = 'color: #28a745; font-size: 0.9em; margin-top: 4px;';

                if (sizeMB > 10) {
                    message += ' ⚠️ Large file - upload may take time';
                    indicator.style.color = '#ffc107';
                }

                indicator.textContent = message;
                audioInput.parentElement.appendChild(indicator);
            }
        });
    }
}

// Submit song edit
async function submitEditSong(event) {
    event.preventDefault();

    const songId = document.getElementById('edit-song-id').value;

    try {
        // Get files before processing
        const coverFileInput = document.getElementById('edit-cover-file');
        const audioFileInput = document.getElementById('edit-audio-file-input');
        const coverFile = coverFileInput.files[0];
        const audioFile = audioFileInput.files[0];

        // Show progress message
        if (coverFile || audioFile) {
            const uploadMsg = coverFile && audioFile
                ? '⏳ Compressing and uploading files...'
                : coverFile
                    ? '⏳ Compressing cover image...'
                    : '⏳ Uploading audio file...';

            // Create a non-blocking notification
            const statusDiv = document.createElement('div');
            statusDiv.id = 'upload-status';
            statusDiv.style.cssText = 'position:fixed;top:20px;right:20px;background:#28a745;color:white;padding:16px 24px;border-radius:8px;z-index:99999;font-weight:600;';
            statusDiv.textContent = uploadMsg;
            document.body.appendChild(statusDiv);
        }

        // Use FormData to support file uploads
        const formData = new FormData();

        // Add text fields
        formData.append('title', document.getElementById('edit-title').value);
        formData.append('singer', document.getElementById('edit-singer').value);
        formData.append('artist', document.getElementById('edit-artist').value);
        formData.append('lyricist', document.getElementById('edit-lyricist').value);
        formData.append('music_director', document.getElementById('edit-music-director').value);
        formData.append('composer', document.getElementById('edit-composer').value);
        formData.append('producer', document.getElementById('edit-producer').value);
        formData.append('language', document.getElementById('edit-language').value);

        // Add URL fields (if no file is uploaded)
        formData.append('cover_image_url', document.getElementById('edit-cover-image').value);
        formData.append('audio_file_url', document.getElementById('edit-audio-file').value);

        // Compress and add cover image if selected
        if (coverFile) {
            console.log('📷 Original cover size:', (coverFile.size / 1024 / 1024).toFixed(2), 'MB');

            const options = {
                maxSizeMB: 0.5,          // Max 500KB
                maxWidthOrHeight: 1000,   // Max 1000px
                useWebWorker: true,
                fileType: 'image/jpeg'
            };

            try {
                const compressedFile = await imageCompression(coverFile, options);
                console.log('✅ Compressed cover size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
                formData.append('cover', compressedFile, compressedFile.name);
            } catch (compressionError) {
                console.error('Compression error, using original:', compressionError);
                formData.append('cover', coverFile);
            }
        }

        // Add audio file if selected (no compression for audio)
        if (audioFile) {
            console.log('🎵 Audio file size:', (audioFile.size / 1024 / 1024).toFixed(2), 'MB');
            formData.append('audio', audioFile);
        }

        // Update status
        const statusDiv = document.getElementById('upload-status');
        if (statusDiv) {
            statusDiv.textContent = '☁️ Uploading to S3...';
        }

        const response = await fetch(`/api/admin/songs/${songId}`, {
            method: 'PUT',
            body: formData
        });

        // Remove status div
        if (statusDiv) {
            statusDiv.remove();
        }

        if (response.ok) {
            showSuccessToast('Song updated successfully!');
            closeEditModal();

            // Reload all songs
            await loadAllSongs();

            // Reload current section to show updated data
            if (currentSection) {
                await loadSectionSongs(currentSection);
            }
        } else {
            const data = await response.json();
            showErrorToast('Failed to update song: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating song:', error);

        // Remove status div if exists
        const statusDiv = document.getElementById('upload-status');
        if (statusDiv) {
            statusDiv.remove();
        }

        alert('❌ Error updating song: ' + error.message);
    }
}

// ========================================
// UPLOAD NEW SONG FUNCTIONS
// ========================================

// Open upload modal
function openUploadModal() {
    document.getElementById('upload-modal').style.display = 'flex';
    setupUploadFileListeners();
}

// Close upload modal
function closeUploadModal() {
    document.getElementById('upload-modal').style.display = 'none';
    document.getElementById('upload-song-form').reset();

    // Remove file size indicators
    const sizeIndicators = document.querySelectorAll('.file-size-indicator');
    sizeIndicators.forEach(el => el.remove());
}

// Setup file input listeners for upload
function setupUploadFileListeners() {
    const coverInput = document.getElementById('upload-cover-file');
    const audioInput = document.getElementById('upload-audio-file');

    if (coverInput && !coverInput.hasListener) {
        coverInput.hasListener = true;
        coverInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                let message = `Selected: ${file.name} (${sizeMB} MB)`;

                const oldIndicator = coverInput.parentElement.querySelector('.file-size-indicator');
                if (oldIndicator) oldIndicator.remove();

                const indicator = document.createElement('div');
                indicator.className = 'file-size-indicator';
                indicator.style.cssText = 'color: #28a745; font-size: 0.9em; margin-top: 4px;';

                if (sizeMB > 5) {
                    message += ' ⚠️ Will be compressed';
                    indicator.style.color = '#ffc107';
                }

                indicator.textContent = message;
                coverInput.parentElement.appendChild(indicator);
            }
        });
    }

    if (audioInput && !audioInput.hasListener) {
        audioInput.hasListener = true;
        audioInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                let message = `Selected: ${file.name} (${sizeMB} MB)`;

                const oldIndicator = audioInput.parentElement.querySelector('.file-size-indicator');
                if (oldIndicator) oldIndicator.remove();

                const indicator = document.createElement('div');
                indicator.className = 'file-size-indicator';
                indicator.style.cssText = 'color: #e31e24; font-size: 0.9em; margin-top: 4px;';

                if (sizeMB > 10) {
                    message += ' ⚠️ Large file';
                    indicator.style.color = '#ffc107';
                }

                indicator.textContent = message;
                audioInput.parentElement.appendChild(indicator);
            }
        });
    }
}

// Submit new song upload
async function submitUploadSong(event) {
    event.preventDefault();

    const coverFile = document.getElementById('upload-cover-file').files[0];
    const audioFile = document.getElementById('upload-audio-file').files[0];

    if (!coverFile || !audioFile) {
        alert('❌ Cover image and audio file are required!');
        return;
    }

    try {
        // Create status notification
        const statusDiv = document.createElement('div');
        statusDiv.id = 'upload-status';
        statusDiv.style.cssText = 'position:fixed;top:20px;right:20px;background:#28a745;color:white;padding:16px 24px;border-radius:8px;z-index:99999;font-weight:600;';
        statusDiv.textContent = '⏳ Processing files...';
        document.body.appendChild(statusDiv);

        // Compress cover image
        console.log('📷 Original cover size:', (coverFile.size / 1024 / 1024).toFixed(2), 'MB');
        statusDiv.textContent = '⏳ Compressing cover image...';

        const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1000,
            useWebWorker: true,
            fileType: 'image/jpeg'
        };

        let compressedCover;
        try {
            compressedCover = await imageCompression(coverFile, options);
            console.log('✅ Compressed cover size:', (compressedCover.size / 1024 / 1024).toFixed(2), 'MB');
        } catch (compressionError) {
            console.error('Compression error, using original:', compressionError);
            compressedCover = coverFile;
        }

        // Prepare FormData
        statusDiv.textContent = '☁️ Uploading to S3...';

        const formData = new FormData();
        formData.append('title', document.getElementById('upload-title').value);
        formData.append('singer', document.getElementById('upload-singer').value);
        formData.append('lyricist', document.getElementById('upload-lyricist').value);
        formData.append('music_director', document.getElementById('upload-music-director').value);
        formData.append('composer', document.getElementById('upload-composer').value);
        formData.append('company', document.getElementById('upload-company').value);
        formData.append('language', document.getElementById('upload-language').value);
        formData.append('lyrics', document.getElementById('upload-lyrics').value);
        formData.append('cover', compressedCover, compressedCover.name);
        formData.append('audio', audioFile);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        statusDiv.remove();

        if (response.ok) {
            alert('✅ Song uploaded successfully!');
            closeUploadModal();

            // Reload all songs
            await loadAllSongs();

            // Reload current section if any
            if (currentSection) {
                await loadSectionSongs(currentSection);
            }
        } else {
            const data = await response.json();
            alert('❌ Upload failed: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error uploading song:', error);

        const statusDiv = document.getElementById('upload-status');
        if (statusDiv) {
            statusDiv.remove();
        }

        alert('❌ Error uploading song: ' + error.message);
    }
}

// ============ ALBUM EDIT FUNCTIONS ============
let currentEditingAlbumId = null;
let currentEditingSectionId = null;

async function editAlbum(albumId, sectionId) {
    currentEditingAlbumId = albumId;
    currentEditingSectionId = sectionId;

    // Close Add Song modal if open
    closeAddSongToAlbumModal();

    try {
        const response = await fetch(`/api/albums/${albumId}`);
        const data = await response.json();
        const album = data.album;
        const songs = data.songs || [];

        document.getElementById('edit-album-id').value = album.id;
        document.getElementById('edit-album-section-id').value = sectionId;
        document.getElementById('edit-album-name').value = album.name || album.title;
        document.getElementById('edit-album-cover-preview').src = album.cover_image || '/assets/default-cover.jpg';
        document.getElementById('album-songs-count').textContent = songs.length;

        const songsList = document.getElementById('album-songs-list');
        songsList.innerHTML = songs.map(song => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #1a1a1a; border-radius: 8px; border: 2px solid #333;">
                <img src="${song.cover_image || '/assets/default-cover.jpg'}" style="width: 60px; height: 60px; border-radius: 6px; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #fff;">${song.title}</div>
                    <div style="color: #888; font-size: 0.85em;">${song.singer || 'Unknown'}</div>
                </div>
                <input type="file" id="cover-${song.id}" accept="image/*" onchange="updateSongCover(${song.id})" style="display: none;">
                <button class="btn-edit" onclick="document.getElementById('cover-${song.id}').click(); event.preventDefault();" style="padding: 8px 16px; font-size: 0.9em;">
                    📷 Cover
                </button>
                <button class="remove-btn" onclick="removeSongFromAlbum(${albumId}, ${song.id}); event.preventDefault();" style="padding: 8px 16px; font-size: 0.9em;">
                    Remove
                </button>
            </div>
        `).join('');

        document.getElementById('edit-album-modal').classList.add('active');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

function closeEditAlbumModal() {
    document.getElementById('edit-album-modal').classList.remove('active');
    closeAddSongToAlbumModal(); // Also close Add Song modal
}

async function submitEditAlbum(event) {
    event.preventDefault();

    const albumId = document.getElementById('edit-album-id').value;
    const sectionId = document.getElementById('edit-album-section-id').value;
    const name = document.getElementById('edit-album-name').value;
    const coverFile = document.getElementById('edit-album-cover-file').files[0];

    try {
        const formData = new FormData();
        formData.append('name', name);

        if (coverFile) {
            const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1000, useWebWorker: true, fileType: 'image/jpeg' };
            const compressed = await imageCompression(coverFile, options);
            formData.append('cover', compressed, 'cover.jpg');
        }

        const response = await fetch(`/api/admin/albums/${albumId}`, {
            method: 'PUT',
            body: formData
        });

        if (response.ok) {
            alert('✅ Saved!');
            closeEditAlbumModal();
            await loadSectionSongs(sectionId);
        } else {
            alert('❌ Error');
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function updateSongCover(songId) {
    const file = document.getElementById(`cover-${songId}`).files[0];
    if (!file) return;

    try {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1000, useWebWorker: true, fileType: 'image/jpeg' };
        const compressed = await imageCompression(file, options);

        const formData = new FormData();
        formData.append('cover', compressed, 'cover.jpg');

        const response = await fetch(`/api/admin/songs/${songId}/cover`, {
            method: 'PUT',
            body: formData
        });

        if (response.ok) {
            alert('✅ Cover updated!');
            await editAlbum(currentEditingAlbumId, currentEditingSectionId);
        } else {
            alert('❌ Error');
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function removeSongFromAlbum(albumId, songId) {
    if (!confirm('Remove song?')) return;

    try {
        const response = await fetch(`/api/admin/albums/${albumId}/songs/${songId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('✅ Removed!');
            await editAlbum(albumId, currentEditingSectionId);
        } else {
            alert('❌ Error');
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

function showAddSongToAlbumModal() {
    const searchInput = document.getElementById('add-song-search');
    const songsList = document.getElementById('add-song-list');

    const filterSongs = (query = '') => {
        const filtered = allSongs.filter(s =>
            s.title.toLowerCase().includes(query.toLowerCase()) ||
            (s.singer && s.singer.toLowerCase().includes(query.toLowerCase()))
        );

        songsList.innerHTML = filtered.map(song => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #1a1a1a; border-radius: 8px; cursor: pointer;" onclick="addSongToAlbum(${song.id})">
                <img src="${song.cover_image || '/assets/default-cover.jpg'}" style="width: 50px; height: 50px; border-radius: 6px;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #fff;">${song.title}</div>
                    <div style="color: #888; font-size: 0.85em;">${song.singer || 'Unknown'}</div>
                </div>
                <span style="color: #28a745;">➕</span>
            </div>
        `).join('');
    };

    searchInput.value = '';
    searchInput.oninput = (e) => filterSongs(e.target.value);
    filterSongs();

    document.getElementById('add-song-to-album-modal').classList.add('active');
}

function closeAddSongToAlbumModal() {
    document.getElementById('add-song-to-album-modal').classList.remove('active');
}

async function addSongToAlbum(songId) {
    if (!currentEditingAlbumId) return;

    try {
        const response = await fetch(`/api/admin/songs/${songId}/album`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ album_id: currentEditingAlbumId })
        });

        if (response.ok) {
            alert('✅ Added!');
            closeAddSongToAlbumModal();
            await editAlbum(currentEditingAlbumId, currentEditingSectionId);
        } else {
            alert('❌ Error');
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function deleteAlbum(albumId, albumTitle, sectionId) {
    if (!confirm(`Delete "${albumTitle}"?\n\nSongs won't be deleted.`)) return;

    try {
        const response = await fetch(`/api/admin/albums/${albumId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('✅ Deleted!');
            await loadSectionSongs(sectionId);
        } else {
            alert('❌ Error');
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}
