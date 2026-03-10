require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const db = new sqlite3.Database('./stage_music.db');

// Configure AWS SDK v2
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
});

const s3 = new AWS.S3();

async function uploadToS3(filePath, s3Key, contentType) {
    const fileContent = fs.readFileSync(filePath);
    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType
    };

    await s3.upload(params).promise();
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
}

async function convertWavToMp3(wavPath, mp3Path) {
    console.log(`  Converting ${path.basename(wavPath)} to MP3...`);
    await execPromise(`ffmpeg -i "${wavPath}" -codec:a libmp3lame -qscale:a 2 "${mp3Path}" -y`);
}

async function getOrCreateAlbum(albumName, language) {
    return new Promise((resolve, reject) => {
        if (!albumName || albumName.trim() === '' || albumName === '-' || albumName === 'Singles') {
            resolve(null);
            return;
        }

        db.get('SELECT id FROM albums WHERE title = ?', [albumName], (err, row) => {
            if (err) {
                reject(err);
            } else if (row) {
                resolve(row.id);
            } else {
                // Create new album
                db.run(
                    'INSERT INTO albums (title, artist, language) VALUES (?, ?, ?)',
                    [albumName, 'Various Artists', language],
                    function(err) {
                        if (err) reject(err);
                        else {
                            console.log(`  ✅ Created new album: ${albumName} (${language})`);
                            resolve(this.lastID);
                        }
                    }
                );
            }
        });
    });
}

async function insertSong(songData) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO songs
            (title, singer, lyrics, music_director, composer, company, language, audio_file, cover_image, album_id, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            songData.title,
            songData.singer || '-',
            songData.lyrics || '-',
            songData.music_director || '-',
            songData.composer || '-',
            'STAGE',
            songData.language,
            songData.audio_file,
            songData.cover_image,
            songData.album_id,
            1 // admin user
        ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

async function addToRegionalHits(songId) {
    return new Promise((resolve, reject) => {
        const categoryName = 'BHOJPURI DHAMAKA';

        // Get or create category
        db.get('SELECT id FROM categories WHERE name = ?', [categoryName], (err, category) => {
            if (err) {
                reject(err);
            } else if (category) {
                // Add song to category
                db.run(
                    'INSERT OR IGNORE INTO category_songs (category_id, song_id) VALUES (?, ?)',
                    [category.id, songId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            } else {
                // Create category first
                db.run(
                    'INSERT INTO categories (name, user_id) VALUES (?, ?)',
                    [categoryName, 1],
                    function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            const catId = this.lastID;
                            db.run(
                                'INSERT INTO category_songs (category_id, song_id) VALUES (?, ?)',
                                [catId, songId],
                                (err) => {
                                    if (err) reject(err);
                                    else {
                                        console.log(`  ✅ Created category: ${categoryName}`);
                                        resolve();
                                    }
                                }
                            );
                        }
                    }
                );
            }
        });
    });
}

async function main() {
    console.log('🎵 Starting Bhojpuri Songs Upload...\n');

    const csvPath = './bhojpuri-songs.csv';
    const audioDir = './HR2/Audio_Files';
    const tempDir = './HR2/temp_mp3_bhojpuri';

    // Create temp directory for MP3 files
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const songs = [];

    // Read CSV
    await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                songs.push(row);
            })
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`📊 Found ${songs.length} Bhojpuri songs in CSV\n`);

    let uploaded = 0;
    let errors = 0;

    for (const row of songs) {
        try {
            const songName = row.Song_Name?.trim();
            const audioFile = row.Audio_File?.trim();
            const albumName = row.Album_Name?.trim();
            const language = row.Language?.trim();

            console.log(`\n📀 Processing: ${songName}`);

            // Convert WAV to MP3
            const wavPath = path.join(audioDir, audioFile);
            if (!fs.existsSync(wavPath)) {
                console.log(`  ⚠️  Audio file not found: ${audioFile}`);
                errors++;
                continue;
            }

            const mp3Filename = audioFile.replace('.wav', '.mp3');
            const mp3Path = path.join(tempDir, mp3Filename);
            await convertWavToMp3(wavPath, mp3Path);

            // Upload audio to S3
            console.log(`  ⬆️  Uploading audio to S3...`);
            const audioS3Key = `songs/${Date.now()}-${mp3Filename}`;
            const audioUrl = await uploadToS3(mp3Path, audioS3Key, 'audio/mpeg');

            // Get or create album
            const albumId = await getOrCreateAlbum(albumName, language);

            // Prepare song data
            const songData = {
                title: songName,
                language: language,
                audio_file: audioUrl,
                cover_image: null,
                album_id: albumId
            };

            // Insert song
            const songId = await insertSong(songData);
            console.log(`  ✅ Song inserted with ID: ${songId}`);

            // Add to Regional Hits
            await addToRegionalHits(songId);
            console.log(`  ✅ Added to BHOJPURI DHAMAKA`);

            // Clean up temp MP3
            fs.unlinkSync(mp3Path);

            uploaded++;

        } catch (error) {
            console.error(`  ❌ Error: ${error.message}`);
            errors++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Upload Summary:');
    console.log(`✅ Uploaded: ${uploaded}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(50));

    db.close();
}

main().catch(console.error);
