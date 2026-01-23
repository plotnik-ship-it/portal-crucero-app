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
 * Restore Firestore from a backup file
 * WARNING: This will overwrite existing data
 */
async function restoreBackup(backupFilePath) {
    console.log('🔄 Starting Firestore Restore...\n');

    if (!fs.existsSync(backupFilePath)) {
        console.error('❌ Backup file not found:', backupFilePath);
        process.exit(1);
    }

    try {
        // Read backup file
        const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

        console.log('📋 Backup Information:');
        console.log(`   - Created: ${backupData.timestamp}`);
        console.log(`   - Project: ${backupData.project}`);
        console.log(`   - Collections: ${Object.keys(backupData.collections).length}`);

        // Confirm before proceeding
        console.log('\n⚠️  WARNING: This will overwrite existing data!');
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

        await new Promise(resolve => setTimeout(resolve, 5000));

        // Restore each collection
        for (const [collectionName, documents] of Object.entries(backupData.collections)) {
            console.log(`📦 Restoring collection: ${collectionName}...`);

            for (const doc of documents) {
                // Convert ISO strings back to Firestore Timestamps
                const data = JSON.parse(JSON.stringify(doc.data, (key, value) => {
                    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
                        // Looks like an ISO date string
                        return admin.firestore.Timestamp.fromDate(new Date(value));
                    }
                    return value;
                }));

                await db.collection(collectionName).doc(doc.id).set(data);
            }

            console.log(`   ✅ ${documents.length} documents restored`);
        }

        console.log('\n✅ Restore completed successfully!');

        // Summary
        console.log('\n📋 Restore Summary:');
        for (const [collection, docs] of Object.entries(backupData.collections)) {
            console.log(`   - ${collection}: ${docs.length} documents`);
        }

    } catch (error) {
        console.error('❌ Error restoring backup:', error);
        throw error;
    }
}

// Get backup file from command line argument
const backupFile = process.argv[2];

if (!backupFile) {
    console.error('❌ Usage: node restoreBackup.cjs <backup-file-path>');
    console.log('\nExample:');
    console.log('  node scripts/restoreBackup.cjs backups/firestore-backup-2026-01-22.json');
    process.exit(1);
}

// Run restore
restoreBackup(backupFile)
    .then(() => {
        console.log('\n🎉 Restore process completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Restore failed:', error);
        process.exit(1);
    });
