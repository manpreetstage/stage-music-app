const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./stage_music.db');

console.log('Adding missing columns to songs table...');

db.serialize(() => {
    // Add artist column
    db.run(`ALTER TABLE songs ADD COLUMN artist TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ artist column already exists');
            } else {
                console.error('❌ Error adding artist:', err.message);
            }
        } else {
            console.log('✅ artist column added successfully!');
        }
    });

    // Add lyricist column
    db.run(`ALTER TABLE songs ADD COLUMN lyricist TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ lyricist column already exists');
            } else {
                console.error('❌ Error adding lyricist:', err.message);
            }
        } else {
            console.log('✅ lyricist column added successfully!');
        }
    });

    // Add producer column
    db.run(`ALTER TABLE songs ADD COLUMN producer TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ producer column already exists');
            } else {
                console.error('❌ Error adding producer:', err.message);
            }
        } else {
            console.log('✅ producer column added successfully!');
        }
    });

    // Add language column
    db.run(`ALTER TABLE songs ADD COLUMN language TEXT DEFAULT 'Hindi'`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ language column already exists');
            } else {
                console.error('❌ Error adding language:', err.message);
            }
        } else {
            console.log('✅ language column added successfully!');
        }
    });

    // Add user_id column
    db.run(`ALTER TABLE songs ADD COLUMN user_id INTEGER`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ user_id column already exists');
            } else {
                console.error('❌ Error adding user_id:', err.message);
            }
        } else {
            console.log('✅ user_id column added successfully!');
        }

        // Close database after last operation
        setTimeout(() => {
            console.log('\n✅ All columns added successfully!');
            db.close();
            console.log('Done! You can now upload songs.');
        }, 500);
    });
});
