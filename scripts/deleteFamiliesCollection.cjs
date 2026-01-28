/**
 * Cleanup Script: Delete Families Collection
 * 
 * ⚠️  WARNING: This will permanently delete the 'families' collection
 * Only run this AFTER verifying the bookings migration was successful
 * 
 * Usage: node scripts/deleteFamiliesCollection.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const readline = require('readline');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Create readline interface for user confirmation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function deleteFamiliesCollection() {
    console.log('⚠️  WARNING: This will DELETE the entire families collection!');
    console.log('   This action CANNOT be undone.\n');

    const answer = await askQuestion('Are you sure you want to continue? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Deletion cancelled.');
        rl.close();
        process.exit(0);
    }

    console.log('\n🗑️  Starting deletion of families collection...\n');

    try {
        const familiesSnapshot = await db.collection('families').get();

        if (familiesSnapshot.empty) {
            console.log('✅ Families collection is already empty.');
            rl.close();
            process.exit(0);
        }

        console.log(`📊 Found ${familiesSnapshot.size} families to delete\n`);

        let deletedCount = 0;

        for (const familyDoc of familiesSnapshot.docs) {
            const familyId = familyDoc.id;
            const familyData = familyDoc.data();

            try {
                console.log(`🗑️  Deleting: ${familyData.displayName || familyId}`);

                // Delete subcollections
                const authSnapshot = await db.collection('families').doc(familyId).collection('auth').get();
                for (const doc of authSnapshot.docs) {
                    await doc.ref.delete();
                }

                const paymentsSnapshot = await db.collection('families').doc(familyId).collection('payments').get();
                for (const doc of paymentsSnapshot.docs) {
                    await doc.ref.delete();
                }

                const requestsSnapshot = await db.collection('families').doc(familyId).collection('paymentRequests').get();
                for (const doc of requestsSnapshot.docs) {
                    await doc.ref.delete();
                }

                // Delete main document
                await familyDoc.ref.delete();

                deletedCount++;
                console.log(`  ✅ Deleted successfully`);

            } catch (error) {
                console.error(`  ❌ Error deleting ${familyId}:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Deleted ${deletedCount} families`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Deletion failed:', error);
    } finally {
        rl.close();
        process.exit(0);
    }
}

// Run deletion
deleteFamiliesCollection();
