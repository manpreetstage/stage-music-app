const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./stage_music.db');

console.log('🎵 Adding More Categories...\n');

const newCategories = [
    { name: 'TOP 10 TRENDING', description: 'Hottest songs right now', icon: 'trending' },
    { name: 'POPULAR ALBUMS', description: 'Most loved albums', icon: 'albums' },
    { name: 'HARYANVI HITS', description: 'Best of Haryanvi music', icon: 'haryanvi' },
    { name: 'RAJASTHANI FOLK', description: 'Traditional Rajasthani songs', icon: 'rajasthani' },
    { name: 'BHOJPURI DHAMAKA', description: 'Energetic Bhojpuri tracks', icon: 'bhojpuri' }
];

let completed = 0;

newCategories.forEach((cat, index) => {
    db.run(
        `INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)`,
        [cat.name, cat.description, cat.icon],
        function(err) {
            if (err) {
                console.error(`❌ Error inserting ${cat.name}:`, err.message);
            } else {
                console.log(`✅ ${cat.name} created (ID: ${this.lastID})`);
            }

            completed++;
            if (completed === newCategories.length) {
                console.log('\n🎉 All new categories added!');
                console.log('📝 Total categories: 10\n');
                db.close();
            }
        }
    );
});
