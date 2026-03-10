const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./stage_music.db');

console.log('Re-enabling HLS for song 113...');

db.run('UPDATE songs SET has_hls = 1 WHERE id = 113', (err) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('✅ HLS re-enabled for song 113');

        db.get('SELECT id, title, has_hls, hls_master_url FROM songs WHERE id = 113', (err, row) => {
            if (row) {
                console.log('\n📊 Song Details:');
                console.log('  ID:', row.id);
                console.log('  Title:', row.title);
                console.log('  HLS Enabled:', row.has_hls ? 'YES ✅' : 'NO');
                console.log('  Master URL:', row.hls_master_url);
            }
            db.close();
        });
    }
});
