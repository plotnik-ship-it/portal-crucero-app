const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

/**
 * Test multi-agency isolation
 */
async function testAgencyIsolation() {
    console.log('🧪 Testing Multi-Agency Isolation\n');

    try {
        // Get all agencies
        const agenciesSnapshot = await db.collection('agencies').get();
        const agencies = agenciesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`📊 Found ${agencies.length} agencies:\n`);
        agencies.forEach(agency => {
            console.log(`   - ${agency.id}: ${agency.name}`);
        });

        console.log('\n' + '='.repeat(60) + '\n');

        // Test 1: Verify families are agency-scoped
        console.log('Test 1: Family Isolation');
        console.log('-'.repeat(60));

        for (const agency of agencies) {
            const familiesSnapshot = await db.collection('families')
                .where('agencyId', '==', agency.id)
                .get();

            console.log(`\n${agency.name} (${agency.id}):`);
            console.log(`  Families: ${familiesSnapshot.size}`);

            if (familiesSnapshot.size > 0) {
                const familyCodes = familiesSnapshot.docs.map(doc => doc.data().familyCode);
                console.log(`  Codes: ${familyCodes.join(', ')}`);
            }
        }

        console.log('\n' + '='.repeat(60) + '\n');

        // Test 2: Verify groups are agency-scoped
        console.log('Test 2: Group Isolation');
        console.log('-'.repeat(60));

        for (const agency of agencies) {
            const groupsSnapshot = await db.collection('groups')
                .where('agencyId', '==', agency.id)
                .get();

            console.log(`\n${agency.name} (${agency.id}):`);
            console.log(`  Groups: ${groupsSnapshot.size}`);

            if (groupsSnapshot.size > 0) {
                const groupNames = groupsSnapshot.docs.map(doc => doc.data().name);
                console.log(`  Names: ${groupNames.join(', ')}`);
            }
        }

        console.log('\n' + '='.repeat(60) + '\n');

        // Test 3: Check for documents without agencyId
        console.log('Test 3: Documents Without agencyId (Security Risk)');
        console.log('-'.repeat(60));

        const collections = ['families', 'groups', 'payments', 'paymentRequests', 'users'];
        let foundIssues = false;

        for (const collectionName of collections) {
            const snapshot = await db.collection(collectionName).get();
            const docsWithoutAgency = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.agencyId) {
                    docsWithoutAgency.push(doc.id);
                }
            });

            if (docsWithoutAgency.length > 0) {
                foundIssues = true;
                console.log(`\n❌ ${collectionName}:`);
                console.log(`   ${docsWithoutAgency.length} documents missing agencyId`);
                console.log(`   IDs: ${docsWithoutAgency.slice(0, 5).join(', ')}${docsWithoutAgency.length > 5 ? '...' : ''}`);
            } else {
                console.log(`\n✅ ${collectionName}: All documents have agencyId`);
            }
        }

        console.log('\n' + '='.repeat(60) + '\n');

        // Test 4: Verify users are assigned to agencies
        console.log('Test 4: User Agency Assignment');
        console.log('-'.repeat(60));

        const usersSnapshot = await db.collection('users').get();
        const usersWithoutAgency = [];
        const usersByAgency = {};

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.agencyId) {
                usersWithoutAgency.push(doc.id);
            } else {
                if (!usersByAgency[data.agencyId]) {
                    usersByAgency[data.agencyId] = [];
                }
                usersByAgency[data.agencyId].push({
                    id: doc.id,
                    email: data.email,
                    role: data.role
                });
            }
        });

        console.log(`\nTotal users: ${usersSnapshot.size}`);

        if (usersWithoutAgency.length > 0) {
            console.log(`\n❌ Users without agency: ${usersWithoutAgency.length}`);
            console.log(`   IDs: ${usersWithoutAgency.join(', ')}`);
        } else {
            console.log('\n✅ All users have agency assignment');
        }

        console.log('\nUsers by agency:');
        for (const [agencyId, users] of Object.entries(usersByAgency)) {
            const agency = agencies.find(a => a.id === agencyId);
            console.log(`\n  ${agency ? agency.name : agencyId}:`);
            users.forEach(user => {
                console.log(`    - ${user.email} (${user.role})`);
            });
        }

        console.log('\n' + '='.repeat(60) + '\n');

        // Summary
        console.log('📋 Summary');
        console.log('-'.repeat(60));
        console.log(`\n✅ Agencies: ${agencies.length}`);
        console.log(`✅ Users: ${usersSnapshot.size}`);

        if (foundIssues) {
            console.log('\n⚠️  SECURITY ISSUES FOUND!');
            console.log('   Some documents are missing agencyId');
            console.log('   Run migration scripts to fix');
        } else {
            console.log('\n✅ All documents have proper agency isolation');
        }

        if (usersWithoutAgency.length > 0) {
            console.log('\n⚠️  USERS WITHOUT AGENCY!');
            console.log('   Assign agencies to all users');
        }

        console.log('\n✅ Multi-agency isolation test complete!\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Run test
testAgencyIsolation().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
