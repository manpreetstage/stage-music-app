require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');
const { promisify } = require('util');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const db = new sqlite3.Database('./stage_music.db');

// Promisify database methods
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Column mapping for different CSV formats
const COLUMN_MAPPING = {
    'Sr No.': 'sr_no',
    'Song_Name': 'title',
    'Song Name': 'title',
    'Title': 'title',
    'Album_Name': 'album_name',
    'Album Name': 'album_name',
    'Album': 'album_name',
    'Wave Audio': 'wave_audio',
    'Audio_File': 'audio_file',
    'Audio File': 'audio_file',
    'Audio_Files': 'audio_file',
    'Audio': 'audio_file',
    'Cover_File': 'cover_file',
    'Cover File': 'cover_file',
    'Cover': 'cover_file',
    'Singer': 'singer',
    'Artist': 'singer',
    'Lyrics': 'lyricist',
    'Lyricist': 'lyricist',
    'Music_Director': 'music_director',
    'Music Director': 'music_director',
    'Composer': 'composer',
    'Record_Label/Company': 'company',
    'Company': 'company',
    'Label': 'company',
    'Langauage': 'language',
    'Language': 'language'
};

// Normalize column names
function normalizeRow(row) {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
        const mappedKey = COLUMN_MAPPING[key] || key.toLowerCase().replace(/\s+/g, '_');
        normalized[mappedKey] = value ? value.trim() : '';
    }
    return normalized;
}

// Upload file to S3
async function uploadToS3(localPath, s3Key) {
    const fileContent = fs.readFileSync(localPath);
    const contentType = s3Key.includes('.mp3') ? 'audio/mpeg' :
                        s3Key.includes('.wav') ? 'audio/wav' :
                        s3Key.includes('.jpg') ? 'image/jpeg' :
                        s3Key.includes('.png') ? 'image/png' : 'application/octet-stream';

    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType
    };

    const result = await s3.upload(params).promise();
    return result.Location;
}

// Find song by title or audio file name
async function findSong(title, audioFileName) {
    // Try to find by exact title match first
    let song = await dbGet(
        'SELECT * FROM songs WHERE LOWER(title) = LOWER(?)',
        [title]
    );

    // If not found, try to find by audio file name
    if (!song && audioFileName) {
        const audioBaseName = path.basename(audioFileName, path.extname(audioFileName));
        song = await dbGet(
            'SELECT * FROM songs WHERE audio_file LIKE ?',
            [`%${audioBaseName}%`]
        );
    }

    return song;
}

// Update song in database
async function updateSong(songId, updates) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        return;
    }

    values.push(songId);
    const query = `UPDATE songs SET ${fields.join(', ')} WHERE id = ?`;

    await dbRun(query, values);
}

