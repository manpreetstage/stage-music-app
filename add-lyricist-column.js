require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./stage_music.db');

async function addColumn() {
    return new Promise((resolve, reject) => {
        console.log('🔧 Adding lyricist column to songs table...\n');

        db.run(`
            ALTER TABLE songs ADD COLUMN lyricist TEXT
        `, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log('ℹ️  Column already exists, skipping...\n');
                    resolve();
                } else {
                    reject(err);
                }
                return;
            }

            console.log('✅ Column added successfully!\n');
            resolve();
        });
    });
}

async function verifySchema() {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT sql FROM sqlite_master
            WHERE type='table' AND name='songs'
        `, (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            console.log('📋 Updated Schema:');
            console.log(row.sql);
            resolve();
        });
    });
}

async function main() {
    console.log('🎵 Adding Lyricist Column to Songs Table\n');
    console.log('='.repeat(80));

    try {
        await addColumn();
        await verifySchema();

        console.log('\n' + '='.repeat(80));
        console.log('✅ Schema update complete!');
        console.log('='.repeat(80));
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    db.close();
}

main().catch(console.error);
