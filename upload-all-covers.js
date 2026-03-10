require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK v2
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
});

const s3 = new AWS.S3();

async function uploadToS3(filePath, s3Key, contentType) {
    const fileContent = fs.readFileSync(filePath);
    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType
    };

    await s3.upload(params).promise();
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
}

async function main() {
    console.log('📤 Uploading all covers to S3...\n');

    const coverDir = './HR2/Cover_Files';
    const coverMapping = {};

    // All covers to upload
    const coverFiles = [
        'Cover1.jpg', 'Cover2.jpg', 'Cover3.jpg',
        'cover6.jpg', 'Cover7.jpg', 'Cover8.jpg', 'Cover9.png',
        'Cover10.jpg', 'Cover11.jpg', 'Cover12.jpg', 'Cover13.jpg',
        'cover15.jpg', 'Cover22.jpg'
    ];

    for (const coverFile of coverFiles) {
        try {
            const coverPath = path.join(coverDir, coverFile);
            if (!fs.existsSync(coverPath)) {
                console.log(`⏭️  Skipping ${coverFile} - not found`);
                continue;
            }

            console.log(`⬆️  Uploading ${coverFile}...`);
            const coverExt = path.extname(coverFile);
            const coverS3Key = `covers/${Date.now()}-${coverFile}`;
            const contentType = coverExt === '.png' ? 'image/png' : 'image/jpeg';
            const coverUrl = await uploadToS3(coverPath, coverS3Key, contentType);

            coverMapping[coverFile] = coverUrl;
            console.log(`  ✅ ${coverFile} uploaded`);

            // Small delay to ensure unique timestamps
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error(`  ❌ Error uploading ${coverFile}:`, error.message);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 Cover URLs:\n');
    Object.entries(coverMapping).forEach(([file, url]) => {
        console.log(`${file}:`);
        console.log(`  ${url}\n`);
    });
    console.log('='.repeat(60));

    // Save mapping to file
    fs.writeFileSync(
        'cover-urls.json',
        JSON.stringify(coverMapping, null, 2)
    );
    console.log('\n✅ Mapping saved to cover-urls.json');
}

main().catch(console.error);
