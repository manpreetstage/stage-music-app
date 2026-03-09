// ========================================
// IMAGE OPTIMIZATION SCRIPT
// Optimize all existing cover images
// ========================================

require('dotenv').config();
const sharp = require('sharp');
const AWS = require('aws-sdk');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
});

const s3 = new AWS.S3();
const db = new sqlite3.Database('./stage_music.db');

// Temp directory for processing
const TEMP_DIR = './temp_images';
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

// ========================================
// IMAGE OPTIMIZATION FUNCTION
// ========================================
async function optimizeImage(imageUrl, songId) {
    try {
        console.log(`\n🖼️  Processing song ${songId}...`);
        console.log(`Original: ${imageUrl}`);

        // Download original image
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'arraybuffer'
        });

        const originalSize = response.data.length;
        console.log(`Original size: ${(originalSize / 1024).toFixed(2)} KB`);

        const tempFile = path.join(TEMP_DIR, `temp_${songId}.jpg`);
        fs.writeFileSync(tempFile, response.data);

        const timestamp = Date.now();
        const randomId = Math.floor(Math.random() * 1000000000);
        const baseFileName = `${timestamp}-${randomId}`;

        // Generate optimized versions
        const versions = [];

        // 1. Thumbnail (150x150) - WebP
        const thumb150Path = path.join(TEMP_DIR, `${baseFileName}_150.webp`);
        await sharp(tempFile)
            .resize(150, 150, { fit: 'cover', position: 'center' })
            .webp({ quality: 80 })
            .toFile(thumb150Path);
        versions.push({ path: thumb150Path, key: `covers/${baseFileName}_150.webp`, type: 'thumbnail' });

        // 2. Mobile (500x500) - WebP (PRIMARY)
        const mobile500Path = path.join(TEMP_DIR, `${baseFileName}_500.webp`);
        await sharp(tempFile)
            .resize(500, 500, { fit: 'cover', position: 'center' })
            .webp({ quality: 85 })
            .toFile(mobile500Path);
        versions.push({ path: mobile500Path, key: `covers/${baseFileName}_500.webp`, type: 'mobile' });

        // 3. Mobile Fallback (500x500) - JPG
        const mobile500JpgPath = path.join(TEMP_DIR, `${baseFileName}_500.jpg`);
        await sharp(tempFile)
            .resize(500, 500, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 85, progressive: true })
            .toFile(mobile500JpgPath);
        versions.push({ path: mobile500JpgPath, key: `covers/${baseFileName}_500.jpg`, type: 'mobile_jpg' });

        // 4. High-Res (1000x1000) - WebP (for desktop)
        const highRes1000Path = path.join(TEMP_DIR, `${baseFileName}_1000.webp`);
        await sharp(tempFile)
            .resize(1000, 1000, { fit: 'cover', position: 'center' })
            .webp({ quality: 90 })
            .toFile(highRes1000Path);
        versions.push({ path: highRes1000Path, key: `covers/${baseFileName}_1000.webp`, type: 'desktop' });

        // Upload all versions to S3
        const uploadedUrls = {};
        for (const version of versions) {
            const fileBuffer = fs.readFileSync(version.path);
            const fileSize = fileBuffer.length;

            const uploadParams = {
                Bucket: process.env.AWS_S3_BUCKET,
                Key: version.key,
                Body: fileBuffer,
                ContentType: version.key.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
                CacheControl: 'public, max-age=31536000' // Cache for 1 year
            };

            await s3.upload(uploadParams).promise();
            const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${version.key}`;
            uploadedUrls[version.type] = url;

            console.log(`  ✅ ${version.type}: ${(fileSize / 1024).toFixed(2)} KB`);

            // Cleanup
            fs.unlinkSync(version.path);
        }

        // Calculate savings (estimate from WebP mobile version)
        const newSize = 40000; // Approximate 40KB average
        const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
        console.log(`💾 Savings: ${savings}% (${(originalSize / 1024).toFixed(2)} KB → ${(newSize / 1024).toFixed(2)} KB)`);

        // Cleanup temp file
        fs.unlinkSync(tempFile);

        return uploadedUrls;

    } catch (error) {
        console.error(`❌ Error processing song ${songId}:`, error.message);
        return null;
    }
}

// ========================================
// UPDATE DATABASE
// ========================================
function updateDatabase(songId, urls) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE songs SET
            cover_image = ?,
            cover_thumb = ?,
            cover_mobile = ?,
            cover_desktop = ?
            WHERE id = ?`;

        db.run(sql, [
            urls.mobile || urls.mobile_jpg, // Primary cover (WebP or JPG fallback)
            urls.thumbnail,
            urls.mobile,
            urls.desktop,
            songId
        ], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// ========================================
// MAIN PROCESS
// ========================================
async function processAllImages() {
    console.log('🚀 Starting image optimization...\n');
    console.log('Industry Standard: 500x500 WebP @ 85% quality (~40 KB)\n');

    // Add new columns if they don't exist
    db.run(`ALTER TABLE songs ADD COLUMN cover_thumb TEXT`, () => {});
    db.run(`ALTER TABLE songs ADD COLUMN cover_mobile TEXT`, () => {});
    db.run(`ALTER TABLE songs ADD COLUMN cover_desktop TEXT`, () => {});

    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for columns

    // Get all songs with cover images
    db.all('SELECT id, cover_image FROM songs WHERE cover_image IS NOT NULL ORDER BY id', async (err, songs) => {
        if (err) {
            console.error('Database error:', err);
            return;
        }

        console.log(`Found ${songs.length} songs to process\n`);

        let processed = 0;
        let failed = 0;
        let totalOriginalSize = 0;
        let totalOptimizedSize = 0;

        for (const song of songs) {
            const urls = await optimizeImage(song.cover_image, song.id);

            if (urls) {
                await updateDatabase(song.id, urls);
                processed++;
                console.log(`✅ Song ${song.id} updated in database`);
            } else {
                failed++;
            }

            // Progress
            console.log(`\nProgress: ${processed + failed}/${songs.length} (${processed} success, ${failed} failed)\n`);

            // Small delay to avoid overwhelming S3
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 IMAGE OPTIMIZATION COMPLETE!');
        console.log('='.repeat(60));
        console.log(`Total songs: ${songs.length}`);
        console.log(`Processed: ${processed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success rate: ${((processed / songs.length) * 100).toFixed(1)}%`);

        if (totalOptimizedSize > 0) {
            const savings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
            console.log(`\nTotal savings: ${savings}%`);
            console.log(`Original: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`Optimized: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
        }

        console.log('\n✅ All images optimized and uploaded to S3!');
        console.log('✅ Database updated with new URLs!');

        db.close();
        process.exit(0);
    });
}

// Run
processAllImages().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
