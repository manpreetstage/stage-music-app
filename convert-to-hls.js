const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// Configuration
const SONG_ID = 113; // Test with "Do Lugai"
const TEMP_DIR = path.join(__dirname, 'temp_hls');
const HLS_DIR = path.join(TEMP_DIR, 'hls_output');

// AWS S3 Configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const BUCKET = process.env.AWS_S3_BUCKET;

// Database
const db = new sqlite3.Database('./stage_music.db');

// ========================================
// UTILITY FUNCTIONS
// ========================================

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
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
            CacheControl: 'public, max-age=31536000'
        };

        s3.upload(uploadParams, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data.Location);
            }
        });
    });
}

function createMasterPlaylist(outputDir, songId, bucket, region) {
    const baseUrl = `https://${bucket}.s3.${region}.amazonaws.com/hls/${songId}/`;
    const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=64000,CODECS="mp4a.40.2"
${baseUrl}quality_64k.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=128000,CODECS="mp4a.40.2"
${baseUrl}quality_128k.m3u8
`;
    fs.writeFileSync(path.join(outputDir, 'master.m3u8'), masterContent);
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

// ========================================
// MAIN CONVERSION LOGIC
// ========================================

async function convertToHLS() {
    console.log('🚀 Starting HLS conversion for Song ID:', SONG_ID);
    console.log('');

    // Step 1: Get song info from database
    const song = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM songs WHERE id = ?', [SONG_ID], (err, row) => {
            if (err) reject(err);
            else if (!row) reject(new Error('Song not found'));
            else resolve(row);
        });
    });

    console.log('📀 Song:', song.title, 'by', song.singer);
    console.log('');

    // Step 2: Create temp directories
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true });
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.mkdirSync(HLS_DIR, { recursive: true });
    fs.mkdirSync(path.join(HLS_DIR, 'segments_64k'), { recursive: true });
    fs.mkdirSync(path.join(HLS_DIR, 'segments_128k'), { recursive: true });

    // Step 3: Download audio file
    console.log('📥 Downloading audio file...');
    const audioUrl = song.audio_file_128 || song.audio_file;
    const inputFile = path.join(TEMP_DIR, 'input.m4a');
    await downloadFile(audioUrl, inputFile);
    console.log('✅ Download complete');
    console.log('');

    // Step 4: Convert to HLS using FFmpeg
    console.log('🎵 Converting to HLS format...');

    try {
        // Generate 64kbps variant
        console.log('  📊 Generating 64kbps variant...');
        const baseUrl64 = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/hls/${SONG_ID}/segments_64k/`;
        execSync(`ffmpeg -i "${inputFile}" \
            -c:a aac -b:a 64k -ar 44100 -ac 2 -profile:a aac_low \
            -hls_time 4 \
            -hls_playlist_type vod \
            -hls_segment_filename "${path.join(HLS_DIR, 'segments_64k', 'segment_%03d.ts')}" \
            -hls_base_url "${baseUrl64}" \
            -f hls "${path.join(HLS_DIR, 'quality_64k.m3u8')}"`,
            { stdio: 'inherit' }
        );

        // Generate 128kbps variant
        console.log('  📊 Generating 128kbps variant...');
        const baseUrl128 = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/hls/${SONG_ID}/segments_128k/`;
        execSync(`ffmpeg -i "${inputFile}" \
            -c:a aac -b:a 128k -ar 44100 -ac 2 -profile:a aac_low \
            -hls_time 4 \
            -hls_playlist_type vod \
            -hls_segment_filename "${path.join(HLS_DIR, 'segments_128k', 'segment_%03d.ts')}" \
            -hls_base_url "${baseUrl128}" \
            -f hls "${path.join(HLS_DIR, 'quality_128k.m3u8')}"`,
            { stdio: 'inherit' }
        );

        console.log('✅ HLS conversion complete!');
        console.log('');
    } catch (error) {
        console.error('❌ FFmpeg conversion failed:', error.message);
        throw error;
    }

    // Step 5: Create master playlist
    createMasterPlaylist(HLS_DIR, SONG_ID, BUCKET, process.env.AWS_REGION);

    // Step 6: Upload to S3
    console.log('☁️  Uploading to S3...');
    const s3Prefix = `hls/${SONG_ID}`;
    await uploadDirectoryToS3(HLS_DIR, s3Prefix);

    const masterUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Prefix}/master.m3u8`;
    console.log('✅ Upload complete!');
    console.log('📍 Master URL:', masterUrl);
    console.log('');

    // Step 7: Update database
    console.log('💾 Updating database...');
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
    console.log('✅ Database updated!');
    console.log('');

    // Step 8: Cleanup
    console.log('🧹 Cleaning up temporary files...');
    fs.rmSync(TEMP_DIR, { recursive: true });
    console.log('✅ Cleanup complete!');
    console.log('');

    // Close database
    db.close();

    console.log('🎉 SUCCESS! HLS conversion complete!');
    console.log('');
    console.log('📊 Summary:');
    console.log('  Song ID:', SONG_ID);
    console.log('  Song Title:', song.title);
    console.log('  Master Playlist:', masterUrl);
    console.log('  Quality Levels: 64kbps, 128kbps');
    console.log('  Segment Duration: 4 seconds');
}

// Run the conversion
convertToHLS().catch((error) => {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
});
