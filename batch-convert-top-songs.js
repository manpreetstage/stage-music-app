const sqlite3 = require('sqlite3').verbose();
const { execSync } = require('child_process');

const db = new sqlite3.Database('./stage_music.db');

// Get top N most played songs
const TOP_SONGS_COUNT = 20;

console.log(`🎵 Converting top ${TOP_SONGS_COUNT} most played songs to HLS...\n`);

db.all(
    `SELECT id, title, singer, plays
     FROM songs
     WHERE has_hls = 0
     ORDER BY plays DESC
     LIMIT ?`,
    [TOP_SONGS_COUNT],
    (err, songs) => {
        if (err) {
            console.error('❌ Database error:', err);
            process.exit(1);
        }

        if (songs.length === 0) {
            console.log('✅ All top songs already have HLS!');
            db.close();
            return;
        }

        console.log(`📊 Found ${songs.length} songs to convert:\n`);
        songs.forEach((song, i) => {
            console.log(`${i + 1}. ${song.title} by ${song.singer} (${song.plays} plays)`);
        });

        console.log('\n⚠️  This will take time. Continue? (Ctrl+C to cancel)\n');

        setTimeout(() => {
            convertSongs(songs, 0);
        }, 3000);
    }
);

function convertSongs(songs, index) {
    if (index >= songs.length) {
        console.log('\n🎉 All songs converted!');
        db.close();
        return;
    }

    const song = songs[index];
    console.log(`\n[${index + 1}/${songs.length}] Converting: ${song.title} (ID: ${song.id})`);

    try {
        // Update SONG_ID in convert-to-hls.js temporarily
        const fs = require('fs');
        let script = fs.readFileSync('./convert-to-hls.js', 'utf8');
        script = script.replace(/const SONG_ID = \d+;/, `const SONG_ID = ${song.id};`);
        fs.writeFileSync('./convert-to-hls-temp.js', script);

        // Run conversion
        execSync('node convert-to-hls-temp.js', { stdio: 'inherit' });

        console.log(`✅ Completed: ${song.title}`);

        // Clean up temp file
        fs.unlinkSync('./convert-to-hls-temp.js');

        // Wait 2 seconds before next conversion
        setTimeout(() => {
            convertSongs(songs, index + 1);
        }, 2000);

    } catch (error) {
        console.error(`❌ Failed: ${song.title}`, error.message);
        // Continue with next song
        setTimeout(() => {
            convertSongs(songs, index + 1);
        }, 2000);
    }
}
