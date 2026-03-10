require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./stage_music.db');

async function mergeDuplicateAlbums() {
    return new Promise((resolve, reject) => {
        console.log('\n🔧 Fixing duplicate Kathputliyaan albums...');

        // Move all songs from ID 57 to ID 53, then delete ID 57
        db.serialize(() => {
            // Update songs from album 57 to album 53
            db.run(
                'UPDATE songs SET album_id = 53 WHERE album_id = 57',
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`  ✅ Moved ${this.changes} songs from duplicate album`);

                        // Delete the duplicate album
                        db.run('DELETE FROM albums WHERE id = 57', (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                console.log('  ✅ Deleted duplicate Kathputliyaan album (ID 57)');

                                // Remove trailing space from the remaining album
                                db.run(
                                    "UPDATE albums SET title = 'Kathputliyaan' WHERE id = 53",
                                    (err) => {
                                        if (err) reject(err);
                                        else {
                                            console.log('  ✅ Fixed album title (removed trailing space)');
                                            resolve();
                                        }
                                    }
                                );
                            }
                        });
                    }
                }
            );
        });
    });
}

async function deleteEmptyAlbum() {
    return new Promise((resolve, reject) => {
        console.log('\n🔧 Deleting empty JholaChhap album (ID 3)...');

        db.run('DELETE FROM albums WHERE id = 3', (err) => {
            if (err) {
                reject(err);
            } else {
                console.log('  ✅ Deleted empty album');
                resolve();
            }
        });
    });
}

async function checkResults() {
    return new Promise((resolve, reject) => {
        console.log('\n📊 Verification:\n');

        db.all(`
            SELECT a.id, a.title, a.language, COUNT(s.id) as song_count
            FROM albums a
            LEFT JOIN songs s ON a.id = s.album_id
            WHERE a.title LIKE '%Kathputli%' OR a.language = 'Bhojpuri'
            GROUP BY a.id
            ORDER BY a.language, a.title
        `, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                console.log('Bhojpuri Albums:');
                rows.filter(r => r.language === 'Bhojpuri').forEach(row => {
                    console.log(`  ${row.id}. ${row.title} - ${row.song_count} songs`);
                });

                console.log('\nRajasthani Albums (Kathputliyaan):');
                rows.filter(r => r.title.includes('Kathputli')).forEach(row => {
                    console.log(`  ${row.id}. ${row.title} - ${row.song_count} songs`);
                });

                resolve();
            }
        });
    });
}

async function main() {
    console.log('🔧 Fixing Album Issues...\n');

    try {
        await mergeDuplicateAlbums();
        await deleteEmptyAlbum();
        await checkResults();

        console.log('\n' + '='.repeat(50));
        console.log('✅ Album issues fixed!');
        console.log('='.repeat(50));
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    db.close();
}

main().catch(console.error);
