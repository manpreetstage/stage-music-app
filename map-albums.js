require('dotenv').config();
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

// Parse Haryanvi CSV
async function parseHaryanviCSV() {
    const songAlbumMap = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream('./Haryanvi1/Music Haryanvi STAGE  - Release Plan.csv')
            .pipe(csv())
            .on('data', (row) => {
                const songName = row['Song_Name']?.trim();
                const albumName = row['Album_Name']?.trim();
                if (songName && albumName) {
                    songAlbumMap.push({
                        songName: songName.toLowerCase(),
                        albumName: albumName
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ Parsed ${songAlbumMap.length} Haryanvi songs from CSV`);
                resolve(songAlbumMap);
            })
            .on('error', reject);
    });
}

// Parse Rajasthani CSV
async function parseRajasthaniCSV() {
    const songAlbumMap = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream('./RJ1/Music Haryanvi STAGE  - RJ1.csv')
            .pipe(csv())
            .on('data', (row) => {
                const songName = row['Song_Name']?.trim();
                const albumName = row['Album_Name']?.trim();
                if (songName && albumName) {
                    songAlbumMap.push({
                        songName: songName.toLowerCase(),
                        albumName: albumName
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ Parsed ${songAlbumMap.length} Rajasthani songs from CSV`);
                resolve(songAlbumMap);
            })
            .on('error', reject);
    });
}

// Get or create album
function getOrCreateAlbum(albumName, language) {
    return new Promise((resolve, reject) => {
        // First check if album exists
        db.get('SELECT id FROM albums WHERE title = ?', [albumName], (err, row) => {
            if (err) return reject(err);

            if (row) {
                resolve(row.id);
            } else {
                // Create new album
                const sql = `INSERT INTO albums (title, artist, language, company, user_id)
                             VALUES (?, ?, ?, ?, ?)`;

                db.run(sql, [albumName, '', language, 'STAGE', 1], function(err) {
                    if (err) return reject(err);
                    console.log(`   ➕ Created album: ${albumName}`);
                    resolve(this.lastID);
                });
            }
        });
    });
}

// Update song with album_id
function updateSongAlbum(songId, albumId) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE songs SET album_id = ? WHERE id = ?', [albumId, songId], (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

// Get all songs
function getAllSongs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, title, language FROM songs', (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

// Main mapping function
async function mapAlbums() {
    console.log('🗂️  Mapping songs to albums...\n');

    const [haryanviMap, rajasthaniMap] = await Promise.all([
        parseHaryanviCSV(),
        parseRajasthaniCSV()
    ]);

    const allSongs = await getAllSongs();
    console.log(`\n📋 Total songs in database: ${allSongs.length}\n`);

    let mapped = 0;
    let notFound = 0;
    let skipped = 0;

    for (const song of allSongs) {
        const titleLower = song.title.toLowerCase();

        // Find in CSV maps
        let csvMatch = null;

        if (song.language === 'Haryanvi') {
            csvMatch = haryanviMap.find(m =>
                titleLower.includes(m.songName) || m.songName.includes(titleLower)
            );
        } else if (song.language === 'Rajasthani') {
            csvMatch = rajasthaniMap.find(m =>
                titleLower.includes(m.songName) || m.songName.includes(titleLower)
            );
        } else {
            skipped++;
            continue;
        }

        if (csvMatch) {
            try {
                const albumId = await getOrCreateAlbum(csvMatch.albumName, song.language);
                await updateSongAlbum(song.id, albumId);
                console.log(`✅ [${song.id}] ${song.title} → ${csvMatch.albumName}`);
                mapped++;
            } catch (error) {
                console.error(`❌ Error mapping [${song.id}] ${song.title}:`, error.message);
                notFound++;
            }
        } else {
            console.log(`⚠️  [${song.id}] ${song.title} - No album found`);
            notFound++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MAPPING SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Mapped: ${mapped} songs`);
    console.log(`⚠️  Not found: ${notFound} songs`);
    console.log(`⏭️  Skipped (other languages): ${skipped} songs`);
    console.log('='.repeat(60));
}

// Verify albums
async function verifyAlbums() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT a.title, a.language,
                   (SELECT COUNT(*) FROM songs WHERE album_id = a.id) as song_count
            FROM albums a
            WHERE a.language IN ('Haryanvi', 'Rajasthani')
            ORDER BY song_count DESC, a.title
        `;

        db.all(sql, (err, rows) => {
            if (err) return reject(err);

            console.log('\n' + '='.repeat(60));
            console.log('📊 ALBUMS WITH SONGS:');
            console.log('='.repeat(60));

            const withSongs = rows.filter(r => r.song_count > 0);
            const empty = rows.filter(r => r.song_count === 0);

            withSongs.forEach(row => {
                console.log(`✅ ${row.title} (${row.language}): ${row.song_count} songs`);
            });

            if (empty.length > 0) {
                console.log(`\n⚠️  ${empty.length} albums are empty`);
            }

            console.log('='.repeat(60));
            resolve();
        });
    });
}

async function main() {
    try {
        await mapAlbums();
        await verifyAlbums();

        console.log('\n✅ Album mapping complete!');
        db.close();
    } catch (error) {
        console.error('❌ Error:', error);
        db.close();
        process.exit(1);
    }
}

main();
