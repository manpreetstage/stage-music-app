require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./stage_music.db');

async function removeDuplicates() {
    return new Promise((resolve, reject) => {
        console.log('🔧 Removing duplicate Kathputliyaan songs...\n');

        // Delete songs from Kathputliyaan album with ID >= 243
        // These are all duplicates of the original 30 songs (IDs 201-230)
        db.run(
            'DELETE FROM songs WHERE album_id = 53 AND id >= 243',
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Deleted ${this.changes} duplicate songs\n`);

                    // Also clean up category mappings
                    db.run(
                        'DELETE FROM category_songs WHERE song_id >= 243 AND song_id <= 272',
                        (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                console.log('✅ Cleaned up category mappings\n');
                                resolve(this.changes);
                            }
                        }
                    );
                }
            }
        );
    });
}

async function verifyResults() {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT COUNT(*) as count FROM songs WHERE album_id = 53',
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('📊 Verification:');
                    console.log(`  Kathputliyaan album now has: ${row.count} songs`);
                    console.log('  Expected: 30 songs (as per CSV)\n');

                    if (row.count === 30) {
                        console.log('✅ Perfect! All duplicates removed.');
                    } else {
                        console.log(`⚠️  Warning: Expected 30 songs, but found ${row.count}`);
                    }

                    resolve();
                }
            }
        );
    });
}

async function main() {
    console.log('🔧 Fixing Kathputliyaan Album Duplicates...\n');

    try {
        await removeDuplicates();
        await verifyResults();

        console.log('\n' + '='.repeat(50));
        console.log('✅ Kathputliyaan duplicates fixed!');
        console.log('='.repeat(50));
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    db.close();
}

main().catch(console.error);
