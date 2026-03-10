require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./stage_music.db');

// 5 Custom Sections
const sections = [
    { id: 1, name: 'Haryanvi Tadka', icon: '🔥', display_order: 1 },
    { id: 2, name: 'Haryanvi Love', icon: '❤️', display_order: 2 },
    { id: 3, name: 'Rajasthani Hits', icon: '🎵', display_order: 3 },
    { id: 4, name: 'Rajasthani Soul', icon: '🎸', display_order: 4 },
    { id: 5, name: 'Bhojpuri Dhamaka', icon: '💥', display_order: 5 }
];

async function createTables() {
    return new Promise((resolve, reject) => {
        console.log('🔧 Creating custom sections tables...\n');

        // Create custom_sections table
        db.run(`
            CREATE TABLE IF NOT EXISTS custom_sections (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                display_order INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                reject(err);
                return;
            }
            console.log('✅ custom_sections table created');

            // Create custom_section_songs table
            db.run(`
                CREATE TABLE IF NOT EXISTS custom_section_songs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    section_id INTEGER NOT NULL,
                    song_id INTEGER NOT NULL,
                    position INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (section_id) REFERENCES custom_sections(id) ON DELETE CASCADE,
                    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
                    UNIQUE(section_id, song_id)
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('✅ custom_section_songs table created\n');
                resolve();
            });
        });
    });
}

async function insertSections() {
    return new Promise((resolve, reject) => {
        console.log('📝 Inserting 5 custom sections...\n');

        const stmt = db.prepare(`
            INSERT OR REPLACE INTO custom_sections (id, name, icon, display_order)
            VALUES (?, ?, ?, ?)
        `);

        sections.forEach(section => {
            stmt.run(section.id, section.name, section.icon, section.display_order);
            console.log(`✅ ${section.icon} ${section.name}`);
        });

        stmt.finalize((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function verify() {
    return new Promise((resolve, reject) => {
        console.log('\n📊 Verification:\n');
        console.log('='.repeat(80));

        db.all('SELECT * FROM custom_sections ORDER BY display_order', (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            console.log('Custom Sections:');
            rows.forEach(row => {
                console.log(`  ${row.id}. ${row.icon} ${row.name} (Order: ${row.display_order})`);
            });

            resolve();
        });
    });
}

async function main() {
    console.log('🎵 Creating Custom Music Sections\n');
    console.log('='.repeat(80));

    try {
        await createTables();
        await insertSections();
        await verify();

        console.log('\n' + '='.repeat(80));
        console.log('✅ Custom sections created successfully!');
        console.log('='.repeat(80));
        console.log('\nNext steps:');
        console.log('1. Add backend APIs');
        console.log('2. Create admin panel');
        console.log('3. Update mobile UI\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    db.close();
}

main().catch(console.error);
