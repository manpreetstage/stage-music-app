const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./stage_music.db');

console.log('Disabling HLS for song 113...');

db.run('UPDATE songs SET has_hls = 0 WHERE id = 113', (err) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('✅ HLS disabled for song 113');
        console.log('Song will now use standard audio file');

        db.get('SELECT id, title, has_hls, audio_file_128 FROM songs WHERE id = 113', (err, row) => {
            if (row) {
                console.log('\nSong Details:');
                console.log('  ID:', row.id);
                console.log('  Title:', row.title);
                console.log('  HLS Enabled:', row.has_hls);
                console.log('  Audio File:', row.audio_file_128 ? 'Using 128k optimized' : 'Using original');
            }
            db.close();
        });
    }
});
