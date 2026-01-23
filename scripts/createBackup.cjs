const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

/**
 * Create a backup of all Firestore collections
 * This creates a JSON backup that can be restored if needed
 */
async function createBackup() {
    console.log('🔄 Starting Firestore Backup...\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'backups');
    const backupFile = path.join(backupDir, `firestore-backup-${timestamp}.json`);

    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log('✅ Created backups directory');
    }

    const backup = {
        timestamp: new Date().toISOString(),
        project: serviceAccount.project_id,
        collections: {}
    };

    try {
        // Collections to backup
        const collections = ['groups', 'families', 'users', 'admins', 'payments', 'paymentRequests'];

        for (const collectionName of collections) {
            console.log(`📦 Backing up collection: ${collectionName}...`);

            const snapshot = await db.collection(collectionName).get();
            backup.collections[collectionName] = [];

            snapshot.forEach(doc => {
                const data = doc.data();

                // Convert Firestore timestamps to ISO strings for JSON serialization
                const serializedData = JSON.parse(JSON.stringify(data, (key, value) => {
                    if (value && typeof value === 'object' && value._seconds !== undefined) {
                        // Firestore Timestamp
                        return new Date(value._seconds * 1000).toISOString();
                    }
                    return value;
                }));

                backup.collections[collectionName].push({
                    id: doc.id,
                    data: serializedData
                });
            });

            console.log(`   ✅ ${snapshot.size} documents backed up`);
        }

        // Write backup to file
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

        console.log('\n✅ Backup completed successfully!');
        console.log(`📁 Backup file: ${backupFile}`);
        console.log(`📊 Backup size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);

        // Summary
        console.log('\n📋 Backup Summary:');
        for (const [collection, docs] of Object.entries(backup.collections)) {
            console.log(`   - ${collection}: ${docs.length} documents`);
        }

        console.log('\n💡 To restore from this backup, run:');
        console.log(`   node scripts/restoreBackup.cjs "${backupFile}"`);

        return backupFile;

    } catch (error) {
        console.error('❌ Error creating backup:', error);
        throw error;
    }
}

// Run backup
createBackup()
    .then(() => {
        console.log('\n🎉 Backup process completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Backup failed:', error);
        process.exit(1);
    });
