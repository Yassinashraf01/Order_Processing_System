const db = require('./src/config/db');

async function checkUsers() {
    try {
        const [users] = await db.execute('SELECT username, role FROM Users');
        console.log('Current Users:', JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUsers();
