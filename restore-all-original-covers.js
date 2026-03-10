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

const db = new sqlite3.Database(DB_PATH);

// Upload cover to S3
async function uploadCoverToS3(coverFile, sourcePath) {
    // Try different folder structures
    const possiblePaths = [
        path.join(sourcePath, 'Cover_File', coverFile),
        path.join(sourcePath, 'Cover_Images', coverFile),
        path.join(sourcePath, coverFile)
    ];

    let filePath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            filePath = p;
            break;
        }
    }

    if (!filePath) {
        console.log(`⚠️  File not found: ${coverFile} in ${sourcePath}`);
        return null;
    }

    const fileExt = path.extname(coverFile);
    const s3Key = `covers/original-${path.basename(coverFile, fileExt)}-${Date.now()}${fileExt}`;

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

// Get ALL songs
function getAllSongs() {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT id, title, singer, language, cover_image FROM songs ORDER BY id';
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

        if (!fs.existsSync(csvPath)) {
            console.log('⚠️  Haryanvi CSV not found');
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
        const csvPath = './RJ1/Music Haryanvi STAGE  - RJ1.csv';

        if (!fs.existsSync(csvPath)) {
            console.log('⚠️  Rajasthani CSV not found');
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

    // Try partial match (remove special characters and compare)
    const cleanTitle = titleLower.replace(/[/\-()]/g, ' ').replace(/\s+/g, ' ').trim();

    for (const [csvTitle, cover] of Object.entries(haryanviMap)) {
        const cleanCsvTitle = csvTitle.replace(/[/\-()]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanTitle.includes(cleanCsvTitle) || cleanCsvTitle.includes(cleanTitle)) {
            return { cover, folder: 'Haryanvi1' };
        }
    }

    for (const [csvTitle, cover] of Object.entries(rajasthaniMap)) {
        const cleanCsvTitle = csvTitle.replace(/[/\-()]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanTitle.includes(cleanCsvTitle) || cleanCsvTitle.includes(cleanTitle)) {
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
    console.log('🔄 Restoring ALL original covers...\n');

    try {
        // Step 1: Get all songs
        console.log('Step 1: Getting all songs...');
        const allSongs = await getAllSongs();
        console.log(`✅ Found ${allSongs.length} total songs\n`);

        // Step 2: Parse CSVs
        console.log('Step 2: Parsing CSV files...');
        const haryanviMap = await parseHaryanviCSV();
        const rajasthaniMap = await parseRajasthaniCSV();
        console.log('');

        // Step 3: Restore covers
        console.log('Step 3: Restoring ALL original covers...');
        let restored = 0;
        let notFound = 0;
        let skipped = 0;
        const uploadedCovers = new Map(); // Cache uploaded covers

        for (const song of allSongs) {
            // Skip if not Haryanvi or Rajasthani
            if (!['Haryanvi', 'Rajasthani'].includes(song.language)) {
                skipped++;
                continue;
            }

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
                    console.log(`✅ [${song.id}] ${song.title} → ${match.cover}`);
                    restored++;
                } else {
                    console.log(`⚠️  [${song.id}] Failed to upload: ${song.title}`);
                    notFound++;
                }
            } else {
                console.log(`⚠️  [${song.id}] No match found: ${song.title}`);
                notFound++;
            }
        }

        // Step 4: Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY:');
        console.log('='.repeat(60));
        console.log(`✅ Restored with original covers: ${restored} songs`);
        console.log(`⚠️  Not found/failed: ${notFound} songs`);
        console.log(`⏭️  Skipped (Bhojpuri/other): ${skipped} songs`);
        console.log(`📁 Unique covers uploaded: ${uploadedCovers.size}`);
        console.log('='.repeat(60));

        console.log('\n✅ All done! All original covers restored.');
        db.close();

    } catch (error) {
        console.error('❌ Error:', error);
        db.close();
        process.exit(1);
    }
}

main();
