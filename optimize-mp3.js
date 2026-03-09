// ========================================
// MP3 OPTIMIZATION SCRIPT
// Transcode remaining MP3 files to AAC
// ========================================

require('dotenv').config();
const ffmpeg = require('fluent-ffmpeg');
const AWS = require('aws-sdk');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
});

const s3 = new AWS.S3();
const db = new sqlite3.Database('./stage_music.db');

// Temp directory
const TEMP_DIR = './temp_audio_mp3';
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

// ========================================
// AUDIO TRANSCODING FUNCTION
// ========================================
async function transcodeAudio(audioUrl, songId, songTitle) {
    try {
        console.log(`\n🎵 Processing: ${songTitle} (ID: ${songId})`);
        console.log(`Original: ${audioUrl}`);

        // Download original audio
        console.log('⬇️  Downloading...');
        const response = await axios({
            url: audioUrl,
            method: 'GET',
            responseType: 'stream',
            timeout: 300000
        });

        const originalSize = parseInt(response.headers['content-length']);
        console.log(`Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

        const tempInputFile = path.join(TEMP_DIR, `input_${songId}.mp3`);
        const writer = fs.createWriteStream(tempInputFile);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log('✅ Downloaded');

        const timestamp = Date.now();
        const randomId = Math.floor(Math.random() * 1000000000);
        const baseFileName = `${timestamp}-${randomId}`;

        const versions = [];

        // 1. Standard Quality (128 kbps AAC)
        const aac128Path = path.join(TEMP_DIR, `${baseFileName}_128.m4a`);
        console.log('🔄 Transcoding to AAC 128 kbps...');
        await transcodeToAAC(tempInputFile, aac128Path, '128k');
        const size128 = fs.statSync(aac128Path).size;
        console.log(`  ✅ Standard: ${(size128 / 1024 / 1024).toFixed(2)} MB`);
        versions.push({ path: aac128Path, key: `songs/${baseFileName}_128.m4a`, bitrate: '128k', quality: 'standard' });

        // 2. High Quality (256 kbps AAC)
        const aac256Path = path.join(TEMP_DIR, `${baseFileName}_256.m4a`);
        console.log('🔄 Transcoding to AAC 256 kbps...');
        await transcodeToAAC(tempInputFile, aac256Path, '256k');
        const size256 = fs.statSync(aac256Path).size;
        console.log(`  ✅ High Quality: ${(size256 / 1024 / 1024).toFixed(2)} MB`);
        versions.push({ path: aac256Path, key: `songs/${baseFileName}_256.m4a`, bitrate: '256k', quality: 'high' });

        // Upload all versions to S3
        const uploadedUrls = {};
        for (const version of versions) {
            console.log(`📤 Uploading ${version.quality}...`);
            const fileBuffer = fs.readFileSync(version.path);

            const uploadParams = {
                Bucket: process.env.AWS_S3_BUCKET,
                Key: version.key,
                Body: fileBuffer,
                ContentType: 'audio/mp4',
                CacheControl: 'public, max-age=31536000',
                Metadata: {
                    'bitrate': version.bitrate,
                    'codec': 'aac'
                }
            };

            await s3.upload(uploadParams).promise();
            const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${version.key}`;
            uploadedUrls[version.quality] = url;

            console.log(`  ✅ Uploaded: ${version.quality}`);

            // Cleanup
            fs.unlinkSync(version.path);
        }

        // Cleanup temp input file
        fs.unlinkSync(tempInputFile);

        // Calculate savings
        const savings = ((originalSize - size128) / originalSize * 100).toFixed(1);
        console.log(`\n💾 Savings: ${savings}% (${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(size128 / 1024 / 1024).toFixed(2)} MB)`);

        return {
            urls: uploadedUrls,
            originalSize,
            optimizedSize: size128
        };

    } catch (error) {
        console.error(`❌ Error processing song ${songId}:`, error.message);
        return null;
    }
}

// ========================================
// FFMPEG TRANSCODING
// ========================================
function transcodeToAAC(inputPath, outputPath, bitrate) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioCodec('aac')
            .audioBitrate(bitrate)
            .audioChannels(2)
            .audioFrequency(44100)
            .outputOptions([
                '-movflags +faststart',
                '-profile:a aac_low'
            ])
            .on('start', (cmd) => {
                console.log(`  Running: ffmpeg ${cmd.split('ffmpeg')[1].substring(0, 50)}...`);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    process.stdout.write(`\r  Progress: ${progress.percent.toFixed(1)}%`);
                }
            })
            .on('end', () => {
                console.log('\r  Progress: 100%   ');
                resolve();
            })
            .on('error', (err) => {
                console.error('\n  FFmpeg error:', err.message);
                reject(err);
            })
            .save(outputPath);
    });
}

// ========================================
// UPDATE DATABASE
// ========================================
function updateDatabase(songId, urls, originalSize, optimizedSize) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE songs SET
            audio_file_128 = ?,
            audio_file_256 = ?,
            original_audio_size = ?,
            optimized_audio_size = ?
            WHERE id = ?`;

        db.run(sql, [
            urls.standard,
            urls.high,
            originalSize,
            optimizedSize,
            songId
        ], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// ========================================
// MAIN PROCESS
// ========================================
async function processMP3Files() {
    console.log('🚀 Starting MP3 optimization...\n');
    console.log('Target: MP3 files that are not yet optimized\n');

    // Get all songs with MP3 files that don't have audio_file_128
    db.all(`SELECT id, title, audio_file
            FROM songs
            WHERE audio_file LIKE '%.mp3'
            AND audio_file_128 IS NULL
            ORDER BY id`, async (err, songs) => {

        if (err) {
            console.error('Database error:', err);
            return;
        }

        console.log(`Found ${songs.length} MP3 files to process\n`);
        console.log('='.repeat(60));

        let processed = 0;
        let failed = 0;

        for (const song of songs) {
            const result = await transcodeAudio(song.audio_file, song.id, song.title);

            if (result) {
                await updateDatabase(song.id, result.urls, result.originalSize, result.optimizedSize);
                processed++;
                console.log(`✅ Song ${song.id} updated in database`);
            } else {
                failed++;
            }

            console.log('='.repeat(60));
            console.log(`Progress: ${processed + failed}/${songs.length} (${processed} success, ${failed} failed)`);
            console.log('='.repeat(60) + '\n');
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 MP3 OPTIMIZATION COMPLETE!');
        console.log('='.repeat(60));
        console.log(`Total MP3s: ${songs.length}`);
        console.log(`Processed: ${processed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success rate: ${((processed / songs.length) * 100).toFixed(1)}%`);

        console.log('\n✅ All MP3 files transcoded and uploaded to S3!');
        console.log('✅ Database updated with new URLs!');

        db.close();
        process.exit(0);
    });
}

// Run
processMP3Files().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
