/**
 * Bootstrap Owner Member Doc
 * 
 * Creates the initial member document for an agency owner.
 * This is required for Team Management to work because Firestore rules
 * check for owner/admin membership before allowing reads.
 * 
 * Usage: node scripts/bootstrapOwner.cjs <agencyId> <ownerEmail>
 * Example: node scripts/bootstrapOwner.cjs agencia-test admin@agencia.com
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');

try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('❌ Could not load service account from:', serviceAccountPath);
    console.error('   Please ensure service-account.json exists in the project root.');
    process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

async function bootstrapOwner(agencyId, ownerEmail) {
    console.log('\n🚀 Bootstrapping owner for Team Management...\n');

    // 1. Verify agency exists
    console.log(`📋 Checking agency: ${agencyId}`);
    const agencyDoc = await db.collection('agencies').doc(agencyId).get();

    if (!agencyDoc.exists) {
        console.error(`❌ Agency "${agencyId}" not found!`);
        process.exit(1);
    }

    console.log(`   ✅ Agency found: ${agencyDoc.data().name || agencyId}`);

    // 2. Get user by email
    console.log(`\n👤 Looking up user: ${ownerEmail}`);
    let user;
    try {
        user = await auth.getUserByEmail(ownerEmail);
        console.log(`   ✅ User found: ${user.uid}`);
    } catch (error) {
        console.error(`❌ User with email "${ownerEmail}" not found!`);
        process.exit(1);
    }

    // 3. Check if member doc already exists
    const memberRef = db.doc(`agencies/${agencyId}/members/${user.uid}`);
    const existingMember = await memberRef.get();

    if (existingMember.exists) {
        console.log(`\n⚠️  Member doc already exists:`);
        console.log(`   Role: ${existingMember.data().role}`);
        console.log(`   Status: ${existingMember.data().status}`);
        console.log('\n   To overwrite, delete the doc first and re-run.');
        process.exit(0);
    }

    // 4. Create owner member doc
    console.log(`\n📝 Creating owner member doc...`);

    await memberRef.set({
        role: 'owner',
        status: 'active',
        email: ownerEmail.toLowerCase(),
        displayName: user.displayName || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'bootstrap-script'
    });

    console.log(`   ✅ Member doc created at: agencies/${agencyId}/members/${user.uid}`);

    // 5. Summary
    console.log('\n✨ Bootstrap complete!\n');
    console.log('   You can now use Team Management to invite other members.');
    console.log('   Refresh the /admin/team page to see the changes.\n');
}

// Parse args
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.log('\nUsage: node scripts/bootstrapOwner.cjs <agencyId> <ownerEmail>\n');
    console.log('Example: node scripts/bootstrapOwner.cjs agencia-test admin@agencia.com\n');
    process.exit(1);
}

const [agencyId, ownerEmail] = args;

bootstrapOwner(agencyId, ownerEmail)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Bootstrap failed:', error.message);
        process.exit(1);
    });
