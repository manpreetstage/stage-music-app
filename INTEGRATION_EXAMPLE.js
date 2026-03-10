/**
 * Stage Music - Event Tracking Integration Examples
 *
 * This file contains copy-paste ready code examples for integrating
 * event tracking into the Stage Music app.
 *
 * Follow the line numbers and function names to find where to add each snippet.
 */

// ============================================================================
// MOBILE APP INTEGRATION - /public/mobile/mobile.js
// ============================================================================

// -----------------------------------------------------------------------------
// 1. TRACK SONG PLAYBACK
// Location: Inside playSong() function (around line 200)
// -----------------------------------------------------------------------------

function playSong(songId) {
    const song = allSongs.find(s => s.id === songId);
    if (!song) return;

    currentSong = song;
    audioPlayer.src = song.audio_file;
    audioPlayer.play();
    isPlaying = true;

    // ✅ ADD THIS: Track song play event
    if (window.tracker) {
        window.tracker.trackSongPlay(song, currentPlaySource || 'unknown', currentPlayPosition || 0);
    }

    updateNowPlaying();
    updatePlayButton();
}

// -----------------------------------------------------------------------------
// 2. TRACK PAUSE/COMPLETE EVENTS
// Location: After audioPlayer initialization (around line 100)
// -----------------------------------------------------------------------------

// ✅ ADD THESE: Audio player event listeners
audioPlayer.addEventListener('pause', () => {
    if (currentSong && window.tracker && !audioPlayer.ended) {
        const playedDuration = Math.round(audioPlayer.currentTime);
        const totalDuration = Math.round(audioPlayer.duration);
        window.tracker.trackSongPause(currentSong, playedDuration, totalDuration);
    }
});

audioPlayer.addEventListener('ended', () => {
    if (currentSong && window.tracker) {
        window.tracker.trackSongComplete(currentSong);
    }
    playNext();
});

// -----------------------------------------------------------------------------
// 3. TRACK SEARCH
// Location: Inside performSearch() function
// -----------------------------------------------------------------------------

async function performSearch(query) {
    if (!query || query.length < 2) {
        showSearchEmpty();
        return;
    }

    showSearchLoading();

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        // ✅ ADD THIS: Track search event
        if (window.tracker) {
            window.tracker.trackSearch(query, data.results?.length || 0);
        }

        if (data.results && data.results.length > 0) {
            showSearchResults(data.results);
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Search error:', error);
        showSearchError();
    }
}

// -----------------------------------------------------------------------------
// 4. TRACK SEARCH RESULT CLICKS
// Location: When rendering search results or when user clicks
// -----------------------------------------------------------------------------

function handleSearchResultClick(song, position) {
    // ✅ ADD THIS: Track search result click
    if (window.tracker) {
        window.tracker.track('search_result_click', {
            query: currentSearchQuery,
            song_id: song.id,
            position: position,
            result_type: 'song'
        });
    }

    playSong(song.id);
}

// -----------------------------------------------------------------------------
// 5. TRACK SCREEN/PAGE NAVIGATION
// Location: Inside switchPage() function (around line 393)
// -----------------------------------------------------------------------------

