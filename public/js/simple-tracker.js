// Simple RudderStack Tracker - Direct API Calls
(function() {
    const WRITE_KEY = '36QF0PqNsJf4zj6W9LbkkXiUEM7';
    const ENDPOINT = 'https://rudder-event-prod.stage.in/v1/track';
    
    // Get or create device ID
    function getDeviceId() {
        let deviceId = localStorage.getItem('stage_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('stage_device_id', deviceId);
        }
        return deviceId;
    }
    
    const deviceId = getDeviceId();
    const sessionId = 'session_' + Date.now();
    const sessionStartTime = Date.now();

    // Session tracking variables
    let songsPlayedCount = 0;
    let pagesViewedCount = 0;
    let lastActivityTime = Date.now();
    let isUserActive = true;
    
    // Simple track function
    function trackEvent(eventName, properties = {}) {
        const payload = {
            anonymousId: deviceId,
            event: eventName + '_web',
            properties: {
                ...properties,
                session_id: sessionId,
                device_id: deviceId,
                platform: 'web',
                timestamp: new Date().toISOString(),
                page_url: window.location.href
            },
            context: {
                page: {
                    url: window.location.href
                }
            },
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 TRACKING:', eventName, properties);
        
        fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa(WRITE_KEY + ':')
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            console.log('✅ Event sent:', eventName, 'Status:', response.status);
            return response.text();
        })
        .then(data => console.log('Response:', data))
        .catch(error => console.error('❌ Error sending event:', error));
    }
    
    // Create simple tracker object
    window.simpleTracker = {
        track: trackEvent,
        trackSongPlay: function(song, source, position) {
            trackEvent('song_played', {
                song_id: song.id,
                song_title: song.title,
                artist: song.singer,
                language: song.language,
                source: source,
                position: position
            });
        },
        trackSongPause: function(song, playedDuration, totalDuration) {
            trackEvent('song_paused', {
                song_id: song.id,
                song_title: song.title,
                played_duration: Math.round(playedDuration),
                total_duration: Math.round(totalDuration),
                completion_percentage: Math.round((playedDuration / totalDuration) * 100)
            });
        },
        trackSongComplete: function(song) {
            trackEvent('song_completed', {
                song_id: song.id,
                song_title: song.title
            });
        },

        // === LISTENING MILESTONE TRACKING - 4 Separate Events ===
        trackSong30sListened: function(song, currentTime, totalDuration) {
            console.log('🎯 30s Milestone Reached!', song.title);
            trackEvent('listening_milestone_30s', {
                song_id: song.id,
                song_title: song.title,
                artist: song.singer,
                language: song.language,
                milestone: '30s',
                current_time: Math.round(currentTime),
                total_duration: Math.round(totalDuration),
                completion_percentage: Math.round((currentTime / totalDuration) * 100)
            });
        },

        trackSong1minListened: function(song, currentTime, totalDuration) {
            console.log('🎯 1min Milestone Reached!', song.title);
            trackEvent('listening_milestone_1min', {
                song_id: song.id,
                song_title: song.title,
                artist: song.singer,
                language: song.language,
                milestone: '1min',
                current_time: Math.round(currentTime),
                total_duration: Math.round(totalDuration),
                completion_percentage: Math.round((currentTime / totalDuration) * 100)
            });
        },

        trackSong2minListened: function(song, currentTime, totalDuration) {
            console.log('🎯 2min Milestone Reached!', song.title);
            trackEvent('listening_milestone_2min', {
                song_id: song.id,
                song_title: song.title,
                artist: song.singer,
                language: song.language,
                milestone: '2min',
                current_time: Math.round(currentTime),
                total_duration: Math.round(totalDuration),
                completion_percentage: Math.round((currentTime / totalDuration) * 100)
            });
        },

        trackSong3minListened: function(song, currentTime, totalDuration) {
            console.log('🎯 3min Milestone Reached!', song.title);
            trackEvent('listening_milestone_3min', {
                song_id: song.id,
                song_title: song.title,
                artist: song.singer,
                language: song.language,
                milestone: '3min',
                current_time: Math.round(currentTime),
                total_duration: Math.round(totalDuration),
                completion_percentage: Math.round((currentTime / totalDuration) * 100)
            });
        },
        trackSearch: function(query, resultsCount) {
            trackEvent('search_query', {
                query: query,
                results_count: resultsCount
            });
        },
        trackLogin: function(method) {
            trackEvent('logged_in', { method: method });
        },
        trackSignup: function(userId, method, traits) {
            trackEvent('signed_up', {
                method: method,
                user_id: userId
            });
        },
        trackLogout: function() {
            trackEvent('logged_out', {});
        },
        trackPlaylistCreate: function(playlistId, playlistName, isPublic) {
            trackEvent('playlist_created', {
                playlist_id: playlistId,
                playlist_name: playlistName,
                is_public: isPublic
            });
        },
        trackSongAddedToPlaylist: function(songId, playlistId, songTitle) {
            trackEvent('song_added_to_playlist', {
                song_id: songId,
                song_title: songTitle,
                playlist_id: playlistId
            });
        },
        trackSongRemovedFromPlaylist: function(songId, playlistId, songTitle) {
            trackEvent('song_removed_from_playlist', {
                song_id: songId,
                song_title: songTitle,
                playlist_id: playlistId
            });
        },

        // === NEW PLAYER EVENTS ===
        trackSongSkipped: function(song, direction) {
            trackEvent('song_skipped', {
                song_id: song?.id,
                song_title: song?.title,
                direction: direction
            });
        },
        trackSongSeeked: function(song, fromTime, toTime) {
            trackEvent('song_seeked', {
                song_id: song?.id,
                from_time: Math.round(fromTime),
                to_time: Math.round(toTime)
            });
        },
        trackRepeatToggled: function(mode) {
            trackEvent('repeat_toggled', { mode: mode });
        },
        trackMiniPlayerExpanded: function() {
            trackEvent('mini_player_expanded', {});
        },
        trackFullPlayerMinimized: function() {
            trackEvent('full_player_minimized', {});
        },

        // === NEW SEARCH EVENTS ===
        trackSearchResultClicked: function(query, songId, position) {
            trackEvent('search_result_clicked', {
                query: query,
                song_id: songId,
                position: position
            });
        },
        trackSearchNoResults: function(query) {
            trackEvent('search_no_results', { query: query });
        },

        // === NEW AUTH EVENTS ===
        trackLoginFailed: function(error) {
            trackEvent('login_failed', { error: error });
        },
        trackSignupFailed: function(error) {
            trackEvent('signup_failed', { error: error });
        },
        trackProfileViewed: function() {
            trackEvent('profile_viewed', {});
        },

        // === NEW PLAYLIST EVENTS ===
        trackPlaylistViewed: function(playlistId, playlistName) {
            trackEvent('playlist_viewed', {
                playlist_id: playlistId,
                playlist_name: playlistName
            });
        },
        trackPlaylistPlayed: function(playlistId, playlistName) {
            trackEvent('playlist_played', {
                playlist_id: playlistId,
                playlist_name: playlistName
            });
        },

        // === NEW NAVIGATION EVENTS ===
        trackScreenViewed: function(screenName) {
            trackEvent('screen_viewed', { screen_name: screenName });
        },
        trackCategoryClicked: function(categoryId, categoryName) {
            trackEvent('category_clicked', {
                category_id: categoryId,
                category_name: categoryName
            });
        },
        trackAlbumClicked: function(albumId, albumName, language) {
            trackEvent('album_clicked', {
                album_id: albumId,
                album_name: albumName,
                language: language
            });
        },
        trackCustomSectionClicked: function(sectionId, sectionName) {
            trackEvent('custom_section_clicked', {
                section_id: sectionId,
                section_name: sectionName
            });
        },
        trackBackButtonPressed: function(fromScreen) {
            trackEvent('back_button_pressed', { from: fromScreen });
        },

        // === MOBILE APP OPENED ===
        trackMobileAppOpened: function() {
            trackEvent('mobile_app_opened', {
                app_display_language: document.documentElement.lang || 'en'
            });
        },

        // === MUSIC COLLECTION & REGIONAL HITS EVENTS ===
        trackMusicCollectionViewed: function() {
            trackEvent('music_collection_viewed', {});
        },
        trackRegionalHitsViewed: function() {
            trackEvent('regional_hits_viewed', {});
        },
        trackRegionalHitsCategory: function(language, categoryId) {
            trackEvent('regional_hits_category_clicked', {
                language: language,
                category_id: categoryId
            });
        },

        // === TRENDING EVENTS ===
        trackTrendingSectionViewed: function() {
            trackEvent('trending_section_viewed', {});
        },
        trackTrendingSongClicked: function(songId, songTitle, position) {
            trackEvent('trending_song_clicked', {
                song_id: songId,
                song_title: songTitle,
                position: position
            });
        },

        // === ALBUM SONG PLAY EVENT ===
        trackAlbumSongPlayed: function(songId, songTitle, albumId, albumName, language) {
            trackEvent('album_song_played', {
                song_id: songId,
                song_title: songTitle,
                album_id: albumId,
                album_name: albumName,
                language: language
            });
        },

        // === NEW ERROR EVENTS ===
        trackError: function(type, message) {
            trackEvent('error_occurred', {
                error_type: type,
                error_message: message
            });
        },

        // === SESSION TRACKING EVENTS ===
        trackSessionStarted: function() {
            trackEvent('session_started', {
                session_start_time: new Date(sessionStartTime).toISOString()
            });
        },

        trackSessionEnded: function(duration, songsPlayed, pagesViewed) {
            trackEvent('session_ended', {
                session_duration_seconds: Math.round(duration / 1000),
                session_duration_minutes: Math.round(duration / 60000),
                songs_played_count: songsPlayed,
                pages_viewed_count: pagesViewed,
                session_start_time: new Date(sessionStartTime).toISOString(),
                session_end_time: new Date().toISOString()
            });
        },

        trackSessionHeartbeat: function() {
            const currentDuration = Date.now() - sessionStartTime;
            trackEvent('session_heartbeat', {
                session_duration_seconds: Math.round(currentDuration / 1000),
                is_user_active: isUserActive,
                songs_played_count: songsPlayedCount,
                pages_viewed_count: pagesViewedCount,
                last_activity_seconds_ago: Math.round((Date.now() - lastActivityTime) / 1000)
            });
        },

        // Update counters
        incrementSongsPlayed: function() {
            songsPlayedCount++;
            lastActivityTime = Date.now();
            isUserActive = true;
        },

        incrementPagesViewed: function() {
            pagesViewedCount++;
            lastActivityTime = Date.now();
            isUserActive = true;
        },

        updateActivity: function() {
            lastActivityTime = Date.now();
            isUserActive = true;
        },

        // === TRAFFIC SOURCE TRACKING ===
        trackTrafficSource: function() {
            const referrer = document.referrer || 'direct';
            const urlParams = new URLSearchParams(window.location.search);

            // Get UTM parameters
            const utm_source = urlParams.get('utm_source') || null;
            const utm_medium = urlParams.get('utm_medium') || null;
            const utm_campaign = urlParams.get('utm_campaign') || null;
            const utm_content = urlParams.get('utm_content') || null;
            const utm_term = urlParams.get('utm_term') || null;

            // Determine traffic type
            let trafficType = 'direct';
            if (referrer && referrer !== 'direct') {
                const referrerUrl = new URL(referrer);
                const referrerHost = referrerUrl.hostname;

                // Search engines
                if (['google', 'bing', 'yahoo', 'duckduckgo', 'baidu'].some(s => referrerHost.includes(s))) {
                    trafficType = 'search';
                }
                // Social media
                else if (['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'whatsapp', 't.co', 'fb.me', 'linkedin.com'].some(s => referrerHost.includes(s))) {
                    trafficType = 'social';
                }
                // Same domain
                else if (referrerHost === window.location.hostname) {
                    trafficType = 'internal';
                }
                // Other sites
                else {
                    trafficType = 'referral';
                }
            }

            // Override with UTM source if available
            if (utm_source) {
                if (['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'whatsapp'].includes(utm_source.toLowerCase())) {
                    trafficType = 'social';
                } else if (['google', 'bing', 'yahoo'].includes(utm_source.toLowerCase())) {
                    trafficType = 'search';
                }
            }

            trackEvent('traffic_source', {
                referrer: referrer,
                referrer_domain: referrer !== 'direct' ? new URL(referrer).hostname : null,
                utm_source: utm_source,
                utm_medium: utm_medium,
                utm_campaign: utm_campaign,
                utm_content: utm_content,
                utm_term: utm_term,
                traffic_type: trafficType,
                landing_page: window.location.pathname,
                landing_url: window.location.href,
                has_utm_params: !!(utm_source || utm_medium || utm_campaign)
            });
        }
    };
    
    // Track app open (existing event)
    trackEvent('app_open', {
        app_display_language: document.documentElement.lang || 'en'
    });

    // Track mobile app opened (additional event)
    trackEvent('mobile_app_opened', {
        app_display_language: document.documentElement.lang || 'en'
    });

    // Track session started
    window.simpleTracker.trackSessionStarted();

    // Track traffic source (where user came from)
    window.simpleTracker.trackTrafficSource();

    // === SESSION DURATION TRACKING ===

    // Track user activity for idle detection
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
        document.addEventListener(event, () => {
            lastActivityTime = Date.now();
            isUserActive = true;
        }, { passive: true });
    });

    // Check idle status every 60 seconds
    setInterval(() => {
        const idleTime = Date.now() - lastActivityTime;
        if (idleTime > 120000) { // 2 minutes idle
            isUserActive = false;
        }
    }, 60000);

    // Send heartbeat every 30 seconds
    setInterval(() => {
        window.simpleTracker.trackSessionHeartbeat();
    }, 30000);

    // Track session end when user leaves
    window.addEventListener('beforeunload', () => {
        const sessionDuration = Date.now() - sessionStartTime;
        window.simpleTracker.trackSessionEnded(sessionDuration, songsPlayedCount, pagesViewedCount);
    });

    // Also track on visibility change (tab switch/minimize)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            const sessionDuration = Date.now() - sessionStartTime;
            window.simpleTracker.trackSessionEnded(sessionDuration, songsPlayedCount, pagesViewedCount);
        }
    });

    console.log('✅ Simple Tracker initialized with session tracking!');
})();
