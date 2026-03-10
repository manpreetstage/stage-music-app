require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

// S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = 'stage-music-files';
const HR2_PATH = './HR2';

console.log('🎵 SMART UPLOAD - HR2 SONGS\n');
console.log('📂 Folder:', HR2_PATH);
console.log('🗄️  Database:', DB_PATH);
console.log('☁️  S3 Bucket:', BUCKET_NAME);
console.log('\n' + '='.repeat(70) + '\n');

// Get all existing songs from database
async function getExistingSongs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT title, singer FROM songs WHERE language = ?', ['Haryanvi'], (err, rows) => {
            if (err) return reject(err);
            // Create a Set of normalized titles for fast lookup
            const existingTitles = new Set(rows.map(song =>
                `${song.title.toLowerCase().trim()}`
            ));
            console.log(`✅ Found ${rows.length} existing Haryanvi songs in database\n`);
            resolve(existingTitles);
        });
    });
}

// Upload file to S3
async function uploadToS3(filePath, s3Key) {
    try {
        const fileContent = fs.readFileSync(filePath);
        const contentType = filePath.endsWith('.wav') ? 'audio/wav' :
                          filePath.endsWith('.mp3') ? 'audio/mpeg' :
                          filePath.endsWith('.png') ? 'image/png' :
                          filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') ? 'image/jpeg' :
                          'application/octet-stream';

        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType
        }));

        return `https://${BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${s3Key}`;
    } catch (error) {
        throw new Error(`S3 upload failed: ${error.message}`);
    }
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
                // Create new album
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

// Insert song into database
async function insertSong(songData, audioUrl, coverUrl, albumId) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO songs
            (title, singer, lyrics, music_director, composer, company, language, audio_file, cover_image, album_id, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            songData.Song_Name,
            songData.Singer,
            songData.Lyrics,
            songData.Music_Director,
            songData.Composer,
            songData.Record_Label_Company,
            'Haryanvi',
            audioUrl,
            coverUrl,
            albumId,
            1 // admin user
        ], function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
        });
    });
}

// Main upload process
async function uploadNewSongs() {
    try {
        // Get existing songs
        const existingSongs = await getExistingSongs();

        // Read CSV
        const csvPath = path.join(HR2_PATH, 'Music Haryanvi STAGE  - Mix.csv');
        const songs = [];

        await new Promise((resolve, reject) => {
            let lineNumber = 0;
            fs.createReadStream(csvPath)
                .pipe(csv({
                    skipLines: 1  // Skip the "Akha" line
                }))
                .on('data', (row) => {
                    lineNumber++;
                    // Skip empty rows and ensure it's a valid song row
                    if (row.Song_Name && row.Audio_File && row.Song_Name.trim() !== '') {
                        songs.push(row);
                    }
                })
                .on('end', () => {
                    console.log(`📋 Read ${songs.length} songs from CSV (scanned ${lineNumber} rows)\n`);
                    resolve();
                })
                .on('error', reject);
        });

        let uploaded = 0;
        let skipped = 0;
        let errors = 0;

        console.log('🔍 Checking which songs are new...\n');

        for (const song of songs) {
            const normalizedTitle = song.Song_Name.toLowerCase().trim();

            // Check if song already exists
            if (existingSongs.has(normalizedTitle)) {
                console.log(`⏭️  SKIP: "${song.Song_Name}" (already exists)`);
                skipped++;
                continue;
            }

            // New song - upload it!
            try {
                console.log(`\n📤 UPLOADING: "${song.Song_Name}"`);

                // Upload audio file
                const audioPath = path.join(HR2_PATH, 'Audio_Files', song.Audio_File);
                if (!fs.existsSync(audioPath)) {
                    throw new Error(`Audio file not found: ${song.Audio_File}`);
                }

                const audioS3Key = `songs/${Date.now()}-${song.Audio_File}`;
                const audioUrl = await uploadToS3(audioPath, audioS3Key);
                console.log(`   ✅ Audio uploaded`);

                // Upload cover file
                let coverUrl = null;
                if (song.Cover_File) {
                    const coverPath = path.join(HR2_PATH, 'Cover_Files', song.Cover_File);
                    if (fs.existsSync(coverPath)) {
                        const coverS3Key = `covers/original-${song.Cover_File.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${song.Cover_File.split('.').pop()}`;
                        coverUrl = await uploadToS3(coverPath, coverS3Key);
                        console.log(`   ✅ Cover uploaded`);
                    } else {
                        console.log(`   ⚠️  Cover not found: ${song.Cover_File}`);
                    }
                }

                // Get or create album
                let albumId = null;
                if (song.Album_Name) {
                    albumId = await getOrCreateAlbum(song.Album_Name, 'Haryanvi', coverUrl);
                }

                // Insert song into database
                const songId = await insertSong(song, audioUrl, coverUrl, albumId);
                console.log(`   ✅ Song #${songId} added to database`);

                uploaded++;

            } catch (error) {
                console.error(`   ❌ ERROR: ${error.message}`);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('📊 UPLOAD SUMMARY:');
        console.log('='.repeat(70));
        console.log(`✅ Uploaded: ${uploaded} new songs`);
        console.log(`⏭️  Skipped: ${skipped} existing songs`);
        console.log(`❌ Errors: ${errors} failed uploads`);
        console.log('='.repeat(70));

        if (uploaded > 0) {
            console.log('\n✅ NEW SONGS UPLOADED SUCCESSFULLY!');
            console.log('✅ Mobile app me refresh karo to dikhenge!');
        } else {
            console.log('\n✅ All songs already uploaded - nothing new to add!');
        }

    } catch (error) {
        console.error('❌ Upload failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run the upload
uploadNewSongs();
