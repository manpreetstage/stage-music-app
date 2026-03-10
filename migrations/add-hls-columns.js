const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'stage_music.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Starting HLS columns migration...');
console.log('📁 Database:', dbPath);

db.serialize(() => {
    console.log('📊 Adding HLS columns to songs table...');

    db.run(`ALTER TABLE songs ADD COLUMN hls_master_url TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Error adding hls_master_url:', err.message);
        } else if (!err) {
            console.log('  ✅ Added hls_master_url column');
        } else {
            console.log('  ℹ️  hls_master_url column already exists');
        }
    });

    db.run(`ALTER TABLE songs ADD COLUMN has_hls INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Error adding has_hls:', err.message);
        } else if (!err) {
            console.log('  ✅ Added has_hls column');
        } else {
            console.log('  ℹ️  has_hls column already exists');
        }

        // Close database after last operation
        setTimeout(() => {
            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('\n🎉 Migration completed successfully!');
                }
            });
        }, 100);
    });
});
