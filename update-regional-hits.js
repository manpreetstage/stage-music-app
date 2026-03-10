require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = './stage_music.db';
const db = new sqlite3.Database(DB_PATH);

console.log('🎯 UPDATING REGIONAL HITS CATEGORIES\n');

// Clear and repopulate category songs by language
async function updateRegionalHits() {
    try {
        // Get category IDs
        const categories = await new Promise((resolve, reject) => {
            db.all(`SELECT id, name FROM categories WHERE name IN
                ('HARYANVI HITS', 'RAJASTHANI FOLK', 'BHOJPURI DHAMAKA', 'GUJARATI GARBA')`,
                (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        console.log('📋 Categories found:');
        categories.forEach(cat => console.log(`   - ${cat.name} (ID: ${cat.id})`));
        console.log('');

        // Language mapping
        const langMap = {
            'HARYANVI HITS': 'Haryanvi',
            'RAJASTHANI FOLK': 'Rajasthani',
            'BHOJPURI DHAMAKA': 'Bhojpuri',
            'GUJARATI GARBA': 'Gujarati'
        };

        for (const category of categories) {
            const language = langMap[category.name];

            console.log(`\n🔄 Processing: ${category.name} (${language})`);

            // Get all songs for this language
            const songs = await new Promise((resolve, reject) => {
                db.all('SELECT id, title FROM songs WHERE language = ?', [language], (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                });
            });

            console.log(`   📊 Found ${songs.length} ${language} songs`);

            // Clear existing mappings for this category
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM category_songs WHERE category_id = ?', [category.id], (err) => {
                    if (err) return reject(err);
                    console.log(`   🗑️  Cleared old mappings`);
                    resolve();
                });
            });

            // Add all songs to category
            let added = 0;
            for (const song of songs) {
                await new Promise((resolve, reject) => {
                    db.run('INSERT INTO category_songs (category_id, song_id) VALUES (?, ?)',
                        [category.id, song.id], (err) => {
                        if (err) {
                            // Skip if already exists (shouldn't happen after DELETE)
                            if (!err.message.includes('UNIQUE constraint')) {
                                return reject(err);
                            }
                        }
                        resolve();
                    });
                });
                added++;
            }

            console.log(`   ✅ Added ${added} songs to ${category.name}`);
        }

        // Verify results
        console.log('\n' + '='.repeat(70));
        console.log('📊 FINAL VERIFICATION:');
        console.log('='.repeat(70));

        const verification = await new Promise((resolve, reject) => {
            db.all(`
                SELECT c.name, COUNT(cs.song_id) as song_count,
                       GROUP_CONCAT(DISTINCT s.language) as languages
                FROM categories c
                LEFT JOIN category_songs cs ON c.id = cs.category_id
                LEFT JOIN songs s ON s.id = cs.song_id
                WHERE c.name IN ('HARYANVI HITS', 'RAJASTHANI FOLK', 'BHOJPURI DHAMAKA', 'GUJARATI GARBA')
                GROUP BY c.id
            `, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        verification.forEach(row => {
            const icon = row.song_count > 0 ? '✅' : '⚠️';
            console.log(`${icon} ${row.name}: ${row.song_count} songs (${row.languages || 'none'})`);
        });

        console.log('='.repeat(70));
        console.log('\n✅ REGIONAL HITS UPDATED!');
        console.log('✅ Sab categories me correct language ke songs hain!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run
updateRegionalHits();
