const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// Configuration
const BATCH_SIZE = 5; // Convert 5 songs at a time
const DELAY_BETWEEN_SONGS = 3000; // 3 seconds between each song
const DELAY_BETWEEN_BATCHES = 10000; // 10 seconds between batches

// AWS S3 Configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const BUCKET = process.env.AWS_S3_BUCKET;
const db = new sqlite3.Database('./stage_music.db');

// Statistics
const stats = {
    total: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    startTime: Date.now()
};

const failedSongs = [];
const completedSongs = [];

// ========================================
// UTILITY FUNCTIONS
// ========================================

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
        info: '\x1b[36m',    // Cyan
        success: '\x1b[32m', // Green
        error: '\x1b[31m',   // Red
        warning: '\x1b[33m', // Yellow
        reset: '\x1b[0m'
    };

    const color = colors[type] || colors.info;
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

function uploadFileToS3(localPath, s3Key, contentType) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(localPath);
        const uploadParams = {
            Bucket: BUCKET,
            Key: s3Key,
            Body: fileStream,
            ContentType: contentType,
            CacheControl: 'no-cache, no-store, must-revalidate' // Prevent caching issues
        };

        s3.upload(uploadParams, (err, data) => {
            if (err) reject(err);
            else resolve(data.Location);
        });
    });
}

async function uploadDirectoryToS3(localDir, s3Prefix) {
    const files = fs.readdirSync(localDir, { recursive: true });
    const uploadPromises = [];

    for (const file of files) {
        const localPath = path.join(localDir, file);
        const stat = fs.statSync(localPath);

        if (stat.isFile()) {
            const s3Key = `${s3Prefix}/${file}`;
            let contentType = 'application/octet-stream';

            if (file.endsWith('.m3u8')) {
                contentType = 'application/vnd.apple.mpegurl';
            } else if (file.endsWith('.ts')) {
                contentType = 'video/MP2T';
            }

            uploadPromises.push(uploadFileToS3(localPath, s3Key, contentType));
        }
    }

    return Promise.all(uploadPromises);
}

function createMasterPlaylist(outputDir, songId) {
    const baseUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/hls/${songId}/`;
    const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=64000,CODECS="mp4a.40.2"
${baseUrl}quality_64k.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=128000,CODECS="mp4a.40.2"
${baseUrl}quality_128k.m3u8
`;
    fs.writeFileSync(path.join(outputDir, 'master.m3u8'), masterContent);
}

// ========================================
// CONVERSION FUNCTION
// ========================================

