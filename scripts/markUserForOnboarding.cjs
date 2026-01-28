/**
 * Script to mark a user as needing onboarding
 * Usage: node scripts/markUserForOnboarding.cjs <email>
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function markUserForOnboarding(email) {
    try {
        console.log(`🔍 Looking for user with email: ${email}`);

        // Find user by email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            console.error('❌ User not found with email:', email);
            process.exit(1);
        }

        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        console.log('✅ Found user:', userId);
        console.log('   Current onboardingCompleted:', userData.onboardingCompleted);

        // Update user to mark onboarding as incomplete
        await db.collection('users').doc(userId).update({
            onboardingCompleted: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ User marked for onboarding!');
        console.log('   onboardingCompleted: false');
        console.log('\n📝 Next steps:');
        console.log('   1. Log in with this user');
        console.log('   2. You will be automatically redirected to /onboarding');
        console.log('   3. Complete the 3-step wizard');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node scripts/markUserForOnboarding.cjs <email>');
    process.exit(1);
}

markUserForOnboarding(email);
