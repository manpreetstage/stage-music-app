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

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
});

const s3 = new AWS.S3();

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

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

            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new Error('Only image files are allowed for cover!'));
            }
        } else {
            cb(null, true);
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB per file
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
            music_director TEXT,
            composer TEXT,
            company TEXT,
            lyrics TEXT,
            audio_file TEXT NOT NULL,
            cover_image TEXT,
            duration TEXT,
            plays INTEGER DEFAULT 0,
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

    let sql = 'SELECT * FROM songs';
    let params = [];

    if (language && language !== 'All') {
        sql += ' WHERE language = ?';
        params.push(language);
    }

    sql += ' ORDER BY created_at DESC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
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

// ==================== END CATEGORY ENDPOINTS ====================

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

// Upload new song
app.post('/api/upload', isAuthenticated, upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), (req, res) => {
    if (!req.files || !req.files.audio) {
        return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { title, singer, music_director, composer, company, lyrics, language } = req.body;

    if (!title || !singer) {
        // Files will remain in S3 if validation fails (acceptable for now)
        // TODO: Implement S3 cleanup for failed uploads
        return res.status(400).json({ error: 'Title and Singer are required' });
    }

    // Get S3 URLs from multer-s3
    const audioFile = req.files.audio[0].location; // S3 URL
    const coverImage = req.files.cover ? req.files.cover[0].location : null;
    const userId = req.session.userId; // Get user ID from session

    const sql = `INSERT INTO songs (title, singer, music_director, composer, company, lyrics, audio_file, cover_image, language, user_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [title, singer, music_director, composer, company, lyrics, audioFile, coverImage, language || 'Hindi', userId], function(err) {
        if (err) {
            // Files remain in S3 if database insert fails (acceptable for now)
            // TODO: Implement S3 cleanup for failed database inserts
            return res.status(500).json({ error: err.message });
        }

        res.json({
            success: true,
            message: 'Song uploaded successfully!',
            songId: this.lastID,
            song: {
                id: this.lastID,
                title,
                singer,
                music_director,
                composer,
                company,
                lyrics,
                audio_file: audioFile,
                cover_image: coverImage,
                user_id: userId
            }
        });
    });
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
        res.json({ songs: rows });
    });
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
    const sql = `
        SELECT a.*, COUNT(s.id) as song_count, u.username as creator_name
        FROM albums a
        LEFT JOIN songs s ON a.id = s.album_id
        LEFT JOIN users u ON a.user_id = u.id
        GROUP BY a.id
        ORDER BY a.created_at DESC
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
module.exports = app;

// Start server only in non-serverless environment
if (require.main === module || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`
    ╔═══════════════════════════════════════════════╗
    ║                                               ║
    ║       🎵  STAGE MUSIC PLATFORM  🎵           ║
    ║                                               ║
    ║   Server running on: http://localhost:${PORT}   ║
    ║                                               ║
    ║   Music Player: http://localhost:${PORT}/          ║
    ║   Admin Panel:  http://localhost:${PORT}/admin     ║
    ║                                               ║
    ╚═══════════════════════════════════════════════╝
        `);
    });
}

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
