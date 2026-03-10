// Load environment variables first
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const { optimizeAndUploadImage, transcodeAndUploadAudio } = require('./media-optimizer');

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
});

const s3 = new AWS.S3();

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// COMPRESSION (For Android Performance)
// ========================================
const compression = require('compression');

// Enable gzip compression for all responses
app.use(compression({
    level: 6, // Compression level (0-9, 6 is good balance)
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        // Compress everything except images (already compressed)
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'stage-music-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Mobile detection middleware - redirect mobile devices to mobile version
app.get('/', (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    if (isMobile) {
        return res.redirect('/mobile/');
    }
    next();
});

// Smart caching strategy - NO CACHE for JS/HTML, cache images
app.use((req, res, next) => {
    const path = req.path;

    // NEVER cache JavaScript - always fetch fresh for updates
    if (path.match(/\.js$/)) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    // NEVER cache HTML - always check for updates
    else if (path.match(/\.(html|htm)$/) || path === '/mobile/' || path === '/mobile') {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    // Cache images and fonts aggressively (they don't change)
    else if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|woff|woff2|ttf|eot|ico)$/)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
    }
    // Cache CSS for short time (allows updates)
    else if (path.match(/\.css$/)) {
        res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
    }
    // No cache for API endpoints (will be handled individually)
    else if (path.startsWith('/api/')) {
        // Let individual routes set cache headers
    }
    // Default: no cache
    else {
        res.set('Cache-Control', 'no-cache');
    }

    next();
});

app.use(express.static('public', {
    maxAge: '1y', // Static files cached for 1 year
    immutable: true
}));
app.use('/uploads', express.static('uploads', {
    maxAge: '1y',
    immutable: true
}));

// Keep directories for backward compatibility during migration
const uploadsDir = './uploads/songs';
const coversDir = './uploads/covers';

// Note: Files will now be stored in AWS S3 instead of local directories
// Local directories kept temporarily for migration purposes

// Configure multer for S3 uploads
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        // Note: Public access is handled by bucket policy, not ACLs
        metadata: function (req, file, cb) {
            cb(null, {
                fieldName: file.fieldname,
                originalName: file.originalname,
                uploadedAt: new Date().toISOString()
            });
        },
        key: function (req, file, cb) {
            // Determine folder based on fieldname
            let folder = 'songs/';
            if (file.fieldname === 'cover') {
                folder = 'covers/';
            } else if (file.fieldname.startsWith('audio_')) {
                folder = 'songs/';
            }

            // Generate unique filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = uniqueSuffix + path.extname(file.originalname);

            cb(null, folder + filename);
        }
    }),
    fileFilter: function (req, file, cb) {
        // Audio files validation
        if (file.fieldname === 'audio' || file.fieldname.startsWith('audio_')) {
            const allowedTypes = /mp3|wav|m4a|aac|flac|ogg|wma/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('audio/');

            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new Error('Only audio files are allowed!'));
            }
        }
        // Cover image validation
        else if (file.fieldname === 'cover') {
            const allowedTypes = /jpeg|jpg|png|gif|webp/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = file.mimetype.startsWith('image/');

            // Accept if either mimetype is image OR extension is valid
            if (mimetype || extname) {
                return cb(null, true);
            } else {
                cb(new Error('Only image files are allowed for cover!'));
            }
        } else {
            cb(null, true);
        }
    },
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB per file
    }
});

// Configure multer for LOCAL uploads (for optimization before S3)
const tempUploadDir = './temp_uploads';
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

const uploadLocal = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, tempUploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    }),
    fileFilter: function (req, file, cb) {
        // Audio files validation
        if (file.fieldname === 'audio' || file.fieldname.startsWith('audio_')) {
            const allowedTypes = /mp3|wav|m4a|aac|flac|ogg|wma/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('audio/');

            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new Error('Only audio files are allowed!'));
            }
        }
        // Cover image validation
        else if (file.fieldname === 'cover') {
            const allowedTypes = /jpeg|jpg|png|gif|webp/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = file.mimetype.startsWith('image/');

            if (mimetype || extname) {
                return cb(null, true);
            } else {
                cb(new Error('Only image files are allowed for cover!'));
            }
        } else {
            cb(null, true);
        }
    },
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB per file
    }
});

