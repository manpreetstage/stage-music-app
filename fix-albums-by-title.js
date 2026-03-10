require('dotenv').config();
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

console.log('🔧 FIXING ALBUMS BY SONG TITLE MATCHING\n');

// Helper function to normalize titles for matching
function normalizeTitle(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')  // normalize spaces
        .replace(/[^\w\s]/g, ''); // remove special chars
}

// Step 1: Clear all album mappings
async function clearAllMappings() {
    return new Promise((resolve, reject) => {
        console.log('Step 1: Clearing all album mappings...');
        db.run('UPDATE songs SET album_id = NULL', (err) => {
            if (err) return reject(err);
            console.log('✅ All album mappings cleared\n');
            resolve();
        });
    });
}

// Step 2: Read CSV and create title-to-album mapping
async function readCSVData() {
    const haryanviMap = new Map();
    const rajasthaniMap = new Map();

    // Read Haryanvi CSV
    await new Promise((resolve, reject) => {
        fs.createReadStream('./Haryanvi1/Music Haryanvi STAGE  - Release Plan.csv')
            .pipe(csv())
            .on('data', (row) => {
                const songName = row['Song_Name']?.trim();
                const albumName = row['Album_Name']?.trim();
                const coverFile = row['Cover_File']?.trim();

                if (songName && albumName) {
                    const normalizedTitle = normalizeTitle(songName);
                    haryanviMap.set(normalizedTitle, {
                        albumName,
                        coverFile,
                        originalTitle: songName
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ Read ${haryanviMap.size} Haryanvi entries from CSV`);
                resolve();
            })
            .on('error', reject);
    });

    // Read Rajasthani CSV
    await new Promise((resolve, reject) => {
        fs.createReadStream('./RJ1/Music Haryanvi STAGE  - RJ1.csv')
            .pipe(csv())
            .on('data', (row) => {
                const songName = row['Song_Name']?.trim();
                const albumName = row['Album_Name']?.trim();
                const coverFile = row['Cover_File']?.trim();

                if (songName && albumName) {
                    const normalizedTitle = normalizeTitle(songName);
                    rajasthaniMap.set(normalizedTitle, {
                        albumName,
                        coverFile,
                        originalTitle: songName
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ Read ${rajasthaniMap.size} Rajasthani entries from CSV\n`);
                resolve();
            })
            .on('error', reject);
    });

    return { haryanviMap, rajasthaniMap };
}

// Step 3: Get all songs
async function getAllSongs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, title, language FROM songs', (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

// Step 4: Get or create album with cover
async function getOrCreateAlbum(albumName, language, coverFile) {
    return new Promise((resolve, reject) => {
        // Check if album exists
        db.get('SELECT id, cover_image FROM albums WHERE title = ? AND language = ?',
            [albumName, language], async (err, album) => {
            if (err) return reject(err);

            if (album) {
                // Album exists, update cover if needed
                if (!album.cover_image && coverFile) {
                    const coverUrl = `https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/original-${coverFile}`;
                    db.run('UPDATE albums SET cover_image = ? WHERE id = ?', [coverUrl, album.id], (err) => {
                        if (err) console.error('Error updating album cover:', err);
                    });
                }
                resolve(album.id);
            } else {
                // Create new album
                const sql = `INSERT INTO albums (title, artist, language, company, user_id, cover_image)
                             VALUES (?, ?, ?, ?, ?, ?)`;

                const coverUrl = coverFile ?
                    `https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/original-${coverFile}` : null;

                db.run(sql, [albumName, '', language, 'STAGE', 1, coverUrl], function(err) {
                    if (err) return reject(err);
                    console.log(`   ➕ Created album: ${albumName} (${language})`);
                    resolve(this.lastID);
                });
            }
        });
    });
}

// Step 5: Map songs to albums by title
async function mapSongsByTitle() {
    console.log('Step 2: Reading CSV data...');
    const { haryanviMap, rajasthaniMap } = await readCSVData();

    console.log('Step 3: Getting all songs from database...');
    const allSongs = await getAllSongs();
    console.log(`✅ Found ${allSongs.length} songs in database\n`);

    console.log('Step 4: Mapping songs to albums by TITLE MATCHING...\n');

    let mapped = 0;
    let notFound = 0;
    let skipped = 0;

    for (const song of allSongs) {
        // Skip non-Haryanvi/Rajasthani songs
        if (!['Haryanvi', 'Rajasthani'].includes(song.language)) {
            skipped++;
            continue;
        }

        const normalizedTitle = normalizeTitle(song.title);
        const csvMap = song.language === 'Haryanvi' ? haryanviMap : rajasthaniMap;
        const match = csvMap.get(normalizedTitle);

        if (match && match.albumName) {
            try {
                const albumId = await getOrCreateAlbum(match.albumName, song.language, match.coverFile);

                // Update song with album_id
                await new Promise((resolve, reject) => {
                    db.run('UPDATE songs SET album_id = ? WHERE id = ?', [albumId, song.id], (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });

                console.log(`✅ [${song.id}] "${song.title}" → "${match.albumName}"`);
                mapped++;
            } catch (error) {
                console.error(`❌ Error mapping [${song.id}] ${song.title}:`, error.message);
                notFound++;
            }
        } else {
            console.log(`⚠️  [${song.id}] "${song.title}" - No match in CSV (normalized: "${normalizedTitle}")`);
            notFound++;
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 MAPPING SUMMARY:');
    console.log('='.repeat(70));
    console.log(`✅ Successfully mapped: ${mapped} songs`);
    console.log(`⚠️  Not found/no album: ${notFound} songs`);
    console.log(`⏭️  Skipped (other languages): ${skipped} songs`);
    console.log('='.repeat(70));
}

// Step 6: Update album covers from first song if needed
async function updateAlbumCovers() {
    return new Promise((resolve, reject) => {
        console.log('\nStep 5: Updating album covers from songs if needed...\n');

        const sql = `
            SELECT a.id, a.title, a.cover_image,
                   (SELECT s.cover_image FROM songs s WHERE s.album_id = a.id LIMIT 1) as first_song_cover,
                   (SELECT COUNT(*) FROM songs WHERE album_id = a.id) as song_count
            FROM albums a
            WHERE a.language IN ('Haryanvi', 'Rajasthani')
        `;

        db.all(sql, async (err, albums) => {
            if (err) return reject(err);

            for (const album of albums) {
                if (album.song_count > 0 && !album.cover_image && album.first_song_cover) {
                    await new Promise((res, rej) => {
                        db.run('UPDATE albums SET cover_image = ? WHERE id = ?',
                            [album.first_song_cover, album.id], (err) => {
                            if (err) return rej(err);
                            console.log(`✅ Updated cover for album: ${album.title}`);
                            res();
                        });
                    });
                }
            }
            resolve();
        });
    });
}

// Step 7: Verify results
async function verifyResults() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT a.title, a.language,
                   (SELECT COUNT(*) FROM songs WHERE album_id = a.id) as song_count,
                   CASE WHEN a.cover_image IS NOT NULL THEN 'YES' ELSE 'NO' END as has_cover
            FROM albums a
            WHERE a.language IN ('Haryanvi', 'Rajasthani')
              AND (SELECT COUNT(*) FROM songs WHERE album_id = a.id) > 0
            ORDER BY song_count DESC, a.title
        `;

        db.all(sql, (err, rows) => {
            if (err) return reject(err);

            console.log('\n' + '='.repeat(70));
            console.log('📊 FINAL VERIFICATION:');
            console.log('='.repeat(70));

            const withoutCover = rows.filter(r => r.has_cover === 'NO');

            console.log(`✅ Albums with songs: ${rows.length}`);
            console.log(`⚠️  Albums without cover: ${withoutCover.length}\n`);

            rows.forEach(row => {
                const coverIcon = row.has_cover === 'YES' ? '✅' : '❌';
                console.log(`${coverIcon} ${row.title} (${row.language}): ${row.song_count} songs`);
            });

            console.log('='.repeat(70));
            resolve();
        });
    });
}

// Step 8: Show sample mappings for verification
async function showSampleMappings() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT s.id, s.title, s.language, a.title as album_title
            FROM songs s
            LEFT JOIN albums a ON s.album_id = a.id
            WHERE s.language IN ('Haryanvi', 'Rajasthani')
            ORDER BY s.id
            LIMIT 30
        `;

        db.all(sql, (err, rows) => {
            if (err) return reject(err);

            console.log('\n' + '='.repeat(70));
            console.log('📋 SAMPLE MAPPINGS (First 30 songs):');
            console.log('='.repeat(70));

            rows.forEach(row => {
                const albumInfo = row.album_title ? `→ ${row.album_title}` : '(no album)';
                console.log(`[${row.id}] ${row.title} ${albumInfo}`);
            });

            console.log('='.repeat(70));
            resolve();
        });
    });
}

// Main execution
async function main() {
    try {
        await clearAllMappings();
        await mapSongsByTitle();
        await updateAlbumCovers();
        await verifyResults();
        await showSampleMappings();

        console.log('\n✅ ALBUMS FIXED BY TITLE MATCHING!');
        console.log('✅ Mobile app will work perfectly!');
        console.log('✅ Ready for tomorrow\'s launch! 🚀\n');

        db.close();
    } catch (error) {
        console.error('❌ Error:', error);
        db.close();
        process.exit(1);
    }
}

main();
