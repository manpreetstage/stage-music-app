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

    console.log(`📤 Uploading ${fileName}...`);

    try {
        await s3.upload(params).promise();
        const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;
        return url;
    } catch (error) {
        console.error(`❌ Error uploading ${fileName}:`, error.message);
        throw error;
    }
}

// Insert song in database
function insertSong(songData) {
    return new Promise((resolve, reject) => {
        const { title, audioUrl, coverUrl, language, singer, album } = songData;

        console.log(`➕ Inserting: ${title}`);

        db.run(
            `INSERT INTO songs (title, audio_file, cover_image, language, singer, plays)
            VALUES (?, ?, ?, ?, ?, 0)`,
            [title, audioUrl, coverUrl, language, singer || 'STAGE'],
            function(insertErr) {
                if (insertErr) {
                    console.error(`❌ Error inserting ${title}:`, insertErr.message);
                    return reject(insertErr);
                }

                const songId = this.lastID;
                console.log(`✅ Inserted song ID ${songId}: ${title}`);

                // Add to Rajasthani category (ID = 10)
                db.run(
                    'INSERT INTO category_songs (category_id, song_id) VALUES (10, ?)',
                    [songId],
                    (catErr) => {
                        if (catErr) {
                            console.error('❌ Error adding to category:', catErr.message);
                            return reject(catErr);
                        }
                        console.log(`✅ Added to Rajasthani category`);
                        resolve(songId);
                    }
                );
            }
        );
    });
}

// Main function
async function main() {
    console.log('🎵 Starting FRESH Rajasthani songs upload...\n');

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
                singer: row['Singer'] || 'STAGE',
                language: row['Langauage'] || 'Rajasthani'
            });
        })
        .on('end', async () => {
            console.log(`📋 Found ${songs.length} songs in CSV\n`);

            let successCount = 0;
            let errorCount = 0;

            for (const song of songs) {
                try {
                    console.log(`\n--- [${song.srNo}/36] ${song.title} ---`);

                    // Check if audio file exists
                    const audioFilePath = path.join(AUDIO_PATH, song.audioFile);
                    if (!fs.existsSync(audioFilePath)) {
                        console.log(`⚠️  Audio file not found: ${song.audioFile}`);
                        errorCount++;
                        continue;
                    }

                    // Upload audio file
                    const audioUrl = await uploadToS3(audioFilePath, song.audioFile, 'songs');

                    // Upload cover file (optional)
                    let coverUrl = '';
                    const coverFilePath = path.join(COVER_PATH, song.coverFile);
                    if (fs.existsSync(coverFilePath)) {
                        coverUrl = await uploadToS3(coverFilePath, song.coverFile, 'covers');
                    } else {
                        console.log(`⚠️  Cover file not found: ${song.coverFile} (will skip)`);
                    }

                    // Insert into database
                    await insertSong({
                        title: song.title,
                        audioUrl,
                        coverUrl,
                        language: song.language,
                        singer: song.singer,
                        album: song.album
                    });

                    successCount++;

                } catch (error) {
                    console.error(`❌ FAILED: ${song.title} - ${error.message}`);
                    errorCount++;
                }
            }

            console.log('\n' + '='.repeat(50));
            console.log('📊 UPLOAD COMPLETE!');
            console.log('='.repeat(50));
            console.log(`✅ Success: ${successCount} songs`);
            console.log(`❌ Failed: ${errorCount} songs`);
            console.log('='.repeat(50));

            db.close();
        });
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
