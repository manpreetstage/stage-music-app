const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./stage_music.db', (err) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }

    console.log('Creating authentication tables...');

    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            console.log('✅ Users table created');

            // Create default admin user
            const adminPassword = bcrypt.hashSync('admin123', 10);

            db.run(`INSERT OR IGNORE INTO users (username, email, password, full_name, role)
                    VALUES (?, ?, ?, ?, ?)`,
                ['admin', 'admin@stage.in', adminPassword, 'Stage Admin', 'admin'],
                (err) => {
                    if (err) {
                        console.log('Admin already exists or error:', err.message);
                    } else {
                        console.log('✅ Default admin created (username: admin, password: admin123)');
                    }
                }
            );
        }
    });

    // Add user_id column to songs table
    db.run('ALTER TABLE songs ADD COLUMN user_id INTEGER', (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding user_id:', err);
        } else {
            console.log('✅ user_id column added to songs');
        }
    });

    // Add is_approved column for admin moderation
    db.run('ALTER TABLE songs ADD COLUMN is_approved INTEGER DEFAULT 1', (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding is_approved:', err);
        } else {
            console.log('✅ is_approved column added to songs');
            db.close();
        }
    });
});
