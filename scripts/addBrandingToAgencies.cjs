const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const DEFAULT_BRANDING = {
    logo: null,
    primaryColor: '#0F766E',
    portalName: 'Portal Crucero',
    favicon: null
};

const DEFAULT_EMAIL_SETTINGS = {
    senderName: 'Portal Crucero',
    replyTo: 'noreply@portalcrucero.com',
    emailSignature: 'Best regards,\nPortal Crucero Team'
};

async function addBrandingToAgencies() {
    try {
        console.log('🔄 Starting migration: Adding branding to agencies...');

        const agenciesSnapshot = await db.collection('agencies').get();

        if (agenciesSnapshot.empty) {
            console.log('⚠️  No agencies found');
            return;
        }

        console.log(`📊 Found ${agenciesSnapshot.size} agencies`);

        const batch = db.batch();
        let updateCount = 0;

        agenciesSnapshot.forEach(doc => {
            const data = doc.data();

            // Only update if branding doesn't exist
            if (!data.branding) {
                const agencyRef = db.collection('agencies').doc(doc.id);
                batch.update(agencyRef, {
                    branding: DEFAULT_BRANDING,
                    emailSettings: DEFAULT_EMAIL_SETTINGS,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updateCount++;
                console.log(`  ✓ Queued update for agency: ${doc.id} (${data.name || 'Unnamed'})`);
            } else {
                console.log(`  ⊘ Skipped agency: ${doc.id} (already has branding)`);
            }
        });

        if (updateCount > 0) {
            await batch.commit();
            console.log(`\n✅ Successfully updated ${updateCount} agencies with branding fields`);
        } else {
            console.log('\n✅ All agencies already have branding fields');
        }

        // Display summary
        console.log('\n📋 Migration Summary:');
        console.log(`   Total agencies: ${agenciesSnapshot.size}`);
        console.log(`   Updated: ${updateCount}`);
        console.log(`   Skipped: ${agenciesSnapshot.size - updateCount}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Run migration
addBrandingToAgencies().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
