const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const BUCKET = process.env.AWS_S3_BUCKET;

// Bucket policy to allow public read access to HLS files
const bucketPolicy = {
    Version: '2012-10-17',
    Statement: [
        {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [
                `arn:aws:s3:::${BUCKET}/hls/*`,
                `arn:aws:s3:::${BUCKET}/songs/*`,
                `arn:aws:s3:::${BUCKET}/covers/*`
            ]
        }
    ]
};

console.log('🔧 Setting S3 bucket policy for:', BUCKET);
console.log('📁 Allowing public read access to: hls/*, songs/*, covers/*');

s3.putBucketPolicy({
    Bucket: BUCKET,
    Policy: JSON.stringify(bucketPolicy)
}, (err) => {
    if (err) {
        console.error('❌ Error setting bucket policy:', err.message);
        console.log('\nℹ️  You may need to:');
        console.log('   1. Disable "Block all public access" in S3 bucket settings');
        console.log('   2. Check AWS IAM permissions');
        process.exit(1);
    } else {
        console.log('✅ Bucket policy updated successfully!');
        console.log('\n📊 Public read access enabled for:');
        console.log('   - HLS segments and playlists');
        console.log('   - Song audio files');
        console.log('   - Cover images');
        console.log('\n🎉 403 errors should be fixed now!');
    }
});
