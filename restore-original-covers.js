require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');
const csv = require('csv-parser');

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const DB_PATH = './stage_music.db';

// Regional categories that should KEEP language-specific covers
const REGIONAL_CATEGORY_IDS = [7, 8, 10, 11]; // HARYANVI HITS, BHOJPURI DHAMAKA, RAJASTHANI FOLK, GUJARATI GARBA

const db = new sqlite3.Database(DB_PATH);

// Upload cover to S3
async function uploadCoverToS3(coverFile, sourcePath) {
    // Covers are in Cover_File subfolder for Haryanvi, and RJ1/Cover_Images for Rajasthani
    let filePath = path.join(sourcePath, 'Cover_File', coverFile);

    // Try alternate paths if not found
    if (!fs.existsSync(filePath)) {
        filePath = path.join(sourcePath, 'Cover_Images', coverFile);
    }
    if (!fs.existsSync(filePath)) {
        filePath = path.join(sourcePath, coverFile);
    }

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return null;
    }

    const fileExt = path.extname(coverFile);
    const s3Key = `covers/${path.basename(coverFile, fileExt)}-${Date.now()}${fileExt}`;

    const fileContent = fs.readFileSync(filePath);
    const contentType = fileExt === '.png' ? 'image/png' : 'image/jpeg';

    const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType
    };

    try {
        await s3.upload(params).promise();
        const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
        return s3Url;
    } catch (error) {
        console.error(`❌ Error uploading ${coverFile}:`, error.message);
        return null;
    }
}

