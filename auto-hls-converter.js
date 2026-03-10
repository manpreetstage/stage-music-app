// ========================================
// AUTOMATIC HLS CONVERTER
// Runs in background, auto-converts new songs
// ========================================

const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// ========================================
// CONFIGURATION
// ========================================

const CHECK_INTERVAL = 60000; // Check every 60 seconds (1 minute)
const CONVERSION_DELAY = 5000; // Wait 5 seconds between conversions
const MAX_RETRIES = 3; // Retry failed conversions 3 times

// AWS S3 Configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const BUCKET = process.env.AWS_S3_BUCKET;
const db = new sqlite3.Database('./stage_music.db');

// ========================================
// LOGGING
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

// ========================================
// UTILITY FUNCTIONS
// ========================================

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
            CacheControl: 'no-cache, no-store, must-revalidate'
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
// HLS CONVERSION
// ========================================

async function convertSongToHLS(song) {
    const SONG_ID = song.id;
    const TEMP_DIR = path.join(__dirname, `temp_hls_${SONG_ID}`);
    const HLS_DIR = path.join(TEMP_DIR, 'hls_output');

    try {
        log(`Starting conversion: ${song.title} (ID: ${SONG_ID})`, 'info');

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

        log(`Downloading: ${audioUrl}`, 'info');
        const inputFile = path.join(TEMP_DIR, 'input.m4a');
        await downloadFile(audioUrl, inputFile);

        // Step 3: Convert to HLS using FFmpeg
        log('Converting to HLS (64kbps)...', 'info');
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

        log('Converting to HLS (128kbps)...', 'info');
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

        // Step 4: Create master playlist
        log('Creating master playlist...', 'info');
        createMasterPlaylist(HLS_DIR, SONG_ID);

        // Step 5: Upload to S3
        log('Uploading to S3...', 'info');
        const s3Prefix = `hls/${SONG_ID}`;
        await uploadDirectoryToS3(HLS_DIR, s3Prefix);

        const masterUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Prefix}/master.m3u8`;

        // Step 6: Update database
        log('Updating database...', 'info');
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
        return { success: true, song };

    } catch (error) {
        log(`❌ Failed: ${song.title} - ${error.message}`, 'error');

        // Cleanup on error
        if (fs.existsSync(TEMP_DIR)) {
            fs.rmSync(TEMP_DIR, { recursive: true });
        }

        return { success: false, song, error: error.message };
    }
}

// ========================================
// AUTO-CONVERTER SERVICE
// ========================================

class AutoHLSConverter {
    constructor() {
        this.isRunning = false;
        this.isConverting = false;
        this.stats = {
            totalConverted: 0,
            totalFailed: 0,
            startTime: Date.now()
        };
    }

    async checkForNewSongs() {
        if (this.isConverting) {
            log('Conversion in progress, skipping check...', 'warning');
            return;
        }

        return new Promise((resolve, reject) => {
            db.get(
                `SELECT id, title, singer, audio_file, audio_file_128
                 FROM songs
                 WHERE has_hls = 0
                 AND (audio_file IS NOT NULL OR audio_file_128 IS NOT NULL)
                 ORDER BY created_at DESC
                 LIMIT 1`,
                async (err, song) => {
                    if (err) {
                        log(`Database error: ${err.message}`, 'error');
                        reject(err);
                        return;
                    }

                    if (!song) {
                        // No songs to convert
                        resolve(null);
                        return;
                    }

                    log(`Found new song: ${song.title} by ${song.singer}`, 'info');
                    this.isConverting = true;

                    try {
                        const result = await convertSongToHLS(song);

                        if (result.success) {
                            this.stats.totalConverted++;
                        } else {
                            this.stats.totalFailed++;
                        }

                        // Wait before next conversion
                        await new Promise(r => setTimeout(r, CONVERSION_DELAY));

                    } catch (error) {
                        log(`Conversion error: ${error.message}`, 'error');
                        this.stats.totalFailed++;
                    } finally {
                        this.isConverting = false;
                    }

                    resolve(song);
                }
            );
        });
    }

    async start() {
        if (this.isRunning) {
            log('Auto-converter already running', 'warning');
            return;
        }

        this.isRunning = true;
        this.stats.startTime = Date.now();

        log('═══════════════════════════════════════', 'success');
        log('🚀 AUTO HLS CONVERTER STARTED', 'success');
        log('═══════════════════════════════════════', 'success');
        log(`Check interval: ${CHECK_INTERVAL / 1000} seconds`, 'info');
        log(`Conversion delay: ${CONVERSION_DELAY / 1000} seconds`, 'info');
        log('Watching for new songs...', 'info');
        log('', 'info');

        // Initial check
        await this.checkForNewSongs();

        // Set up interval
        this.interval = setInterval(async () => {
            log('Checking for new songs...', 'info');
            await this.checkForNewSongs();
        }, CHECK_INTERVAL);

        // Log stats every 10 minutes
        this.statsInterval = setInterval(() => {
            this.logStats();
        }, 600000); // 10 minutes
    }

    stop() {
        if (!this.isRunning) {
            log('Auto-converter not running', 'warning');
            return;
        }

        this.isRunning = false;
        clearInterval(this.interval);
        clearInterval(this.statsInterval);

        log('═══════════════════════════════════════', 'warning');
        log('⏸️  AUTO HLS CONVERTER STOPPED', 'warning');
        log('═══════════════════════════════════════', 'warning');
        this.logStats();
    }

    logStats() {
        const runtime = Math.floor((Date.now() - this.stats.startTime) / 1000 / 60);
        log('', 'info');
        log('📊 STATS:', 'info');
        log(`   Runtime: ${runtime} minutes`, 'info');
        log(`   ✅ Converted: ${this.stats.totalConverted}`, 'success');
        log(`   ❌ Failed: ${this.stats.totalFailed}`, 'error');
        log('', 'info');
    }
}

// ========================================
// START SERVICE
// ========================================

const converter = new AutoHLSConverter();

// Handle graceful shutdown
process.on('SIGINT', () => {
    log('', 'warning');
    log('Received SIGINT, shutting down...', 'warning');
    converter.stop();
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('', 'warning');
    log('Received SIGTERM, shutting down...', 'warning');
    converter.stop();
    db.close();
    process.exit(0);
});

// Start the converter
converter.start();

// Expose for debugging
global.converter = converter;

log('💡 To stop: Press Ctrl+C', 'info');
log('', 'info');
