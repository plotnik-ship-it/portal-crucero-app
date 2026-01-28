#!/usr/bin/env node

/**
 * Set SuperAdmin Flag for a User
 * 
 * Usage:
 *   node scripts/setSuperAdmin.cjs <email>
 * 
 * Example:
 *   node scripts/setSuperAdmin.cjs dplotnik@travelpoint.mx
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function setSuperAdmin(email) {
    console.log(`\n🔐 Setting SuperAdmin for: ${email}\n`);

    try {
        // Find user by email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            console.error(`❌ No user found with email: ${email}`);
            process.exit(1);
        }

        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();

        console.log(`📋 Found user:`);
        console.log(`   UID: ${userDoc.id}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Role: ${userData.role || 'N/A'}`);
        console.log(`   Current isSuperAdmin: ${userData.isSuperAdmin || false}`);

        // Update with isSuperAdmin flag
        await userDoc.ref.update({
            isSuperAdmin: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`\n✅ Successfully set isSuperAdmin: true`);
        console.log(`\n🔑 User can now access /superadmin panel`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Get email from command line
const email = process.argv[2] || 'dplotnik@travelpoint.mx';

setSuperAdmin(email).then(() => {
    console.log('\n✅ Done!\n');
    process.exit(0);
});
