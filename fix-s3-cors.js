const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const BUCKET = process.env.AWS_S3_BUCKET;

// CORS configuration
const corsConfiguration = {
    CORSRules: [
        {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000
        }
    ]
};

console.log('🔧 Setting CORS configuration for S3 bucket:', BUCKET);

s3.putBucketCors({
    Bucket: BUCKET,
    CORSConfiguration: corsConfiguration
}, (err, data) => {
    if (err) {
        console.error('❌ Error setting CORS:', err.message);
        process.exit(1);
    } else {
        console.log('✅ CORS configuration updated successfully!');
        console.log('');
        console.log('CORS Rules:');
        console.log('  - Allowed Origins: * (all domains)');
        console.log('  - Allowed Methods: GET, HEAD');
        console.log('  - Allowed Headers: *');
        console.log('  - Max Age: 3000 seconds');
        console.log('');
        console.log('🎉 HLS segments will now be accessible from browsers!');
    }
});
