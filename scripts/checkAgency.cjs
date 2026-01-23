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
 * Check agency and user configuration
 */
async function checkAgencySetup() {
    try {
        console.log('\n🔍 Checking agency setup...\n');

        // 1. List all agencies
        console.log('📋 Agencies in Firestore:');
        const agenciesSnapshot = await db.collection('agencies').get();

        if (agenciesSnapshot.empty) {
            console.log('   ❌ NO AGENCIES FOUND!');
        } else {
            agenciesSnapshot.forEach(doc => {
                const data = doc.data();
                console.log(`   - ID: ${doc.id}`);
                console.log(`     Name: ${data.name}`);
                console.log(`     Email: ${data.email || 'N/A'}`);
            });
        }

        // 2. Check the specific user
        console.log('\n👤 Checking user: dplotnik@travelpoint.mx');
        const usersSnapshot = await db.collection('users')
            .where('email', '==', 'dplotnik@travelpoint.mx')
            .get();

        if (usersSnapshot.empty) {
            console.log('   ❌ User not found!');
        } else {
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();
            console.log(`   - User ID: ${userDoc.id}`);
            console.log(`   - Email: ${userData.email}`);
            console.log(`   - Role: ${userData.role}`);
            console.log(`   - AgencyId: ${userData.agencyId || 'NOT SET'}`);

            // 3. Check if the agency exists
            if (userData.agencyId) {
                console.log(`\n🔍 Checking if agency "${userData.agencyId}" exists...`);
                const agencyDoc = await db.collection('agencies').doc(userData.agencyId).get();

                if (agencyDoc.exists) {
                    console.log('   ✅ Agency found!');
                    console.log(`   - Name: ${agencyDoc.data().name}`);
                } else {
                    console.log('   ❌ AGENCY NOT FOUND!');
                    console.log('   This is the problem - the user has an agencyId that doesn\'t exist.');

                    // Suggest fix
                    if (agenciesSnapshot.size > 0) {
                        const firstAgency = agenciesSnapshot.docs[0];
                        console.log(`\n💡 Suggestion: Update user's agencyId to "${firstAgency.id}"`);
                    }
                }
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

checkAgencySetup()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Failed:', error);
        process.exit(1);
    });
