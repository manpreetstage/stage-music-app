require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

async function uploadCover() {
    const filePath = './RJ1/Cover_File/cover08.jpg';
    const fileContent = fs.readFileSync(filePath);
    const s3Key = `covers/rajasthani-cover08-${Date.now()}.jpg`;

    const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: 'image/jpeg'
    };

    const result = await s3.upload(params).promise();
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
}

async function main() {
    console.log('🔧 Fixing song 170 (KAi) cover...');

    const s3Url = await uploadCover();
    console.log(`✅ Uploaded cover08.jpg: ${s3Url}`);

    db.run('UPDATE songs SET cover_image = ? WHERE id = 170', [s3Url], (err) => {
        if (err) {
            console.error('❌ Error updating:', err);
        } else {
            console.log('✅ Updated song 170 with correct cover');
        }
        db.close();
    });
}

main();
