require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@libsql/client');

// Local SQLite database
const localDb = new sqlite3.Database('./stage_music.db');

// Turso database (add your credentials)
const tursoDb = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrateTables() {
    console.log('🚀 Starting migration to Turso...\n');

    try {
        // Get schema from local database
        console.log('📋 Reading local database schema...');

        localDb.all("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", async (err, tables) => {
            if (err) {
                console.error('❌ Error reading schema:', err);
                return;
            }

            console.log(`✅ Found ${tables.length} tables\n`);

            // Create tables in Turso
            for (const table of tables) {
                console.log(`Creating table: ${table.sql.match(/CREATE TABLE (\w+)/)[1]}`);
                try {
                    await tursoDb.execute(table.sql);
                    console.log('✅ Created successfully\n');
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        console.log('⚠️  Table already exists, skipping\n');
                    } else {
                        console.error('❌ Error:', error.message, '\n');
                    }
                }
            }

            // Migrate data
            console.log('📊 Migrating data...\n');
            await migrateData();
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

async function migrateData() {
    // Migrate songs
    localDb.all('SELECT * FROM songs', async (err, rows) => {
        if (err) {
            console.error('❌ Error reading songs:', err);
            return;
        }

        console.log(`📀 Migrating ${rows.length} songs...`);

        for (const song of rows) {
            try {
                await tursoDb.execute({
                    sql: `INSERT OR REPLACE INTO songs (id, title, singer, music_director, composer, company, lyrics, audio_file, cover_image, duration, plays, created_at, language, youtube_url, user_id, is_approved, album_id, play_count)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [
                        song.id, song.title, song.singer, song.music_director, song.composer,
                        song.company, song.lyrics, song.audio_file, song.cover_image, song.duration,
                        song.plays, song.created_at, song.language, song.youtube_url, song.user_id,
                        song.is_approved, song.album_id, song.play_count
                    ]
                });
            } catch (error) {
                console.error(`❌ Error migrating song ${song.id}:`, error.message);
            }
        }

        console.log('✅ Songs migrated!\n');

        // Migrate other tables
        await migrateAlbums();
        await migrateFeaturedSongs();
        await migrateUsers();

        console.log('\n🎉 Migration complete!');
        console.log('✅ Your database is now on Turso cloud!');
        process.exit(0);
    });
}

async function migrateAlbums() {
    return new Promise((resolve) => {
        localDb.all('SELECT * FROM albums', async (err, rows) => {
            if (err || !rows) {
                console.log('⚠️  No albums table found');
                resolve();
                return;
            }

            console.log(`📚 Migrating ${rows.length} albums...`);

            for (const album of rows) {
                try {
                    await tursoDb.execute({
                        sql: `INSERT OR REPLACE INTO albums (id, name, artist, cover_image, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
                        args: [album.id, album.name, album.artist, album.cover_image, album.created_at, album.user_id]
                    });
                } catch (error) {
                    console.error(`❌ Error migrating album ${album.id}:`, error.message);
                }
            }

            console.log('✅ Albums migrated!\n');
            resolve();
        });
    });
}

async function migrateFeaturedSongs() {
    return new Promise((resolve) => {
        localDb.all('SELECT * FROM featured_songs', async (err, rows) => {
            if (err || !rows || rows.length === 0) {
                console.log('⚠️  No featured songs found');
                resolve();
                return;
            }

            console.log(`⭐ Migrating ${rows.length} featured songs...`);

            for (const featured of rows) {
                try {
                    await tursoDb.execute({
                        sql: `INSERT OR REPLACE INTO featured_songs (id, song_id, position, created_at) VALUES (?, ?, ?, ?)`,
                        args: [featured.id, featured.song_id, featured.position, featured.created_at]
                    });
                } catch (error) {
                    console.error(`❌ Error:`, error.message);
                }
            }

            console.log('✅ Featured songs migrated!\n');
            resolve();
        });
    });
}

async function migrateUsers() {
    return new Promise((resolve) => {
        localDb.all('SELECT * FROM users', async (err, rows) => {
            if (err || !rows) {
                console.log('⚠️  No users table found');
                resolve();
                return;
            }

            console.log(`👥 Migrating ${rows.length} users...`);

            for (const user of rows) {
                try {
                    await tursoDb.execute({
                        sql: `INSERT OR REPLACE INTO users (id, email, password, is_admin, created_at) VALUES (?, ?, ?, ?, ?)`,
                        args: [user.id, user.email, user.password, user.is_admin, user.created_at]
                    });
                } catch (error) {
                    console.error(`❌ Error migrating user ${user.id}:`, error.message);
                }
            }

            console.log('✅ Users migrated!\n');
            resolve();
        });
    });
}

// Run migration
migrateTables();
