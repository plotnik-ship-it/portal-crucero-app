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

/**
 * Check and fix user agencyId
 */
async function checkAndFixUser(email) {
    try {
        console.log(`\n🔍 Checking user: ${email}...\n`);

        // Find user in Firestore
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email)
            .get();

        if (usersSnapshot.empty) {
            console.log(`❌ User ${email} not found in Firestore`);
            return;
        }

        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();

        console.log('📋 Current user data:');
        console.log(`   - Email: ${userData.email}`);
        console.log(`   - Role: ${userData.role}`);
        console.log(`   - AgencyId: ${userData.agencyId || 'NOT SET'}`);

        if (userData.role === 'admin' && !userData.agencyId) {
            console.log('\n⚠️  Admin user missing agencyId!');
            console.log('🔧 Fixing...');

            await userDoc.ref.update({
                agencyId: 'agency_travelpoint',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ AgencyId added successfully!');
            console.log(`   - AgencyId: agency_travelpoint`);
        } else if (userData.agencyId) {
            console.log('\n✅ User already has agencyId');
        } else {
            console.log('\nℹ️  User is not an admin, no agencyId needed');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

// Get email from command line or use default
const email = process.argv[2] || 'dplotnik@travelpoint.mx';

checkAndFixUser(email)
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Failed:', error);
        process.exit(1);
    });
