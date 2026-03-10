require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./stage_music.db');

async function resetAdminPassword() {
    const newPassword = 'admin123'; // Simple password for user
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET password = ? WHERE username = ?',
            [hashedPassword, 'admin'],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Admin password reset successfully!\n');
                    console.log('📝 Admin Credentials:');
                    console.log('   Username: admin');
                    console.log('   Password: admin123\n');
                    resolve();
                }
            }
        );
    });
}

async function main() {
    console.log('🔧 Resetting Admin Password...\n');

    try {
        await resetAdminPassword();

        console.log('🌐 Admin Panel Access:');
        console.log('   URL: https://3-111-168-236.nip.io/admin/');
        console.log('   Or: https://3-111-168-236.nip.io/admin/index.html\n');

        console.log('📋 Available Admin Pages:');
        console.log('   • /admin/dashboard.html - Main dashboard');
        console.log('   • /admin/top10.html - Manage Quick Picks (Featured Songs)');
        console.log('   • /admin/categories.html - Manage categories');
        console.log('   • /admin/index.html - Upload songs from YouTube\n');

        console.log('='.repeat(60));
        console.log('✅ Admin access ready!');
        console.log('='.repeat(60));
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    db.close();
}

main().catch(console.error);
