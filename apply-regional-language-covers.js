require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

// Language covers already uploaded to S3
const LANGUAGE_COVERS = {
    'HARYANVI HITS': 'https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/haryanvi-cover.png',
    'BHOJPURI DHAMAKA': 'https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/bhojpuri-cover.png',
    'RAJASTHANI FOLK': 'https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/rajasthani-cover.png',
    'GUJARATI GARBA': 'https://stage-music-files.s3.ap-south-1.amazonaws.com/covers/gujarati-cover.png'
};

// Regional category IDs
const REGIONAL_CATEGORIES = {
    7: 'HARYANVI HITS',
    8: 'BHOJPURI DHAMAKA',
    10: 'RAJASTHANI FOLK',
    11: 'GUJARATI GARBA'
};

async function updateCategoryCovers() {
    console.log('🎨 Applying language-specific covers to regional categories...\n');

    for (const [categoryId, categoryName] of Object.entries(REGIONAL_CATEGORIES)) {
        const coverUrl = LANGUAGE_COVERS[categoryName];

        await new Promise((resolve, reject) => {
            const sql = `
                UPDATE songs
                SET cover_image = ?
                WHERE id IN (
                    SELECT song_id
                    FROM category_songs
                    WHERE category_id = ?
                )
            `;

            db.run(sql, [coverUrl, categoryId], function(err) {
                if (err) {
                    console.error(`❌ Error updating ${categoryName}:`, err);
                    return reject(err);
                }
                console.log(`✅ ${categoryName}: Updated ${this.changes} songs`);
                resolve();
            });
        });
    }
}

async function showSummary() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT c.name as category, COUNT(s.id) as count
            FROM categories c
            INNER JOIN category_songs cs ON c.id = cs.category_id
            INNER JOIN songs s ON cs.song_id = s.id
            WHERE c.id IN (7, 8, 10, 11)
            GROUP BY c.name
            ORDER BY c.id
        `;

        db.all(sql, (err, rows) => {
            if (err) return reject(err);

            console.log('\n' + '='.repeat(60));
            console.log('📊 SUMMARY:');
            console.log('='.repeat(60));
            rows.forEach(row => {
                console.log(`${row.category}: ${row.count} songs`);
            });
            console.log('='.repeat(60));
            resolve();
        });
    });
}

async function main() {
    try {
        await updateCategoryCovers();
        await showSummary();
        console.log('\n✅ Done! Regional categories now have language-specific covers.');
        console.log('✅ All other songs kept their original individual covers.');
        db.close();
    } catch (error) {
        console.error('❌ Error:', error);
        db.close();
        process.exit(1);
    }
}

main();
