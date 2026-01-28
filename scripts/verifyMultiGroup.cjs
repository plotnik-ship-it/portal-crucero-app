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
 * Verify groups and user setup
 */
async function verifySetup() {
    try {
        console.log('\n🔍 Verifying Multi-Group Setup...\n');

        // 1. Check groups
        console.log('📋 Groups in Firestore:');
        const groupsSnapshot = await db.collection('groups').get();

        if (groupsSnapshot.empty) {
            console.log('   ❌ NO GROUPS FOUND!');
        } else {
            groupsSnapshot.forEach(doc => {
                const data = doc.data();
                console.log(`   ✅ Group ID: ${doc.id}`);
                console.log(`      Name: ${data.name}`);
                console.log(`      Ship: ${data.shipName || 'N/A'}`);
                console.log(`      AgencyId: ${data.agencyId}`);
                console.log('');
            });
        }

        // 2. Check user
        console.log('👤 User: dplotnik@travelpoint.mx');
        const usersSnapshot = await db.collection('users')
            .where('email', '==', 'dplotnik@travelpoint.mx')
            .get();

        if (usersSnapshot.empty) {
            console.log('   ❌ User not found!');
        } else {
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();
            console.log(`   ✅ User ID: ${userDoc.id}`);
            console.log(`      Email: ${userData.email}`);
            console.log(`      Role: ${userData.role}`);
            console.log(`      AgencyId: ${userData.agencyId || 'NOT SET'}`);
        }

        // 3. Check agency
        console.log('\n🏢 Agency:');
        const agencyDoc = await db.collection('agencies').doc('agency_travelpoint').get();

        if (agencyDoc.exists) {
            const agencyData = agencyDoc.data();
            console.log(`   ✅ Agency ID: agency_travelpoint`);
            console.log(`      Name: ${agencyData.name}`);
            console.log(`      Email: ${agencyData.email || 'N/A'}`);
        } else {
            console.log('   ❌ Agency not found!');
        }

        // 4. Count families per group
        console.log('\n👨‍👩‍👧‍👦 Families per group:');
        for (const groupDoc of groupsSnapshot.docs) {
            const familiesSnapshot = await db.collection('families')
                .where('groupId', '==', groupDoc.id)
                .get();
            console.log(`   ${groupDoc.data().name}: ${familiesSnapshot.size} families`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

verifySetup()
    .then(() => {
        console.log('\n🎉 Verification complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Failed:', error);
        process.exit(1);
    });
