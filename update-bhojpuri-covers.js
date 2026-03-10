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

async function updateSongCover(songId, coverUrl) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE songs SET cover_image = ? WHERE id = ?',
            [coverUrl, songId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

async function updateAlbumCover(albumTitle, coverUrl) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE albums SET cover_image = ? WHERE title = ?',
            [coverUrl, albumTitle],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

async function getSongsByAlbum(albumTitle) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT s.id FROM songs s INNER JOIN albums a ON s.album_id = a.id WHERE a.title = ?',
            [albumTitle],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

async function getSongsWithoutAlbum(language) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT id, title FROM songs WHERE language = ? AND album_id IS NULL',
            [language],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

async function main() {
    console.log('🎨 Updating Bhojpuri Song Covers...\n');

    const coverDir = './HR2/Cover_Files';

    // Album to cover mapping
    const albumCovers = {
        'Naache Dulha Gali Gali': 'Cover16.jpg',
        'Saas Gaari Deve': 'Cover17.jpg',
        'Jholachhap Dr': 'Cover18.jpg',
        'Laadli Chhathi Mai Ke': 'Cover19.jpg',
        'Punarjanm - Janm ke Phera': 'Cover20.jpg'
    };

    let updated = 0;

    for (const [albumTitle, coverFile] of Object.entries(albumCovers)) {
        try {
            console.log(`\n📀 Processing album: ${albumTitle}`);

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

            // Update album cover
            await updateAlbumCover(albumTitle, coverUrl);
            console.log(`  ✅ Album cover updated`);

            // Get all songs in this album
            const songs = await getSongsByAlbum(albumTitle);
            console.log(`  📝 Updating ${songs.length} songs...`);

            // Update each song's cover
            for (const song of songs) {
                await updateSongCover(song.id, coverUrl);
                updated++;
            }

            console.log(`  ✅ All songs updated with cover`);

        } catch (error) {
            console.error(`  ❌ Error: ${error.message}`);
        }
    }

    // Update singles without albums
    try {
        console.log(`\n📀 Processing singles without albums...`);

        const coverPath = path.join(coverDir, 'Cover21.jpg');
        if (fs.existsSync(coverPath)) {
            console.log(`  ⬆️  Uploading Cover21.jpg to S3...`);
            const coverS3Key = `covers/${Date.now()}-Cover21.jpg`;
            const coverUrl = await uploadToS3(coverPath, coverS3Key, 'image/jpeg');

            const singles = await getSongsWithoutAlbum('Bhojpuri');
            console.log(`  📝 Updating ${singles.length} singles...`);

            for (const song of singles) {
                await updateSongCover(song.id, coverUrl);
                updated++;
                console.log(`  ✅ Updated: ${song.title}`);
            }
        }
    } catch (error) {
        console.error(`  ❌ Error updating singles: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Total songs updated: ${updated}`);
    console.log('='.repeat(50));

    db.close();
}

main().catch(console.error);
