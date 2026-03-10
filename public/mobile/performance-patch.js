// ========================================
// 🚀 PERFORMANCE PATCH FOR MOBILE.JS
// Add this code to fix hang and slow loading issues
// ========================================

// 1. DEBOUNCE HELPER (Reduce excessive function calls)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 2. THROTTLE HELPER (Limit function calls per time period)
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 3. IMPROVED HLS CLEANUP
function cleanupHLSInstance() {
    if (window.hlsInstance) {
        try {
            window.hlsInstance.removeAllListeners();
            window.hlsInstance.detachMedia();
            window.hlsInstance.destroy();
        } catch (e) {
            console.warn('HLS cleanup warning:', e);
        } finally {
            window.hlsInstance = null;
        }
    }
}

// 4. INTERSECTION OBSERVER FOR LAZY LOADING (Better than loading="lazy")
let imageObserver = null;

function setupLazyLoading() {
    if (!imageObserver) {
        imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '100px', // Load 100px before visible
            threshold: 0.01
        });
    }
}

function observeImages() {
    if (!imageObserver) setupLazyLoading();

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// 5. MEMORY CLEANUP ON PAGE UNLOAD
window.addEventListener('beforeunload', () => {
    cleanupHLSInstance();

    // Pause and clear audio
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.src = '';
        audioPlayer.load();
    }

    // Disconnect observers
    if (imageObserver) {
        imageObserver.disconnect();
    }
});

// 6. THROTTLED UPDATE PROGRESS (Instead of firing 100+ times per second)
const throttledUpdateProgress = throttle(() => {
    if (!audioPlayer || !currentSong) return;

    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;

    // Update mini player progress
    if (miniProgress) {
        miniProgress.style.width = progress + '%';
    }

    // Update full player progress
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }

    // Update time stamps
    if (currentTimeEl) {
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    }

    // Check listening milestones (throttled)
    checkListeningMilestones(audioPlayer.currentTime);
}, 250); // Update only every 250ms instead of every frame

// 7. IMPROVED LOAD AUDIO SOURCE WITH CLEANUP
function loadAudioSourceOptimized(song) {
    // Clean up existing HLS first
    cleanupHLSInstance();

    // Pause and reset audio player
    audioPlayer.pause();
    audioPlayer.currentTime = 0;

    // Priority: HLS > Optimized (128k) > Original
    if (song.hls_master_url && song.has_hls) {
        if (Hls.isSupported()) {
            console.log('🎵 Loading HLS stream');

            const hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 30, // Reduced from 90 to save memory
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                maxBufferSize: 60 * 1000 * 1000, // 60MB max
                maxBufferHole: 0.5
            });

            hls.loadSource(song.hls_master_url);
            hls.attachMedia(audioPlayer);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('✅ HLS ready');
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.log('🔄 HLS error, fallback');
                    cleanupHLSInstance();
                    audioPlayer.src = song.audio_file_128 || song.audio_file;
                }
            });

            window.hlsInstance = hls;
        } else if (audioPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            audioPlayer.src = song.hls_master_url;
        } else {
            audioPlayer.src = song.audio_file_128 || song.audio_file;
        }
    } else {
        audioPlayer.src = song.audio_file_128 || song.audio_file;
    }
}

// 8. REQUEST ANIMATION FRAME FOR SMOOTH UPDATES
let rafId = null;

function smoothUpdateProgress() {
    if (!audioPlayer || !currentSong || audioPlayer.paused) {
        rafId = null;
        return;
    }

    throttledUpdateProgress();
    rafId = requestAnimationFrame(smoothUpdateProgress);
}

// Start smooth updates when playing
audioPlayer.addEventListener('play', () => {
    if (!rafId) {
        rafId = requestAnimationFrame(smoothUpdateProgress);
    }
});

// Stop smooth updates when paused
audioPlayer.addEventListener('pause', () => {
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
});

// 9. CLEANUP ON SONG CHANGE
function cleanupBeforeSongChange() {
    // Cancel any pending animation frames
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    // Cleanup HLS
    cleanupHLSInstance();

    // Reset audio player
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
}

// 10. IMAGE LOADING OPTIMIZATION
// Call this after adding new images to DOM
function optimizeNewImages() {
    // Change all cover images to use data-src for lazy loading
    document.querySelectorAll('img[src*="s3.amazonaws.com"]').forEach(img => {
        if (!img.dataset.src && !img.complete) {
            img.dataset.src = img.src;
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E'; // Tiny placeholder
        }
    });

    observeImages();
}

console.log('✅ Performance patch loaded');