// Get songs NOT in regional categories
function getSongsToRestore() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT s.id, s.title, s.singer, s.cover_image
            FROM songs s
            WHERE s.id NOT IN (
                SELECT DISTINCT song_id
                FROM category_songs
                WHERE category_id IN (${REGIONAL_CATEGORY_IDS.join(',')})
            )
            AND s.language IN ('Haryanvi', 'Rajasthani', 'Bhojpuri', 'Gujarati')
            ORDER BY s.id
        `;

        db.all(sql, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

// Parse Haryanvi CSV to get song-to-cover mapping
function parseHaryanviCSV() {
    return new Promise((resolve, reject) => {
        const songCoverMap = {};
        const csvPath = './Haryanvi1/Music Haryanvi STAGE  - Release Plan.csv';

        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                const songName = row['Song_Name']?.trim();
                const coverFile = row['Cover_File']?.trim();
                if (songName && coverFile) {
                    songCoverMap[songName.toLowerCase()] = coverFile;
                }
            })
            .on('end', () => {
                console.log(`✅ Parsed ${Object.keys(songCoverMap).length} songs from Haryanvi CSV`);
                resolve(songCoverMap);
            })
            .on('error', reject);
    });
}

// Parse Rajasthani CSV
function parseRajasthaniCSV() {
    return new Promise((resolve, reject) => {
        const songCoverMap = {};
        const csvPath = './RJ1/Music Haryanvi STAGE - RJ1.csv';

        if (!fs.existsSync(csvPath)) {
            console.log('⚠️  Rajasthani CSV not found, skipping...');
            return resolve(songCoverMap);
        }

        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                const songName = row['Song_Name']?.trim();
                const coverFile = row['Cover_File']?.trim();
                if (songName && coverFile) {
                    songCoverMap[songName.toLowerCase()] = coverFile;
                }
            })
            .on('end', () => {
                console.log(`✅ Parsed ${Object.keys(songCoverMap).length} songs from Rajasthani CSV`);
                resolve(songCoverMap);
            })
            .on('error', reject);
    });
}

// Find matching cover for a song title
function findCoverForSong(title, singer, haryanviMap, rajasthaniMap) {
    const titleLower = title.toLowerCase();

    // Try exact match first
    if (haryanviMap[titleLower]) return { cover: haryanviMap[titleLower], folder: 'Haryanvi1' };
    if (rajasthaniMap[titleLower]) return { cover: rajasthaniMap[titleLower], folder: 'RJ1' };

    // Try partial match
    for (const [csvTitle, cover] of Object.entries(haryanviMap)) {
        if (titleLower.includes(csvTitle) || csvTitle.includes(titleLower)) {
            return { cover, folder: 'Haryanvi1' };
        }
    }

    for (const [csvTitle, cover] of Object.entries(rajasthaniMap)) {
        if (titleLower.includes(csvTitle) || csvTitle.includes(titleLower)) {
            return { cover, folder: 'RJ1' };
        }
    }

    return null;
}

// Update song cover in database
function updateSongCover(songId, coverUrl) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE songs SET cover_image = ? WHERE id = ?', [coverUrl, songId], (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

// Main execution
async function main() {
    console.log('🔄 Restoring original covers for non-regional songs...\n');

    try {
        // Step 1: Get songs to restore
        console.log('Step 1: Finding songs to restore...');
        const songsToRestore = await getSongsToRestore();
        console.log(`✅ Found ${songsToRestore.length} songs to restore\n`);

        if (songsToRestore.length === 0) {
            console.log('✅ No songs to restore!');
            db.close();
            return;
        }

        // Step 2: Parse CSVs
        console.log('Step 2: Parsing CSV files...');
        const haryanviMap = await parseHaryanviCSV();
        const rajasthaniMap = await parseRajasthaniCSV();
        console.log('');

        // Step 3: Upload covers and update database
        console.log('Step 3: Restoring covers...');
        let restored = 0;
        let notFound = 0;
        const uploadedCovers = new Map(); // Cache uploaded covers

        for (const song of songsToRestore) {
            const match = findCoverForSong(song.title, song.singer, haryanviMap, rajasthaniMap);

            if (match) {
                const cacheKey = `${match.folder}/${match.cover}`;

                // Check if already uploaded
                let s3Url = uploadedCovers.get(cacheKey);

                if (!s3Url) {
                    console.log(`📤 Uploading ${match.cover} from ${match.folder}...`);
                    s3Url = await uploadCoverToS3(match.cover, match.folder);
                    if (s3Url) {
                        uploadedCovers.set(cacheKey, s3Url);
                    }
                }

                if (s3Url) {
                    await updateSongCover(song.id, s3Url);
                    console.log(`✅ Restored cover for: ${song.title} → ${match.cover}`);
                    restored++;
                } else {
                    console.log(`⚠️  Failed to upload cover for: ${song.title}`);
                    notFound++;
                }
            } else {
                console.log(`⚠️  No matching cover found for: ${song.title}`);
                notFound++;
            }
        }

        // Step 4: Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 SUMMARY:');
        console.log('='.repeat(50));
        console.log(`✅ Restored: ${restored} songs`);
        console.log(`⚠️  Not found: ${notFound} songs`);
        console.log(`📁 Unique covers uploaded: ${uploadedCovers.size}`);
        console.log('='.repeat(50));

        // Step 5: Verify regional categories still have language-specific covers
        console.log('\nVerifying regional categories...');
        const sql = `
            SELECT c.name, COUNT(DISTINCT s.id) as count
            FROM categories c
            INNER JOIN category_songs cs ON c.id = cs.category_id
            INNER JOIN songs s ON cs.song_id = s.id
            WHERE c.id IN (${REGIONAL_CATEGORY_IDS.join(',')})
            AND s.cover_image LIKE '%covers/%cover.png'
            GROUP BY c.name
        `;

        db.all(sql, (err, rows) => {
            if (err) {
                console.error('Error verifying:', err);
            } else {
                console.log('\nRegional categories with language-specific covers:');
                rows.forEach(row => {
                    console.log(`  ${row.name}: ${row.count} songs`);
                });
            }

            console.log('\n✅ All done! Original covers restored.');
            db.close();
        });

    } catch (error) {
        console.error('❌ Error:', error);
        db.close();
        process.exit(1);
    }
}

main();
