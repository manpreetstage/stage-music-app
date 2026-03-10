// ========================================
// WEBVIEW EXIT CONFIRMATION
// Prevents native app from closing webview
// Shows confirmation before exit
// ========================================

(function() {
    'use strict';

    console.log('[EXIT-GUARD] Loading webview exit guard...');

    // Configuration
    const INITIAL_BUFFER = 50;  // Large buffer to trap back button
    const MAINTAIN_BUFFER = 30; // Always maintain at least this many
    const CRITICAL_LEVEL = 5;   // Show warning when this low

    let userWantsToExit = false; // Flag to allow exit
    let isShowingDialog = false;  // Prevent multiple dialogs

    // ==========================================
    // STEP 1: CREATE MASSIVE INITIAL BUFFER
    // ==========================================

    console.log('[EXIT-GUARD] Creating history buffer...');

    for (let i = 0; i < INITIAL_BUFFER; i++) {
        history.pushState(
            { guard: true, index: i, timestamp: Date.now() },
            '',
            window.location.href
        );
    }

    console.log('[EXIT-GUARD] Buffer created:', history.length, 'entries');

    // ==========================================
    // VIEW DETECTION (Same as before)
    // ==========================================

    function getCurrentView() {
        try {
            const fullPlayer = document.getElementById('full-player');
            if (fullPlayer && fullPlayer.classList.contains('active')) {
                return { type: 'player', element: fullPlayer };
            }

            const searchView = document.getElementById('search-view');
            if (searchView && searchView.classList.contains('active')) {
                return { type: 'search', element: searchView };
            }

            const libraryView = document.getElementById('library-view');
            if (libraryView && libraryView.classList.contains('active')) {
                return { type: 'library', element: libraryView };
            }

            const profileView = document.getElementById('profile-view');
            if (profileView && profileView.classList.contains('active')) {
                return { type: 'profile', element: profileView };
            }

            const playlistDetail = document.getElementById('playlist-detail-view');
            if (playlistDetail && playlistDetail.classList.contains('active')) {
                return { type: 'playlist', element: playlistDetail };
            }

            const categoryView = document.getElementById('category-view');
            if (categoryView && categoryView.classList.contains('active')) {
                return { type: 'category', element: categoryView };
            }
        } catch (e) {
            console.log('[EXIT-GUARD] DOM not ready:', e.message);
        }

        return { type: 'home', element: null };
    }

    // ==========================================
    // CLOSE VIEW FUNCTION
    // ==========================================

    function closeView(view) {
        if (!view.element) return false;

        console.log('[EXIT-GUARD] Closing view:', view.type);
        view.element.classList.remove('active');

        if (view.type === 'player' && typeof hideFullPlayer === 'function') {
            try {
                hideFullPlayer();
            } catch (e) {}
        }

        return true;
    }

    // ==========================================
    // SHOW EXIT CONFIRMATION
    // ==========================================

    function showExitConfirmation() {
        if (isShowingDialog) {
            console.log('[EXIT-GUARD] Dialog already showing, ignoring...');
            return false;
        }

        isShowingDialog = true;
        console.log('[EXIT-GUARD] Showing exit confirmation...');

        // Use setTimeout to ensure dialog shows on UI thread
        setTimeout(function() {
            const confirmed = window.confirm(
                '🚪 Exit Stage Music?\n\n' +
                'Do you want to return to app home?\n\n' +
                '✓ Press OK to exit\n' +
                '✗ Press Cancel to stay'
            );

            isShowingDialog = false;

            if (confirmed) {
                console.log('[EXIT-GUARD] ✅ User confirmed exit');
                console.log('[EXIT-GUARD] Setting exit flag and draining history...');

                userWantsToExit = true;

                // Drain history to let native app close webview
                // Go back repeatedly until we reach the original entry
                const maxAttempts = 100;
                let attempts = 0;

                const drainInterval = setInterval(function() {
                    if (attempts >= maxAttempts || history.length <= 1) {
                        clearInterval(drainInterval);
                        console.log('[EXIT-GUARD] History drained, webview should close now');

                        // Try explicit close methods
                        tryCloseWebView();
                        return;
                    }

                    history.back();
                    attempts++;
                }, 10); // Go back every 10ms

            } else {
                console.log('[EXIT-GUARD] ❌ User cancelled exit, staying in app');
                console.log('[EXIT-GUARD] Re-adding buffer...');

                userWantsToExit = false;

                // Add massive buffer again
                for (let i = 0; i < INITIAL_BUFFER; i++) {
                    history.pushState(
                        { guard: true, stay: true, timestamp: Date.now() },
                        '',
                        window.location.href
                    );
                }

                console.log('[EXIT-GUARD] Buffer restored:', history.length, 'entries');
            }
        }, 50);

        return true;
    }

    // ==========================================
    // TRY TO CLOSE WEBVIEW
    // ==========================================

    function tryCloseWebView() {
        console.log('[EXIT-GUARD] Attempting to close webview...');

        // Method 1: CleverTap API
        if (window.CleverTap && typeof window.CleverTap.close === 'function') {
            console.log('[EXIT-GUARD] Using CleverTap.close()');
            try {
                window.CleverTap.close();
                return;
            } catch (e) {
                console.log('[EXIT-GUARD] CleverTap.close() failed:', e.message);
            }
        }

        // Method 2: Android WebView interface
        if (window.Android && typeof window.Android.closeWebView === 'function') {
            console.log('[EXIT-GUARD] Using Android.closeWebView()');
            try {
                window.Android.closeWebView();
                return;
            } catch (e) {
                console.log('[EXIT-GUARD] Android.closeWebView() failed:', e.message);
            }
        }

        // Method 3: Custom URL scheme
        if (window.location.href.indexOf('stage://') > -1) {
            console.log('[EXIT-GUARD] Using URL scheme redirect');
            try {
                window.location.href = 'stage://close';
                return;
            } catch (e) {
                console.log('[EXIT-GUARD] URL redirect failed:', e.message);
            }
        }

        // Method 4: Just let history drain naturally
        console.log('[EXIT-GUARD] Using natural history drain (native app will close)');
        // Native app will close webview when history.length reaches 1
    }

    // ==========================================
    // HANDLE BACK BUTTON PRESS
    // ==========================================

    function handleBackButton() {
        console.log('[EXIT-GUARD] ========================================');
        console.log('[EXIT-GUARD] BACK BUTTON PRESSED');
        console.log('[EXIT-GUARD] History length:', history.length);
        console.log('[EXIT-GUARD] User wants to exit:', userWantsToExit);

        // If user already confirmed exit, let history drain
        if (userWantsToExit) {
            console.log('[EXIT-GUARD] Exit confirmed, allowing navigation...');
            return; // Don't add more history, let it drain
        }

        // Add buffer to maintain control
        history.pushState(
            { guard: true, restore: true, timestamp: Date.now() },
            '',
            window.location.href
        );

        // Check current view
        const currentView = getCurrentView();
        console.log('[EXIT-GUARD] Current view:', currentView.type);

        // If on sub-view (not home), close it
        if (currentView.type !== 'home') {
            console.log('[EXIT-GUARD] Closing sub-view...');
            closeView(currentView);

            // Add more buffer after closing view
            for (let i = 0; i < 10; i++) {
                history.pushState(
                    { guard: true, after_close: true },
                    '',
                    window.location.href
                );
            }

            console.log('[EXIT-GUARD] View closed, buffer maintained');
            return;
        }

        // We're on home - show exit confirmation
        console.log('[EXIT-GUARD] On home page - showing exit confirmation');
        showExitConfirmation();
    }

    // ==========================================
    // ATTACH EVENT LISTENER
    // ==========================================

    window.addEventListener('popstate', function(event) {
        console.log('[EXIT-GUARD] popstate event detected');
        handleBackButton();
    }, false);

    console.log('[EXIT-GUARD] Event listener attached');

    // ==========================================
    // BUFFER MAINTENANCE
    // ==========================================

    setInterval(function() {
        // Don't maintain buffer if user wants to exit
        if (userWantsToExit) {
            return;
        }

        const currentLength = history.length;

        if (currentLength < CRITICAL_LEVEL) {
            console.warn('[EXIT-GUARD] ⚠️ CRITICAL! History only', currentLength);
            console.warn('[EXIT-GUARD] Adding emergency buffer...');

            for (let i = 0; i < INITIAL_BUFFER; i++) {
                history.pushState(
                    { guard: true, emergency: true, timestamp: Date.now() },
                    '',
                    window.location.href
                );
            }

            console.log('[EXIT-GUARD] Emergency buffer added:', history.length);
        }
        else if (currentLength < MAINTAIN_BUFFER) {
            console.log('[EXIT-GUARD] History low (', currentLength, '), adding buffer...');

            const needed = MAINTAIN_BUFFER - currentLength + 10;
            for (let i = 0; i < needed; i++) {
                history.pushState(
                    { guard: true, maintain: true },
                    '',
                    window.location.href
                );
            }

            console.log('[EXIT-GUARD] Buffer maintained:', history.length);
        }
    }, 500);

    console.log('[EXIT-GUARD] Buffer maintenance active (every 500ms)');

    // ==========================================
    // PAGE VISIBILITY
    // ==========================================

    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && !userWantsToExit) {
            console.log('[EXIT-GUARD] Page visible, checking buffer...');

            if (history.length < MAINTAIN_BUFFER) {
                for (let i = 0; i < INITIAL_BUFFER; i++) {
                    history.pushState({ guard: true, visibility: true }, '', window.location.href);
                }
                console.log('[EXIT-GUARD] Buffer restored on visibility');
            }
        }
    });

    // ==========================================
    // PAGE SHOW (BFCache)
    // ==========================================

    window.addEventListener('pageshow', function(event) {
        if (event.persisted && !userWantsToExit) {
            console.log('[EXIT-GUARD] Page from cache, restoring buffer...');
            for (let i = 0; i < INITIAL_BUFFER; i++) {
                history.pushState({ guard: true, bfcache: true }, '', window.location.href);
            }
        }
    });

    // ==========================================
    // DEBUG INTERFACE
    // ==========================================

    window.__exitGuard = {
        version: '5.0-exit-confirmation',
        historyLength: function() {
            return history.length;
        },
        currentView: getCurrentView,
        wantsExit: function() {
            return userWantsToExit;
        },
        forceExit: function() {
            userWantsToExit = true;
            tryCloseWebView();
        },
        addBuffer: function(count) {
            count = count || 50;
            for (let i = 0; i < count; i++) {
                history.pushState({ guard: true, manual: true }, '', window.location.href);
            }
            console.log('[EXIT-GUARD] Manually added', count, 'entries');
        },
        test: function() {
            console.log('========== EXIT GUARD STATUS ==========');
            console.log('Version:', this.version);
            console.log('History Length:', history.length);
            console.log('Current View:', getCurrentView().type);
            console.log('User Wants Exit:', userWantsToExit);
            console.log('Is Showing Dialog:', isShowingDialog);
            console.log('======================================');
        }
    };

    // ==========================================
    // INITIALIZATION COMPLETE
    // ==========================================

    console.log('[EXIT-GUARD] ========================================');
    console.log('[EXIT-GUARD] ✅ Exit Guard Initialized');
    console.log('[EXIT-GUARD] History Length:', history.length);
    console.log('[EXIT-GUARD] Buffer Maintenance: Active');
    console.log('[EXIT-GUARD] Exit Confirmation: Enabled');
    console.log('[EXIT-GUARD] ========================================');
    console.log('[EXIT-GUARD]');
    console.log('[EXIT-GUARD] 🛡️ WebView is now protected');
    console.log('[EXIT-GUARD] 🚪 Back button will show confirmation before exit');
    console.log('[EXIT-GUARD] 💡 Debug: __exitGuard.test()');
    console.log('[EXIT-GUARD]');

})();
