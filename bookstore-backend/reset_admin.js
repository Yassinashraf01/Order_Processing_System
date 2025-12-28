const db = require('./src/config/db');
const bcrypt = require('bcrypt');

async function resetAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        await db.execute(
            'UPDATE Users SET password = ? WHERE username = ?',
            [hashedPassword, 'admin']
        );
        console.log('Password for user "admin" has been reset to "Admin@123"');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

resetAdmin();
