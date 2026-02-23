const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./stage_music.db', (err) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }

    console.log('Adding YouTube column...');
    
    db.run('ALTER TABLE songs ADD COLUMN youtube_url TEXT', (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding column:', err);
        } else {
            console.log('✅ YouTube URL column added!');
        }
        
        db.close();
    });
});