function switchPage(page) {
    console.log('Switching to:', page);

    // Hide all full-screen views
    hideSearchView();
    hideCategoryView();
    hideLibraryView();
    hideProfileView();

    // ✅ ADD THIS: Track screen view
    if (window.tracker) {
        window.tracker.track('screen_view', {
            screen_name: page,
            previous_screen: currentPage || 'none'
        });
    }

    mainContent.style.display = page === 'home' ? 'block' : 'none';

    switch(page) {
        case 'home':
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

    currentPage = page;
}

// -----------------------------------------------------------------------------
// 6. TRACK SECTION VIEWS
// Location: Inside viewCategory() function
// -----------------------------------------------------------------------------

function viewCategory(sectionId) {
    const section = allSections.find(s => s.id === sectionId);
    if (!section) return;

    // ✅ ADD THIS: Track section view
    if (window.tracker) {
        window.tracker.track('section_view', {
            section_id: section.id,
            section_name: section.name,
            language: section.language,
            songs_count: section.songs?.length || 0
        });
    }

    // Show category view
    currentCategoryId = sectionId;
    currentCategoryName = section.name;
    renderCategoryView(section);
    showCategoryView();
}

// -----------------------------------------------------------------------------
// 7. TRACK ALBUM VIEWS
// Location: When opening an album
// -----------------------------------------------------------------------------

function viewAlbum(albumId) {
    const album = allAlbums.find(a => a.id === albumId);
    if (!album) return;

    // ✅ ADD THIS: Track album view
    if (window.tracker) {
        window.tracker.track('album_view', {
            album_id: album.id,
            album_name: album.title,
            song_count: album.song_count || 0
        });
    }

    renderAlbumView(album);
}

// -----------------------------------------------------------------------------
// 8. TRACK PLAYLIST CREATION
// Location: Inside createPlaylist() function
// -----------------------------------------------------------------------------

async function createPlaylist(name, description, isPublic) {
    try {
        const response = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                description: description,
                is_public: isPublic
            })
        });

        const data = await response.json();

        if (response.ok) {
            // ✅ ADD THIS: Track playlist creation
            if (window.tracker) {
                window.tracker.track('playlist_create', {
                    playlist_id: data.playlist.id,
                    playlist_name: name,
                    is_public: isPublic
                });
            }

            alert('✅ Playlist created!');
            loadUserPlaylists();
            return data;
        }
    } catch (error) {
        console.error('Playlist creation error:', error);
    }
}

// -----------------------------------------------------------------------------
// 9. TRACK ADD SONG TO PLAYLIST
// Location: Inside addToPlaylist() function
// -----------------------------------------------------------------------------

async function addToPlaylist(playlistId, songId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
            method: 'POST'
        });

        if (response.ok) {
            // ✅ ADD THIS: Track song added to playlist
            if (window.tracker) {
                window.tracker.track('song_add_to_playlist', {
                    song_id: songId,
                    playlist_id: playlistId
                });
            }

            alert('✅ Added to playlist!');
            closeAddToPlaylistModal();
        }
    } catch (error) {
        console.error('Add to playlist error:', error);
    }
}

// -----------------------------------------------------------------------------
// 10. TRACK REMOVE SONG FROM PLAYLIST
// Location: Inside removeSongFromPlaylist() function
// -----------------------------------------------------------------------------

async function removeSongFromPlaylist(playlistId, songId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // ✅ ADD THIS: Track song removed from playlist
            if (window.tracker) {
                window.tracker.track('song_remove_from_playlist', {
                    song_id: songId,
                    playlist_id: playlistId
                });
            }

            alert('✅ Removed from playlist!');
            viewPlaylistDetail(playlistId); // Refresh view
        }
    } catch (error) {
        console.error('Remove from playlist error:', error);
    }
}

// -----------------------------------------------------------------------------
// 11. TRACK DELETE PLAYLIST
// Location: Inside deletePlaylist() function
// -----------------------------------------------------------------------------

