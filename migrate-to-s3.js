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
    try {
        const fileContent = fs.readFileSync(localPath);

        // Determine content type
        const ext = path.extname(localPath).toLowerCase();
        let contentType = 'application/octet-stream';

        if (ext === '.mp3') contentType = 'audio/mpeg';
        else if (ext === '.wav') contentType = 'audio/wav';
        else if (ext === '.m4a') contentType = 'audio/mp4';
        else if (ext === '.aac') contentType = 'audio/aac';
        else if (ext === '.flac') contentType = 'audio/flac';
        else if (ext === '.ogg') contentType = 'audio/ogg';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.webp') contentType = 'image/webp';

        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType
            // Note: ACL removed - public access is handled by bucket policy
        };

        const result = await s3.upload(params).promise();
        return result.Location; // S3 URL
    } catch (error) {
        console.error(`Error uploading ${localPath}:`, error.message);
        throw error;
    }
}

async function migrateSongs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, audio_file, cover_image FROM songs', async (err, rows) => {
            if (err) return reject(err);

            console.log(`\n🚀 Starting migration of ${rows.length} songs to S3...\n`);

            let successCount = 0;
            let skipCount = 0;
            let errorCount = 0;

            for (const song of rows) {
                try {
                    let audioUrl = song.audio_file;
                    let coverUrl = song.cover_image;
                    let needsUpdate = false;

                    // Migrate audio file
                    if (song.audio_file && song.audio_file.startsWith('/uploads/')) {
                        const localAudioPath = '.' + song.audio_file; // ./uploads/songs/...
                        const s3AudioKey = song.audio_file.replace('/uploads/', '');

                        if (fs.existsSync(localAudioPath)) {
                            console.log(`📤 Uploading audio: ${s3AudioKey}`);
                            audioUrl = await uploadFileToS3(localAudioPath, s3AudioKey);
                            console.log(`   ✅ Audio uploaded: ${audioUrl}`);
                            needsUpdate = true;
                        } else {
                            console.log(`   ⚠️  Local file not found: ${localAudioPath}`);
                        }
                    } else if (song.audio_file && song.audio_file.includes('amazonaws.com')) {
                        console.log(`   ⏭️  Song ${song.id} already in S3, skipping...`);
                        skipCount++;
                    }

                    // Migrate cover image
                    if (song.cover_image && song.cover_image.startsWith('/uploads/')) {
                        const localCoverPath = '.' + song.cover_image; // ./uploads/covers/...
                        const s3CoverKey = song.cover_image.replace('/uploads/', '');

                        if (fs.existsSync(localCoverPath)) {
                            console.log(`📤 Uploading cover: ${s3CoverKey}`);
                            coverUrl = await uploadFileToS3(localCoverPath, s3CoverKey);
                            console.log(`   ✅ Cover uploaded: ${coverUrl}`);
                            needsUpdate = true;
                        } else {
                            console.log(`   ⚠️  Local file not found: ${localCoverPath}`);
                        }
                    }

                    // Update database with S3 URLs
                    if (needsUpdate) {
                        await new Promise((resolve, reject) => {
                            db.run(
                                'UPDATE songs SET audio_file = ?, cover_image = ? WHERE id = ?',
                                [audioUrl, coverUrl, song.id],
                                (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        });
                        console.log(`   💾 Database updated for song ID ${song.id}\n`);
                        successCount++;
                    }

                } catch (error) {
                    console.error(`❌ Error migrating song ${song.id}:`, error.message, '\n');
                    errorCount++;
                }
            }

            console.log('\n' + '='.repeat(60));
            console.log('📊 Migration Summary:');
            console.log('='.repeat(60));
            console.log(`✅ Successfully migrated: ${successCount} songs`);
            console.log(`⏭️  Already in S3: ${skipCount} songs`);
            console.log(`❌ Failed: ${errorCount} songs`);
            console.log('='.repeat(60) + '\n');

            resolve();
        });
    });
}

async function verifyS3Connection() {
    try {
        console.log('🔍 Verifying S3 connection...');
        await s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET }).promise();
        console.log('✅ S3 bucket accessible:', process.env.AWS_S3_BUCKET);
        return true;
    } catch (error) {
        console.error('❌ S3 connection failed:', error.message);
        console.error('\nPlease check:');
        console.error('1. AWS credentials in .env file');
        console.error('2. S3 bucket name is correct');
        console.error('3. IAM permissions are properly configured');
        return false;
    }
}

async function main() {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('   🎵 Stage Music - S3 Migration Tool 🎵');
        console.log('='.repeat(60) + '\n');

        // Verify S3 connection
        const isConnected = await verifyS3Connection();
        if (!isConnected) {
            process.exit(1);
        }

        console.log('\n⚠️  IMPORTANT: This will migrate all local files to S3.');
        console.log('Local files will be kept as backup.\n');

        // Start migration
        await migrateSongs();

        console.log('✅ Migration complete!');
        console.log('\n📝 Next steps:');
        console.log('1. Test the application to ensure songs play correctly');
        console.log('2. Upload a test song to verify S3 upload works');
        console.log('3. Once verified, you can delete local files from ./public/uploads/');
        console.log('4. Consider setting up CloudFront CDN for better performance\n');

        db.close();
    } catch (error) {
        console.error('❌ Migration failed:', error);
        db.close();
        process.exit(1);
    }
}

main();
