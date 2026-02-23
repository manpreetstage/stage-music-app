require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const db = new sqlite3.Database('./stage_music.db');

// Column mapping
const COLUMN_MAPPING = {
    'Sr No.': 'sr_no',
    'Song_Name': 'title',
    'Song Name': 'title',
    'Title': 'title',
    'Album_Name': 'album_name',
    'Album Name': 'album_name',
    'Cover_File': 'cover_file',
    'Cover File': 'cover_file',
    'Audio_Files': 'audio_file',
    'Audio_File': 'audio_file'
};

function normalizeRow(row) {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
        const mappedKey = COLUMN_MAPPING[key] || key.toLowerCase().replace(/\s+/g, '_');
        normalized[mappedKey] = value ? value.trim() : '';
    }
    return normalized;
}

async function uploadToS3(localPath, s3Key) {
    const fileContent = fs.readFileSync(localPath);
    const contentType = s3Key.includes('.jpg') ? 'image/jpeg' :
                        s3Key.includes('.png') ? 'image/png' : 'image/jpeg';

    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType
    };

    const result = await s3.upload(params).promise();
    return result.Location;
}

function findSongByTitle(title) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM songs WHERE LOWER(title) = LOWER(?)',
            [title],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

function updateSongCover(songId, coverUrl) {
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

function getAlbumByNameAndId(albumName, songId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT DISTINCT albums.* FROM albums
             JOIN songs ON songs.album_id = albums.id
             WHERE LOWER(albums.title) = LOWER(?)
             AND songs.id = ?`,
            [albumName, songId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

function updateAlbumCover(albumId, coverUrl) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE albums SET cover_image = ? WHERE id = ?',
            [coverUrl, albumId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

async function processCovers(csvPath, baseFolder) {
    const rows = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                const normalized = normalizeRow(row);
                rows.push(normalized);
            })
            .on('end', async () => {
                console.log(`\n📋 Found ${rows.length} rows in CSV\n`);

                let songCoverUpdates = 0;
                let albumCoverUpdates = 0;
                let notFound = 0;
                let errors = 0;

                // Track which albums we've already updated
                const updatedAlbums = new Set();

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const title = row.title || '';
                    const coverFile = row.cover_file || '';
                    const albumName = row.album_name || '';

                    if (!title || !coverFile) {
                        continue;
                    }

                    console.log(`[${i + 1}/${rows.length}] ${title}`);

                    try {
                        const song = await findSongByTitle(title);

                        if (!song) {
                            console.log(`   ❌ Song not found`);
                            notFound++;
                            continue;
                        }

                        const coverPath = path.join(baseFolder, 'Cover_File', coverFile);

                        if (!fs.existsSync(coverPath)) {
                            console.log(`   ⚠️  Cover file not found: ${coverFile}`);
                            errors++;
                            continue;
                        }

                        // Upload cover to S3
                        const s3Key = `covers/${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${coverFile}`;
                        const coverUrl = await uploadToS3(coverPath, s3Key);

                        // Update song cover
                        await updateSongCover(song.id, coverUrl);
                        console.log(`   ✅ Song cover updated`);
                        songCoverUpdates++;

                        // Update album cover if song is part of an album
                        if (albumName && song.album_id) {
                            const albumKey = `${song.album_id}-${albumName}`;

                            if (!updatedAlbums.has(albumKey)) {
                                await updateAlbumCover(song.album_id, coverUrl);
                                console.log(`   📀 Album "${albumName}" cover updated`);
                                albumCoverUpdates++;
                                updatedAlbums.add(albumKey);
                            }
                        }

                    } catch (error) {
                        console.error(`   ❌ Error: ${error.message}`);
                        errors++;
                    }

                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                console.log('\n' + '='.repeat(60));
                console.log('📊 COVER UPDATE SUMMARY');
                console.log('='.repeat(60));
                console.log(`✅ Songs Updated: ${songCoverUpdates}`);
                console.log(`📀 Albums Updated: ${albumCoverUpdates}`);
                console.log(`❌ Not Found: ${notFound}`);
                console.log(`⚠️  Errors: ${errors}`);
                console.log('='.repeat(60));

                resolve();
            })
            .on('error', reject);
    });
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('❌ Error: Please provide CSV file and base folder');
        console.log('\nUsage:');
        console.log('  node update-covers-only.js <csv-file> <base-folder>');
        console.log('\nExample:');
        console.log('  node update-covers-only.js RJ1/songs.csv RJ1');
        process.exit(1);
    }

    const csvPath = args[0];
    const baseFolder = args[1];

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ CSV file not found: ${csvPath}`);
        process.exit(1);
    }

    if (!fs.existsSync(baseFolder)) {
        console.error(`❌ Base folder not found: ${baseFolder}`);
        process.exit(1);
    }

    console.log('🖼️  UPDATE COVERS FROM CSV');
    console.log('='.repeat(60));
    console.log(`📄 CSV: ${csvPath}`);
    console.log(`📁 Folder: ${baseFolder}`);
    console.log('='.repeat(60));

    try {
        await processCovers(csvPath, baseFolder);
        console.log('\n✅ Cover update completed!\n');
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

main();
