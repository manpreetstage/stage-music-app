require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

async function verifyS3Setup() {
    console.log('🔍 Verifying S3 Configuration...\n');

    try {
        // 1. Check bucket exists and is accessible
        console.log('✓ Checking bucket access...');
        const buckets = await s3.listBuckets().promise();
        const targetBucket = buckets.Buckets.find(b => b.Name === process.env.AWS_S3_BUCKET);

        if (targetBucket) {
            console.log(`✅ Bucket "${process.env.AWS_S3_BUCKET}" found`);
            console.log(`   Created: ${targetBucket.CreationDate}\n`);
        } else {
            console.log(`❌ Bucket "${process.env.AWS_S3_BUCKET}" not found\n`);
            return;
        }

        // 2. List files in songs folder
        console.log('✓ Checking uploaded songs...');
        const songsData = await s3.listObjectsV2({
            Bucket: process.env.AWS_S3_BUCKET,
            Prefix: 'songs/',
            MaxKeys: 10
        }).promise();

        console.log(`✅ Found ${songsData.KeyCount} song files (showing first 10)`);
        songsData.Contents.forEach((obj, i) => {
            const sizeMB = (obj.Size / (1024 * 1024)).toFixed(2);
            console.log(`   ${i + 1}. ${obj.Key} (${sizeMB} MB)`);
        });
        console.log();

        // 3. List files in covers folder
        console.log('✓ Checking uploaded covers...');
        const coversData = await s3.listObjectsV2({
            Bucket: process.env.AWS_S3_BUCKET,
            Prefix: 'covers/',
            MaxKeys: 10
        }).promise();

        console.log(`✅ Found ${coversData.KeyCount} cover files (showing first 10)`);
        coversData.Contents.forEach((obj, i) => {
            const sizeKB = (obj.Size / 1024).toFixed(2);
            console.log(`   ${i + 1}. ${obj.Key} (${sizeKB} KB)`);
        });
        console.log();

        // 4. Check bucket policy for public access
        console.log('✓ Checking bucket policy...');
        try {
            const policyData = await s3.getBucketPolicy({
                Bucket: process.env.AWS_S3_BUCKET
            }).promise();

            const policy = JSON.parse(policyData.Policy);
            const hasPublicRead = policy.Statement.some(stmt =>
                stmt.Effect === 'Allow' &&
                stmt.Principal === '*' &&
                (stmt.Action === 's3:GetObject' || stmt.Action.includes('s3:GetObject'))
            );

            if (hasPublicRead) {
                console.log('✅ Bucket has public read access configured');
            } else {
                console.log('⚠️  Bucket policy exists but may not have public read');
            }
        } catch (err) {
            if (err.code === 'NoSuchBucketPolicy') {
                console.log('⚠️  No bucket policy configured - files may not be publicly accessible');
                console.log('   Consider adding a policy for public read access');
            } else {
                throw err;
            }
        }
        console.log();

        // 5. Test file accessibility
        console.log('✓ Testing file accessibility...');
        if (songsData.Contents.length > 0) {
            const testKey = songsData.Contents[0].Key;
            const testUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${testKey}`;
            console.log(`   Test URL: ${testUrl}`);
            console.log('   (Open this URL in browser to verify playback)');
        }
        console.log();

        // 6. Calculate storage costs
        const totalSize = [...songsData.Contents, ...coversData.Contents]
            .reduce((sum, obj) => sum + obj.Size, 0);
        const totalGB = totalSize / (1024 * 1024 * 1024);
        const monthlyCost = totalGB * 0.023; // $0.023 per GB in ap-south-1

        console.log('💰 Storage Cost Estimate:');
        console.log(`   Total size: ${totalGB.toFixed(2)} GB`);
        console.log(`   Monthly cost: $${monthlyCost.toFixed(2)}`);
        console.log();

        console.log('✅ S3 VERIFICATION COMPLETE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Your Stage Music app is configured for S3!');
        console.log('New uploads will go directly to S3.');
        console.log('Make sure to test playback in the browser.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
            console.error('\n⚠️  AWS credentials may be invalid or expired');
            console.error('   Check your .env file and AWS IAM console');
        }
    }
}

verifyS3Setup();
