require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

console.log('📝 UPDATING HR2 SONG METADATA\n');

// Normalize title
function normalizeTitle(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '');
}

// Read HR2 CSV
async function readHR2CSV() {
    return new Promise((resolve, reject) => {
        const csvPath = path.join('./HR2', 'Music Haryanvi STAGE  - Mix.csv');
        const songMetadata = new Map();

        fs.createReadStream(csvPath)
            .pipe(csv({
                skipLines: 1  // Skip "Akha" line
            }))
            .on('data', (row) => {
                if (row.Song_Name && row.Song_Name.trim() !== '') {
                    const normalizedTitle = normalizeTitle(row.Song_Name);
                    songMetadata.set(normalizedTitle, {
                        singer: row.Singer?.trim() || '',
                        lyrics: row.Lyrics?.trim() || '',
                        music_director: row.Music_Director?.trim() || '',
                        composer: row.Composer?.trim() || ''
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ Read ${songMetadata.size} songs from HR2 CSV\n`);
                resolve(songMetadata);
            })
            .on('error', reject);
    });
}

// Get HR2 songs (id >= 178)
async function getHR2Songs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, title, singer, lyrics, music_director, composer FROM songs WHERE id >= 178',
            (err, rows) => {
            if (err) return reject(err);
            console.log(`✅ Found ${rows.length} HR2 songs in database\n`);
            resolve(rows);
        });
    });
}

// Update metadata
async function updateMetadata() {
    try {
        const songMetadata = await readHR2CSV();
        const songs = await getHR2Songs();

        console.log('🔄 Checking metadata...\n');

        let updated = 0;
        let alreadyGood = 0;
        let notFound = 0;

        for (const song of songs) {
            const normalizedTitle = normalizeTitle(song.title);
            const metadata = songMetadata.get(normalizedTitle);

            if (metadata) {
                // Check if needs update
                const needsUpdate =
                    (metadata.singer && metadata.singer !== song.singer) ||
                    (metadata.lyrics && metadata.lyrics !== song.lyrics) ||
                    (metadata.music_director && metadata.music_director !== song.music_director) ||
                    (metadata.composer && metadata.composer !== song.composer);

                if (needsUpdate) {
                    await new Promise((resolve, reject) => {
                        db.run(`UPDATE songs SET
                                singer = ?,
                                lyrics = ?,
                                music_director = ?,
                                composer = ?
                                WHERE id = ?`,
                            [
                                metadata.singer || song.singer,
                                metadata.lyrics || song.lyrics,
                                metadata.music_director || song.music_director,
                                metadata.composer || song.composer,
                                song.id
                            ],
                            (err) => {
                                if (err) return reject(err);
                                resolve();
                            }
                        );
                    });

                    console.log(`✅ [${song.id}] "${song.title}" - Updated`);
                    updated++;
                } else {
                    alreadyGood++;
                }
            } else {
                console.log(`⚠️  [${song.id}] "${song.title}" - Not in CSV`);
                notFound++;
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('📊 UPDATE SUMMARY:');
        console.log('='.repeat(70));
        console.log(`✅ Updated: ${updated} songs`);
        console.log(`⏭️  Already correct: ${alreadyGood} songs`);
        console.log(`⚠️  Not in CSV: ${notFound} songs`);
        console.log('='.repeat(70));

        console.log('\n✅ HR2 METADATA CHECK COMPLETE!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

updateMetadata();
