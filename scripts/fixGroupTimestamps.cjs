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
 * Check group fields
 */
async function checkGroupFields() {
    try {
        console.log('\n🔍 Checking group fields...\n');

        const groupDoc = await db.collection('groups').doc('default').get();

        if (!groupDoc.exists) {
            console.log('❌ Group not found!');
            return;
        }

        const data = groupDoc.data();
        console.log('📋 Group data:');
        console.log(JSON.stringify(data, null, 2));

        // Check if createdAt exists
        if (!data.createdAt) {
            console.log('\n⚠️  Missing createdAt field!');
            console.log('🔧 Adding createdAt and updatedAt...');

            await groupDoc.ref.update({
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ Fields added successfully!');
        } else {
            console.log('\n✅ createdAt field exists');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

checkGroupFields()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Failed:', error);
        process.exit(1);
    });
