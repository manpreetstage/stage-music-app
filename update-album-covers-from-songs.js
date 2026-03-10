require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

console.log('🎨 UPDATING ALBUM COVERS FROM SONGS\n');

async function updateAlbumCovers() {
    return new Promise((resolve, reject) => {
        // Get all albums with their first song's cover
        const sql = `
            SELECT a.id, a.title,
                   (SELECT s.cover_image FROM songs s WHERE s.album_id = a.id LIMIT 1) as first_song_cover,
                   (SELECT COUNT(*) FROM songs WHERE album_id = a.id) as song_count
            FROM albums a
            WHERE a.language IN ('Haryanvi', 'Rajasthani')
        `;

        db.all(sql, async (err, albums) => {
            if (err) return reject(err);

            let updated = 0;

            for (const album of albums) {
                if (album.song_count > 0 && album.first_song_cover) {
                    await new Promise((res, rej) => {
                        db.run('UPDATE albums SET cover_image = ? WHERE id = ?',
                            [album.first_song_cover, album.id], (err) => {
                            if (err) return rej(err);
                            console.log(`✅ Updated: ${album.title} → ${album.first_song_cover.split('/').pop()}`);
                            updated++;
                            res();
                        });
                    });
                }
            }

            console.log(`\n✅ Updated ${updated} album covers!`);
            resolve();
        });
    });
}

async function verifyResults() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT a.title, a.cover_image as album_cover, s.cover_image as song_cover
            FROM albums a
            JOIN songs s ON s.album_id = a.id
            WHERE a.title IN ('Reet', '1600 Meter', 'Namak')
            GROUP BY a.id
        `;

        db.all(sql, (err, rows) => {
            if (err) return reject(err);

            console.log('\n' + '='.repeat(70));
            console.log('📊 VERIFICATION (Sample Albums):');
            console.log('='.repeat(70));

            rows.forEach(row => {
                const match = row.album_cover === row.song_cover ? '✅' : '❌';
                console.log(`${match} ${row.title}`);
                console.log(`   Album: ${row.album_cover.split('/').pop()}`);
                console.log(`   Song:  ${row.song_cover.split('/').pop()}`);
            });

            console.log('='.repeat(70));
            resolve();
        });
    });
}

async function main() {
    try {
        await updateAlbumCovers();
        await verifyResults();

        console.log('\n✅ SAHI HO GAYA! Albums ab songs ke covers use kar rahe hain!');
        console.log('✅ Ab mobile app refresh karo - covers sahi dikhenge!\n');

        db.close();
    } catch (error) {
        console.error('❌ Error:', error);
        db.close();
        process.exit(1);
    }
}

main();
