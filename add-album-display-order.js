const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./stage_music.db');

console.log('Adding display_order column to albums table...');

db.serialize(() => {
    // Add display_order column
    db.run(`ALTER TABLE albums ADD COLUMN display_order INTEGER DEFAULT 0`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ Column already exists');
            } else {
                console.error('❌ Error:', err.message);
            }
        } else {
            console.log('✅ display_order column added successfully!');
        }
    });

    // Set initial display_order based on existing IDs and group by language
    db.all('SELECT id, language FROM albums ORDER BY language, id', [], (err, albums) => {
        if (err) {
            console.error('Error fetching albums:', err);
            db.close();
            return;
        }

        let currentLanguage = null;
        let position = 1;

        albums.forEach((album, index) => {
            // Reset position counter when language changes
            if (album.language !== currentLanguage) {
                currentLanguage = album.language;
                position = 1;
            }

            db.run('UPDATE albums SET display_order = ? WHERE id = ?', [position, album.id], (err) => {
                if (err) console.error('Error updating album:', album.id, err);
            });

            position++;

            // Close database after last update
            if (index === albums.length - 1) {
                setTimeout(() => {
                    console.log('✅ Initial display orders set!');
                    db.close();
                    console.log('Done!');
                }, 500);
            }
        });
    });
});
