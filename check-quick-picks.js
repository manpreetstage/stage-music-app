const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./stage_music.db');

console.log('📋 Current Quick Picks Order:\n');

db.all('SELECT song_id, position FROM quick_picks ORDER BY position', [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }

    console.log('Position | Song ID');
    console.log('---------|--------');
    rows.forEach(row => {
        console.log(`   ${row.position}     |   ${row.song_id}`);
    });

    db.close();
});
