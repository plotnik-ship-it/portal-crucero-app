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
const auth = admin.auth();

async function createAuthUsers() {
    console.log('🔐 Creating Auth Users...');

    try {
        // 1. Get all families from Firestore
        const snapshot = await db.collection('families').get();
        const families = snapshot.docs.map(doc => doc.data());

        console.log(`Found ${families.length} families in Firestore.`);

        // 2. Create Auth user for each family
        for (const family of families) {
            try {
                // Check if user exists
                try {
                    await auth.getUserByEmail(family.email);
                    console.log(`User ${family.email} already exists. Updating password...`);
                    const user = await auth.getUserByEmail(family.email);
                    await auth.updateUser(user.uid, {
                        password: 'password123', // Default password for testing
                        displayName: family.displayName
                    });
                    // IMPORTANT: Ensure the UID matches what we expect or update Firestore
                    // In this app, we link by email or we store familyId in user profile.
                    // The Implementation Plan says `users/{uid}` collection links to `familyId`.
                    // We need to create that link!
                    await db.collection('users').doc(user.uid).set({
                        email: family.email,
                        role: 'family',
                        familyId: family.id
                    });

                } catch (error) {
                    if (error.code === 'auth/user-not-found') {
                        console.log(`Creating user for ${family.email}...`);
                        const userRecord = await auth.createUser({
                            email: family.email,
                            emailVerified: true,
                            password: 'password123',
                            displayName: family.displayName,
                            disabled: false
                        });

                        // Create User Role Link
                        await db.collection('users').doc(userRecord.uid).set({
                            email: family.email,
                            role: 'family',
                            familyId: family.id // Link auth UID to family document ID
                        });
                    } else {
                        throw error;
                    }
                }
            } catch (err) {
                console.error(`Error processing ${family.email}:`, err.message);
            }
        }

        // 3. Create Admin User
        const adminEmail = 'dplotnik@trevelo.com';
        try {
            const adminUser = await auth.getUserByEmail(adminEmail);
            console.log('Admin user exists. Resetting password...');
            await auth.updateUser(adminUser.uid, { password: 'password123' });

            await db.collection('users').doc(adminUser.uid).set({
                email: adminEmail,
                role: 'admin'
            });
            // Also add to admins collection for security rules
            await db.collection('admins').doc(adminUser.uid).set({
                email: adminEmail,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log('Creating Admin user...');
                const userRecord = await auth.createUser({
                    email: adminEmail,
                    password: 'password123',
                    displayName: 'Danny Plotnik'
                });

                await db.collection('users').doc(userRecord.uid).set({
                    email: adminEmail,
                    role: 'admin'
                });
                await db.collection('admins').doc(userRecord.uid).set({
                    email: adminEmail,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        console.log('✅ Auth users created successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating auth users:', error);
        process.exit(1);
    }
}

createAuthUsers();