async function deletePlaylist(playlistId, playlistName) {
    if (!confirm(`Delete playlist "${playlistName}"?`)) return;

    try {
        const response = await fetch(`/api/playlists/${playlistId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // ✅ ADD THIS: Track playlist deletion
            if (window.tracker) {
                window.tracker.track('playlist_delete', {
                    playlist_id: playlistId,
                    songs_count: 0 // You might want to get this before deleting
                });
            }

            alert('✅ Playlist deleted!');
            hidePlaylistDetailView();
            loadUserPlaylists();
        }
    } catch (error) {
        console.error('Delete playlist error:', error);
    }
}

// -----------------------------------------------------------------------------
// 12. TRACK USER LOGIN
// Location: Inside handleMobileLogin() function
// -----------------------------------------------------------------------------

async function handleMobileLogin(e) {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // ✅ ADD THIS: Track login
            if (window.tracker) {
                window.tracker.track('user_login', {
                    method: 'email',
                    is_remember_me: false
                });
            }

            closeMobileLogin();
            loadUserProfile();
            alert('✅ Logged in successfully!');
        } else {
            showLoginError(data.error);
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('Login failed. Please try again.');
    }
}

// -----------------------------------------------------------------------------
// 13. TRACK USER REGISTRATION
// Location: Inside handleMobileRegister() function
// -----------------------------------------------------------------------------

async function handleMobileRegister(e) {
    e.preventDefault();

    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const fullname = document.getElementById('register-fullname').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, fullname, password })
        });

        const data = await response.json();

        if (response.ok) {
            // ✅ ADD THIS: Track signup
            if (window.tracker) {
                window.tracker.track('user_signup', {
                    method: 'email',
                    referral_source: 'direct'
                });
            }

            closeMobileRegister();
            alert('✅ Account created! Please login.');
            showMobileLogin();
        } else {
            showRegisterError(data.error);
        }
    } catch (error) {
        console.error('Register error:', error);
        showRegisterError('Registration failed. Please try again.');
    }
}

// -----------------------------------------------------------------------------
// 14. TRACK USER LOGOUT
// Location: Inside handleMobileLogout() function
// -----------------------------------------------------------------------------

async function handleMobileLogout() {
    if (!confirm('Are you sure you want to logout?')) return;

    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (response.ok) {
            // ✅ ADD THIS: Track logout
            if (window.tracker) {
                window.tracker.track('user_logout', {
                    session_duration: Math.round((Date.now() - sessionStartTime) / 1000) // seconds
                });
            }

            // Clear user data
            currentUser = null;
            showProfileGuest();
            switchPage('home');
            alert('✅ Logged out successfully!');
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// -----------------------------------------------------------------------------
// 15. TRACK ERRORS
// Location: In catch blocks throughout the app
// -----------------------------------------------------------------------------

// Example: In any catch block
catch (error) {
    console.error('Error:', error);

    // ✅ ADD THIS: Track error
    if (window.tracker) {
        window.tracker.trackError(
            'api_error',
            error.message,
            {
                endpoint: '/api/playlists',
                action: 'create_playlist'
            }
        );
    }

    alert('❌ An error occurred. Please try again.');
}

// ============================================================================
// DESKTOP APP INTEGRATION - /public/script.js
// ============================================================================

// Similar integration as mobile app - add tracking calls to:
// - playSong() function
// - Search functionality
// - Playlist operations
// - Authentication functions

// ============================================================================
// ADMIN PANEL INTEGRATION - /public/admin/sections.js
// ============================================================================

// -----------------------------------------------------------------------------
// 16. TRACK ADMIN SONG UPLOAD
// Location: After successful song upload
// -----------------------------------------------------------------------------

// In uploadSong() or similar function, after successful upload:
if (response.ok) {
    const data = await response.json();

    // ✅ ADD THIS: Track admin upload
    if (window.tracker) {
        window.tracker.track('admin_song_upload', {
            song_id: data.songId,
            method: 'manual',
            language: formData.get('language')
        });
    }

    alert('✅ Song uploaded!');
    loadSongs();
}

// -----------------------------------------------------------------------------
// 17. TRACK ADMIN ALBUM EDIT
// Location: After successful album edit
// -----------------------------------------------------------------------------

// In submitEditAlbum() function:
if (response.ok) {
    // ✅ ADD THIS: Track admin album edit
    if (window.tracker) {
        window.tracker.track('admin_album_edit', {
            album_id: albumId,
            changes: ['name', 'cover'] // List what was changed
        });
    }

    alert('✅ Album updated!');
}

// -----------------------------------------------------------------------------
// 18. TRACK ADMIN SONG DELETE
// Location: After successful song deletion
// -----------------------------------------------------------------------------

// In deleteSong() function:
if (response.ok) {
    // ✅ ADD THIS: Track admin song delete
    if (window.tracker) {
        window.tracker.track('admin_song_delete', {
            song_id: songId,
            language: song.language
        });
    }

    alert('✅ Song deleted!');
}

// ============================================================================
// USAGE NOTES
// ============================================================================

/**
 * 1. Always check if window.tracker exists before calling
 * 2. Use convenience methods when available (trackSongPlay, trackSearch, etc.)
 * 3. Use immediate flag for critical events: tracker.track('error', {...}, true)
 * 4. Keep properties clean - only send necessary data
 * 5. Events are automatically batched and sent every 5 seconds
 * 6. Events also flush on page unload (beforeunload)
 */

// ============================================================================
// TESTING
// ============================================================================

// Open browser console and run:
console.log(window.tracker); // Should show EventTracker object

// Test manual event:
window.tracker.track('test_event', { test_prop: 'test_value' });

// Check Network tab for POST /api/events after 5 seconds

// Verify in database:
// ssh root@69.49.243.142
// cd /root/stage-music-app
// sqlite3 database.db "SELECT * FROM events ORDER BY created_at DESC LIMIT 10;"
