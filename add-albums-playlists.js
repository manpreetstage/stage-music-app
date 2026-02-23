// Add Albums and Playlists tables to database
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./stage_music.db');

console.log('Adding albums and playlists tables...');

db.serialize(() => {
    // Create albums table
    db.run(`CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        cover_image TEXT,
        language TEXT,
        company TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating albums table:', err);
        } else {
            console.log('✅ Albums table created');
        }
    });

    // Add album_id to songs table (if not exists)
    db.run(`ALTER TABLE songs ADD COLUMN album_id INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding album_id to songs:', err);
        } else {
            console.log('✅ album_id column added to songs');
        }
    });

    // Create playlists table
    db.run(`CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        user_id INTEGER NOT NULL,
        is_public INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating playlists table:', err);
        } else {
            console.log('✅ Playlists table created');
        }
    });

    // Create playlist_songs junction table
    db.run(`CREATE TABLE IF NOT EXISTS playlist_songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlist_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        position INTEGER,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
        UNIQUE(playlist_id, song_id)
    )`, (err) => {
        if (err) {
            console.error('Error creating playlist_songs table:', err);
        } else {
            console.log('✅ Playlist_songs table created');
        }
    });
});

db.close(() => {
    console.log('\n✅ Database updated successfully!');
    console.log('\nNew features:');
    console.log('1. Albums - Upload multiple songs with shared cover');
    console.log('2. Playlists - Users can create personalized playlists');
});