// Initialize SQLite Database
const db = new sqlite3.Database('./stage_music.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('✅ Database connected successfully');

        // Create songs table
        db.run(`CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            singer TEXT NOT NULL,
            artist TEXT,
            lyricist TEXT,
            music_director TEXT,
            composer TEXT,
            producer TEXT,
            company TEXT,
            lyrics TEXT,
            audio_file TEXT NOT NULL,
            cover_image TEXT,
            duration TEXT,
            plays INTEGER DEFAULT 0,
            language TEXT DEFAULT 'Hindi',
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err);
            } else {
                console.log('✅ Songs table ready');
            }
        });
    }
});

// Create user play history table
db.run(`CREATE TABLE IF NOT EXISTS user_play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    song_id INTEGER NOT NULL,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
)`, (err) => {
    if (err) {
        console.error('Error creating user_play_history table:', err);
    } else {
        console.log('✅ User play history table ready');

        // Create index for faster queries
        db.run(`CREATE INDEX IF NOT EXISTS idx_play_history_user
                ON user_play_history(user_id, played_at DESC)`, (err) => {
            if (err) console.error('Error creating index:', err);
        });
    }
});

// Authentication Middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized. Please login.' });
}

function isAdmin(req, res, next) {
    if (req.session && req.session.userId && req.session.role === 'admin') {
        return next();
    }
    res.status(403).json({ error: 'Forbidden. Admin access required.' });
}

// Authentication Routes

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, full_name } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password required' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `INSERT INTO users (username, email, password, full_name, role)
                     VALUES (?, ?, ?, ?, 'user')`;

        db.run(sql, [username, email, hashedPassword, full_name || username], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Username or email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }

            res.json({
                success: true,
                message: 'Registration successful!',
                userId: this.lastID
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is inactive' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.fullName = user.full_name;

        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });
    });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Get current user
app.get('/api/auth/me', isAuthenticated, (req, res) => {
    db.get('SELECT id, username, email, full_name, role FROM users WHERE id = ?',
        [req.session.userId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    });
});

// API Routes

// Get all songs
app.get('/api/songs', (req, res) => {
    const language = req.query.language;
    const limit = parseInt(req.query.limit) || null;
    const offset = parseInt(req.query.offset) || 0;
    const lite = req.query.lite === 'true'; // Lite mode for mobile

    // Use lite mode for faster response (only essential fields)
    let sql = lite
        ? `SELECT id, title, singer, language, cover_thumb, cover_mobile,
           audio_file_128, audio_file_256, audio_file, plays,
           hls_master_url, has_hls FROM songs`
        : `SELECT id, title, singer, music_director, composer, company, lyrics,
           audio_file, audio_file_128, audio_file_256, cover_image, cover_thumb,
           cover_mobile, duration, plays, language, album_id, created_at,
           hls_master_url, has_hls FROM songs`;
    let params = [];

    if (language && language !== 'All') {
        sql += ' WHERE language = ?';
        params.push(language);
    }

    sql += ' ORDER BY created_at DESC';

    if (limit) {
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Cache for 5 minutes on mobile
        if (lite) {
            res.setHeader('Cache-Control', 'public, max-age=300');
        }
        res.json({ songs: rows });
    });
});

// Get Top 10 Songs (Featured + Most Played)
app.get('/api/top10', (req, res) => {
    // First get admin featured songs
    const featuredQuery = `
        SELECT s.*, f.position, 'featured' as source
        FROM songs s
        JOIN featured_songs f ON s.id = f.song_id
        ORDER BY f.position ASC
        LIMIT 10
    `;

    db.all(featuredQuery, [], (err, featuredSongs) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const featuredCount = featuredSongs.length;

        if (featuredCount >= 10) {
            // Already have 10 featured songs
            res.json({ songs: featuredSongs, source: 'featured' });
            return;
        }

        // Get most played songs to fill remaining slots
        const remainingSlots = 10 - featuredCount;
        const featuredIds = featuredSongs.map(s => s.id).join(',');
        const excludeClause = featuredIds ? `WHERE id NOT IN (${featuredIds})` : '';

        const mostPlayedQuery = `
            SELECT *, 'trending' as source
            FROM songs
            ${excludeClause}
            ORDER BY play_count DESC, created_at DESC
            LIMIT ?
        `;

        db.all(mostPlayedQuery, [remainingSlots], (err, trendingSongs) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            const allSongs = [...featuredSongs, ...trendingSongs];
            res.json({
                songs: allSongs,
                featured: featuredCount,
                trending: trendingSongs.length
            });
        });
    });
});

// Increment play count
app.post('/api/songs/:id/play', (req, res) => {
    const songId = req.params.id;

    db.run(
        'UPDATE songs SET play_count = play_count + 1 WHERE id = ?',
        [songId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, plays: this.changes });
        }
    );
});

// Get featured songs (Admin)
app.get('/api/featured-songs', (req, res) => {
    const query = `
        SELECT f.id as featured_id, f.position, s.*
        FROM featured_songs f
        JOIN songs s ON f.song_id = s.id
        ORDER BY f.position ASC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ songs: rows });
    });
});

// Add song to featured (Admin)
app.post('/api/featured-songs', (req, res) => {
    const { song_id, position } = req.body;

    if (!song_id) {
        res.status(400).json({ error: 'song_id is required' });
        return;
    }

    const pos = position || 999;

    db.run(
        'INSERT OR REPLACE INTO featured_songs (song_id, position) VALUES (?, ?)',
        [song_id, pos],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Remove song from featured (Admin)
app.delete('/api/featured-songs/:id', (req, res) => {
    const songId = req.params.id;

    db.run(
        'DELETE FROM featured_songs WHERE song_id = ?',
        [songId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, deleted: this.changes });
        }
    );
});

// ==================== QUICK PICKS ENDPOINTS ====================

// Get quick picks (ONLY admin selected, no auto-fill)
app.get('/api/quick-picks', (req, res) => {
    // Optimized query - only essential fields for faster response
    const query = `
        SELECT
            s.id, s.title, s.singer, s.language,
            s.cover_thumb, s.cover_mobile, s.cover_image,
            s.audio_file_128, s.audio_file_256, s.audio_file,
            s.hls_master_url, s.has_hls,
            qp.position
        FROM songs s
        JOIN quick_picks qp ON s.id = qp.song_id
        ORDER BY qp.position ASC
        LIMIT 9
    `;

    db.all(query, [], (err, quickPicks) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Enable aggressive caching for Quick Picks
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
        res.json({ songs: quickPicks });
    });
});

// Get admin quick picks (only manually featured)
app.get('/api/admin/quick-picks', (req, res) => {
    const query = `
        SELECT qp.id as pick_id, qp.position, s.*
        FROM quick_picks qp
        JOIN songs s ON qp.song_id = s.id
        ORDER BY qp.position ASC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ songs: rows });
    });
});

// Add song to quick picks
app.post('/api/admin/quick-picks', (req, res) => {
    const { song_id, position } = req.body;

    if (!song_id) {
        res.status(400).json({ error: 'song_id is required' });
        return;
    }

    const pos = position || 999;

    db.run(
        'INSERT OR REPLACE INTO quick_picks (song_id, position) VALUES (?, ?)',
        [song_id, pos],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Remove song from quick picks
app.delete('/api/admin/quick-picks/:id', (req, res) => {
    const songId = req.params.id;

    db.run(
        'DELETE FROM quick_picks WHERE song_id = ?',
        [songId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, deleted: this.changes });
        }
    );
});

// Reorder quick picks
app.put('/api/admin/quick-picks/reorder', (req, res) => {
    const { songIds } = req.body;

    if (!songIds || !Array.isArray(songIds)) {
        res.status(400).json({ error: 'songIds array is required' });
        return;
    }

    // Update position for each song
    const updates = songIds.map((songId, index) => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE quick_picks SET position = ? WHERE song_id = ?',
                [index, songId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });

    Promise.all(updates)
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// ==================== TRENDING SONGS ENDPOINTS ====================

// Get trending songs (ONLY admin selected, no auto-fill)
app.get('/api/trending', (req, res) => {
    const query = `
        SELECT s.*, t.position
        FROM songs s
        JOIN trending_songs t ON s.id = t.song_id
        ORDER BY t.position ASC
        LIMIT 9
    `;

    db.all(query, [], (err, trending) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Return ONLY admin's manual selections - NO AUTO-FILL
        res.json({ songs: trending });
    });
});

// Get admin trending songs (only manually featured)
app.get('/api/admin/trending', (req, res) => {
    const query = `
        SELECT t.id as trending_id, t.position, s.*
        FROM trending_songs t
        JOIN songs s ON t.song_id = s.id
        ORDER BY t.position ASC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ songs: rows });
    });
});

