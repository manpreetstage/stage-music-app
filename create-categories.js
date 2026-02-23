const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./stage_music.db');

console.log('🎵 Creating Categories System...\n');

// Create categories table
db.run(`
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        cover_image TEXT,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('❌ Error creating categories table:', err);
    } else {
        console.log('✅ Categories table created');
    }
});

// Create category_songs junction table
db.run(`
    CREATE TABLE IF NOT EXISTS category_songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        position INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
        UNIQUE(category_id, song_id)
    )
`, (err) => {
    if (err) {
        console.error('❌ Error creating category_songs table:', err);
    } else {
        console.log('✅ Category_songs table created');
    }
});

// Insert default categories
const categories = [
    { name: 'POP TADKA', description: 'Catchy pop hits', icon: '🎤' },
    { name: 'ROMANTIC TALES', description: 'Love songs for every mood', icon: '💕' },
    { name: 'DESI HIP HOP', description: 'Indian hip hop beats', icon: '🎧' },
    { name: 'DEVOTIONAL', description: 'Spiritual & devotional music', icon: '🙏' },
    { name: 'GYM HITS', description: 'High energy workout tracks', icon: '💪' }
];

setTimeout(() => {
    categories.forEach((cat, index) => {
        db.run(
            `INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)`,
            [cat.name, cat.description, cat.icon],
            function(err) {
                if (err) {
                    console.error(`❌ Error inserting ${cat.name}:`, err.message);
                } else {
                    console.log(`✅ ${cat.name} created (ID: ${this.lastID})`);
                }

                if (index === categories.length - 1) {
                    console.log('\n🎉 Categories system ready!');
                    console.log('📝 Now add songs to categories via admin panel\n');
                    db.close();
                }
            }
        );
    });
}, 500);
