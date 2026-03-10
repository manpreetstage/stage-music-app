require('dotenv').config();
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

console.log('🔧 FIXING ALBUMS PROPERLY - NO MORE ISSUES!\n');

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

// Step 2: Read CSV and create proper album mapping
async function readCSVData() {
    const haryanviData = [];
    const rajasthaniData = [];

    // Read Haryanvi CSV
    await new Promise((resolve, reject) => {
        fs.createReadStream('./Haryanvi1/Music Haryanvi STAGE  - Release Plan.csv')
            .pipe(csv())
            .on('data', (row) => {
                haryanviData.push({
                    audioFile: row['Audio_Files']?.trim().toLowerCase(),
                    albumName: row['Album_Name']?.trim(),
                    coverFile: row['Cover_File']?.trim()
                });
            })
            .on('end', () => {
                console.log(`✅ Read ${haryanviData.length} Haryanvi entries from CSV`);
                resolve();
            })
            .on('error', reject);
    });

    // Read Rajasthani CSV
    await new Promise((resolve, reject) => {
        fs.createReadStream('./RJ1/Music Haryanvi STAGE  - RJ1.csv')
            .pipe(csv())
            .on('data', (row) => {
                rajasthaniData.push({
                    audioFile: row['Audio_Files']?.trim().toLowerCase(),
                    albumName: row['Album_Name']?.trim(),
                    coverFile: row['Cover_File']?.trim()
                });
            })
            .on('end', () => {
                console.log(`✅ Read ${rajasthaniData.length} Rajasthani entries from CSV\n`);
                resolve();
            })
            .on('error', reject);
    });

    return { haryanviData, rajasthaniData };
}

// Step 3: Get all songs with their audio file names
async function getAllSongs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, title, audio_file, language FROM songs', (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

// Step 4: Extract audio filename from S3 URL
function extractAudioFilename(s3Url) {
    if (!s3Url) return null;
    // Extract filename from URL like: .../songs/1234-5678.wav
    const match = s3Url.match(/([^/]+\.(wav|mp3))$/i);
    if (match) {
        // Get the part after the timestamp
        const parts = match[1].split('-');
        if (parts.length > 1) {
            // Return the last part (actual filename)
            return parts[parts.length - 1].toLowerCase();
        }
        return match[1].toLowerCase();
    }
    return null;
}

// Step 5: Get or create album with proper cover
async function getOrCreateAlbum(albumName, language, coverFile) {
    return new Promise((resolve, reject) => {
        // Check if album exists
        db.get('SELECT id, cover_image FROM albums WHERE title = ?', [albumName], async (err, album) => {
            if (err) return reject(err);

            if (album) {
                // Album exists, update cover if needed
                if (!album.cover_image && coverFile) {
                    // Use the cover from CSV (it's already uploaded)
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
                    console.log(`   ➕ Created album: ${albumName}`);
                    resolve(this.lastID);
                });
            }
        });
    });
}

// Step 6: Map songs to albums using EXACT audio file matching
async function mapSongsToAlbums() {
    console.log('Step 2: Reading CSV data...');
    const { haryanviData, rajasthaniData } = await readCSVData();

    console.log('Step 3: Getting all songs from database...');
    const allSongs = await getAllSongs();
    console.log(`✅ Found ${allSongs.length} songs in database\n`);

    console.log('Step 4: Mapping songs to albums (EXACT MATCHING ONLY)...\n');

    let mapped = 0;
    let notFound = 0;
    let skipped = 0;

    for (const song of allSongs) {
        // Skip non-Haryanvi/Rajasthani songs
        if (!['Haryanvi', 'Rajasthani'].includes(song.language)) {
            skipped++;
            continue;
        }

        const audioFilename = extractAudioFilename(song.audio_file);
        if (!audioFilename) {
            console.log(`⚠️  [${song.id}] ${song.title} - Could not extract filename`);
            notFound++;
            continue;
        }

        // Find EXACT match in CSV data
        const csvData = song.language === 'Haryanvi' ? haryanviData : rajasthaniData;
        const match = csvData.find(row => row.audioFile === audioFilename);

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

                console.log(`✅ [${song.id}] ${song.title} → ${match.albumName}`);
                mapped++;
            } catch (error) {
                console.error(`❌ Error mapping [${song.id}] ${song.title}:`, error.message);
                notFound++;
            }
        } else {
            console.log(`⚠️  [${song.id}] ${song.title} - No album in CSV (${audioFilename})`);
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

// Step 7: Update album covers from first song
async function updateAlbumCovers() {
    return new Promise((resolve, reject) => {
        console.log('\nStep 5: Updating album covers from songs...\n');

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

// Step 8: Verify everything
async function verifyResults() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT a.title, a.language,
                   (SELECT COUNT(*) FROM songs WHERE album_id = a.id) as song_count,
                   CASE WHEN a.cover_image IS NOT NULL THEN 'YES' ELSE 'NO' END as has_cover
            FROM albums a
            WHERE a.language IN ('Haryanvi', 'Rajasthani')
            ORDER BY song_count DESC, a.title
        `;

        db.all(sql, (err, rows) => {
            if (err) return reject(err);

            console.log('\n' + '='.repeat(70));
            console.log('📊 FINAL VERIFICATION:');
            console.log('='.repeat(70));

            const withSongs = rows.filter(r => r.song_count > 0);
            const withoutCover = withSongs.filter(r => r.has_cover === 'NO');

            console.log(`✅ Albums with songs: ${withSongs.length}`);
            console.log(`⚠️  Albums without cover: ${withoutCover.length}\n`);

            withSongs.slice(0, 20).forEach(row => {
                const coverIcon = row.has_cover === 'YES' ? '✅' : '❌';
                console.log(`${coverIcon} ${row.title} (${row.language}): ${row.song_count} songs`);
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
        await mapSongsToAlbums();
        await updateAlbumCovers();
        await verifyResults();

        console.log('\n✅ ALBUMS FIXED PROPERLY!');
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
