require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const db = new sqlite3.Database('./stage_music.db');

async function uploadFileToS3(localPath, s3Key) {
    if (!fs.existsSync(localPath)) {
        console.log(`⚠️  File not found: ${localPath}`);
        return null;
    }

    const fileContent = fs.readFileSync(localPath);
    const ext = path.extname(localPath).toLowerCase();

    const contentTypeMap = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp'
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType
    };

    try {
        const result = await s3.upload(params).promise();
        return result.Location;
    } catch (error) {
        console.error(`❌ Upload failed: ${error.message}`);
        return null;
    }
}

async function migrateRemainingSongs() {
    return new Promise((resolve, reject) => {
        db.all("SELECT id, title, audio_file, cover_image FROM songs WHERE audio_file LIKE '/uploads/%'",
            async (err, rows) => {
                if (err) return reject(err);

                if (rows.length === 0) {
                    console.log('✅ All songs already migrated to S3!');
                    resolve();
                    return;
                }

                console.log(`\n🚀 Migrating ${rows.length} remaining song(s) to S3...\n`);

                for (const song of rows) {
                    try {
                        console.log(`📝 Processing: ${song.title} (ID: ${song.id})`);

                        // Migrate audio file
                        if (song.audio_file && song.audio_file.startsWith('/uploads/')) {
                            const localAudioPath = '.' + song.audio_file; // ./uploads/...
                            const s3AudioKey = song.audio_file.replace('/uploads/', '');

                            console.log(`   📤 Uploading audio: ${path.basename(localAudioPath)}`);
                            const audioUrl = await uploadFileToS3(localAudioPath, s3AudioKey);

                            if (audioUrl) {
                                await new Promise((res, rej) => {
                                    db.run('UPDATE songs SET audio_file = ? WHERE id = ?',
                                        [audioUrl, song.id],
                                        (err) => err ? rej(err) : res());
                                });
                                console.log(`   ✅ Audio uploaded: ${audioUrl}`);
                            }
                        }

                        // Migrate cover image
                        if (song.cover_image && song.cover_image.startsWith('/uploads/')) {
                            const localCoverPath = '.' + song.cover_image; // ./uploads/...
                            const s3CoverKey = song.cover_image.replace('/uploads/', '');

                            console.log(`   📤 Uploading cover: ${path.basename(localCoverPath)}`);
                            const coverUrl = await uploadFileToS3(localCoverPath, s3CoverKey);

                            if (coverUrl) {
                                await new Promise((res, rej) => {
                                    db.run('UPDATE songs SET cover_image = ? WHERE id = ?',
                                        [coverUrl, song.id],
                                        (err) => err ? rej(err) : res());
                                });
                                console.log(`   ✅ Cover uploaded: ${coverUrl}`);
                            }
                        }

                        console.log(`✅ Completed: ${song.title}\n`);

                    } catch (error) {
                        console.error(`❌ Error migrating song ${song.id}:`, error.message);
                    }
                }

                resolve();
            });
    });
}

async function main() {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  Stage Music - S3 Migration (Remaining)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        await migrateRemainingSongs();

        // Verify migration
        db.get("SELECT COUNT(*) as remaining FROM songs WHERE audio_file LIKE '/uploads/%'",
            (err, row) => {
                if (err) {
                    console.error('Error checking remaining songs:', err);
                } else {
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log(`✅ Migration Complete!`);
                    console.log(`   Remaining local files: ${row.remaining}`);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                }
                db.close();
            });

    } catch (error) {
        console.error('❌ Migration failed:', error);
        db.close();
        process.exit(1);
    }
}

main();