// Add song to trending
app.post('/api/admin/trending', (req, res) => {
    const { song_id, position } = req.body;

    if (!song_id) {
        res.status(400).json({ error: 'song_id is required' });
        return;
    }

    const pos = position || 999;

    db.run(
        'INSERT OR REPLACE INTO trending_songs (song_id, position) VALUES (?, ?)',
        [song_id, pos],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Remove song from trending
app.delete('/api/admin/trending/:id', (req, res) => {
    const songId = req.params.id;

    db.run(
        'DELETE FROM trending_songs WHERE song_id = ?',
        [songId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, deleted: this.changes });
        }
    );
});

// Reorder trending songs
app.put('/api/admin/trending/reorder', (req, res) => {
    const { songIds } = req.body;

    if (!songIds || !Array.isArray(songIds)) {
        res.status(400).json({ error: 'songIds array is required' });
        return;
    }

    // Update position for each song
    const updates = songIds.map((songId, index) => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE trending_songs SET position = ? WHERE song_id = ?',
                [index, songId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });

    Promise.all(updates)
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// ==================== CUSTOM SECTIONS ENDPOINTS ====================

// Get all custom sections
app.get('/api/custom-sections', (req, res) => {
    db.all('SELECT * FROM custom_sections ORDER BY display_order ASC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ sections: rows });
    });
});

// Get songs in a custom section (for mobile app)
app.get('/api/custom-sections/:id/songs', (req, res) => {
    const sectionId = req.params.id;

    const query = `
        SELECT s.*, css.position
        FROM songs s
        JOIN custom_section_songs css ON s.id = css.song_id
        WHERE css.section_id = ?
        ORDER BY css.position ASC
    `;

    db.all(query, [sectionId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ songs: rows });
    });
});

// Get songs for admin panel (with section info)
app.get('/api/admin/custom-sections/:id/songs', (req, res) => {
    const sectionId = req.params.id;

    const query = `
        SELECT css.id as mapping_id, css.position, s.*
        FROM custom_section_songs css
        JOIN songs s ON css.song_id = s.id
        WHERE css.section_id = ?
        ORDER BY css.position ASC
    `;

    db.all(query, [sectionId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ songs: rows });
    });
});

// Add song to custom section (Admin)
app.post('/api/admin/custom-sections/:id/songs', (req, res) => {
    const sectionId = req.params.id;
    const { song_id, position } = req.body;

    if (!song_id) {
        res.status(400).json({ error: 'song_id is required' });
        return;
    }

    // Get max position if not provided
    if (!position) {
        db.get(
            'SELECT MAX(position) as max_pos FROM custom_section_songs WHERE section_id = ?',
            [sectionId],
            (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                const newPosition = (row.max_pos || 0) + 1;

                db.run(
                    'INSERT OR REPLACE INTO custom_section_songs (section_id, song_id, position) VALUES (?, ?, ?)',
                    [sectionId, song_id, newPosition],
                    function(err) {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        res.json({ success: true, id: this.lastID });
                    }
                );
            }
        );
    } else {
        db.run(
            'INSERT OR REPLACE INTO custom_section_songs (section_id, song_id, position) VALUES (?, ?, ?)',
            [sectionId, song_id, position],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ success: true, id: this.lastID });
            }
        );
    }
});

// Remove song from custom section (Admin)
app.delete('/api/admin/custom-sections/:sectionId/songs/:songId', (req, res) => {
    const { sectionId, songId } = req.params;

    db.run(
        'DELETE FROM custom_section_songs WHERE section_id = ? AND song_id = ?',
        [sectionId, songId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, deleted: this.changes });
        }
    );
});

// Reorder songs in custom section (Admin)
app.put('/api/admin/custom-sections/:sectionId/reorder', (req, res) => {
    const { sectionId } = req.params;
    const { songIds } = req.body; // Array of song IDs in new order

    if (!songIds || !Array.isArray(songIds)) {
        res.status(400).json({ error: 'songIds array is required' });
        return;
    }

    // Update positions for all songs
    const stmt = db.prepare(
        'UPDATE custom_section_songs SET position = ? WHERE section_id = ? AND song_id = ?'
    );

    let completed = 0;
    let errors = [];

    songIds.forEach((songId, index) => {
        stmt.run(index + 1, sectionId, songId, (err) => {
            if (err) errors.push(err);
            completed++;

            if (completed === songIds.length) {
                stmt.finalize();
                if (errors.length > 0) {
                    res.status(500).json({ error: 'Some updates failed', errors });
                } else {
                    res.json({ success: true, updated: songIds.length });
                }
            }
        });
    });
});

// ==================== CATEGORY/PLAYLIST ENDPOINTS ====================

// Get all categories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY id ASC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ categories: rows });
    });
});

// Get songs in a category
app.get('/api/categories/:id/songs', (req, res) => {
    const categoryId = req.params.id;

    const query = `
        SELECT s.*, cs.position
        FROM category_songs cs
        JOIN songs s ON cs.song_id = s.id
        WHERE cs.category_id = ?
        ORDER BY cs.position ASC, cs.created_at DESC
    `;

    db.all(query, [categoryId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ songs: rows, count: rows.length });
    });
});

// Add song to category (Admin only)
app.post('/api/categories/:id/songs', (req, res) => {
    const categoryId = req.params.id;
    const { song_id, position } = req.body;

    if (!song_id) {
        res.status(400).json({ error: 'song_id is required' });
        return;
    }

    const pos = position || 0;

    db.run(
        'INSERT OR REPLACE INTO category_songs (category_id, song_id, position) VALUES (?, ?, ?)',
        [categoryId, song_id, pos],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Remove song from category (Admin only)
app.delete('/api/categories/:categoryId/songs/:songId', (req, res) => {
    const { categoryId, songId } = req.params;

    db.run(
        'DELETE FROM category_songs WHERE category_id = ? AND song_id = ?',
        [categoryId, songId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, deleted: this.changes });
        }
    );
});

// Reorder songs in category (Admin only)
app.put('/api/categories/:categoryId/reorder', (req, res) => {
    const { categoryId } = req.params;
    const { songIds } = req.body;

    if (!songIds || !Array.isArray(songIds)) {
        res.status(400).json({ error: 'songIds array is required' });
        return;
    }

    // Update position for each song
    const updatePromises = songIds.map((songId, index) => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE category_songs SET position = ? WHERE category_id = ? AND song_id = ?',
                [index + 1, categoryId, songId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });

    Promise.all(updatePromises)
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// ==================== END CATEGORY ENDPOINTS ====================

// ==================== ALBUM MANAGEMENT ENDPOINTS ====================

// Get albums by language (Admin)
app.get('/api/admin/albums/:language', (req, res) => {
    const { language } = req.params;

    const query = `
        SELECT a.*, COUNT(s.id) as song_count
        FROM albums a
        LEFT JOIN songs s ON a.id = s.album_id
        WHERE a.language = ?
        GROUP BY a.id
        ORDER BY a.display_order ASC, a.id ASC
    `;

    db.all(query, [language], (err, albums) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ albums: albums });
    });
});

