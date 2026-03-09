// ========================================
// AUDIO OPTIMIZATION SCRIPT
// Transcode all existing WAV files to AAC
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
const TEMP_DIR = './temp_audio';
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
            timeout: 300000 // 5 minutes
        });

        const originalSize = parseInt(response.headers['content-length']);
        console.log(`Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

        const tempInputFile = path.join(TEMP_DIR, `input_${songId}.wav`);
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

        // 1. Standard Quality (128 kbps AAC) - RECOMMENDED for 95% users
        const aac128Path = path.join(TEMP_DIR, `${baseFileName}_128.m4a`);
        console.log('🔄 Transcoding to AAC 128 kbps...');
        await transcodeToAAC(tempInputFile, aac128Path, '128k');
        const size128 = fs.statSync(aac128Path).size;
        console.log(`  ✅ Standard: ${(size128 / 1024 / 1024).toFixed(2)} MB`);
        versions.push({ path: aac128Path, key: `songs/${baseFileName}_128.m4a`, bitrate: '128k', quality: 'standard' });

        // 2. High Quality (256 kbps AAC) - For audiophiles
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
                CacheControl: 'public, max-age=31536000', // Cache for 1 year
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
            .audioChannels(2) // Stereo
            .audioFrequency(44100) // 44.1 kHz
            .outputOptions([
                '-movflags +faststart', // Enable streaming (audio can start playing before full download)
                '-profile:a aac_low' // AAC-LC profile (best compatibility)
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
async function processAllAudio() {
    console.log('🚀 Starting audio optimization...\n');
    console.log('Industry Standard: AAC 128 kbps (~5 MB for 4-min song)\n');
    console.log('⚠️  This will take a while! Processing ~75 MB files...\n');

    // Add new columns if they don't exist
    db.run(`ALTER TABLE songs ADD COLUMN audio_file_128 TEXT`, () => {});
    db.run(`ALTER TABLE songs ADD COLUMN audio_file_256 TEXT`, () => {});
    db.run(`ALTER TABLE songs ADD COLUMN original_audio_size INTEGER`, () => {});
    db.run(`ALTER TABLE songs ADD COLUMN optimized_audio_size INTEGER`, () => {});

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get all songs with audio files (WAV only)
    db.all(`SELECT id, title, audio_file
            FROM songs
            WHERE audio_file IS NOT NULL
            AND (audio_file LIKE '%.wav' OR audio_file LIKE '%.WAV')
            ORDER BY id`, async (err, songs) => {

        if (err) {
            console.error('Database error:', err);
            return;
        }

        console.log(`Found ${songs.length} WAV files to process\n`);
        console.log('='.repeat(60));

        let processed = 0;
        let failed = 0;
        let totalOriginalSize = 0;
        let totalOptimizedSize = 0;

        for (const song of songs) {
            const result = await transcodeAudio(song.audio_file, song.id, song.title);

            if (result) {
                await updateDatabase(song.id, result.urls, result.originalSize, result.optimizedSize);
                processed++;
                totalOriginalSize += result.originalSize;
                totalOptimizedSize += result.optimizedSize;
                console.log(`✅ Song ${song.id} updated in database`);
            } else {
                failed++;
            }

            console.log('='.repeat(60));
            console.log(`Progress: ${processed + failed}/${songs.length} (${processed} success, ${failed} failed)`);
            console.log('='.repeat(60) + '\n');
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 AUDIO OPTIMIZATION COMPLETE!');
        console.log('='.repeat(60));
        console.log(`Total songs: ${songs.length}`);
        console.log(`Processed: ${processed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success rate: ${((processed / songs.length) * 100).toFixed(1)}%`);

        if (totalOptimizedSize > 0) {
            const savings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
            console.log(`\n💰 MASSIVE SAVINGS:`);
            console.log(`Original: ${(totalOriginalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
            console.log(`Optimized: ${(totalOptimizedSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
            console.log(`Savings: ${savings}% (${((totalOriginalSize - totalOptimizedSize) / 1024 / 1024 / 1024).toFixed(2)} GB saved!)`);
        }

        console.log('\n✅ All audio files transcoded and uploaded to S3!');
        console.log('✅ Database updated with new URLs!');
        console.log('\n⚠️  IMPORTANT: Update mobile.js to use audio_file_128 instead of audio_file');

        db.close();
        process.exit(0);
    });
}

// Check if ffmpeg is installed
ffmpeg.getAvailableFormats((err, formats) => {
    if (err) {
        console.error('❌ FFmpeg not found! Please install FFmpeg first:');
        console.error('   Ubuntu: sudo apt-get install ffmpeg');
        console.error('   Mac: brew install ffmpeg');
        process.exit(1);
    } else {
        console.log('✅ FFmpeg found, starting optimization...\n');
        processAllAudio().catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
    }
});
