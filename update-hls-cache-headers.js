const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const BUCKET = process.env.AWS_S3_BUCKET;
const SONG_ID = 113;

// Files to update with no-cache headers for playlists
const playlistFiles = [
    `hls/${SONG_ID}/master.m3u8`,
    `hls/${SONG_ID}/quality_64k.m3u8`,
    `hls/${SONG_ID}/quality_128k.m3u8`
];

async function updateCacheHeaders() {
    console.log('🔧 Updating cache headers for HLS playlists...\n');

    for (const file of playlistFiles) {
        try {
            // Copy object to itself with new metadata
            await s3.copyObject({
                Bucket: BUCKET,
                CopySource: `${BUCKET}/${file}`,
                Key: file,
                MetadataDirective: 'REPLACE',
                CacheControl: 'no-cache, no-store, must-revalidate',
                ContentType: 'application/vnd.apple.mpegurl',
                ACL: 'public-read'
            }).promise();

            console.log(`✅ Updated: ${file}`);
        } catch (err) {
            console.error(`❌ Error updating ${file}:`, err.message);
        }
    }

    console.log('\n🎉 Cache headers updated!');
    console.log('Clear browser cache and test again.');
}

updateCacheHeaders();
