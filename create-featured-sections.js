require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./stage_music.db');

async function createTables() {
    return new Promise((resolve, reject) => {
        console.log('🔧 Creating featured sections tables...\n');

        // Create quick_picks table
        db.run(`
            CREATE TABLE IF NOT EXISTS quick_picks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                song_id INTEGER NOT NULL,
                position INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
                UNIQUE(song_id)
            )
        `, (err) => {
            if (err) {
                reject(err);
                return;
            }
            console.log('✅ quick_picks table created');

            // Create trending_songs table
            db.run(`
                CREATE TABLE IF NOT EXISTS trending_songs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    song_id INTEGER NOT NULL,
                    position INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
                    UNIQUE(song_id)
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('✅ trending_songs table created');
                resolve();
            });
        });
    });
}

async function verifyTables() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT name FROM sqlite_master
            WHERE type='table'
            AND (name='quick_picks' OR name='trending_songs')
            ORDER BY name
        `, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            console.log('\n📊 Verification:');
            rows.forEach(row => {
                console.log(`  ✅ Table exists: ${row.name}`);
            });
            resolve();
        });
    });
}

async function main() {
    console.log('🎵 Stage Music - Creating Featured Sections\n');
    console.log('='.repeat(50));

    try {
        await createTables();
        await verifyTables();

        console.log('\n' + '='.repeat(50));
        console.log('✅ Featured sections tables ready!');
        console.log('='.repeat(50));
        console.log('\nNext steps:');
        console.log('1. Run: node add-featured-apis.js');
        console.log('2. Deploy to server');
        console.log('3. Use admin panel to add songs\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    db.close();
}

main().catch(console.error);
