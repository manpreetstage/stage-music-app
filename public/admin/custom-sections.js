let allSongs = [];
let sections = [];
let currentSection = null;
let selectedSongId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSections();
    loadAllSongs();
});

// Load sections
async function loadSections() {
    try {
        const response = await fetch('/api/custom-sections');
        const data = await response.json();
        sections = data.sections || [];

        renderTabs();
        if (sections.length > 0) {
            switchTab(sections[0].id);
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

// Render tabs
function renderTabs() {
    const tabsContainer = document.getElementById('tabs-container');
    const tabsContent = document.getElementById('tabs-content');

    // Create tab buttons
    tabsContainer.innerHTML = sections.map(section => `
        <button class="tab-btn" id="tab-btn-${section.id}" onclick="switchTab(${section.id})">
            ${section.icon} ${section.name}
        </button>
    `).join('');

    // Create tab content areas
    tabsContent.innerHTML = sections.map(section => `
        <div class="tab-content" id="tab-${section.id}">
            <div class="info-box">
                <strong>${section.icon} ${section.name}:</strong> Unlimited songs add kar sakte ho. Songs position ke order mein dikhenge.
            </div>

            <!-- Current Songs -->
            <div class="section">
                <h2 class="section-title">📌 Current Songs (<span id="count-${section.id}">0</span>)</h2>
                <div class="songs-list" id="list-${section.id}">
                    <div class="empty-state">Loading...</div>
                </div>
            </div>

            <!-- Add New -->
            <div class="section">
                <h2 class="section-title">➕ Add Song</h2>
                <input type="text" class="search-box" id="search-${section.id}" placeholder="Search songs...">

                <div class="hint-box">
                    👇 Song select karo, phir green button click karo
                </div>

                <div class="songs-grid" id="grid-${section.id}">
                    <div class="empty-state">Loading songs...</div>
                </div>

                <div class="add-btn-container">
                    <button class="add-btn" id="add-btn-${section.id}" disabled>
                        <span style="font-size: 1.2em;">➕</span> Add to ${section.name}
                    </button>
                    <div class="selection-status" id="status-${section.id}">
                        Select a song to enable this button
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Setup event listeners for each section
    sections.forEach(section => {
        setupSectionListeners(section.id);
    });
}

// Switch tab
function switchTab(sectionId) {
    currentSection = sectionId;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab-btn-${sectionId}`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${sectionId}`).classList.add('active');

    // Load songs for this section
    loadSectionSongs(sectionId);
    displaySongs(sectionId, allSongs);

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

        // Display in all grids
        sections.forEach(section => {
            displaySongs(section.id, allSongs);
        });
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Load section songs
async function loadSectionSongs(sectionId) {
    try {
        const response = await fetch(`/api/admin/custom-sections/${sectionId}/songs`);
        const data = await response.json();
        const songs = data.songs || [];

        document.getElementById(`count-${sectionId}`).textContent = songs.length;

        const list = document.getElementById(`list-${sectionId}`);

        if (songs.length === 0) {
            list.innerHTML = '<div class="empty-state">No songs yet. Add songs below!</div>';
            return;
        }

        list.innerHTML = songs.map((song, index) => `
            <div class="song-item-list" draggable="true" data-song-id="${song.id}" data-section-id="${sectionId}">
                <div class="drag-handle">⋮⋮</div>
                <div class="song-number">${index + 1}</div>
                <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                     class="song-cover-small"
                     onerror="this.src='/assets/default-cover.jpg'">
                <div class="song-info-small">
                    <div class="song-title-small">${song.title}</div>
                    <div class="song-artist-small">${song.artist || song.singer || 'Unknown'}</div>
                </div>
                <button class="remove-btn" onclick="removeSong(${sectionId}, ${song.id}, event)">Remove</button>
            </div>
        `).join('');

        // Setup drag and drop
        setupDragAndDrop(list, sectionId);
    } catch (error) {
        console.error('Error loading section songs:', error);
    }
}

// Setup drag and drop
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
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');

    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';

    const target = e.currentTarget;
    if (target !== draggedElement) {
        target.classList.add('drag-over');
    }

    return false;
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    const target = e.currentTarget;
    target.classList.remove('drag-over');

    if (draggedElement !== target) {
        // Get parent list
        const list = target.parentNode;
        const sectionId = target.dataset.sectionId;

        // Reorder in DOM
        if (target.previousSibling === draggedElement) {
            list.insertBefore(draggedElement, target);
        } else {
            list.insertBefore(draggedElement, target.nextSibling);
        }

        // Update numbers
        updateSongNumbers(list);

        // Save new order to backend
        await saveNewOrder(list, sectionId);
    }

    return false;
}

function updateSongNumbers(list) {
    const items = list.querySelectorAll('.song-item-list');
    items.forEach((item, index) => {
        const numberDiv = item.querySelector('.song-number');
        if (numberDiv) {
            numberDiv.textContent = index + 1;
        }
    });
}

async function saveNewOrder(list, sectionId) {
    const items = list.querySelectorAll('.song-item-list');
    const songIds = Array.from(items).map(item => parseInt(item.dataset.songId));

    try {
        const response = await fetch(`/api/admin/custom-sections/${sectionId}/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songIds })
        });

        if (response.ok) {
            console.log('✅ Order saved successfully');
        } else {
            console.error('Failed to save order');
            alert('Failed to save new order. Please try again.');
        }
    } catch (error) {
        console.error('Error saving order:', error);
        alert('Error saving order. Please try again.');
    }
}

