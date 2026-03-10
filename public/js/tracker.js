// Stage Music - Event Tracking System
// Version: 3.0.0 - Adapted from stage-webapp implementation

(function() {
  'use strict';

  // Configuration
  const RUDDERSTACK_WRITE_KEY = '36QF0PqNsJf4zj6W9LbkkXiUEM7';
  const RUDDERSTACK_ENDPOINT = 'https://rudder-event-prod.stage.in';
  const APP_VERSION = '1.0.0';
  const PLATFORM = 'web'; // 'web', 'mobile_web', or 'tv'

  class StageEventTracker {
    constructor() {
      this.isInitialized = false;
      this.isLoading = false;
      this.sessionId = null;
      this.deviceId = window.stageDeviceId || null;
      this.platform = PLATFORM;

      // Auto-initialize
      this.init();
    }

    async init() {
      if (this.isLoading || this.isInitialized) {
        console.log('⚠️ Tracker already initializing or initialized');
        return;
      }
      this.isLoading = true;

      console.log('🚀 Starting RudderStack initialization...');
      console.log('📍 Write Key:', RUDDERSTACK_WRITE_KEY);
      console.log('📍 Endpoint:', RUDDERSTACK_ENDPOINT);
      console.log('📍 Device ID:', this.deviceId);

      try {
        // Load RudderStack SDK from CDN
        console.log('📦 Loading RudderStack SDK...');
        await this.loadRudderStackSDK();
        console.log('✅ SDK loaded successfully');

        // Initialize RudderStack
        console.log('🔧 Initializing RudderStack...');
        window.rudderanalytics.load(
          RUDDERSTACK_WRITE_KEY,
          RUDDERSTACK_ENDPOINT,
          {
            integrations: { All: true }
          }
        );

        // Wait for SDK to be ready
        window.rudderanalytics.ready(() => {
          console.log('✅ RudderStack SDK ready!');

          // Set anonymousId to deviceId for consistent tracking
          if (this.deviceId) {
            window.rudderanalytics.setAnonymousId(this.deviceId);
            console.log('👤 Anonymous ID set:', this.deviceId);
          }

          // Get session ID
          this.sessionId = window.rudderanalytics.getSessionId();
          console.log('🔑 Session ID:', this.sessionId);

          // Track app open
          console.log('📊 Tracking app_open event...');
          this.trackAppOpen();

          this.isInitialized = true;
          console.log('✅✅✅ RudderStack fully initialized and ready!');
        });
      } catch (error) {
        console.error('❌ Failed to initialize RudderStack:', error);
        this.isLoading = false;
      }
    }

    // Load RudderStack SDK dynamically
    loadRudderStackSDK() {
      return new Promise((resolve, reject) => {
        if (window.rudderanalytics && window.rudderanalytics.load) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.rudderlabs.com/v3/modern/rudder-analytics.min.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // Get user agent info
    getUserAgent() {
      const ua = navigator.userAgent;
      const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);

      let os = 'Unknown';
      if (ua.includes('Win')) os = 'Windows';
      else if (ua.includes('Mac')) os = 'macOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

      let browser = 'Unknown';
      if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
      else if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Edge')) browser = 'Edge';

      return {
        os_name: os,
        os_version: '', // Can parse from UA if needed
        browser_name: browser,
        browser_version: '', // Can parse from UA if needed
        device_type: isMobile ? 'mobile' : 'desktop',
        device_platform: this.platform,
        user_agent: ua
      };
    }

    // Get common properties for all events
    getCommonProperties() {
      const uaInfo = this.getUserAgent();

      return {
        ...uaInfo,
        session_id: this.sessionId,
        device_id: this.deviceId,
        version: APP_VERSION,
        platform: this.platform,
        nextJsWebsite: false, // This is a vanilla JS app
        device_screen_type: uaInfo.device_type,
        page_url: window.location.href,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        timestamp: new Date().toISOString()
      };
    }

    // Get user ID from session
    getUserId() {
      // Try to get from global variable or cookie
      return window.currentUserId || this.getCookie('user_id') || null;
    }

    // Get cookie value
    getCookie(name) {
      const value = '; ' + document.cookie;
      const parts = value.split('; ' + name + '=');
      if (parts.length === 2) {
        return decodeURIComponent(parts.pop().split(';').shift());
      }
      return null;
    }

    // Append platform to event name (following stage-webapp pattern)
    getEventName(eventName) {
      return `${eventName}_${this.platform}`;
    }

    // Track app open event
    async trackAppOpen() {
      const properties = {
        ...this.getCommonProperties(),
        app_display_language: document.documentElement.lang || 'en'
      };

      this.track('app_open', properties);
    }

    // Main track method
    track(eventName, properties = {}, options = {}) {
      if (!this.isInitialized) {
        console.warn('⚠️ RudderStack not initialized yet, event queued:', eventName);
        // Events will be queued in buffer
      }

      try {
        // Merge common properties
        const mergedProperties = {
          ...this.getCommonProperties(),
          ...properties
        };

        // Add user ID if available
        const userId = this.getUserId();
        if (userId) {
          mergedProperties.customer_user_id = userId;
          mergedProperties.userId = userId;
        }

        // Get event name with platform suffix
        const fullEventName = this.getEventName(eventName);

        // Console log ALWAYS (for debugging)
        console.log('📊 TRACKING EVENT:', fullEventName);
        console.log('   Properties:', properties);
        console.log('   Session ID:', this.sessionId);
        console.log('   Initialized:', this.isInitialized);

        // Track event
        window.rudderanalytics.track(fullEventName, mergedProperties, options);
        console.log('✅ Event sent to RudderStack');

      } catch (error) {
        console.error('❌ Failed to track event:', eventName, error);
      }
    }

    // Identify user
    identify(userId, traits = {}) {
      if (!this.isInitialized) {
        console.warn('RudderStack not initialized yet for identify');
        return;
      }

      try {
        const mergedTraits = {
          ...traits,
          device_id: this.deviceId,
          platform: this.platform,
          app_version: APP_VERSION
        };

        window.rudderanalytics.identify(userId.toString(), mergedTraits);

        console.log('👤 User identified:', userId);
      } catch (error) {
        console.error('Failed to identify user:', error);
      }
    }

    // Track page view
    page(pageName, properties = {}) {
      if (!this.isInitialized) {
        console.warn('RudderStack not initialized yet for page view');
        return;
      }

      try {
        const mergedProperties = {
          ...this.getCommonProperties(),
          ...properties
        };

        window.rudderanalytics.page({
          name: pageName,
          properties: mergedProperties
        });

        console.log('📄 Page:', pageName);
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    }

    // Reset (on logout)
    reset() {
      if (!this.isInitialized) return;

      try {
        window.rudderanalytics.reset();
        console.log('🔄 Tracker reset');
      } catch (error) {
        console.error('Failed to reset tracker:', error);
      }
    }

    // ============================================================================
    // CONVENIENCE METHODS
    // ============================================================================

    // Track song play
    trackSongPlay(song, source = 'unknown', position = 0) {
      this.track('song_played', {
        song_id: song.id,
        song_title: song.title || song.name,
        artist: song.singer || song.artist,
        language: song.language,
        source: source,
        position: position,
        duration: song.duration || 0,
        cover_image: song.cover_image
      });
    }

    // Track song pause
    trackSongPause(song, playedDuration, totalDuration) {
      const completionPercentage = Math.round((playedDuration / totalDuration) * 100);

      this.track('song_paused', {
        song_id: song.id,
        song_title: song.title || song.name,
        artist: song.singer || song.artist,
        played_duration: Math.round(playedDuration),
        total_duration: Math.round(totalDuration),
        completion_percentage: completionPercentage
      });
    }

    // Track song complete
    trackSongComplete(song) {
      this.track('song_completed', {
        song_id: song.id,
        song_title: song.title || song.name,
        artist: song.singer || song.artist,
        completion_rate: 100
      });
    }

    // Track search
    trackSearch(query, resultsCount = 0) {
      this.track('search_query', {
        query: query,
        results_count: resultsCount
      });
    }

    // Track signup
    trackSignup(userId, method = 'email', traits = {}) {
      // Identify user
      this.identify(userId, {
        ...traits,
        signup_method: method,
        signup_date: new Date().toISOString()
      });

      // Track event
      this.track('signed_up', {
        method: method,
        user_id: userId
      });
    }

    // Track login
    trackLogin(method = 'email') {
      this.track('logged_in', {
        method: method
      });
    }

    // Track logout
    trackLogout(sessionDuration = 0) {
      this.track('logged_out', {
        session_duration: sessionDuration
      });

      // Reset tracker
      this.reset();
    }

    // Track playlist create
    trackPlaylistCreate(playlistId, playlistName, isPublic = false) {
      this.track('playlist_created', {
        playlist_id: playlistId,
        playlist_name: playlistName,
        is_public: isPublic
      });
    }

    // Track song added to playlist
    trackSongAddedToPlaylist(songId, playlistId, songTitle = null) {
      this.track('song_added_to_playlist', {
        song_id: songId,
        song_title: songTitle,
        playlist_id: playlistId
      });
    }

    // Track song removed from playlist
    trackSongRemovedFromPlaylist(songId, playlistId, songTitle = null) {
      this.track('song_removed_from_playlist', {
        song_id: songId,
        song_title: songTitle,
        playlist_id: playlistId
      });
    }

    // Track error
    trackError(errorType, errorMessage, context = {}) {
      this.track('error_occurred', {
        error_type: errorType,
        error_message: errorMessage,
        ...context
      }, {
        integrations: { All: true }
      });
    }

    // Track screen view
    trackScreenView(screenName, previousScreen = null) {
      this.track('screen_viewed', {
        screen_name: screenName,
        previous_screen: previousScreen
      });
    }
  }

  // Initialize global tracker
  window.tracker = new StageEventTracker();

  // Export for modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StageEventTracker;
  }
})();