// Process CSV and update songs
async function processCsvAndUpdate(csvPath, baseFolder) {
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

                let updatedCount = 0;
                let notFoundCount = 0;
                let errorCount = 0;

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const title = row.title || row.song_name || '';
                    const audioFile = row.audio_file || '';

                    if (!title) {
                        console.log(`⚠️  Row ${i + 1}: No title found, skipping`);
                        continue;
                    }

                    console.log(`\n[${i + 1}/${rows.length}] Processing: ${title}`);

                    try {
                        // Find existing song
                        const existingSong = await findSong(title, audioFile);

                        if (!existingSong) {
                            console.log(`   ❌ Song not found in database`);
                            notFoundCount++;
                            continue;
                        }

                        console.log(`   ✓ Found song (ID: ${existingSong.id})`);

                        // Prepare updates
                        const updates = {};

                        // Update basic info
                        if (row.title && row.title !== existingSong.title) {
                            updates.title = row.title;
                            console.log(`   📝 Title: "${existingSong.title}" → "${row.title}"`);
                        }

                        if (row.singer && row.singer !== existingSong.artist) {
                            updates.artist = row.singer;
                            console.log(`   🎤 Artist: "${existingSong.artist}" → "${row.singer}"`);
                        }

                        if (row.composer && row.composer !== existingSong.composer) {
                            updates.composer = row.composer;
                            console.log(`   🎹 Composer: "${existingSong.composer}" → "${row.composer}"`);
                        }

                        if (row.music_director && row.music_director !== existingSong.music_director) {
                            updates.music_director = row.music_director;
                            console.log(`   🎼 Music Director: "${existingSong.music_director}" → "${row.music_director}"`);
                        }

                        if (row.lyricist && row.lyricist !== existingSong.lyricist) {
                            updates.lyricist = row.lyricist;
                            console.log(`   ✍️  Lyricist: "${existingSong.lyricist}" → "${row.lyricist}"`);
                        }

                        if (row.company && row.company !== existingSong.company) {
                            updates.company = row.company;
                            console.log(`   🏢 Company: "${existingSong.company}" → "${row.company}"`);
                        }

                        if (row.language && row.language !== existingSong.language) {
                            updates.language = row.language;
                            console.log(`   🌐 Language: "${existingSong.language}" → "${row.language}"`);
                        }

                        // Update cover image if provided
                        if (row.cover_file && baseFolder) {
                            const coverPath = path.join(baseFolder, 'Cover_File', row.cover_file);
                            if (fs.existsSync(coverPath)) {
                                const s3CoverKey = `covers/${Date.now()}-${row.cover_file}`;
                                const coverUrl = await uploadToS3(coverPath, s3CoverKey);
                                updates.cover_image = coverUrl;
                                console.log(`   🖼️  Cover: Updated with new image`);
                            }
                        }

                        // Update album if provided
                        if (row.album_name) {
                            const albumName = row.album_name;
                            const albumArtist = row.singer || existingSong.artist;
                            const albumLanguage = row.language || existingSong.language;
                            const albumCover = updates.cover_image || existingSong.cover_image;

                            // Find or create album
                            let album = await dbGet(
                                'SELECT * FROM albums WHERE LOWER(title) = LOWER(?) AND LOWER(artist) = LOWER(?)',
                                [albumName, albumArtist]
                            );

                            if (!album) {
                                const result = await dbRun(
                                    `INSERT INTO albums (title, artist, cover_image, language, created_at)
                                     VALUES (?, ?, ?, ?, datetime('now'))`,
                                    [albumName, albumArtist, albumCover, albumLanguage]
                                );
                                updates.album_id = result.lastID;
                                console.log(`   📀 Album: Created "${albumName}"`);
                            } else if (existingSong.album_id !== album.id) {
                                updates.album_id = album.id;
                                console.log(`   📀 Album: Linked to "${albumName}"`);
                            }
                        }

                        // Perform update if there are changes
                        if (Object.keys(updates).length > 0) {
                            await updateSong(existingSong.id, updates);
                            console.log(`   ✅ Updated successfully`);
                            updatedCount++;
                        } else {
                            console.log(`   ℹ️  No changes needed`);
                        }

                    } catch (error) {
                        console.error(`   ❌ Error: ${error.message}`);
                        errorCount++;
                    }

                    // Small delay to avoid overwhelming the system
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                console.log('\n' + '='.repeat(60));
                console.log('📊 UPDATE SUMMARY');
                console.log('='.repeat(60));
                console.log(`✅ Updated: ${updatedCount}`);
                console.log(`❌ Not Found: ${notFoundCount}`);
                console.log(`⚠️  Errors: ${errorCount}`);
                console.log(`📝 Total Processed: ${rows.length}`);
                console.log('='.repeat(60));

                resolve();
            })
            .on('error', reject);
    });
}

// Main function
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.log('❌ Error: Please provide CSV file path');
        console.log('\nUsage:');
        console.log('  node bulk-update-songs.js <csv-file-path> [base-folder]');
        console.log('\nExample:');
        console.log('  node bulk-update-songs.js ./songs-update.csv');
        console.log('  node bulk-update-songs.js ./Haryanvi1/updated-songs.csv ./Haryanvi1');
        process.exit(1);
    }

    const csvPath = args[0];
    const baseFolder = args[1] || path.dirname(csvPath);

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ Error: CSV file not found: ${csvPath}`);
        process.exit(1);
    }

    console.log('🔄 BULK UPDATE SONGS FROM CSV');
    console.log('='.repeat(60));
    console.log(`📄 CSV File: ${csvPath}`);
    console.log(`📁 Base Folder: ${baseFolder}`);
    console.log('='.repeat(60));

    try {
        await processCsvAndUpdate(csvPath, baseFolder);
        console.log('\n✅ Bulk update completed!\n');
    } catch (error) {
        console.error('\n❌ Error during bulk update:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

main();