// Display songs
function displaySongs(sectionId, songs) {
    const grid = document.getElementById(`grid-${sectionId}`);

    if (songs.length === 0) {
        grid.innerHTML = '<div class="empty-state">No songs found</div>';
        return;
    }

    grid.innerHTML = songs.map(song => `
        <div class="song-item" data-song-id="${song.id}" onclick="selectSong(${sectionId}, ${song.id}, event)">
            <img src="${song.cover_image || '/assets/default-cover.jpg'}"
                 class="song-cover"
                 onerror="this.src='/assets/default-cover.jpg'">
            <div class="song-name">${song.title}</div>
            <div class="song-artist">${song.artist || song.singer || 'Unknown'}</div>
        </div>
    `).join('');
}

// Select song
function selectSong(sectionId, songId, event) {
    selectedSongId = songId;

    // Remove selection from all songs in this grid
    const grid = document.getElementById(`grid-${sectionId}`);
    grid.querySelectorAll('.song-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Add selection to clicked item
    event.currentTarget.classList.add('selected');

    // Enable button
    const btn = document.getElementById(`add-btn-${sectionId}`);
    btn.disabled = false;

    // Update status
    const song = allSongs.find(s => s.id === songId);
    if (song) {
        document.getElementById(`status-${sectionId}`).textContent =
            `Selected: ${song.title} - Ready to add!`;
    }
}

// Add song
async function addSong(sectionId) {
    if (!selectedSongId) {
        alert('Please select a song first!');
        return;
    }

    const btn = document.getElementById(`add-btn-${sectionId}`);
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span style="font-size: 1.2em;">⏳</span> Adding...';
    btn.disabled = true;

    try {
        const response = await fetch(`/api/admin/custom-sections/${sectionId}/songs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: selectedSongId })
        });

        if (response.ok) {
            alert('✅ Song added successfully!');
            selectedSongId = null;
            document.getElementById(`status-${sectionId}`).textContent = 'Select a song to enable this button';
            await loadSectionSongs(sectionId);

            // Remove selection
            document.querySelectorAll(`#grid-${sectionId} .song-item`).forEach(item => {
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

// Remove song
async function removeSong(sectionId, songId, event) {
    // Prevent drag event from firing
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    if (!confirm('Remove this song from section?')) return;

    try {
        const response = await fetch(`/api/admin/custom-sections/${sectionId}/songs/${songId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadSectionSongs(sectionId);
        } else {
            alert('Failed to remove song');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error removing song');
    }
}

// Setup section listeners
function setupSectionListeners(sectionId) {
    // Add button
    const btn = document.getElementById(`add-btn-${sectionId}`);
    if (btn) {
        btn.addEventListener('click', () => addSong(sectionId));
    }

    // Search box
    const search = document.getElementById(`search-${sectionId}`);
    if (search) {
        search.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = query
                ? allSongs.filter(song =>
                    song.title.toLowerCase().includes(query) ||
                    (song.artist && song.artist.toLowerCase().includes(query)) ||
                    (song.singer && song.singer.toLowerCase().includes(query))
                )
                : allSongs;
            displaySongs(sectionId, filtered);
        });
    }
}
