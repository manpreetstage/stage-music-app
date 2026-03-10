require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./stage_music.db');

// Load complete cover URLs (both new and existing)
const coverMapping = JSON.parse(fs.readFileSync('complete-cover-mapping.json', 'utf8'));

async function updateAlbumCover(albumId, coverFile) {
    return new Promise((resolve, reject) => {
        const coverUrl = coverMapping[coverFile];
        if (!coverUrl) {
            reject(new Error(`Cover ${coverFile} not found in mapping`));
            return;
        }

        db.run(
            'UPDATE albums SET cover_image = ? WHERE id = ?',
            [coverUrl, albumId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

async function updateSongsCover(albumId, coverFile) {
    return new Promise((resolve, reject) => {
        const coverUrl = coverMapping[coverFile];
        db.run(
            'UPDATE songs SET cover_image = ? WHERE album_id = ?',
            [coverUrl, albumId],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

async function updateSongCoverById(songId, coverFile) {
    return new Promise((resolve, reject) => {
        const coverUrl = coverMapping[coverFile];
        db.run(
            'UPDATE songs SET cover_image = ? WHERE id = ?',
            [coverUrl, songId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

async function moveSongToAlbum(songTitle, albumId) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE songs SET album_id = ? WHERE title = ?',
            [albumId, songTitle],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

async function renameAlbum(albumId, newName) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE albums SET title = ? WHERE id = ?',
            [newName, albumId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

async function main() {
    console.log('🔧 Fixing Bhojpuri Covers Based on CSV...\n');

    try {
        // 1. Fix Naache Dulha Gali Gali: Cover16 → Cover17
        console.log('📀 Fixing: Naache Dulha Gali Gali (Cover16 → Cover17)');
        await updateAlbumCover(58, 'Cover17.jpg');
        const songs1 = await updateSongsCover(58, 'Cover17.jpg');
        console.log(`  ✅ Album and ${songs1} songs updated\n`);

        // 2. Fix Saas Gaari Deve: Cover17 → Cover22
        console.log('📀 Fixing: Saas Gaari Deve (Cover17 → Cover22)');
        await updateAlbumCover(59, 'Cover22.jpg');
        const songs2 = await updateSongsCover(59, 'Cover22.jpg');
        console.log(`  ✅ Album and ${songs2} songs updated`);

        // Move Ankhiya Se to Saas Gaari Deve album
        await moveSongToAlbum('Ankhiya Se', 59);
        await updateSongCoverById(283, 'Cover22.jpg');
        console.log(`  ✅ "Ankhiya Se" moved to Saas Gaari Deve album\n`);

        // 3. Rename Jholachhap Dr → Jholachhap
        console.log('📀 Fixing: Renaming "Jholachhap Dr" → "Jholachhap"');
        await renameAlbum(60, 'Jholachhap');
        console.log(`  ✅ Album renamed\n`);

        // 4. Fix Mere Bholenaath: Cover21 → Cover16
        console.log('📀 Fixing: Mere Bholenaath (Cover21 → Cover16)');
        await updateSongCoverById(289, 'Cover16.jpg');
        console.log(`  ✅ Song cover updated\n`);

        // Verification
        console.log('📊 Verification:\n');
        db.all(`
            SELECT a.id, a.title,
                   SUBSTR(a.cover_image, -15) as cover,
                   COUNT(s.id) as songs
            FROM albums a
            LEFT JOIN songs s ON a.id = s.album_id
            WHERE a.language = 'Bhojpuri'
            GROUP BY a.id
            ORDER BY a.title
        `, (err, rows) => {
            if (err) {
                console.error('Error:', err);
            } else {
                rows.forEach(row => {
                    console.log(`${row.title}: ${row.cover} (${row.songs} songs)`);
                });

                console.log('\n' + '='.repeat(50));
                console.log('✅ All Bhojpuri covers fixed as per CSV!');
                console.log('='.repeat(50));
            }
            db.close();
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        db.close();
    }
}

main().catch(console.error);
