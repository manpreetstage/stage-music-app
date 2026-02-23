// DOM Elements
const uploadForm = document.getElementById('upload-form');
const audioInput = document.getElementById('audio');
const coverInput = document.getElementById('cover');
const fileLabel = document.getElementById('file-label');
const coverLabel = document.getElementById('cover-label');
const fileInfo = document.getElementById('file-info');
const coverInfo = document.getElementById('cover-info');
const coverPreview = document.getElementById('cover-preview');
const coverPreviewImg = document.getElementById('cover-preview-img');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.getElementById('progress-fill-upload');
const progressText = document.getElementById('progress-text');
const submitBtn = document.getElementById('submit-btn');
const uploadSuccess = document.getElementById('upload-success');
const successMessage = document.getElementById('success-message');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    await checkAuth();
    loadStats();
    setupEventListeners();
});

// Check if user is logged in
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            // Not authenticated, redirect to login
            alert('Please login to upload songs');
            window.location.href = '/?login=true';
            return false;
        }
        const data = await response.json();
        console.log('User authenticated:', data.user.username);
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        alert('Please login to upload songs');
        window.location.href = '/?login=true';
        return false;
    }
}

// Load stats
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        document.getElementById('admin-total-songs').textContent = data.stats.total || 0;
        document.getElementById('admin-total-plays').textContent = data.stats.totalPlays || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // File input change
    audioInput.addEventListener('change', handleFileSelect);
    coverInput.addEventListener('change', handleCoverSelect);

    // Drag and drop for audio
    const dropZone = fileLabel;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.background = 'rgba(102, 126, 234, 0.3)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.background = 'rgba(102, 126, 234, 0.1)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.background = 'rgba(102, 126, 234, 0.1)';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            audioInput.files = files;
            handleFileSelect({ target: { files } });
        }
    });

    // Form submit
    uploadForm.addEventListener('submit', handleSubmit);
}

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];

    if (!file) {
        fileInfo.textContent = '';
        return;
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/x-m4a'];
    const isAudio = allowedTypes.includes(file.type) || file.name.match(/\.(mp3|wav|m4a|aac|flac|ogg|wma)$/i);

    if (!isAudio) {
        alert('Please select a valid audio file!');
        audioInput.value = '';
        fileInfo.textContent = '';
        return;
    }

    // Display file info
    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    fileInfo.textContent = `📁 ${file.name} (${fileSize} MB)`;
}

// Handle cover image selection
function handleCoverSelect(e) {
    const file = e.target.files[0];

    if (!file) {
        coverInfo.textContent = '';
        coverPreview.style.display = 'none';
        return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const isImage = allowedTypes.includes(file.type) || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);

    if (!isImage) {
        alert('Please select a valid image file (JPG, PNG, GIF, WEBP)!');
        coverInput.value = '';
        coverInfo.textContent = '';
        coverPreview.style.display = 'none';
        return;
    }

    // Display file info
    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    coverInfo.textContent = `🖼️ ${file.name} (${fileSize} MB)`;

    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        coverPreviewImg.src = e.target.result;
        coverPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Handle form submit
async function handleSubmit(e) {
    e.preventDefault();

    // Validate
    const title = document.getElementById('title').value.trim();
    const singer = document.getElementById('singer').value.trim();
    const audioFile = audioInput.files[0];

    if (!title || !singer || !audioFile) {
        alert('Please fill in all required fields!');
        return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('title', title);
    formData.append('singer', singer);
    formData.append('music_director', document.getElementById('music_director').value.trim());
    formData.append('composer', document.getElementById('composer').value.trim());
    formData.append('company', document.getElementById('company').value.trim());
    formData.append('language', document.getElementById('language').value);
    formData.append('lyrics', document.getElementById('lyrics').value.trim());
    formData.append('audio', audioFile);

    // Add cover image if selected
    const coverFile = coverInput.files[0];
    if (coverFile) {
        formData.append('cover', coverFile);
    }

    // Show progress
    uploadForm.style.display = 'none';
    uploadProgress.style.display = 'block';
    submitBtn.disabled = true;

    try {
        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progressFill.style.width = percentComplete + '%';
                progressText.textContent = `Uploading... ${percentComplete}%`;
            }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);

                if (response.success) {
                    // Show success message
                    uploadProgress.style.display = 'none';
                    uploadSuccess.style.display = 'block';
                    successMessage.textContent = `"${response.song.title}" by ${response.song.singer} has been added to Stage Music!`;

                    // Update stats
                    loadStats();
                } else {
                    throw new Error(response.error || 'Upload failed');
                }
            } else {
                throw new Error(`Upload failed with status ${xhr.status}`);
            }
        });

        // Handle error
        xhr.addEventListener('error', () => {
            throw new Error('Upload failed. Please try again.');
        });

        // Send request
        xhr.open('POST', '/api/upload');
        xhr.send(formData);

    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);

        // Reset UI
        uploadForm.style.display = 'block';
        uploadProgress.style.display = 'none';
        submitBtn.disabled = false;
        progressFill.style.width = '0%';
        progressText.textContent = 'Uploading... 0%';
    }
}

