const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Default agency configuration
const DEFAULT_AGENCY = {
    id: 'agency_travelpoint',
    name: 'TravelPoint',
    email: 'admin@travelpoint.mx',
    logo: null,
    branding: {
        primaryColor: '#1e40af',
        secondaryColor: '#0891b2'
    }
};

/**
 * Migrate existing data to multi-group structure
 * @param {boolean} dryRun - If true, only simulate changes without writing to database
 */
async function migrateToMultiGroup(dryRun = true) {
    console.log('🔄 Starting Multi-Group Migration...\n');
    console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes will be made)' : '✍️  LIVE MODE (changes will be applied)'}\n`);

    if (!dryRun) {
        console.log('⚠️  WARNING: This will modify your database!');
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const changes = {
        agencyCreated: false,
        groupsUpdated: 0,
        usersUpdated: 0,
        errors: []
    };

    try {
        // Step 1: Create default agency
        console.log('📋 Step 1: Creating default agency...');
        const agencyRef = db.collection('agencies').doc(DEFAULT_AGENCY.id);
        const agencyDoc = await agencyRef.get();

        if (!agencyDoc.exists) {
            if (!dryRun) {
                await agencyRef.set({
                    ...DEFAULT_AGENCY,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`   ✅ Agency created: ${DEFAULT_AGENCY.name} (${DEFAULT_AGENCY.id})`);
            } else {
                console.log(`   🔍 Would create agency: ${DEFAULT_AGENCY.name} (${DEFAULT_AGENCY.id})`);
            }
            changes.agencyCreated = true;
        } else {
            console.log(`   ℹ️  Agency already exists: ${DEFAULT_AGENCY.name}`);
        }

        // Step 2: Update groups
        console.log('\n📋 Step 2: Updating groups with agencyId...');
        const groupsSnapshot = await db.collection('groups').get();

        for (const doc of groupsSnapshot.docs) {
            const data = doc.data();

            if (!data.agencyId) {
                if (!dryRun) {
                    await doc.ref.update({
                        agencyId: DEFAULT_AGENCY.id,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`   ✅ Updated group: ${data.name || doc.id}`);
                } else {
                    console.log(`   🔍 Would update group: ${data.name || doc.id}`);
                }
                changes.groupsUpdated++;
            } else {
                console.log(`   ℹ️  Group already has agencyId: ${data.name || doc.id}`);
            }
        }

        console.log(`   📊 Total groups to update: ${changes.groupsUpdated}`);

        // Step 3: Update admin users
        console.log('\n📋 Step 3: Updating admin users with agencyId...');
        const usersSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .get();

        for (const doc of usersSnapshot.docs) {
            const data = doc.data();

            if (!data.agencyId) {
                if (!dryRun) {
                    await doc.ref.update({
                        agencyId: DEFAULT_AGENCY.id,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`   ✅ Updated admin user: ${data.email}`);
                } else {
                    console.log(`   🔍 Would update admin user: ${data.email}`);
                }
                changes.usersUpdated++;
            } else {
                console.log(`   ℹ️  Admin user already has agencyId: ${data.email}`);
            }
        }

        console.log(`   📊 Total admin users to update: ${changes.usersUpdated}`);

        // Step 4: Verify data integrity
        console.log('\n📋 Step 4: Verifying data integrity...');

        // Check all groups have agencyId
        const groupsCheck = await db.collection('groups').get();
        const groupsWithoutAgency = groupsCheck.docs.filter(doc => !doc.data().agencyId);

        if (groupsWithoutAgency.length > 0 && !dryRun) {
            console.log(`   ⚠️  Warning: ${groupsWithoutAgency.length} groups still missing agencyId`);
            changes.errors.push(`${groupsWithoutAgency.length} groups missing agencyId`);
        } else {
            console.log(`   ✅ All groups have agencyId`);
        }

        // Check all admin users have agencyId
        const adminsCheck = await db.collection('users').where('role', '==', 'admin').get();
        const adminsWithoutAgency = adminsCheck.docs.filter(doc => !doc.data().agencyId);

        if (adminsWithoutAgency.length > 0 && !dryRun) {
            console.log(`   ⚠️  Warning: ${adminsWithoutAgency.length} admin users still missing agencyId`);
            changes.errors.push(`${adminsWithoutAgency.length} admin users missing agencyId`);
        } else {
            console.log(`   ✅ All admin users have agencyId`);
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 Migration Summary:');
        console.log('='.repeat(50));
        console.log(`Agency created: ${changes.agencyCreated ? 'Yes' : 'No'}`);
        console.log(`Groups updated: ${changes.groupsUpdated}`);
        console.log(`Admin users updated: ${changes.usersUpdated}`);
        console.log(`Errors: ${changes.errors.length}`);

        if (changes.errors.length > 0) {
            console.log('\n⚠️  Errors encountered:');
            changes.errors.forEach(err => console.log(`   - ${err}`));
        }

        if (dryRun) {
            console.log('\n💡 This was a DRY RUN. No changes were made.');
            console.log('To apply these changes, run:');
            console.log('   node scripts/migrateToMultiGroup.cjs --apply');
        } else {
            console.log('\n✅ Migration completed successfully!');
            console.log('\n📋 Next steps:');
            console.log('   1. Verify the application still works');
            console.log('   2. Test admin login and dashboard');
            console.log('   3. Test family login and dashboard');
            console.log('   4. Proceed to Phase 2 (UI updates)');
        }

        return changes;

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.error('\n💡 To rollback, restore from backup:');
        console.error('   node scripts/restoreBackup.cjs backups/firestore-backup-[timestamp].json');
        throw error;
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const applyMode = args.includes('--apply');

// Run migration
migrateToMultiGroup(!applyMode)
    .then(() => {
        console.log('\n🎉 Migration process completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