// Reorder albums by language (Admin only)
app.put('/api/admin/albums/:language/reorder', (req, res) => {
    const { language } = req.params;
    const { albumIds } = req.body;

    if (!albumIds || !Array.isArray(albumIds)) {
        res.status(400).json({ error: 'albumIds array is required' });
        return;
    }

    // Update display_order for each album
    const updatePromises = albumIds.map((albumId, index) => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE albums SET display_order = ? WHERE id = ? AND language = ?',
                [index + 1, albumId, language],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });

    Promise.all(updatePromises)
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Update album (name, cover) - Admin only
app.put('/api/admin/albums/:id', upload.single('cover'), (req, res) => {
    const albumId = req.params.id;
    const { name, language } = req.body;

    let coverImage = req.body.cover_image;
    if (req.file && req.file.location) {
        coverImage = req.file.location;
    }

    const updates = [];
    const params = [];

    if (name) {
        updates.push('name = ?');
        params.push(name);
    }
    if (language) {
        updates.push('language = ?');
        params.push(language);
    }
    if (coverImage) {
        updates.push('cover_image = ?');
        params.push(coverImage);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(albumId);
    const sql = `UPDATE albums SET ${updates.join(', ')} WHERE id = ?`;

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Update song cover - Admin only
app.put('/api/admin/songs/:songId/cover', upload.single('cover'), (req, res) => {
    const { songId } = req.params;

    if (!req.file || !req.file.location) {
        return res.status(400).json({ error: 'Cover image required' });
    }

    db.run('UPDATE songs SET cover_image = ? WHERE id = ?', [req.file.location, songId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, cover_image: req.file.location });
    });
});

// Add song to album - Admin only
app.put('/api/admin/songs/:songId/album', (req, res) => {
    const { songId } = req.params;
    const { album_id } = req.body;

    db.run('UPDATE songs SET album_id = ? WHERE id = ?', [album_id, songId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Remove song from album - Admin only
app.delete('/api/admin/albums/:albumId/songs/:songId', (req, res) => {
    const { songId } = req.params;

    db.run('UPDATE songs SET album_id = NULL WHERE id = ?', [songId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Delete album - Admin only
app.delete('/api/admin/albums/:id', (req, res) => {
    const albumId = req.params.id;

    db.run('UPDATE songs SET album_id = NULL WHERE album_id = ?', [albumId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.run('DELETE FROM albums WHERE id = ?', [albumId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// ==================== END ALBUM MANAGEMENT ENDPOINTS ====================

// Get single song
app.get('/api/songs/:id', (req, res) => {
    db.get('SELECT * FROM songs WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Song not found' });
            return;
        }
        res.json({ song: row });
    });
});

// Update song details with file uploads (Admin only)
app.put('/api/admin/songs/:id', upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), (req, res) => {
    const songId = req.params.id;

    // Get text fields from body
    const {
        title,
        singer,
        artist,
        lyricist,
        music_director,
        composer,
        producer,
        language,
        cover_image_url,
        audio_file_url
    } = req.body;

    // Build dynamic SQL query based on provided fields
    const updates = [];
    const values = [];

    if (title !== undefined && title !== '') {
        updates.push('title = ?');
        values.push(title);
    }
    if (singer !== undefined && singer !== '') {
        updates.push('singer = ?');
        values.push(singer);
    }
    if (artist !== undefined && artist !== '') {
        updates.push('artist = ?');
        values.push(artist);
    }
    if (lyricist !== undefined && lyricist !== '') {
        updates.push('lyricist = ?');
        values.push(lyricist);
    }
    if (music_director !== undefined && music_director !== '') {
        updates.push('music_director = ?');
        values.push(music_director);
    }
    if (composer !== undefined && composer !== '') {
        updates.push('composer = ?');
        values.push(composer);
    }
    if (producer !== undefined && producer !== '') {
        updates.push('producer = ?');
        values.push(producer);
    }
    if (language !== undefined && language !== '') {
        updates.push('language = ?');
        values.push(language);
    }

    // Handle cover image: uploaded file takes priority over URL
    if (req.files && req.files.cover) {
        const coverS3Url = req.files.cover[0].location;
        updates.push('cover_image = ?');
        values.push(coverS3Url);
        console.log('✅ New cover uploaded to S3:', coverS3Url);
    } else if (cover_image_url !== undefined && cover_image_url !== '') {
        updates.push('cover_image = ?');
        values.push(cover_image_url);
    }

    // Handle audio file: uploaded file takes priority over URL
    if (req.files && req.files.audio) {
        const audioS3Url = req.files.audio[0].location;
        updates.push('audio_file = ?');
        values.push(audioS3Url);
        console.log('✅ New audio uploaded to S3:', audioS3Url);
    } else if (audio_file_url !== undefined && audio_file_url !== '') {
        updates.push('audio_file = ?');
        values.push(audio_file_url);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(songId);
    const sql = `UPDATE songs SET ${updates.join(', ')} WHERE id = ?`;

    db.run(sql, values, function(err) {
        if (err) {
            console.error('Error updating song:', err);
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Song not found' });
        }
        console.log('✅ Song updated successfully:', songId);
        res.json({ success: true, message: 'Song updated successfully' });
    });
});

// Upload new song with AUTO-OPTIMIZATION
app.post('/api/upload', isAuthenticated, uploadLocal.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), async (req, res) => {
    try {
        if (!req.files || !req.files.audio) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const {
            title,
            singer,
            lyricist,
            music_director,
            composer,
            company,
            lyrics,
            language
        } = req.body;

        if (!title || !singer) {
            return res.status(400).json({ error: 'Title and Singer are required' });
        }

        const userId = req.session.userId;
        console.log('📤 Uploading new song with optimization:', title, 'by', singer);

        // Get local file paths
        const audioFile = req.files.audio[0];
        const coverFile = req.files.cover ? req.files.cover[0] : null;

        // Optimize and upload to S3
        let imageVersions = null;
        if (coverFile) {
            console.log('🖼️  Optimizing cover image...');
            imageVersions = await optimizeAndUploadImage(
                coverFile.path,
                `covers/${audioFile.filename}`
            );
            // Cleanup local file
            fs.unlinkSync(coverFile.path);
        }

        console.log('🎵 Optimizing audio file...');
        const audioVersions = await transcodeAndUploadAudio(
            audioFile.path,
            `songs/${audioFile.filename}`
        );
        // Cleanup local file
        fs.unlinkSync(audioFile.path);

        console.log('✅ Optimization complete! Saving to database...');

        // Insert into database with optimized URLs
        const sql = `INSERT INTO songs (
            title, singer, lyricist, music_director, composer,
            company, lyrics, language, user_id,
            audio_file, audio_file_128, audio_file_256,
            cover_image, cover_thumb, cover_mobile, cover_desktop
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            title,
            singer,
            lyricist || '',
            music_director || '',
            composer || '',
            company || '',
            lyrics || '',
            language || 'Hindi',
            userId,
            audioVersions.standard, // Use optimized as primary
            audioVersions.standard, // 128 kbps AAC
            audioVersions.high,     // 256 kbps AAC
            imageVersions ? imageVersions.mobile : null, // Use mobile as primary
            imageVersions ? imageVersions.thumbnail : null,
            imageVersions ? imageVersions.mobile : null,
            imageVersions ? imageVersions.desktop : null
        ], function(err) {
            if (err) {
                console.error('❌ Database insert error:', err);
                return res.status(500).json({ error: err.message });
            }

            res.json({
                success: true,
                message: 'Song uploaded and optimized successfully!',
                songId: this.lastID,
                song: {
                    id: this.lastID,
                    title,
                    singer,
                    music_director,
                    composer,
                    audio_file_128: audioVersions.standard,
                    cover_mobile: imageVersions ? imageVersions.mobile : null,
                    user_id: userId
                }
            });
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update play count
app.post('/api/songs/:id/play', (req, res) => {
    db.run('UPDATE songs SET plays = plays + 1 WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, plays: this.changes });
    });
});

// Search songs
app.get('/api/search', (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Search query required' });
    }

    const sql = `SELECT * FROM songs
                 WHERE title LIKE ? OR singer LIKE ? OR music_director LIKE ? OR composer LIKE ?
                 ORDER BY plays DESC`;

    const searchTerm = `%${query}%`;

    db.all(sql, [searchTerm, searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ results: rows });
    });
});

// Track play history
app.post('/api/play-history', (req, res) => {
    const { song_id } = req.body;
    const userId = req.session.userId || null; // null for guests

    if (!song_id) {
        return res.status(400).json({ error: 'Song ID required' });
    }

    // Insert play record
    db.run('INSERT INTO user_play_history (user_id, song_id) VALUES (?, ?)',
        [userId, song_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Increment global play count
        db.run('UPDATE songs SET plays = plays + 1 WHERE id = ?', [song_id]);
        res.json({ success: true });
    });
});

// Get recently played (authenticated)
app.get('/api/recently-played', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 20;

    const sql = `
        SELECT DISTINCT s.*, MAX(uph.played_at) as last_played
        FROM songs s
        INNER JOIN user_play_history uph ON s.id = uph.song_id
        WHERE uph.user_id = ?
        GROUP BY s.id
        ORDER BY last_played DESC
        LIMIT ?
    `;

    db.all(sql, [userId, limit], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ songs: rows });
    });
});

// Get user stats (authenticated)
app.get('/api/user/stats', isAuthenticated, (req, res) => {
    const userId = req.session.userId;

    // Fetch stats in parallel
    Promise.all([
        // Playlists count
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM playlists WHERE user_id = ?',
                [userId], (err, row) => err ? reject(err) : resolve({ playlists: row.count }));
        }),
        // Songs saved count
        new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(DISTINCT ps.song_id) as count
                    FROM playlist_songs ps
                    INNER JOIN playlists p ON ps.playlist_id = p.id
                    WHERE p.user_id = ?`,
                [userId], (err, row) => err ? reject(err) : resolve({ songs_saved: row.count }));
        }),
        // Total plays count
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM user_play_history WHERE user_id = ?',
                [userId], (err, row) => err ? reject(err) : resolve({ total_plays: row.count }));
        })
    ])
    .then(results => res.json({ stats: Object.assign({}, ...results) }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Delete song (user can delete own songs, admin can delete any)
app.delete('/api/songs/:id', isAuthenticated, (req, res) => {
    const songId = req.params.id;
    const userId = req.session.userId;
    const isAdminUser = req.session.role === 'admin';

    // First get the song to check ownership and get file paths
    db.get('SELECT audio_file, cover_image, user_id FROM songs WHERE id = ?', [songId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!row) {
            return res.status(404).json({ error: 'Song not found' });
        }

        // Check authorization: user can only delete their own songs, admin can delete any
        if (!isAdminUser && row.user_id !== userId) {
            return res.status(403).json({ error: 'You do not have permission to delete this song' });
        }

        // Helper function to extract S3 key from URL
        const getS3KeyFromUrl = (url) => {
            if (!url) return null;
            // Handle both S3 URLs and local paths during migration
            if (url.includes('amazonaws.com/')) {
                return url.split('.com/')[1];
            } else if (url.startsWith('/uploads/')) {
                // Old local path - skip S3 deletion
                return null;
            }
            return null;
        };

        // Delete the audio file from S3
        if (row.audio_file) {
            const audioKey = getS3KeyFromUrl(row.audio_file);
            if (audioKey) {
                s3.deleteObject({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: audioKey
                }, (err) => {
                    if (err) {
                        console.error('Error deleting audio from S3:', err);
                    } else {
                        console.log('Deleted audio from S3:', audioKey);
                    }
                });
            } else if (row.audio_file.startsWith('/uploads/')) {
                // Delete old local file if it exists
                const audioPath = path.join(__dirname, 'public', row.audio_file);
                if (fs.existsSync(audioPath)) {
                    fs.unlinkSync(audioPath);
                }
            }
        }

        // Delete the cover image from S3
        if (row.cover_image && row.cover_image !== '/uploads/covers/default-cover.jpg') {
            const coverKey = getS3KeyFromUrl(row.cover_image);
            if (coverKey) {
                s3.deleteObject({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: coverKey
                }, (err) => {
                    if (err) {
                        console.error('Error deleting cover from S3:', err);
                    } else {
                        console.log('Deleted cover from S3:', coverKey);
                    }
                });
            } else if (row.cover_image.startsWith('/uploads/')) {
                // Delete old local file if it exists
                const coverPath = path.join(__dirname, 'public', row.cover_image);
                if (fs.existsSync(coverPath)) {
                    fs.unlinkSync(coverPath);
                }
            }
        }

        // Delete from database
        db.run('DELETE FROM songs WHERE id = ?', [songId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Song deleted successfully' });
        });
    });
});

// Update song (user can update own songs, admin can update any)
app.put('/api/songs/:id', isAuthenticated, upload.single('cover'), (req, res) => {
    const songId = req.params.id;
    const userId = req.session.userId;
    const isAdminUser = req.session.role === 'admin';
    const { title, artist, language, company, music_director, composer, lyrics } = req.body;

    // Validation
    if (!title || !artist) {
        return res.status(400).json({ error: 'Title and singer are required' });
    }

    // First get the song to check ownership
    db.get('SELECT user_id, cover_image FROM songs WHERE id = ?', [songId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!row) {
            return res.status(404).json({ error: 'Song not found' });
        }

        // Check authorization: user can only update their own songs, admin can update any
        if (!isAdminUser && row.user_id !== userId) {
            return res.status(403).json({ error: 'You do not have permission to update this song' });
        }

        // Handle cover image update
        let coverImage = row.cover_image; // Keep existing cover by default
        if (req.file) {
            // New cover uploaded to S3
            coverImage = req.file.location; // S3 URL from multer-s3

            // Delete old cover from S3 if it exists and is not the default
            if (row.cover_image && row.cover_image !== '/assets/default-cover.jpg') {
                if (row.cover_image.includes('amazonaws.com/')) {
                    // S3 file - delete from S3
                    const oldCoverKey = row.cover_image.split('.com/')[1];
                    s3.deleteObject({
                        Bucket: process.env.AWS_S3_BUCKET,
                        Key: oldCoverKey
                    }, (err) => {
                        if (err) {
                            console.error('Error deleting old cover from S3:', err);
                        } else {
                            console.log('Deleted old cover from S3:', oldCoverKey);
                        }
                    });
                } else if (row.cover_image.startsWith('/uploads/') && fs.existsSync(`.${row.cover_image}`)) {
                    // Old local file - delete from filesystem
                    try {
                        fs.unlinkSync(`.${row.cover_image}`);
                    } catch (unlinkErr) {
                        console.error('Error deleting old local cover:', unlinkErr);
                    }
                }
            }
        }

        // Update the song (using 'singer' column, not 'artist')
        db.run(
            `UPDATE songs
             SET title = ?, singer = ?, language = ?, company = ?,
                 music_director = ?, composer = ?, lyrics = ?, cover_image = ?
             WHERE id = ?`,
            [title, artist, language, company, music_director, composer, lyrics, coverImage, songId],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({
                    success: true,
                    message: 'Song updated successfully',
                    song: {
                        id: songId,
                        title,
                        singer: artist,
                        language,
                        company,
                        music_director,
                        composer,
                        lyrics,
                        cover_image: coverImage
                    }
                });
            }
        );
    });
});

// Get stats
app.get('/api/stats', (req, res) => {
    db.get('SELECT COUNT(*) as total, SUM(plays) as totalPlays FROM songs', [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ stats: row });
    });
});

// Get language counts
app.get('/api/languages', (req, res) => {
    db.all('SELECT language, COUNT(*) as count FROM songs GROUP BY language', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ languages: rows });
    });
});