// Reset form
function resetForm() {
    uploadForm.reset();
    fileInfo.textContent = '';
    coverInfo.textContent = '';
    coverPreview.style.display = 'none';
    uploadForm.style.display = 'block';
    uploadSuccess.style.display = 'none';
    submitBtn.disabled = false;
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading... 0%';
}

// Make resetForm available globally
window.resetForm = resetForm;

// Import from YouTube
async function importFromYouTube() {
    const youtubeUrl = document.getElementById('youtube-url').value.trim();
    const language = document.getElementById('youtube-language').value;

    if (!youtubeUrl) {
        alert('Please enter a YouTube URL!');
        return;
    }

    // Validate YouTube URL
    if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
        alert('Please enter a valid YouTube URL!');
        return;
    }

    const importBtn = document.getElementById('youtube-import-btn');
    const progressDiv = document.getElementById('youtube-progress');
    const successDiv = document.getElementById('youtube-success');
    const statusText = document.getElementById('youtube-status');

    // Show progress
    importBtn.disabled = true;
    progressDiv.style.display = 'block';
    successDiv.style.display = 'none';

    try {
        statusText.textContent = 'Fetching video info...';

        const response = await fetch('/api/import-youtube', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                videoUrl: youtubeUrl,
                language: language === 'Auto' ? null : language
            })
        });

        const data = await response.json();

        if (data.success) {
            // Show success
            progressDiv.style.display = 'none';
            successDiv.style.display = 'block';
            document.getElementById('youtube-success-message').textContent =
                `"${data.song.title}" has been imported successfully! Language: ${data.song.language}`;

            // Clear form
            document.getElementById('youtube-url').value = '';

            // Update stats
            loadStats();

            // Hide success after 5 seconds
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 5000);
        } else {
            throw new Error(data.error || 'Import failed');
        }

    } catch (error) {
        console.error('YouTube import error:', error);
        alert('Failed to import from YouTube: ' + error.message);
        progressDiv.style.display = 'none';
    } finally {
        importBtn.disabled = false;
    }
}

// Make it globally available
window.importFromYouTube = importFromYouTube;

// ============================================
// ALBUM UPLOAD FUNCTIONALITY
// ============================================

let albumSongCounter = 0;

// Toggle between single song and album upload
window.toggleUploadType = function() {
    const uploadType = document.querySelector('input[name="upload-type"]:checked').value;
    const singleForm = document.getElementById('upload-form');
    const albumForm = document.getElementById('album-upload-form');

    if (uploadType === 'single') {
        singleForm.style.display = 'block';
        albumForm.style.display = 'none';
    } else {
        singleForm.style.display = 'none';
        albumForm.style.display = 'block';
        // Add first song entry if none exists
        if (albumSongCounter === 0) {
            addAlbumSong();
        }
    }
};

