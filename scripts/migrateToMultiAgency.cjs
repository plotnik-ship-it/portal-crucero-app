const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const DEFAULT_AGENCY = {
    id: 'agency_travelpoint',
    name: 'TravelPoint',
    billingEmail: 'admin@travelpoint.mx', // Default, should be updated
    logoUrl: '', // Default placeholder or empty
    branding: {
        primaryColor: '#007bff', // Bootstrap Primary Blue
        secondaryColor: '#6c757d', // Bootstrap Secondary Gray
        navbarBackground: '#ffffff'
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
};

async function migrate() {
    console.log('🚀 Starting Multi-Agency Migration...');

    try {
        // 1. Create Default Agency
        const agencyRef = db.collection('agencies').doc(DEFAULT_AGENCY.id);
        const agencyDoc = await agencyRef.get();

        if (!agencyDoc.exists) {
            console.log(`✨ Creating default agency: ${DEFAULT_AGENCY.name}`);
            await agencyRef.set(DEFAULT_AGENCY);
        } else {
            console.log(`ℹ️ Default agency ${DEFAULT_AGENCY.name} already exists.`);
        }

        // 2. Migrate Groups
        const groupsSnapshot = await db.collection('groups').get();
        let groupsUpdated = 0;

        const groupBatch = db.batch();

        groupsSnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.agencyId) {
                groupBatch.update(doc.ref, { agencyId: DEFAULT_AGENCY.id });
                groupsUpdated++;
            }
        });

        if (groupsUpdated > 0) {
            await groupBatch.commit();
            console.log(`✅ Updated ${groupsUpdated} groups with agencyId.`);
        } else {
            console.log('ℹ️ All groups already have agencyId.');
        }

        // 3. Migrate Admin Users
        // Currently we assume all current admins belong to the default agency
        const usersSnapshot = await db.collection('users').where('role', '==', 'admin').get();
        let usersUpdated = 0;

        // Firestore limits batches to 500 ops. Simple scripts might loop if >500. 
        // Assuming low volume for now.
        const userBatch = db.batch();

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.agencyId) {
                userBatch.update(doc.ref, { agencyId: DEFAULT_AGENCY.id });
                usersUpdated++;
            }
        });

        if (usersUpdated > 0) {
            await userBatch.commit();
            console.log(`✅ Updated ${usersUpdated} admin users with agencyId.`);
        } else {
            console.log('ℹ️ All admin users already have agencyId.');
        }

        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
