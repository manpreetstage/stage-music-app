require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

console.log('🌍 FIXING HR2 SONG LANGUAGES\n');

// Normalize title
function normalizeTitle(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '');
}

// Read HR2 CSV with language info
async function readHR2CSV() {
    return new Promise((resolve, reject) => {
        const csvPath = path.join('./HR2', 'Music Haryanvi STAGE  - Mix.csv');
        const songLanguages = new Map();

        fs.createReadStream(csvPath)
            .pipe(csv({
                skipLines: 1  // Skip "Akha" line
            }))
            .on('data', (row) => {
                if (row.Song_Name && row.Langauage && row.Song_Name.trim() !== '') {
                    const normalizedTitle = normalizeTitle(row.Song_Name);
                    const language = row.Langauage.trim();
                    songLanguages.set(normalizedTitle, language);
                }
            })
            .on('end', () => {
                console.log(`✅ Read ${songLanguages.size} songs with languages from CSV`);

                // Count by language
                const haryanvi = Array.from(songLanguages.values()).filter(l => l === 'Haryanvi').length;
                const rajasthani = Array.from(songLanguages.values()).filter(l => l === 'Rajasthani').length;
                console.log(`   📊 Haryanvi: ${haryanvi}, Rajasthani: ${rajasthani}\n`);

                resolve(songLanguages);
            })
            .on('error', reject);
    });
}

// Get HR2 songs (id >= 178)
async function getHR2Songs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, title, language FROM songs WHERE id >= 178', (err, rows) => {
            if (err) return reject(err);
            console.log(`✅ Found ${rows.length} HR2 songs in database\n`);
            resolve(rows);
        });
    });
}

// Fix song languages and album languages
async function fixLanguages() {
    try {
        // Read CSV languages
        const songLanguages = await readHR2CSV();

        // Get HR2 songs
        const songs = await getHR2Songs();

        console.log('🔧 Fixing song languages...\n');

        let haryanviCount = 0;
        let rajasthaniCount = 0;
        let notFound = 0;

        for (const song of songs) {
            const normalizedTitle = normalizeTitle(song.title);
            const correctLanguage = songLanguages.get(normalizedTitle);

            if (correctLanguage) {
                if (song.language !== correctLanguage) {
                    // Update song language
                    await new Promise((resolve, reject) => {
                        db.run('UPDATE songs SET language = ? WHERE id = ?',
                            [correctLanguage, song.id], (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    });

                    console.log(`✅ [${song.id}] "${song.title}" → ${correctLanguage}`);

                    if (correctLanguage === 'Haryanvi') haryanviCount++;
                    else if (correctLanguage === 'Rajasthani') rajasthaniCount++;
                }
            } else {
                console.log(`⚠️  [${song.id}] "${song.title}" - Not in CSV`);
                notFound++;
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('📊 LANGUAGE FIX SUMMARY:');
        console.log('='.repeat(70));
        console.log(`✅ Haryanvi: ${haryanviCount} songs`);
        console.log(`✅ Rajasthani: ${rajasthaniCount} songs`);
        console.log(`⚠️  Not found: ${notFound} songs`);
        console.log('='.repeat(70));

        // Now fix album languages
        console.log('\n🎨 Fixing album languages...\n');
        await fixAlbumLanguages();

        console.log('\n✅ LANGUAGES FIXED!');
        console.log('✅ Ab Haryanvi aur Rajasthani alag-alag dikhenge!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Fix album languages based on their songs
async function fixAlbumLanguages() {
    return new Promise((resolve, reject) => {
        // Get albums that have mixed or wrong languages
        const sql = `
            SELECT a.id, a.title, a.language,
                   GROUP_CONCAT(DISTINCT s.language) as song_languages,
                   COUNT(s.id) as song_count
            FROM albums a
            JOIN songs s ON s.album_id = a.id
            GROUP BY a.id
            HAVING song_languages IS NOT NULL
        `;

        db.all(sql, async (err, albums) => {
            if (err) return reject(err);

            for (const album of albums) {
                const languages = album.song_languages.split(',');

                // If all songs are same language, update album
                if (languages.length === 1 && languages[0] !== album.language) {
                    await new Promise((res, rej) => {
                        db.run('UPDATE albums SET language = ? WHERE id = ?',
                            [languages[0], album.id], (err) => {
                            if (err) return rej(err);
                            console.log(`✅ Album "${album.title}" → ${languages[0]}`);
                            res();
                        });
                    });
                }
            }
            resolve();
        });
    });
}

// Run
fixLanguages();