// Add a new song entry to album
window.addAlbumSong = function() {
    if (albumSongCounter >= 50) {
        alert('Maximum 50 songs allowed in an album');
        return;
    }

    albumSongCounter++;
    const container = document.getElementById('album-songs-container');

    const songEntry = document.createElement('div');
    songEntry.className = 'album-song-entry';
    songEntry.dataset.songNumber = albumSongCounter;

    songEntry.innerHTML = `
        <div class="album-song-entry-header">
            <div class="album-song-number">Song ${albumSongCounter}</div>
            <button type="button" class="btn-remove-song" onclick="removeAlbumSong(${albumSongCounter})">
                ❌ Remove
            </button>
        </div>

        <div class="form-group">
            <label>Song Title *</label>
            <input type="text" class="album-song-title" required placeholder="Enter song title">
        </div>

        <div class="form-group">
            <label>🎵 Audio File (MP3, WAV) *</label>
            <div class="file-upload-container">
                <input type="file" class="album-song-audio" accept="audio/*" required id="album-audio-${albumSongCounter}">
                <label for="album-audio-${albumSongCounter}" class="file-label">
                    <span class="file-icon">🎵</span>
                    <span class="file-text">Choose Audio File</span>
                </label>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Singer/Artist *</label>
                <input type="text" class="album-song-singer" required placeholder="Singer name">
            </div>

            <div class="form-group">
                <label>Composer</label>
                <input type="text" class="album-song-composer" placeholder="Composer name">
            </div>
        </div>

        <div class="form-group">
            <label>Music Director</label>
            <input type="text" class="album-song-music-director" placeholder="Music director name">
        </div>
    `;

    container.appendChild(songEntry);
};

// Remove a song entry from album
window.removeAlbumSong = function(songNumber) {
    const entry = document.querySelector(`.album-song-entry[data-song-number="${songNumber}"]`);
    if (entry) {
        entry.remove();
        albumSongCounter--;
        // Renumber remaining songs
        renumberAlbumSongs();
    }
};

// Renumber songs after removal
function renumberAlbumSongs() {
    const entries = document.querySelectorAll('.album-song-entry');
    albumSongCounter = 0;
    entries.forEach((entry, index) => {
        albumSongCounter++;
        entry.dataset.songNumber = albumSongCounter;
        entry.querySelector('.album-song-number').textContent = `Song ${albumSongCounter}`;
        const removeBtn = entry.querySelector('.btn-remove-song');
        removeBtn.onclick = () => removeAlbumSong(albumSongCounter);
    });
}

