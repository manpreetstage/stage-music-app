const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');
const csv = require('csv-parser');
require('dotenv').config();

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'stage-music-files';
const RJ1_PATH = '/Users/manpreetsingh/Thinking/stage-music-app/RJ1';
const CSV_FILE = path.join(RJ1_PATH, 'Music Haryanvi STAGE  - RJ1.csv');
const AUDIO_PATH = path.join(RJ1_PATH, 'Audio_file');
const COVER_PATH = path.join(RJ1_PATH, 'Cover_File');

// Database connection
const db = new sqlite3.Database('stage_music.db');

// Upload file to S3
async function uploadToS3(filePath, fileName, folder) {
    const fileContent = fs.readFileSync(filePath);
    const fileExtension = path.extname(fileName);
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000000);
    const s3Key = `${folder}/${timestamp}-${randomNum}${fileExtension}`;

    const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: folder === 'songs' ? `audio/${fileExtension.slice(1)}` : `image/${fileExtension.slice(1)}`
    };

    console.log(`📤 Uploading ${fileName} to S3...`);

    try {
        await s3.upload(params).promise();
        const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;
        console.log(`✅ Uploaded: ${url}`);
        return url;
    } catch (error) {
        console.error(`❌ Error uploading ${fileName}:`, error.message);
        throw error;
    }
}

// Update or insert song in database
function updateSong(songData) {
    return new Promise((resolve, reject) => {
        const { title, audioUrl, coverUrl, language } = songData;

        // First, check if song with this title and language exists
        db.get(
            'SELECT id FROM songs WHERE title = ? AND language = ?',
            [title, language],
            (err, row) => {
                if (err) {
                    return reject(err);
                }

                if (row) {
                    // Update existing song
                    console.log(`🔄 Updating song: ${title}`);
                    db.run(
                        `UPDATE songs SET
                            audio_file = ?,
                            cover_image = ?
                        WHERE id = ?`,
                        [audioUrl, coverUrl, row.id],
                        function(updateErr) {
                            if (updateErr) return reject(updateErr);
                            console.log(`✅ Updated song ID ${row.id}: ${title}`);
                            resolve(row.id);
                        }
                    );
                } else {
                    // Insert new song
                    console.log(`➕ Inserting new song: ${title}`);
                    db.run(
                        `INSERT INTO songs (title, audio_file, cover_image, language, singer, plays)
                        VALUES (?, ?, ?, ?, ?, 0)`,
                        [title, audioUrl, coverUrl, language, 'Unknown'],
                        function(insertErr) {
                            if (insertErr) return reject(insertErr);
                            const songId = this.lastID;
                            console.log(`✅ Inserted song ID ${songId}: ${title}`);

                            // Add to Rajasthani category (ID = 10)
                            db.run(
                                'INSERT OR IGNORE INTO category_songs (category_id, song_id) VALUES (10, ?)',
                                [songId],
                                (catErr) => {
                                    if (catErr) console.error('Error adding to category:', catErr);
                                    resolve(songId);
                                }
                            );
                        }
                    );
                }
            }
        );
    });
}

// Main function
async function main() {
    console.log('🎵 Starting Rajasthani songs update...\n');

    const songs = [];

    // Read CSV
    fs.createReadStream(CSV_FILE)
        .pipe(csv())
        .on('data', (row) => {
            songs.push({
                srNo: row['Sr No.'],
                title: row['Song_Name'],
                album: row['Album_Name'],
                audioFile: row['Audio_Files'],
                coverFile: row['Cover_File'],
                language: row['Langauage'] || 'Rajasthani'
            });
        })
        .on('end', async () => {
            console.log(`📋 Found ${songs.length} songs in CSV\n`);

            for (const song of songs) {
                try {
                    console.log(`\n--- Processing: ${song.title} ---`);

                    // Upload audio file
                    const audioFilePath = path.join(AUDIO_PATH, song.audioFile);
                    if (!fs.existsSync(audioFilePath)) {
                        console.log(`⚠️  Audio file not found: ${song.audioFile}`);
                        continue;
                    }
                    const audioUrl = await uploadToS3(audioFilePath, song.audioFile, 'songs');

                    // Upload cover file
                    let coverUrl = '';
                    const coverFilePath = path.join(COVER_PATH, song.coverFile);
                    if (fs.existsSync(coverFilePath)) {
                        coverUrl = await uploadToS3(coverFilePath, song.coverFile, 'covers');
                    } else {
                        console.log(`⚠️  Cover file not found: ${song.coverFile}`);
                    }

                    // Update database
                    await updateSong({
                        title: song.title,
                        audioUrl,
                        coverUrl,
                        language: song.language
                    });

                } catch (error) {
                    console.error(`❌ Error processing ${song.title}:`, error.message);
                }
            }

            console.log('\n✅ All songs processed!');
            db.close();
        });
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