// ============================================
// PLAYLIST MANAGEMENT APIS
// ============================================

// Create playlist
app.post('/api/playlists', isAuthenticated, (req, res) => {
    const { name, description, is_public } = req.body;
    const userId = req.session.userId;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Playlist name is required' });
    }

    const sql = `INSERT INTO playlists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)`;

    db.run(sql, [name.trim(), description || '', userId, is_public ? 1 : 0], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({
            success: true,
            message: 'Playlist created successfully',
            playlist: {
                id: this.lastID,
                name: name.trim(),
                description: description || '',
                user_id: userId,
                is_public: is_public ? 1 : 0
            }
        });
    });
});

// Get user's playlists
app.get('/api/playlists', isAuthenticated, (req, res) => {
    const userId = req.session.userId;

    const sql = `
        SELECT p.*, COUNT(ps.song_id) as song_count
        FROM playlists p
        LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
        WHERE p.user_id = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ playlists: rows });
    });
});

// Get playlist details with songs
app.get('/api/playlists/:id', isAuthenticated, (req, res) => {
    const playlistId = req.params.id;
    const userId = req.session.userId;

    // Get playlist info
    db.get('SELECT * FROM playlists WHERE id = ?', [playlistId], (err, playlist) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Check if user owns the playlist or if it's public
        if (playlist.user_id !== userId && !playlist.is_public) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get songs in playlist
        const sql = `
            SELECT s.*, ps.position, ps.added_at
            FROM songs s
            INNER JOIN playlist_songs ps ON s.id = ps.song_id
            WHERE ps.playlist_id = ?
            ORDER BY ps.position ASC, ps.added_at DESC
        `;

        db.all(sql, [playlistId], (err, songs) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                playlist,
                songs
            });
        });
    });
});

// Add song to playlist
app.post('/api/playlists/:id/songs/:songId', isAuthenticated, (req, res) => {
    const playlistId = req.params.id;
    const songId = req.params.songId;
    const userId = req.session.userId;

    // Check if user owns the playlist
    db.get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, userId], (err, playlist) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!playlist) {
            return res.status(403).json({ error: 'Playlist not found or access denied' });
        }

        // Get current max position
        db.get('SELECT MAX(position) as max_pos FROM playlist_songs WHERE playlist_id = ?', [playlistId], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const position = (row.max_pos || 0) + 1;

            // Add song to playlist
            const sql = `INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)`;

            db.run(sql, [playlistId, songId, position], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Song already in playlist' });
                    }
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    success: true,
                    message: 'Song added to playlist'
                });
            });
        });
    });
});

// Remove song from playlist
app.delete('/api/playlists/:id/songs/:songId', isAuthenticated, (req, res) => {
    const playlistId = req.params.id;
    const songId = req.params.songId;
    const userId = req.session.userId;

    // Check if user owns the playlist
    db.get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, userId], (err, playlist) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!playlist) {
            return res.status(403).json({ error: 'Playlist not found or access denied' });
        }

        // Remove song from playlist
        db.run('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?', [playlistId, songId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                success: true,
                message: 'Song removed from playlist'
            });
        });
    });
});

// Update playlist
app.put('/api/playlists/:id', isAuthenticated, (req, res) => {
    const playlistId = req.params.id;
    const userId = req.session.userId;
    const { name, description, is_public } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Playlist name is required' });
    }

    // Check ownership
    db.get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, userId], (err, playlist) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!playlist) {
            return res.status(403).json({ error: 'Playlist not found or access denied' });
        }

        // Update playlist
        const sql = `UPDATE playlists SET name = ?, description = ?, is_public = ? WHERE id = ?`;

        db.run(sql, [name.trim(), description || '', is_public ? 1 : 0, playlistId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                success: true,
                message: 'Playlist updated successfully'
            });
        });
    });
});

// Delete playlist
app.delete('/api/playlists/:id', isAuthenticated, (req, res) => {
    const playlistId = req.params.id;
    const userId = req.session.userId;

    // Check ownership
    db.get('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, userId], (err, playlist) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!playlist) {
            return res.status(403).json({ error: 'Playlist not found or access denied' });
        }

        // Delete playlist (cascade will delete playlist_songs)
        db.run('DELETE FROM playlists WHERE id = ?', [playlistId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                success: true,
                message: 'Playlist deleted successfully'
            });
        });
    });
});

// ============================================
// ALBUM MANAGEMENT APIS
// ============================================

// Test endpoint
app.get('/api/albums/test', (req, res) => {
    res.json({ message: 'Album API is working!' });
});

// Create album with multiple songs
app.post('/api/albums', isAuthenticated, upload.any(), async (req, res) => {
    try {
        console.log('📦 Album upload request received');
        console.log('Body:', req.body);
        console.log('Files:', req.files ? req.files.length : 0);

        const userId = req.session.userId;
        const { albumTitle, albumArtist, language, company } = req.body;

        // Validate album details
        if (!albumTitle || !albumArtist || !language) {
            return res.status(400).json({ error: 'Album title, artist, and language are required' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        // Find cover image
        const coverFile = req.files.find(f => f.fieldname === 'cover');
        if (!coverFile) {
            return res.status(400).json({ error: 'Album cover image is required' });
        }

        const coverImage = coverFile.location; // S3 URL from multer-s3
        console.log('✅ Cover image:', coverImage);

        // Parse songs data - handle both formats
        const songs = [];
        let songIndex = 0;

        // Check if songs data is in nested object format or flat format
        if (req.body.songs && Array.isArray(req.body.songs)) {
            // Nested format: songs = [{ title: "...", singer: "..." }, ...]
            console.log('📝 Parsing songs from nested array format');
            req.body.songs.forEach((songData, index) => {
                const audioFile = req.files.find(f => f.fieldname === `audio_${index}`);

                if (!songData.title || !songData.singer) {
                    return res.status(400).json({
                        error: `Song ${index + 1}: Title and singer are required`
                    });
                }

                if (!audioFile) {
                    return res.status(400).json({
                        error: `Song ${index + 1}: Audio file is required`
                    });
                }

                songs.push({
                    title: songData.title,
                    singer: songData.singer,
                    composer: songData.composer || '',
                    musicDirector: songData.musicDirector || '',
                    audioPath: audioFile.location // S3 URL from multer-s3
                });

                console.log(`✅ Song ${index + 1}: ${songData.title}`);
            });
        } else {
            // Flat format: songs[0][title] = "..."
            console.log('📝 Parsing songs from flat format');
            while (req.body[`songs[${songIndex}][title]`]) {
                const title = req.body[`songs[${songIndex}][title]`];
                const singer = req.body[`songs[${songIndex}][singer]`];
                const composer = req.body[`songs[${songIndex}][composer]`] || '';
                const musicDirector = req.body[`songs[${songIndex}][musicDirector]`] || '';

                // Find audio file for this song
                const audioFile = req.files.find(f => f.fieldname === `audio_${songIndex}`);

                if (!title || !singer) {
                    return res.status(400).json({
                        error: `Song ${songIndex + 1}: Title and singer are required`
                    });
                }

                if (!audioFile) {
                    return res.status(400).json({
                        error: `Song ${songIndex + 1}: Audio file is required`
                    });
                }

                songs.push({
                    title,
                    singer,
                    composer,
                    musicDirector,
                    audioPath: audioFile.location // S3 URL from multer-s3
                });

                console.log(`✅ Song ${songIndex + 1}: ${title}`);
                songIndex++;
            }
        }

        if (songs.length === 0) {
            return res.status(400).json({ error: 'At least one song is required' });
        }

        console.log(`📝 Total songs to upload: ${songs.length}`);

        // Create album in database
        const albumSql = `INSERT INTO albums (title, artist, cover_image, language, company, user_id)
                         VALUES (?, ?, ?, ?, ?, ?)`;

        db.run(albumSql, [albumTitle, albumArtist, coverImage, language, company || '', userId], function(err) {
            if (err) {
                console.error('Error creating album:', err);
                return res.status(500).json({ error: 'Failed to create album' });
            }

            const albumId = this.lastID;

            // Insert all songs with album_id
            const songSql = `INSERT INTO songs (title, singer, music_director, composer, company,
                            audio_file, cover_image, language, user_id, album_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            let completed = 0;
            let hasError = false;

            songs.forEach((song, index) => {
                db.run(songSql, [
                    song.title,
                    song.singer,
                    song.musicDirector,
                    song.composer,
                    company || '',
                    song.audioPath,
                    coverImage,
                    language,
                    userId,
                    albumId
                ], function(err) {
                    if (err && !hasError) {
                        hasError = true;
                        console.error('❌ Error inserting song:', err);
                        return res.status(500).json({ error: 'Failed to insert songs' });
                    }

                    completed++;
                    console.log(`✅ Inserted song ${completed}/${songs.length}`);

                    // When all songs are inserted
                    if (completed === songs.length && !hasError) {
                        console.log('🎉 Album upload complete!');
                        res.json({
                            success: true,
                            message: 'Album uploaded successfully',
                            album: {
                                id: albumId,
                                title: albumTitle,
                                artist: albumArtist,
                                songCount: songs.length
                            }
                        });
                    }
                });
            });
        });

    } catch (error) {
        console.error('Album upload error:', error);
        res.status(500).json({ error: 'Failed to upload album: ' + error.message });
    }
});

