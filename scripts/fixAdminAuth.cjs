const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
// Assuming serviceAccountKey.json is in the root directory relative to this script
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const auth = admin.auth();
const db = admin.firestore();

const TARGET_EMAIL = 'dplotnik@travelpoint.mx';
const TARGET_PASSWORD = 'password123';

async function fixAdmin() {
    console.log(`🔧 Fixing Admin User: ${TARGET_EMAIL}`);

    let uid;

    try {
        // 1. Check if user exists in Auth
        try {
            const userRecord = await auth.getUserByEmail(TARGET_EMAIL);
            console.log('✅ User found in Auth. Updating password...');
            await auth.updateUser(userRecord.uid, {
                password: TARGET_PASSWORD,
                emailVerified: true,
                displayName: 'Admin TravelPoint'
            });
            uid = userRecord.uid;
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log('⚠️ User not found. Creating new user...');
                const newUser = await auth.createUser({
                    email: TARGET_EMAIL,
                    password: TARGET_PASSWORD,
                    emailVerified: true,
                    displayName: 'Admin TravelPoint'
                });
                uid = newUser.uid;
                console.log('✅ User created successfully.');
            } else {
                throw e;
            }
        }

        console.log(`🆔 UID: ${uid}`);

        // 2. Ensure Firestore Role is Admin
        console.log('📝 Updating Firestore permissions...');

        // Update users/{uid}
        await db.collection('users').doc(uid).set({
            email: TARGET_EMAIL,
            role: 'admin',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Update admins/{uid} (Legacy/Redundant but safe)
        await db.collection('admins').doc(uid).set({
            email: TARGET_EMAIL,
            active: true
        });

        console.log('🎉 SUCCESS! Admin access restored.');
        console.log(`👉 Login: ${TARGET_EMAIL}`);
        console.log(`👉 Password: ${TARGET_PASSWORD}`);

    } catch (error) {
        console.error('❌ Error fixing admin:', error);
    } finally {
        process.exit();
    }
}

fixAdmin();
