// ========================================
// MEDIA OPTIMIZER
// Automatic image & audio optimization on upload
// ========================================

const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3();

// ========================================
// IMAGE OPTIMIZATION
// ========================================
async function optimizeAndUploadImage(localFilePath, s3Key) {
    try {
        console.log('🖼️  Optimizing image:', s3Key);

        const timestamp = Date.now();
        const randomId = Math.floor(Math.random() * 1000000000);
        const baseFileName = `${timestamp}-${randomId}`;
        const tempDir = path.dirname(localFilePath);

        const versions = {};

        // 1. Thumbnail (150x150) - WebP
        const thumb150 = path.join(tempDir, `${baseFileName}_150.webp`);
        await sharp(localFilePath)
            .resize(150, 150, { fit: 'cover', position: 'center' })
            .webp({ quality: 80 })
            .toFile(thumb150);

        versions.thumbnail = await uploadToS3(
            thumb150,
            `covers/${baseFileName}_150.webp`,
            'image/webp'
        );
        fs.unlinkSync(thumb150);

        // 2. Mobile (500x500) - WebP (PRIMARY)
        const mobile500 = path.join(tempDir, `${baseFileName}_500.webp`);
        await sharp(localFilePath)
            .resize(500, 500, { fit: 'cover', position: 'center' })
            .webp({ quality: 85 })
            .toFile(mobile500);

        versions.mobile = await uploadToS3(
            mobile500,
            `covers/${baseFileName}_500.webp`,
            'image/webp'
        );
        fs.unlinkSync(mobile500);

        // 3. Mobile Fallback (500x500) - JPG
        const mobile500Jpg = path.join(tempDir, `${baseFileName}_500.jpg`);
        await sharp(localFilePath)
            .resize(500, 500, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 85, progressive: true })
            .toFile(mobile500Jpg);

        versions.mobile_jpg = await uploadToS3(
            mobile500Jpg,
            `covers/${baseFileName}_500.jpg`,
            'image/jpeg'
        );
        fs.unlinkSync(mobile500Jpg);

        // 4. Desktop (1000x1000) - WebP
        const desktop1000 = path.join(tempDir, `${baseFileName}_1000.webp`);
        await sharp(localFilePath)
            .resize(1000, 1000, { fit: 'cover', position: 'center' })
            .webp({ quality: 90 })
            .toFile(desktop1000);

        versions.desktop = await uploadToS3(
            desktop1000,
            `covers/${baseFileName}_1000.webp`,
            'image/webp'
        );
        fs.unlinkSync(desktop1000);

        console.log('  ✅ Image optimized: 4 versions uploaded');

        return versions;

    } catch (error) {
        console.error('❌ Image optimization error:', error.message);
        throw error;
    }
}

// ========================================
// AUDIO TRANSCODING
// ========================================
async function transcodeAndUploadAudio(localFilePath, s3Key) {
    try {
        console.log('🎵 Transcoding audio:', s3Key);

        const timestamp = Date.now();
        const randomId = Math.floor(Math.random() * 1000000000);
        const baseFileName = `${timestamp}-${randomId}`;
        const tempDir = path.dirname(localFilePath);

        const versions = {};

        // 1. Standard Quality (128 kbps AAC) - RECOMMENDED
        const aac128 = path.join(tempDir, `${baseFileName}_128.m4a`);
        await transcodeToAAC(localFilePath, aac128, '128k');

        versions.standard = await uploadToS3(
            aac128,
            `songs/${baseFileName}_128.m4a`,
            'audio/mp4'
        );
        fs.unlinkSync(aac128);
        console.log('  ✅ Standard quality (128 kbps)');

        // 2. High Quality (256 kbps AAC)
        const aac256 = path.join(tempDir, `${baseFileName}_256.m4a`);
        await transcodeToAAC(localFilePath, aac256, '256k');

        versions.high = await uploadToS3(
            aac256,
            `songs/${baseFileName}_256.m4a`,
            'audio/mp4'
        );
        fs.unlinkSync(aac256);
        console.log('  ✅ High quality (256 kbps)');

        return versions;

    } catch (error) {
        console.error('❌ Audio transcoding error:', error.message);
        throw error;
    }
}

// ========================================
// FFMPEG HELPER
// ========================================
function transcodeToAAC(inputPath, outputPath, bitrate) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioCodec('aac')
            .audioBitrate(bitrate)
            .audioChannels(2)
            .audioFrequency(44100)
            .outputOptions([
                '-movflags +faststart',
                '-profile:a aac_low'
            ])
            .on('end', resolve)
            .on('error', reject)
            .save(outputPath);
    });
}

// ========================================
// S3 UPLOAD HELPER
// ========================================
async function uploadToS3(filePath, s3Key, contentType) {
    const fileBuffer = fs.readFileSync(filePath);

    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000'
    };

    await s3.upload(params).promise();

    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
    optimizeAndUploadImage,
    transcodeAndUploadAudio
};
