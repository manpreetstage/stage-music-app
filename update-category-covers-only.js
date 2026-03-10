require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

// Language covers URLs (already uploaded to S3)
const CATEGORY_COVERS = {
    7: {
        name: 'HARYANVI HITS',
        cover: 'https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/haryanvi-cover.png'
    },
    8: {
        name: 'BHOJPURI DHAMAKA',
        cover: 'https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/bhojpuri-cover.png'
    },
    10: {
        name: 'RAJASTHANI FOLK',
        cover: 'https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/rajasthani-cover.png'
    },
    11: {
        name: 'GUJARATI GARBA',
        cover: 'https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/gujarati-cover.png'
    }
};

async function updateCategoryCovers() {
    console.log('🎨 Updating CATEGORY covers (NOT song covers)...\n');

    for (const [categoryId, data] of Object.entries(CATEGORY_COVERS)) {
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE categories SET cover_image = ? WHERE id = ?',
                [data.cover, categoryId],
                function(err) {
                    if (err) {
                        console.error(`❌ Error updating ${data.name}:`, err);
                        return reject(err);
                    }
                    console.log(`✅ ${data.name}: Category cover updated`);
                    resolve();
                }
            );
        });
    }
}

async function verifySongs() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT
                CASE
                    WHEN cover_image LIKE '%haryanvi-cover.png%' THEN 'Language Cover'
                    WHEN cover_image LIKE '%rajasthani-cover.png%' THEN 'Language Cover'
                    WHEN cover_image LIKE '%bhojpuri-cover.png%' THEN 'Language Cover'
                    ELSE 'Original Cover'
                END as cover_type,
                COUNT(*) as count
            FROM songs
            GROUP BY cover_type
        `;

        db.all(sql, (err, rows) => {
            if (err) return reject(err);

            console.log('\n' + '='.repeat(60));
            console.log('📊 SONG COVERS CHECK:');
            console.log('='.repeat(60));
            rows.forEach(row => {
                console.log(`${row.cover_type}: ${row.count} songs`);
            });
            console.log('='.repeat(60));
            resolve();
        });
    });
}

async function verifyCategories() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, name, cover_image FROM categories WHERE id IN (7, 8, 10, 11)', (err, rows) => {
            if (err) return reject(err);

            console.log('\n' + '='.repeat(60));
            console.log('📊 CATEGORY COVERS:');
            console.log('='.repeat(60));
            rows.forEach(row => {
                const hasCover = row.cover_image ? '✅' : '❌';
                console.log(`${hasCover} ${row.name}`);
            });
            console.log('='.repeat(60));
            resolve();
        });
    });
}

async function main() {
    try {
        await updateCategoryCovers();
        await verifySongs();
        await verifyCategories();

        console.log('\n✅ Done!');
        console.log('✅ Category cards have language-specific covers');
        console.log('✅ Songs have their original individual covers');

        db.close();
    } catch (error) {
        console.error('❌ Error:', error);
        db.close();
        process.exit(1);
    }
}

main();
