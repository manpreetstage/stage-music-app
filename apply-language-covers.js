require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const DB_PATH = './stage_music.db';
const ASSETS_PATH = './Assets';

// Language to cover file mapping
const LANGUAGE_COVERS = {
    'Haryanvi': 'Haryanvi.png',
    'Rajasthani': 'Rajasthani.png',
    'Bhojpuri': 'Bhojpuri.png',
    'Gujarati': 'Gujarati.png'
};

const db = new sqlite3.Database(DB_PATH);

// Upload cover to S3
async function uploadCoverToS3(language, filename) {
    const filePath = path.join(ASSETS_PATH, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return null;
    }

    const fileContent = fs.readFileSync(filePath);
    const s3Key = `covers/${language.toLowerCase()}-cover.png`;

    const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: 'image/png'
    };

    try {
        console.log(`📤 Uploading ${filename} to S3 as ${s3Key}...`);
        await s3.upload(params).promise();
        const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
        console.log(`✅ Uploaded: ${s3Url}`);
        return s3Url;
    } catch (error) {
        console.error(`❌ Error uploading ${filename}:`, error.message);
        return null;
    }
}

// Fix language field for songs with invalid values
function fixLanguageField() {
    return new Promise((resolve, reject) => {
        console.log('\n🔧 Fixing language field for songs...');

        // Based on the data, songs with STAGE/singer names are mostly Haryanvi
        const sql = `UPDATE songs
                     SET language = 'Haryanvi'
                     WHERE language NOT IN ('Bhojpuri', 'Haryanvi', 'Rajasthani', 'Gujarati')`;

        db.run(sql, function(err) {
            if (err) {
                console.error('❌ Error fixing language:', err);
                return reject(err);
            }
            console.log(`✅ Fixed ${this.changes} songs with invalid language values`);
            resolve();
        });
    });
}

// Update songs with language-specific covers
function updateSongCovers(languageCoverMap) {
    return new Promise((resolve, reject) => {
        console.log('\n🖼️  Updating song covers...');

        const promises = Object.entries(languageCoverMap).map(([language, coverUrl]) => {
            return new Promise((res, rej) => {
                const sql = `UPDATE songs SET cover_image = ? WHERE language = ?`;

                db.run(sql, [coverUrl, language], function(err) {
                    if (err) {
                        console.error(`❌ Error updating ${language} covers:`, err);
                        return rej(err);
                    }
                    console.log(`✅ Updated ${this.changes} ${language} songs with cover`);
                    res();
                });
            });
        });

        Promise.all(promises)
            .then(() => resolve())
            .catch(err => reject(err));
    });
}

// Get summary of changes
function getSummary() {
    return new Promise((resolve, reject) => {
        const sql = `SELECT language, COUNT(*) as count
                     FROM songs
                     GROUP BY language
                     ORDER BY language`;

        db.all(sql, (err, rows) => {
            if (err) {
                console.error('❌ Error getting summary:', err);
                return reject(err);
            }

            console.log('\n📊 SUMMARY:');
            console.log('='.repeat(40));
            rows.forEach(row => {
                console.log(`${row.language}: ${row.count} songs`);
            });
            console.log('='.repeat(40));
            resolve();
        });
    });
}

// Main execution
async function main() {
    console.log('🎨 Starting language-specific cover application...\n');

    try {
        // Step 1: Upload all language covers to S3
        console.log('Step 1: Uploading language covers to S3');
        const languageCoverMap = {};

        for (const [language, filename] of Object.entries(LANGUAGE_COVERS)) {
            const s3Url = await uploadCoverToS3(language, filename);
            if (s3Url) {
                languageCoverMap[language] = s3Url;
            }
        }

        if (Object.keys(languageCoverMap).length === 0) {
            console.log('❌ No covers uploaded, aborting...');
            db.close();
            return;
        }

        // Step 2: Fix language field for songs with invalid values
        console.log('\nStep 2: Fixing language field');
        await fixLanguageField();

        // Step 3: Update all songs with correct covers
        console.log('\nStep 3: Applying language-specific covers');
        await updateSongCovers(languageCoverMap);

        // Step 4: Show summary
        await getSummary();

        console.log('\n✅ All done! Language-specific covers applied successfully.');
        db.close();

    } catch (error) {
        console.error('❌ Error:', error);
        db.close();
        process.exit(1);
    }
}

main();
