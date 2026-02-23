// YouTube Import JavaScript

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            // Not authenticated, redirect to login
            window.location.href = '/';
            return null;
        }
        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
        return null;
    }
}

// Handle form submission
document.getElementById('youtube-form').addEventListener('submit', async (e) => {
    e.preventDefault();

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

    const form = document.getElementById('youtube-form');
    const importBtn = document.getElementById('import-btn');
    const progressDiv = document.getElementById('import-progress');
    const successDiv = document.getElementById('import-success');
    const statusText = document.getElementById('import-status');

    // Show progress
    form.style.display = 'none';
    progressDiv.style.display = 'block';
    successDiv.style.display = 'none';
    importBtn.disabled = true;

    try {
        statusText.textContent = 'Fetching video information...';

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
            document.getElementById('success-message').textContent =
                `"${data.song.title}" has been imported successfully! Language: ${data.song.language}`;

            // Clear form
            document.getElementById('youtube-url').value = '';
        } else {
            throw new Error(data.error || 'Import failed');
        }

    } catch (error) {
        console.error('YouTube import error:', error);
        alert('Failed to import from YouTube: ' + error.message);

        // Reset form
        form.style.display = 'block';
        progressDiv.style.display = 'none';
        successDiv.style.display = 'none';
    } finally {
        importBtn.disabled = false;
    }
});

// Reset form function
window.resetImportForm = function() {
    const form = document.getElementById('youtube-form');
    const progressDiv = document.getElementById('import-progress');
    const successDiv = document.getElementById('import-success');

    form.style.display = 'block';
    progressDiv.style.display = 'none';
    successDiv.style.display = 'none';
    form.reset();
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

// Initialize page
(async function init() {
    await checkAuth();
})();
