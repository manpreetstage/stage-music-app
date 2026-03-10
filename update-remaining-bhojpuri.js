require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./stage_music.db');

// Remaining songs with exact data from CSV
const songsToUpdate = [
    {
        id: 284,
        title: 'Balamua Chunale Bani',
        singer: 'Priyanka Singh',
        lyricist: 'Azad Singh',
        music: 'Azad SIngh & Vishal Singh'
    },
    {
        id: 286,
        title: 'Nwa Nwa Pyaar',
        singer: 'Sugam Singh & Aavya Dubey',
        lyricist: 'Azad Singh',
        music: 'Azad SIngh & Vishal Singh'
    },
    {
        id: 287,
        title: 'Sagaro Mati Ho Gail',
        singer: 'Alok Kumar',
        lyricist: 'Azad Singh',
        music: 'Azad SIngh & Vishal Singh'
    },
    {
        id: 288,
        title: 'Mai Se Mila Da Hey Chhathi Mai',
        singer: 'Jyoti Sharma',
        lyricist: 'Pyare Lal Yadav Ji',
        music: 'Sajan Mishra'
    },
    {
        id: 290,
        title: 'Sun la Arajiya Hamar Chhathi Maiya',
        singer: 'Sujeet Gautam, Sandhya Sargam',
        lyricist: 'Kumar Sona',
        music: 'Aman Shlok'
    }
];

async function updateSong(song) {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE songs
            SET singer = ?,
                lyricist = ?,
                music_director = ?
            WHERE id = ?
        `, [song.singer, song.lyricist, song.music, song.id], function(err) {
            if (err) {
                reject(err);
                return;
            }

            console.log(`✅ Updated: ${song.title}`);
            console.log(`   Singer: ${song.singer}`);
            console.log(`   Lyricist: ${song.lyricist}`);
            console.log(`   Music: ${song.music}\n`);

            resolve();
        });
    });
}

async function verifyAll() {
    return new Promise((resolve, reject) => {
        console.log('\n📊 Final Verification - All Bhojpuri Songs:\n');
        console.log('='.repeat(80));

        db.all(`
            SELECT s.id, s.title, s.singer, s.lyricist, s.music_director, a.title as album
            FROM songs s
            JOIN albums a ON s.album_id = a.id
            WHERE a.language = 'Bhojpuri'
            ORDER BY a.title, s.id
        `, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            let currentAlbum = '';
            rows.forEach(row => {
                if (currentAlbum !== row.album) {
                    currentAlbum = row.album;
                    console.log(`\n🎵 Album: ${currentAlbum}`);
                    console.log('-'.repeat(80));
                }
                console.log(`${row.id}. ${row.title}`);
                console.log(`   Singer: ${row.singer || 'NOT SET'}`);
                console.log(`   Lyricist: ${row.lyricist || 'NOT SET'}`);
                console.log(`   Music: ${row.music_director || 'NOT SET'}`);
                console.log('');
            });

            // Summary
            const missingSinger = rows.filter(r => !r.singer || r.singer === '-').length;
            const missingLyricist = rows.filter(r => !r.lyricist).length;
            const missingMusic = rows.filter(r => !r.music_director || r.music_director === '-').length;

            console.log('='.repeat(80));
            console.log('\n📈 Final Summary:');
            console.log(`  Total Bhojpuri songs: ${rows.length}`);
            console.log(`  Missing Singer: ${missingSinger}`);
            console.log(`  Missing Lyricist: ${missingLyricist}`);
            console.log(`  Missing Music Director: ${missingMusic}`);

            if (missingSinger === 0 && missingLyricist === 0 && missingMusic === 0) {
                console.log('\n✅ ALL BHOJPURI SONGS HAVE COMPLETE CREDITS! 🎉');
            }

            resolve();
        });
    });
}

async function main() {
    console.log('🎵 Updating Remaining Bhojpuri Songs\n');
    console.log('='.repeat(80));

    try {
        console.log('📝 Updating songs by ID...\n');

        for (const song of songsToUpdate) {
            await updateSong(song);
        }

        console.log('='.repeat(80));
        console.log(`✅ Updated ${songsToUpdate.length} songs successfully!\n`);

        // Final verification
        await verifyAll();

        console.log('\n' + '='.repeat(80));
        console.log('✅ All Bhojpuri credits complete!');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    db.close();
}

main().catch(console.error);
