#!/usr/bin/env node

/**
 * Stage Music - Bulk Upload Script
 * Upload 200-250 songs in one go to S3 and database
 *
 * Usage:
 *   1. Prepare CSV file with song details
 *   2. Put all audio files in ./bulk-songs/ folder
 *   3. Put all cover images in ./bulk-covers/ folder (optional)
 *   4. Run: node bulk-upload.js songs.csv
 */

require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const db = new sqlite3.Database('./stage_music.db');

// Configuration
const AUDIO_FOLDER = './bulk-songs/';
const COVER_FOLDER = './bulk-covers/';
const BATCH_SIZE = 5; // Upload 5 songs at a time
const DEFAULT_COVER = null; // Use default cover if not found

// Statistics
const stats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    startTime: Date.now()
};

const failedSongs = [];

/**
 * Upload file to S3
 */
async function uploadToS3(localPath, s3Key, contentType) {
    try {
        const fileContent = fs.readFileSync(localPath);

        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType
        };

        const result = await s3.upload(params).promise();
        return result.Location;
    } catch (error) {
        throw new Error(`S3 upload failed: ${error.message}`);
    }
}

/**
 * Get content type from file extension
 */
function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const types = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
        '.ogg': 'audio/ogg',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    };
    return types[ext] || 'application/octet-stream';
}

/**
 * Find audio file (case-insensitive)
 */
function findAudioFile(filename) {
    const files = fs.readdirSync(AUDIO_FOLDER);
    const match = files.find(f => f.toLowerCase() === filename.toLowerCase());
    return match ? path.join(AUDIO_FOLDER, match) : null;
}

/**
 * Find cover file (case-insensitive)
 */
function findCoverFile(filename) {
    if (!fs.existsSync(COVER_FOLDER)) return null;

    const files = fs.readdirSync(COVER_FOLDER);
    const match = files.find(f => f.toLowerCase() === filename.toLowerCase());
    return match ? path.join(COVER_FOLDER, match) : null;
}

/**
 * Upload single song
 */
