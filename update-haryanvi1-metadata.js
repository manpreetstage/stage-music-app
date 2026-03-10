require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

console.log('📝 UPDATING HARYANVI1 SONG METADATA\n');

// Normalize title for matching
function normalizeTitle(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '');
}

// Read Haryanvi1 CSV
async function readHaryanvi1CSV() {
    return new Promise((resolve, reject) => {
        const csvPath = path.join('./Haryanvi1', 'Music Haryanvi STAGE  - Release Plan.csv');
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
                console.log(`✅ Read ${songMetadata.size} songs from Haryanvi1 CSV\n`);
                resolve(songMetadata);
            })
            .on('error', reject);
    });
}

// Get all Haryanvi songs
async function getHaryanviSongs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, title, singer, lyrics, music_director, composer FROM songs WHERE language = ?',
            ['Haryanvi'], (err, rows) => {
            if (err) return reject(err);
            console.log(`✅ Found ${rows.length} Haryanvi songs in database\n`);
            resolve(rows);
        });
    });
}

// Update song metadata
async function updateMetadata() {
    try {
        // Read CSV
        const songMetadata = await readHaryanvi1CSV();

        // Get Haryanvi songs
        const songs = await getHaryanviSongs();

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
                    if (metadata.singer) console.log(`   Singer: ${metadata.singer}`);
                    updated++;
                } else {
                    noChanges++;
                }
            } else {
                notFound++;
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('📊 UPDATE SUMMARY:');
        console.log('='.repeat(70));
        console.log(`✅ Updated: ${updated} songs`);
        console.log(`⏭️  No changes needed: ${noChanges} songs`);
        console.log(`⚠️  Not in CSV: ${notFound} songs (likely HR2 songs)`);
        console.log('='.repeat(70));

        console.log('\n✅ HARYANVI1 METADATA UPDATED!');
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
