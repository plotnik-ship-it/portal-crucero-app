const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

/**
 * Fix missing agencyId in all collections
 */
async function fixMissingAgencyIds() {
    console.log('🔧 Fixing Missing Agency IDs\n');

    try {
        // Get the first (or default) agency
        const agenciesSnapshot = await db.collection('agencies').limit(1).get();

        if (agenciesSnapshot.empty) {
            console.error('❌ No agencies found! Create an agency first.');
            process.exit(1);
        }

        const defaultAgency = agenciesSnapshot.docs[0];
        const defaultAgencyId = defaultAgency.id;
        const defaultAgencyName = defaultAgency.data().name;

        console.log(`📌 Default Agency: ${defaultAgencyName} (${defaultAgencyId})\n`);
        console.log('All documents without agencyId will be assigned to this agency.\n');
        console.log('='.repeat(60) + '\n');

        const collections = [
            'families',
            'groups',
            'payments',
            'paymentRequests',
            'users',
            'invoices',
            'documents',
            'quotations',
            'reminders'
        ];

        let totalFixed = 0;

        for (const collectionName of collections) {
            console.log(`Processing ${collectionName}...`);

            const snapshot = await db.collection(collectionName).get();
            const batch = db.batch();
            let batchCount = 0;
            let fixedCount = 0;

            for (const doc of snapshot.docs) {
                const data = doc.data();

                if (!data.agencyId) {
                    batch.update(doc.ref, {
                        agencyId: defaultAgencyId,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    batchCount++;
                    fixedCount++;

                    // Firestore batch limit is 500
                    if (batchCount >= 500) {
                        await batch.commit();
                        console.log(`  ✓ Committed batch of ${batchCount} updates`);
                        batchCount = 0;
                    }
                }
            }

            // Commit remaining updates
            if (batchCount > 0) {
                await batch.commit();
                console.log(`  ✓ Committed final batch of ${batchCount} updates`);
            }

            if (fixedCount > 0) {
                console.log(`  ✅ Fixed ${fixedCount} documents in ${collectionName}`);
                totalFixed += fixedCount;
            } else {
                console.log(`  ✓ All documents in ${collectionName} already have agencyId`);
            }

            console.log('');
        }

        console.log('='.repeat(60));
        console.log(`\n✅ Migration Complete!`);
        console.log(`   Total documents fixed: ${totalFixed}`);
        console.log(`   All assigned to: ${defaultAgencyName} (${defaultAgencyId})\n`);

        // Run verification
        console.log('Running verification...\n');
        await verifyAgencyIds(collections);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

/**
 * Verify all documents have agencyId
 */
async function verifyAgencyIds(collections) {
    let allGood = true;

    for (const collectionName of collections) {
        const snapshot = await db.collection(collectionName).get();
        const missing = [];

        snapshot.forEach(doc => {
            if (!doc.data().agencyId) {
                missing.push(doc.id);
            }
        });

        if (missing.length > 0) {
            console.log(`❌ ${collectionName}: ${missing.length} still missing agencyId`);
            allGood = false;
        } else {
            console.log(`✅ ${collectionName}: All ${snapshot.size} documents have agencyId`);
        }
    }

    console.log('');

    if (allGood) {
        console.log('🎉 All documents now have agencyId!\n');
    } else {
        console.log('⚠️  Some documents still missing agencyId. Check errors above.\n');
    }
}

// Run migration
fixMissingAgencyIds().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
