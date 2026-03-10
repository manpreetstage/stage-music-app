require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

console.log('📝 UPDATING RJ1 SONG METADATA\n');

// Normalize title for matching
function normalizeTitle(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '');
}

// Read RJ1 CSV
async function readRJ1CSV() {
    return new Promise((resolve, reject) => {
        const csvPath = path.join('./RJ1', 'Music Haryanvi STAGE  - RJ1.csv');
        const songMetadata = new Map();

        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                if (row.Song_Name && row.Song_Name.trim() !== '') {
                    const normalizedTitle = normalizeTitle(row.Song_Name);
                    songMetadata.set(normalizedTitle, {
                        singer: row.Singer?.trim() || '',
                        lyrics: row.Lyricist?.trim() || '',
                        music_director: row.Music_Director?.trim() || '',
                        composer: row.Composer?.trim() || ''
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ Read ${songMetadata.size} songs from RJ1 CSV\n`);
                resolve(songMetadata);
            })
            .on('error', reject);
    });
}

// Get all Rajasthani songs
async function getRajasthaniSongs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, title, singer, lyrics, music_director, composer FROM songs WHERE language = ?',
            ['Rajasthani'], (err, rows) => {
            if (err) return reject(err);
            console.log(`✅ Found ${rows.length} Rajasthani songs in database\n`);
            resolve(rows);
        });
    });
}

// Update song metadata
async function updateMetadata() {
    try {
        // Read CSV
        const songMetadata = await readRJ1CSV();

        // Get Rajasthani songs
        const songs = await getRajasthaniSongs();

        console.log('🔄 Updating metadata...\n');

        let updated = 0;
        let notFound = 0;
        let noChanges = 0;

        for (const song of songs) {
            const normalizedTitle = normalizeTitle(song.title);
            const metadata = songMetadata.get(normalizedTitle);

            if (metadata) {
                // Check if any field needs updating
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

                    console.log(`✅ [${song.id}] "${song.title}"`);
                    console.log(`   Singer: ${metadata.singer || '(empty)'}`);
                    console.log(`   Lyrics: ${metadata.lyrics || '(empty)'}`);
                    console.log(`   Music: ${metadata.music_director || '(empty)'}`);
                    console.log(`   Composer: ${metadata.composer || '(empty)'}`);
                    updated++;
                } else {
                    noChanges++;
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
        console.log(`⏭️  No changes needed: ${noChanges} songs`);
        console.log(`⚠️  Not in CSV: ${notFound} songs`);
        console.log('='.repeat(70));

        console.log('\n✅ RJ1 METADATA UPDATED!');
        console.log('✅ Singer, Lyrics, Composer, Music Director sab update ho gaye!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run
updateMetadata();
