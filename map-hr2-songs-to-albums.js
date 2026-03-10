require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

console.log('🎯 MAPPING HR2 SONGS TO ALBUMS\n');

// Normalize title for matching
function normalizeTitle(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '');
}

// Get or create album
async function getOrCreateAlbum(albumName, language, coverUrl) {
    return new Promise((resolve, reject) => {
        db.get('SELECT id FROM albums WHERE title = ? AND language = ?',
            [albumName, language], (err, album) => {
            if (err) return reject(err);

            if (album) {
                resolve(album.id);
            } else {
                const sql = `INSERT INTO albums (title, artist, language, company, user_id, cover_image)
                             VALUES (?, ?, ?, ?, ?, ?)`;

                db.run(sql, [albumName, '', language, 'STAGE', 1, coverUrl], function(err) {
                    if (err) return reject(err);
                    console.log(`   ➕ Created album: ${albumName}`);
                    resolve(this.lastID);
                });
            }
        });
    });
}

// Read HR2 CSV and create mapping
async function readHR2CSV() {
    return new Promise((resolve, reject) => {
        const csvPath = path.join('./HR2', 'Music Haryanvi STAGE  - Mix.csv');
        const songToAlbum = new Map();

        fs.createReadStream(csvPath)
            .pipe(csv({
                skipLines: 1  // Skip "Akha" line
            }))
            .on('data', (row) => {
                if (row.Song_Name && row.Album_Name && row.Song_Name.trim() !== '') {
                    const normalizedTitle = normalizeTitle(row.Song_Name);
                    songToAlbum.set(normalizedTitle, {
                        albumName: row.Album_Name,
                        coverFile: row.Cover_File
                    });
                }
            })
            .on('end', () => {
                console.log(`✅ Read ${songToAlbum.size} song-album mappings from HR2 CSV\n`);
                resolve(songToAlbum);
            })
            .on('error', reject);
    });
}

// Get all songs without album_id
async function getSongsWithoutAlbum() {
    return new Promise((resolve, reject) => {
        const sql = `SELECT id, title, language, cover_image
                     FROM songs
                     WHERE album_id IS NULL AND language = 'Haryanvi'`;

        db.all(sql, (err, rows) => {
            if (err) return reject(err);
            console.log(`✅ Found ${rows.length} Haryanvi songs without albums\n`);
            resolve(rows);
        });
    });
}

// Main mapping function
async function mapSongsToAlbums() {
    try {
        // Read HR2 CSV
        const songToAlbum = await readHR2CSV();

        // Get songs without albums
        const songs = await getSongsWithoutAlbum();

        console.log('🔗 Mapping songs to albums...\n');

        let mapped = 0;
        let notFound = 0;

        for (const song of songs) {
            const normalizedTitle = normalizeTitle(song.title);
            const albumInfo = songToAlbum.get(normalizedTitle);

            if (albumInfo && albumInfo.albumName) {
                try {
                    // Get or create album
                    const albumId = await getOrCreateAlbum(
                        albumInfo.albumName,
                        song.language,
                        song.cover_image  // Use song's cover for album
                    );

                    // Update song with album_id
                    await new Promise((resolve, reject) => {
                        db.run('UPDATE songs SET album_id = ? WHERE id = ?',
                            [albumId, song.id], (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    });

                    console.log(`✅ [${song.id}] "${song.title}" → "${albumInfo.albumName}"`);
                    mapped++;

                } catch (error) {
                    console.error(`❌ Error mapping [${song.id}] "${song.title}": ${error.message}`);
                    notFound++;
                }
            } else {
                console.log(`⚠️  [${song.id}] "${song.title}" - No album in HR2 CSV`);
                notFound++;
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('📊 MAPPING SUMMARY:');
        console.log('='.repeat(70));
        console.log(`✅ Mapped: ${mapped} songs`);
        console.log(`⚠️  Not found: ${notFound} songs`);
        console.log('='.repeat(70));

        // Update album covers
        console.log('\n🎨 Updating album covers...\n');
        await updateAlbumCovers();

        console.log('\n✅ HR2 SONGS MAPPED TO ALBUMS!');
        console.log('✅ Ab mobile app me albums me dikhenge!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Update album covers from songs
async function updateAlbumCovers() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT a.id, a.title,
                   (SELECT s.cover_image FROM songs s WHERE s.album_id = a.id LIMIT 1) as first_song_cover,
                   (SELECT COUNT(*) FROM songs WHERE album_id = a.id) as song_count
            FROM albums a
            WHERE a.language = 'Haryanvi'
        `;

        db.all(sql, async (err, albums) => {
            if (err) return reject(err);

            for (const album of albums) {
                if (album.song_count > 0 && !album.cover_image && album.first_song_cover) {
                    await new Promise((res, rej) => {
                        db.run('UPDATE albums SET cover_image = ? WHERE id = ?',
                            [album.first_song_cover, album.id], (err) => {
                            if (err) return rej(err);
                            console.log(`✅ Updated cover for: ${album.title}`);
                            res();
                        });
                    });
                }
            }
            resolve();
        });
    });
}

// Run mapping
mapSongsToAlbums();
