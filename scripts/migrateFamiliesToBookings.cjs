/**
 * Migration Script: Families → Bookings
 * 
 * This script migrates all data from the 'families' collection to 'bookings'
 * including all subcollections (auth, payments, paymentRequests)
 * 
 * Usage: node scripts/migrateFamiliesToBookings.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateFamiliesToBookings() {
    console.log('🚀 Starting migration: families → bookings\n');

    try {
        // Get all families
        const familiesSnapshot = await db.collection('families').get();

        if (familiesSnapshot.empty) {
            console.log('⚠️  No families found to migrate.');
            return;
        }

        console.log(`📊 Found ${familiesSnapshot.size} families to migrate\n`);

        let successCount = 0;
        let errorCount = 0;

        // Process each family
        for (const familyDoc of familiesSnapshot.docs) {
            const familyId = familyDoc.id;
            const familyData = familyDoc.data();

            try {
                console.log(`\n📦 Migrating: ${familyData.displayName || familyId}`);

                // 1. Copy main document to bookings collection
                await db.collection('bookings').doc(familyId).set(familyData);
                console.log(`  ✅ Main document copied`);

                // 2. Migrate auth subcollection
                const authSnapshot = await db.collection('families').doc(familyId)
                    .collection('auth').get();

                if (!authSnapshot.empty) {
                    for (const authDoc of authSnapshot.docs) {
                        await db.collection('bookings').doc(familyId)
                            .collection('auth').doc(authDoc.id).set(authDoc.data());
                    }
                    console.log(`  ✅ Auth subcollection copied (${authSnapshot.size} docs)`);
                }

                // 3. Migrate payments subcollection
                const paymentsSnapshot = await db.collection('families').doc(familyId)
                    .collection('payments').get();

                if (!paymentsSnapshot.empty) {
                    for (const paymentDoc of paymentsSnapshot.docs) {
                        await db.collection('bookings').doc(familyId)
                            .collection('payments').doc(paymentDoc.id).set(paymentDoc.data());
                    }
                    console.log(`  ✅ Payments subcollection copied (${paymentsSnapshot.size} docs)`);
                }

                // 4. Migrate paymentRequests subcollection
                const requestsSnapshot = await db.collection('families').doc(familyId)
                    .collection('paymentRequests').get();

                if (!requestsSnapshot.empty) {
                    for (const requestDoc of requestsSnapshot.docs) {
                        await db.collection('bookings').doc(familyId)
                            .collection('paymentRequests').doc(requestDoc.id).set(requestDoc.data());
                    }
                    console.log(`  ✅ Payment requests subcollection copied (${requestsSnapshot.size} docs)`);
                }

                successCount++;
                console.log(`  ✅ Successfully migrated: ${familyData.displayName || familyId}`);

            } catch (error) {
                errorCount++;
                console.error(`  ❌ Error migrating ${familyId}:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`  ✅ Successful: ${successCount}`);
        console.log(`  ❌ Failed: ${errorCount}`);
        console.log(`  📦 Total: ${familiesSnapshot.size}`);
        console.log('='.repeat(60));

        if (successCount === familiesSnapshot.size) {
            console.log('\n✅ All families migrated successfully!');
            console.log('\n⚠️  IMPORTANT: Review the bookings collection before deleting families.');
            console.log('   To delete old families collection, run:');
            console.log('   node scripts/deleteFamiliesCollection.cjs');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

// Run migration
migrateFamiliesToBookings();