async function uploadSong(songData, index) {
    const {
        title,
        singer,
        audio_file,
        cover_file,
        music_director,
        composer,
        company,
        lyricist,
        language
    } = songData;

    try {
        console.log(`\n[${index + 1}/${stats.total}] Processing: ${title} - ${singer}`);

        // Check if audio file exists
        const audioPath = findAudioFile(audio_file);
        if (!audioPath) {
            throw new Error(`Audio file not found: ${audio_file}`);
        }

        console.log(`   📤 Uploading audio: ${audio_file}`);

        // Generate unique S3 key
        const timestamp = Date.now();
        const audioExt = path.extname(audio_file);
        const audioS3Key = `songs/${timestamp}-${Math.round(Math.random() * 1E9)}${audioExt}`;

        // Upload audio to S3
        const audioUrl = await uploadToS3(
            audioPath,
            audioS3Key,
            getContentType(audio_file)
        );
        console.log(`   ✅ Audio uploaded: ${audioUrl}`);

        // Upload cover if provided
        let coverUrl = DEFAULT_COVER;
        if (cover_file) {
            const coverPath = findCoverFile(cover_file);
            if (coverPath) {
                console.log(`   📤 Uploading cover: ${cover_file}`);
                const coverExt = path.extname(cover_file);
                const coverS3Key = `covers/${timestamp}-${Math.round(Math.random() * 1E9)}${coverExt}`;

                coverUrl = await uploadToS3(
                    coverPath,
                    coverS3Key,
                    getContentType(cover_file)
                );
                console.log(`   ✅ Cover uploaded: ${coverUrl}`);
            } else {
                console.log(`   ⚠️  Cover file not found: ${cover_file}, using default`);
            }
        }

        // Insert into database
        const sql = `INSERT INTO songs (
            title, singer, music_director, composer, company, lyrics,
            audio_file, cover_image, language
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await new Promise((resolve, reject) => {
            db.run(sql, [
                title,
                singer,
                music_director || '',
                composer || '',
                company || '',
                lyricist || '',
                audioUrl,
                coverUrl,
                language || 'Hindi'
            ], function(err) {
                if (err) reject(err);
                else {
                    console.log(`   💾 Database updated (ID: ${this.lastID})`);
                    resolve();
                }
            });
        });

        stats.success++;
        return { success: true, title, singer };

    } catch (error) {
        stats.failed++;
        failedSongs.push({ title, singer, error: error.message });
        console.error(`   ❌ Error: ${error.message}`);
        return { success: false, title, singer, error: error.message };
    }
}

/**
 * Upload songs in batches
 */
async function uploadBatch(songs, startIndex) {
    const batch = songs.slice(startIndex, startIndex + BATCH_SIZE);
    const promises = batch.map((song, i) => uploadSong(song, startIndex + i));
    return await Promise.all(promises);
}

/**
 * Parse CSV file
 */
async function parseCSV(csvPath) {
    return new Promise((resolve, reject) => {
        const songs = [];
        const fileStream = fs.createReadStream(csvPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let isFirstLine = true;
        let headers = [];

        rl.on('line', (line) => {
            if (isFirstLine) {
                // Parse headers
                headers = line.split(',').map(h => h.trim());
                isFirstLine = false;
            } else if (line.trim()) {
                // Parse data row
                const values = line.split(',').map(v => v.trim());
                const song = {};
                headers.forEach((header, i) => {
                    song[header] = values[i] || '';
                });
                songs.push(song);
            }
        });

        rl.on('close', () => resolve(songs));
        rl.on('error', reject);
    });
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('   🎵 Stage Music - Bulk Upload Script 🎵');
        console.log('='.repeat(70) + '\n');

        // Check command line arguments
        const csvFile = process.argv[2];
        if (!csvFile) {
            console.error('❌ Error: CSV file not provided');
            console.log('\nUsage:');
            console.log('  node bulk-upload.js songs.csv');
            console.log('\nCSV Format:');
            console.log('  title,singer,audio_file,cover_file,music_director,composer,lyricist,company,language');
            console.log('  Nidiya,Vishal Mishra,nidiya.mp3,nidiya.jpg,Pritam,Pritam,Irshad Kamil,Sony Music,Hindi');
            process.exit(1);
        }

        // Check if CSV file exists
        if (!fs.existsSync(csvFile)) {
            console.error(`❌ Error: CSV file not found: ${csvFile}`);
            process.exit(1);
        }

        // Check folders
        if (!fs.existsSync(AUDIO_FOLDER)) {
            console.error(`❌ Error: Audio folder not found: ${AUDIO_FOLDER}`);
            console.log('   Create folder: mkdir bulk-songs');
            process.exit(1);
        }

        // Verify S3 connection
        console.log('🔍 Verifying S3 connection...');
        await s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET }).promise();
        console.log('✅ S3 bucket accessible: ' + process.env.AWS_S3_BUCKET + '\n');

        // Parse CSV
        console.log('📄 Reading CSV file: ' + csvFile);
        const songs = await parseCSV(csvFile);
        stats.total = songs.length;
        console.log(`✅ Found ${songs.length} songs to upload\n`);

        if (songs.length === 0) {
            console.error('❌ No songs found in CSV file');
            process.exit(1);
        }

        // Show sample
        console.log('📝 Sample song:');
        console.log('   Title:', songs[0].title);
        console.log('   Singer:', songs[0].singer);
        console.log('   Audio:', songs[0].audio_file);
        console.log('   Cover:', songs[0].cover_file || '(none)');
        console.log('');

        // Confirm
        console.log('⚠️  Ready to upload ' + songs.length + ' songs to S3 and database');
        console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Upload in batches
        console.log('🚀 Starting bulk upload...\n');
        console.log('='.repeat(70));

        for (let i = 0; i < songs.length; i += BATCH_SIZE) {
            await uploadBatch(songs, i);

            // Progress
            const completed = Math.min(i + BATCH_SIZE, songs.length);
            const percentage = ((completed / songs.length) * 100).toFixed(1);
            console.log(`\n📊 Progress: ${completed}/${songs.length} (${percentage}%)`);
        }

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 Upload Summary:');
        console.log('='.repeat(70));
        console.log(`✅ Success: ${stats.success} songs`);
        console.log(`❌ Failed: ${stats.failed} songs`);
        console.log(`⏭️  Skipped: ${stats.skipped} songs`);
        console.log(`⏱️  Time taken: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);
        console.log('='.repeat(70));

        // Failed songs
        if (failedSongs.length > 0) {
            console.log('\n❌ Failed Songs:');
            failedSongs.forEach((song, i) => {
                console.log(`   ${i + 1}. ${song.title} - ${song.singer}`);
                console.log(`      Error: ${song.error}`);
            });

            // Save failed songs to file
            const failedFile = 'failed-songs.json';
            fs.writeFileSync(failedFile, JSON.stringify(failedSongs, null, 2));
            console.log(`\n💾 Failed songs saved to: ${failedFile}`);
        }

        console.log('\n✅ Bulk upload complete!\n');
        db.close();

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        db.close();
        process.exit(1);
    }
}

// Run
main();
