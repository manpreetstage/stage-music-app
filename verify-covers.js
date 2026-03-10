require('dotenv').config();
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

// Parse CSVs and create mappings
async function parseCSVs() {
    const haryanviMap = new Map();
    const rajasthaniMap = new Map();

    // Parse Haryanvi CSV
    await new Promise((resolve, reject) => {
        fs.createReadStream('./Haryanvi1/Music Haryanvi STAGE  - Release Plan.csv')
            .pipe(csv())
            .on('data', (row) => {
                const songName = row['Song_Name']?.trim();
                const audioFile = row['Audio_Files']?.trim();
                const coverFile = row['Cover_File']?.trim();
                if (songName && coverFile) {
                    haryanviMap.set(songName.toLowerCase(), {
                        songName,
                        audioFile,
                        coverFile
                    });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    // Parse Rajasthani CSV
    await new Promise((resolve, reject) => {
        fs.createReadStream('./RJ1/Music Haryanvi STAGE  - RJ1.csv')
            .pipe(csv())
            .on('data', (row) => {
                const songName = row['Song_Name']?.trim();
                const audioFile = row['Audio_Files']?.trim();
                const coverFile = row['Cover_File']?.trim();
                if (songName && coverFile) {
                    rajasthaniMap.set(songName.toLowerCase(), {
                        songName,
                        audioFile,
                        coverFile
                    });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    return { haryanviMap, rajasthaniMap };
}

// Get all songs from database
function getAllSongs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, title, singer, language, cover_image FROM songs ORDER BY id', (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

// Extract cover number from S3 URL
function extractCoverNumber(coverUrl) {
    if (!coverUrl) return null;

    // Match patterns like cover01, cover1, cover10, etc.
    const match = coverUrl.match(/cover(\d+)/i);
    if (match) {
        return match[1].padStart(2, '0'); // Normalize to 2 digits
    }
    return null;
}

// Normalize cover filename for comparison
function normalizeCover(cover) {
    if (!cover) return null;
    // Extract number from cover01.jpg, cover1.jpg, etc.
    const match = cover.match(/cover(\d+)/i);
    if (match) {
        return match[1].padStart(2, '0');
    }
    return null;
}

// Find matching CSV entry
function findCSVMatch(song, haryanviMap, rajasthaniMap) {
    const titleLower = song.title.toLowerCase();

    // Try exact match
    if (haryanviMap.has(titleLower)) return { source: 'Haryanvi', data: haryanviMap.get(titleLower) };
    if (rajasthaniMap.has(titleLower)) return { source: 'Rajasthani', data: rajasthaniMap.get(titleLower) };

    // Try partial match
    for (const [key, value] of haryanviMap.entries()) {
        if (titleLower.includes(key) || key.includes(titleLower)) {
            return { source: 'Haryanvi', data: value };
        }
    }

    for (const [key, value] of rajasthaniMap.entries()) {
        if (titleLower.includes(key) || key.includes(titleLower)) {
            return { source: 'Rajasthani', data: value };
        }
    }

    return null;
}

async function main() {
    console.log('🔍 Verifying covers against CSV files...\n');

    const { haryanviMap, rajasthaniMap } = await parseCSVs();
    console.log(`✅ Loaded ${haryanviMap.size} Haryanvi songs from CSV`);
    console.log(`✅ Loaded ${rajasthaniMap.size} Rajasthani songs from CSV\n`);

    const songs = await getAllSongs();

    const mismatches = [];
    const missing = [];
    const correct = [];
    const skipped = [];

    for (const song of songs) {
        // Skip Bhojpuri and other languages
        if (!['Haryanvi', 'Rajasthani'].includes(song.language)) {
            skipped.push(song);
            continue;
        }

        const csvMatch = findCSVMatch(song, haryanviMap, rajasthaniMap);

        if (!csvMatch) {
            missing.push(song);
            continue;
        }

        const dbCover = extractCoverNumber(song.cover_image);
        const csvCover = normalizeCover(csvMatch.data.coverFile);

        if (dbCover === csvCover) {
            correct.push({ ...song, csvCover: csvMatch.data.coverFile });
        } else {
            mismatches.push({
                id: song.id,
                title: song.title,
                language: song.language,
                dbCover: dbCover || 'language-specific',
                csvCover: csvMatch.data.coverFile,
                source: csvMatch.source
            });
        }
    }

    console.log('=' .repeat(80));
    console.log('📊 VERIFICATION RESULTS:');
    console.log('='.repeat(80));
    console.log(`✅ Correct: ${correct.length} songs`);
    console.log(`❌ Mismatched: ${mismatches.length} songs`);
    console.log(`⚠️  Not found in CSV: ${missing.length} songs`);
    console.log(`⏭️  Skipped (other languages): ${skipped.length} songs`);
    console.log('='.repeat(80));

    if (mismatches.length > 0) {
        console.log('\n❌ MISMATCHED COVERS:');
        console.log('-'.repeat(80));
        mismatches.forEach(m => {
            console.log(`[${m.id}] ${m.title}`);
            console.log(`    DB: cover${m.dbCover} | CSV: ${m.csvCover} | Source: ${m.source}`);
        });
    }

    if (missing.length > 0) {
        console.log('\n⚠️  SONGS NOT FOUND IN CSV:');
        console.log('-'.repeat(80));
        missing.forEach(s => {
            console.log(`[${s.id}] ${s.title} (${s.language})`);
        });
    }

    console.log('\n✅ Verification complete!');
    db.close();
}

main().catch(err => {
    console.error('Error:', err);
    db.close();
    process.exit(1);
});
