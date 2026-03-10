require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csv = require('csv-parser');

const db = new sqlite3.Database('./stage_music.db');

// Bhojpuri songs data from CSV
const bhojpuriSongs = [];

async function readCSV() {
    return new Promise((resolve, reject) => {
        console.log('📖 Reading CSV file...\n');

        fs.createReadStream('./HR2/Music Haryanvi STAGE  - Mix.csv')
            .pipe(csv({
                headers: ['serial', 'song_name', 'album_name', 'audio_file', 'cover_file', 'singer', 'lyricist', 'music_director', 'empty', 'label', 'language']
            }))
            .on('data', (row) => {
                // Filter Bhojpuri songs (Audio70-88)
                if (row.audio_file && row.audio_file.match(/Audio(7[0-9]|8[0-8])/)) {
                    bhojpuriSongs.push({
                        audioFile: row.audio_file.trim(),
                        songName: row.song_name.trim(),
                        albumName: row.album_name.trim(),
                        singer: row.singer ? row.singer.trim() : null,
                        lyricist: row.lyricist ? row.lyricist.trim() : null,
                        musicDirector: row.music_director ? row.music_director.trim() : null
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ Found ${bhojpuriSongs.length} Bhojpuri songs in CSV\n`);
                resolve();
            })
            .on('error', reject);
    });
}

async function updateSong(song) {
    return new Promise((resolve, reject) => {
        // Match by title (song name without "From..." part)
        const titleMatch = song.songName.split('(From')[0].trim();

        // Use "Unknown" if singer is empty (to satisfy NOT NULL constraint)
        const singer = song.singer || 'Unknown';

        db.run(`
            UPDATE songs
            SET singer = ?,
                lyricist = ?,
                music_director = ?
            WHERE title LIKE ?
            AND album_id IN (
                SELECT id FROM albums
                WHERE language = 'Bhojpuri'
            )
        `, [singer, song.lyricist, song.musicDirector, `%${titleMatch}%`], function(err) {
            if (err) {
                reject(err);
                return;
            }

            if (this.changes > 0) {
                console.log(`✅ Updated: ${song.songName}`);
                console.log(`   Singer: ${singer}`);
                console.log(`   Lyricist: ${song.lyricist || 'N/A'}`);
                console.log(`   Music: ${song.musicDirector || 'N/A'}\n`);
            } else {
                console.log(`⚠️  Not found in DB: ${song.songName}\n`);
            }

            resolve(this.changes);
        });
    });
}

async function verifyUpdates() {
    return new Promise((resolve, reject) => {
        console.log('\n📊 Verification - Bhojpuri Songs with Credits:\n');
        console.log('='.repeat(80));

        db.all(`
            SELECT s.title, s.singer, s.lyricist, s.music_director, a.title as album
            FROM songs s
            JOIN albums a ON s.album_id = a.id
            WHERE a.language = 'Bhojpuri'
            ORDER BY s.id
        `, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            rows.forEach(row => {
                console.log(`Song: ${row.title}`);
                console.log(`  Album: ${row.album}`);
                console.log(`  Singer: ${row.singer || 'NOT SET'}`);
                console.log(`  Lyricist: ${row.lyricist || 'NOT SET'}`);
                console.log(`  Music: ${row.music_director || 'NOT SET'}`);
                console.log('-'.repeat(80));
            });

            // Count missing credits
            const missingSinger = rows.filter(r => !r.singer).length;
            const missingLyricist = rows.filter(r => !r.lyricist).length;
            const missingMusic = rows.filter(r => !r.music_director).length;

            console.log('\n📈 Summary:');
            console.log(`  Total Bhojpuri songs: ${rows.length}`);
            console.log(`  Missing Singer: ${missingSinger}`);
            console.log(`  Missing Lyricist: ${missingLyricist}`);
            console.log(`  Missing Music Director: ${missingMusic}`);

            resolve();
        });
    });
}

async function main() {
    console.log('🎵 Updating Bhojpuri Songs Credits from CSV\n');
    console.log('='.repeat(80));

    try {
        // Read CSV
        await readCSV();

        // Update each song
        console.log('📝 Updating songs in database...\n');
        let totalUpdated = 0;

        for (const song of bhojpuriSongs) {
            const changes = await updateSong(song);
            totalUpdated += changes;
        }

        console.log('='.repeat(80));
        console.log(`\n✅ Updated ${totalUpdated} songs successfully!\n`);

        // Verify
        await verifyUpdates();

        console.log('\n' + '='.repeat(80));
        console.log('✅ Bhojpuri credits update complete!');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    db.close();
}

main().catch(console.error);