// Preview album cover
document.addEventListener('DOMContentLoaded', () => {
    const albumCoverInput = document.getElementById('album-cover');
    if (albumCoverInput) {
        albumCoverInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('album-cover-preview');
                    const img = document.getElementById('album-cover-img');
                    img.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// Handle album upload form submission
const albumForm = document.getElementById('album-upload-form');
if (albumForm) {
    albumForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await uploadAlbum();
    });
}

async function uploadAlbum() {
    const albumTitle = document.getElementById('album-title').value.trim();
    const albumArtist = document.getElementById('album-artist').value.trim();
    const albumLanguage = document.getElementById('album-language').value;
    const albumCompany = document.getElementById('album-company').value.trim();
    const albumCover = document.getElementById('album-cover').files[0];

    // Validate
    if (!albumTitle || !albumArtist || !albumLanguage) {
        alert('Please fill all required album fields');
        return;
    }

    if (!albumCover) {
        alert('Please select an album cover image');
        return;
    }

    // Get all song entries
    const songEntries = document.querySelectorAll('.album-song-entry');
    if (songEntries.length === 0) {
        alert('Please add at least one song to the album');
        return;
    }

    // Validate and collect song data
    const songs = [];
    for (let i = 0; i < songEntries.length; i++) {
        const entry = songEntries[i];
        const title = entry.querySelector('.album-song-title').value.trim();
        const audio = entry.querySelector('.album-song-audio').files[0];
        const singer = entry.querySelector('.album-song-singer').value.trim();
        const composer = entry.querySelector('.album-song-composer').value.trim();
        const musicDirector = entry.querySelector('.album-song-music-director').value.trim();

        if (!title || !audio || !singer) {
            alert(`Song ${i + 1}: Please fill all required fields`);
            return;
        }

        songs.push({
            title,
            audio,
            singer,
            composer,
            musicDirector
        });
    }

    // Create FormData
    const formData = new FormData();
    formData.append('albumTitle', albumTitle);
    formData.append('albumArtist', albumArtist);
    formData.append('language', albumLanguage);
    formData.append('company', albumCompany);
    formData.append('cover', albumCover);

    // Add all songs
    songs.forEach((song, index) => {
        formData.append(`songs[${index}][title]`, song.title);
        formData.append(`songs[${index}][singer]`, song.singer);
        formData.append(`songs[${index}][composer]`, song.composer);
        formData.append(`songs[${index}][musicDirector]`, song.musicDirector);
        formData.append(`audio_${index}`, song.audio);
    });

    // Show progress
    const progressDiv = document.getElementById('album-upload-progress');
    const progressFill = document.getElementById('album-progress-fill');
    const progressText = document.getElementById('album-progress-text');
    const submitBtn = document.getElementById('album-submit-btn');

    console.log('📤 Starting album upload...');
    console.log('Album:', albumTitle, 'Songs:', songs.length);

    progressDiv.style.display = 'block';
    progressText.textContent = 'Uploading album... 0%';
    progressFill.style.width = '0%';
    submitBtn.disabled = true;

    try {
        // Use XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progressFill.style.width = percentComplete + '%';
                progressText.textContent = `Uploading album... ${percentComplete}%`;
                console.log(`📊 Upload progress: ${percentComplete}%`);
            }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
            console.log('📡 Response received:', xhr.status);

            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                console.log('📦 Response data:', data);

                if (data.success) {
                    console.log('✅ Album uploaded successfully!');
                    progressText.textContent = 'Upload complete!';
                    progressFill.style.width = '100%';

                    alert(`✅ Album "${albumTitle}" uploaded successfully with ${songs.length} songs!`);

                    // Reset form
                    const form = document.getElementById('album-upload-form');
                    if (form) form.reset();
                    document.getElementById('album-songs-container').innerHTML = '';
                    albumSongCounter = 0;
                    document.getElementById('album-cover-preview').style.display = 'none';

                    // Switch back to single upload
                    document.querySelector('input[name="upload-type"][value="single"]').checked = true;
                    toggleUploadType();

                    progressDiv.style.display = 'none';
                } else {
                    console.error('❌ Upload failed:', data.error);
                    throw new Error(data.error || 'Unknown error');
                }
            } else {
                throw new Error(`HTTP error! status: ${xhr.status}`);
            }
        });

        // Handle error
        xhr.addEventListener('error', () => {
            throw new Error('Upload failed. Please try again.');
        });

        // Handle timeout
        xhr.addEventListener('timeout', () => {
            throw new Error('Upload timeout. Please try again with fewer songs or smaller files.');
        });

        // Send request
        console.log('🚀 Sending request to /api/albums');
        xhr.open('POST', '/api/albums');
        xhr.timeout = 300000; // 5 minutes timeout
        xhr.send(formData);

    } catch (error) {
        console.error('❌ Album upload error:', error);
        alert('Failed to upload album: ' + error.message + '\nCheck browser console for details');
        progressDiv.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Add file name display when audio file is selected
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('album-song-audio')) {
        const file = e.target.files[0];
        const label = e.target.nextElementSibling;
        const fileText = label.querySelector('.file-text');
        
        if (file) {
            fileText.textContent = `✅ ${file.name}`;
            label.style.borderColor = '#27ae60';
            label.style.background = 'rgba(39, 174, 96, 0.1)';
        } else {
            fileText.textContent = 'Choose Audio File';
            label.style.borderColor = '';
            label.style.background = '';
        }
    }
});

// Simple test function for debugging
window.testAlbumUpload = async function() {
    console.log('🧪 Testing album upload endpoint...');

    const formData = new FormData();
    formData.append('albumTitle', 'Test Album');
    formData.append('albumArtist', 'Test Artist');
    formData.append('language', 'Hindi');
    formData.append('company', 'Test Company');

    // Create a small test file
    const blob = new Blob(['test'], { type: 'image/png' });
    formData.append('cover', blob, 'test.png');

    formData.append('songs[0][title]', 'Test Song');
    formData.append('songs[0][singer]', 'Test Singer');
    formData.append('songs[0][composer]', '');
    formData.append('songs[0][musicDirector]', '');

    const audioBlob = new Blob(['test audio'], { type: 'audio/mp3' });
    formData.append('audio_0', audioBlob, 'test.mp3');

    try {
        console.log('Sending test request...');
        const response = await fetch('/api/albums', {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
            console.log('✅ Test passed!');
        } else {
            console.log('❌ Test failed:', data.error);
        }
    } catch (error) {
        console.error('❌ Test error:', error);
    }
};

console.log('💡 Run testAlbumUpload() in console to test the API');