async function convertSongToHLS(song) {
    const SONG_ID = song.id;
    const TEMP_DIR = path.join(__dirname, `temp_hls_${SONG_ID}`);
    const HLS_DIR = path.join(TEMP_DIR, 'hls_output');

    try {
        log(`Converting: ${song.title} by ${song.singer} (ID: ${SONG_ID})`, 'info');

        // Step 1: Create temp directories
        if (fs.existsSync(TEMP_DIR)) {
            fs.rmSync(TEMP_DIR, { recursive: true });
        }
        fs.mkdirSync(TEMP_DIR, { recursive: true });
        fs.mkdirSync(HLS_DIR, { recursive: true });
        fs.mkdirSync(path.join(HLS_DIR, 'segments_64k'), { recursive: true });
        fs.mkdirSync(path.join(HLS_DIR, 'segments_128k'), { recursive: true });

        // Step 2: Download audio file
        const audioUrl = song.audio_file_128 || song.audio_file;
        if (!audioUrl) {
            throw new Error('No audio file URL found');
        }

        const inputFile = path.join(TEMP_DIR, 'input.m4a');
        await downloadFile(audioUrl, inputFile);

        // Step 3: Convert to HLS using FFmpeg
        const baseUrl64 = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/hls/${SONG_ID}/segments_64k/`;
        const baseUrl128 = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/hls/${SONG_ID}/segments_128k/`;

        // 64kbps variant
        execSync(`ffmpeg -i "${inputFile}" \
            -c:a aac -b:a 64k -ar 44100 -ac 2 -profile:a aac_low \
            -hls_time 4 \
            -hls_playlist_type vod \
            -hls_segment_filename "${path.join(HLS_DIR, 'segments_64k', 'segment_%03d.ts')}" \
            -hls_base_url "${baseUrl64}" \
            -f hls "${path.join(HLS_DIR, 'quality_64k.m3u8')}" 2>&1`,
            { stdio: 'pipe' }
        );

        // 128kbps variant
        execSync(`ffmpeg -i "${inputFile}" \
            -c:a aac -b:a 128k -ar 44100 -ac 2 -profile:a aac_low \
            -hls_time 4 \
            -hls_playlist_type vod \
            -hls_segment_filename "${path.join(HLS_DIR, 'segments_128k', 'segment_%03d.ts')}" \
            -hls_base_url "${baseUrl128}" \
            -f hls "${path.join(HLS_DIR, 'quality_128k.m3u8')}" 2>&1`,
            { stdio: 'pipe' }
        );

        // Step 4: Create master playlist with absolute URLs
        createMasterPlaylist(HLS_DIR, SONG_ID);

        // Step 5: Upload to S3
        const s3Prefix = `hls/${SONG_ID}`;
        await uploadDirectoryToS3(HLS_DIR, s3Prefix);

        const masterUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Prefix}/master.m3u8`;

        // Step 6: Update database
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE songs SET hls_master_url = ?, has_hls = 1 WHERE id = ?',
                [masterUrl, SONG_ID],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Step 7: Cleanup
        fs.rmSync(TEMP_DIR, { recursive: true });

        log(`✅ Success: ${song.title}`, 'success');
        stats.completed++;
        completedSongs.push({ id: song.id, title: song.title });

        return { success: true, song };

    } catch (error) {
        log(`❌ Failed: ${song.title} - ${error.message}`, 'error');
        stats.failed++;
        failedSongs.push({ id: song.id, title: song.title, error: error.message });

        // Cleanup on error
        if (fs.existsSync(TEMP_DIR)) {
            fs.rmSync(TEMP_DIR, { recursive: true });
        }

        return { success: false, song, error: error.message };
    }
}

// ========================================
// BATCH PROCESSING
// ========================================

async function processBatch(songs, batchNumber) {
    log(`\n${'='.repeat(60)}`, 'info');
    log(`BATCH ${batchNumber}: Processing ${songs.length} songs`, 'info');
    log(`${'='.repeat(60)}\n`, 'info');

    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        log(`[${stats.completed + stats.failed + 1}/${stats.total}] Starting: ${song.title}`, 'info');

        await convertSongToHLS(song);

        // Progress update
        const progress = ((stats.completed + stats.failed) / stats.total * 100).toFixed(1);
        log(`Progress: ${progress}% (✅ ${stats.completed} | ❌ ${stats.failed})`, 'info');

        // Delay between songs
        if (i < songs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SONGS));
        }
    }
}

async function processAllSongs() {
    log('🚀 Starting HLS Batch Conversion', 'info');
    log('━'.repeat(60), 'info');

    // Get all songs that don't have HLS yet
    const songs = await new Promise((resolve, reject) => {
        db.all(
            `SELECT id, title, singer, audio_file, audio_file_128
             FROM songs
             WHERE has_hls = 0 AND (audio_file IS NOT NULL OR audio_file_128 IS NOT NULL)
             ORDER BY plays DESC`,
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });

    stats.total = songs.length;

    if (songs.length === 0) {
        log('✅ All songs already have HLS!', 'success');
        db.close();
        return;
    }

    log(`📊 Found ${songs.length} songs to convert`, 'info');
    log(`⚙️  Batch size: ${BATCH_SIZE} songs`, 'info');
    log(`⏱️  Delay between songs: ${DELAY_BETWEEN_SONGS}ms`, 'info');
    log(`⏱️  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`, 'info');
    log('━'.repeat(60) + '\n', 'info');

    // Process in batches
    const batches = [];
    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
        batches.push(songs.slice(i, i + BATCH_SIZE));
    }

    log(`📦 Total batches: ${batches.length}\n`, 'info');

    for (let i = 0; i < batches.length; i++) {
        await processBatch(batches[i], i + 1);

        // Delay between batches (except after last batch)
        if (i < batches.length - 1) {
            log(`\n⏸️  Waiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...\n`, 'warning');
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
    }

    // Final summary
    const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);

    log('\n' + '='.repeat(60), 'info');
    log('🎉 BATCH CONVERSION COMPLETE!', 'success');
    log('='.repeat(60), 'info');
    log(`\n📊 Final Statistics:`, 'info');
    log(`   Total Songs: ${stats.total}`, 'info');
    log(`   ✅ Completed: ${stats.completed}`, 'success');
    log(`   ❌ Failed: ${stats.failed}`, stats.failed > 0 ? 'error' : 'info');
    log(`   ⏱️  Duration: ${duration} minutes`, 'info');

    if (failedSongs.length > 0) {
        log(`\n❌ Failed Songs:`, 'error');
        failedSongs.forEach((s, i) => {
            log(`   ${i + 1}. ${s.title} (ID: ${s.id}) - ${s.error}`, 'error');
        });
    }

    // Save report
    const report = {
        timestamp: new Date().toISOString(),
        duration: `${duration} minutes`,
        stats,
        completed: completedSongs,
        failed: failedSongs
    };

    fs.writeFileSync('./hls-conversion-report.json', JSON.stringify(report, null, 2));
    log(`\n📄 Report saved: hls-conversion-report.json`, 'info');

    db.close();
}

// ========================================
// START
// ========================================

log('━'.repeat(60), 'info');
log('HLS BATCH CONVERTER - Production Ready', 'success');
log('All fixes applied: Absolute URLs + Cache Busting + Error Handling', 'info');
log('━'.repeat(60) + '\n', 'info');

processAllSongs().catch((error) => {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    db.close();
    process.exit(1);
});
