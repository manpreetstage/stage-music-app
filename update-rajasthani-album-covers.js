require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

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

async function updateAlbumAndSongs(albumTitle, coverUrl) {
    return new Promise((resolve, reject) => {
        // Update album cover
        db.run(
            'UPDATE albums SET cover_image = ? WHERE title = ?',
            [coverUrl, albumTitle],
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    // Update all songs in this album
                    db.run(
                        `UPDATE songs SET cover_image = ?
                         WHERE album_id = (SELECT id FROM albums WHERE title = ?)`,
                        [coverUrl, albumTitle],
                        function(err) {
                            if (err) reject(err);
                            else resolve(this.changes);
                        }
                    );
                }
            }
        );
    });
}

async function main() {
    console.log('🎨 Updating Rajasthani Album Covers...\n');

    const coverDir = './HR2/Cover_Files';

    const albumCovers = {
        'Kathputliyaan': 'Cover4.jpg',
        'Aao Gaaon Chaala': 'Cover14.jpg'
    };

    for (const [albumTitle, coverFile] of Object.entries(albumCovers)) {
        try {
            console.log(`\n📀 Processing: ${albumTitle}`);

            const coverPath = path.join(coverDir, coverFile);
            if (!fs.existsSync(coverPath)) {
                console.log(`  ⚠️  Cover not found: ${coverFile}`);
                continue;
            }

            // Upload cover to S3
            console.log(`  ⬆️  Uploading ${coverFile} to S3...`);
            const coverExt = path.extname(coverFile);
            const coverS3Key = `covers/${Date.now()}-${coverFile}`;
            const contentType = coverExt === '.png' ? 'image/png' : 'image/jpeg';
            const coverUrl = await uploadToS3(coverPath, coverS3Key, contentType);

            // Update album and all its songs
            const songsUpdated = await updateAlbumAndSongs(albumTitle, coverUrl);
            console.log(`  ✅ Album cover updated`);
            console.log(`  ✅ ${songsUpdated} songs updated with cover`);

        } catch (error) {
            console.error(`  ❌ Error: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Rajasthani album covers updated!');
    console.log('='.repeat(50));

    db.close();
}

main().catch(console.error);