// Get album details with all songs
app.get('/api/albums/:id', (req, res) => {
    const albumId = req.params.id;

    // Get album info
    db.get('SELECT * FROM albums WHERE id = ?', [albumId], (err, album) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }

        // Get all songs in album
        db.all('SELECT * FROM songs WHERE album_id = ? ORDER BY id', [albumId], (err, songs) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                album,
                songs
            });
        });
    });
});

// Get all albums
app.get('/api/albums', (req, res) => {
    // Disable caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const sql = `
        SELECT a.*,
               (SELECT COUNT(*) FROM songs WHERE album_id = a.id) as song_count,
               u.username as creator_name,
               CASE a.language
                   WHEN 'Haryanvi' THEN 1
                   WHEN 'Rajasthani' THEN 2
                   WHEN 'Bhojpuri' THEN 3
                   ELSE 99
               END as language_order
        FROM albums a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY language_order ASC, a.display_order ASC, a.id ASC
    `;

    db.all(sql, [], (err, albums) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ albums });
    });
});

// Import from YouTube
app.post('/api/import-youtube', async (req, res) => {
    try {
        const { videoUrl, language } = req.body;

        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL required' });
        }

        console.log('📺 Importing from YouTube:', videoUrl);

        // Get video info
        const info = await ytdl.getInfo(videoUrl);
        const videoDetails = info.videoDetails;

        console.log('✅ Video info retrieved:', videoDetails.title);

        // Create unique filename
        const timestamp = Date.now();
        const audioFileName = `youtube-${timestamp}.mp3`;
        const audioPath = path.join(uploadsDir, audioFileName);

        // Download audio
        console.log('⬇️ Downloading audio...');

        await new Promise((resolve, reject) => {
            const audioStream = ytdl(videoUrl, {
                quality: 'highestaudio',
                filter: 'audioonly'
            });

            const writeStream = fs.createWriteStream(audioPath);
            audioStream.pipe(writeStream);

            writeStream.on('finish', () => {
                console.log('✅ Audio downloaded successfully');
                resolve();
            });

            writeStream.on('error', (err) => {
                console.error('❌ Audio download error:', err);
                reject(err);
            });

            audioStream.on('error', (err) => {
                console.error('❌ Stream error:', err);
                reject(err);
            });
        });

        // Upload audio to S3
        console.log('☁️  Uploading audio to S3...');
        const audioS3Key = `songs/${audioFileName}`;
        const audioFileContent = fs.readFileSync(audioPath);
        const audioUploadResult = await s3.upload({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: audioS3Key,
            Body: audioFileContent,
            ContentType: 'audio/mpeg'
        }).promise();
        const audioS3Url = audioUploadResult.Location;
        console.log('✅ Audio uploaded to S3:', audioS3Url);

        // Delete local audio file after S3 upload
        fs.unlinkSync(audioPath);

        // Download thumbnail as cover
        let coverImagePath = null;
        try {
            const thumbnail = videoDetails.thumbnails[videoDetails.thumbnails.length - 1];
            const coverFileName = `youtube-${timestamp}.jpg`;
            const coverPath = path.join(coversDir, coverFileName);

            console.log('⬇️ Downloading thumbnail...');
            const response = await axios({
                url: thumbnail.url,
                responseType: 'stream'
            });

            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(coverPath);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log('☁️  Uploading thumbnail to S3...');
            const coverS3Key = `covers/${coverFileName}`;
            const coverFileContent = fs.readFileSync(coverPath);
            const coverUploadResult = await s3.upload({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: coverS3Key,
                Body: coverFileContent,
                ContentType: 'image/jpeg'
            }).promise();
            coverImagePath = coverUploadResult.Location;
            console.log('✅ Thumbnail uploaded to S3:', coverImagePath);

            // Delete local thumbnail file after S3 upload
            fs.unlinkSync(coverPath);
        } catch (err) {
            console.warn('⚠️ Thumbnail download/upload failed:', err.message);
        }

        // Auto-detect language from channel
        let detectedLanguage = language || 'Hindi';
        const channelName = videoDetails.author.name.toLowerCase();

        if (channelName.includes('haryanvi')) {
            detectedLanguage = 'Haryanvi';
        } else if (channelName.includes('rajasthani')) {
            detectedLanguage = 'Rajasthani';
        }

        // Extract artist/singer from title (usually after - or |)
        let singer = videoDetails.author.name;
        const titleParts = videoDetails.title.split(/[-|]/);
        if (titleParts.length > 1) {
            singer = titleParts[1].trim();
        }

        // Insert into database
        const sql = `INSERT INTO songs (title, singer, company, lyrics, audio_file, cover_image, language, youtube_url)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            videoDetails.title,
            singer,
            'Stage Music',
            videoDetails.description || '',
            audioS3Url, // S3 URL instead of local path
            coverImagePath, // S3 URL or null
            detectedLanguage,
            videoUrl
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Database error:', err);
                // Files are already in S3 and local files deleted, no cleanup needed
                return res.status(500).json({ error: err.message });
            }

            console.log('✅ Song imported successfully! ID:', this.lastID);

            res.json({
                success: true,
                message: 'YouTube video imported successfully!',
                songId: this.lastID,
                song: {
                    id: this.lastID,
                    title: videoDetails.title,
                    singer: singer,
                    language: detectedLanguage,
                    cover_image: coverImagePath,
                    audio_file: audioS3Url
                }
            });
        });

    } catch (error) {
        console.error('❌ YouTube import error:', error);
        res.status(500).json({
            error: 'Failed to import from YouTube',
            details: error.message
        });
    }
});

// Export for Vercel or start server for local
// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║       🎵  STAGE MUSIC PLATFORM  🎵           ║
║                                               ║
║   Server running on PORT: ${PORT}                ║
║                                               ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║                                               ║
╚═══════════════════════════════════════════════╝
    `);
});

module.exports = app;

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('\n✅ Database connection closed');
        process.exit(0);
    });
});
