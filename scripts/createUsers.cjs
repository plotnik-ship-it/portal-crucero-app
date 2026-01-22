#!/usr/bin/env node

/**
 * Create Users Script for Portal de Crucero
 * 
 * This script creates users in Firebase Authentication and corresponding
 * documents in the users collection for role mapping.
 * 
 * SECURITY: Family users are created WITHOUT password and must reset
 * on first login using the "Forgot Password" flow.
 * 
 * Requirements:
 * - Firebase Admin SDK service account key (serviceAccountKey.json)
 * - Families already created in Firestore (run seedFirestore.js first)
 * 
 * Usage:
 *   node scripts/createUsers.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin (reuse if already initialized)
if (!admin.apps.length) {
    const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const auth = admin.auth();
const db = admin.firestore();

// Admin password (change this!)
const ADMIN_PASSWORD = 'AdminCrucero2026!';

async function createAdminUser() {
    const adminEmail = 'dplotnik@trevello.com';

    try {
        console.log('Creating admin user...');

        // Create user in Authentication
        const userRecord = await auth.createUser({
            email: adminEmail,
            password: ADMIN_PASSWORD,
            displayName: 'Administrador'
        });

        console.log(`✓ Admin user created: ${adminEmail}`);
        console.log(`  UID: ${userRecord.uid}`);
        console.log(`  Password: ${ADMIN_PASSWORD}`);

        // Create user document for role mapping
        await db.collection('users').doc(userRecord.uid).set({
            role: 'admin',
            email: adminEmail,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✓ Admin user document created\n`);

        return userRecord;
    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            console.log(`⚠️  Admin user already exists: ${adminEmail}\n`);
            const existingUser = await auth.getUserByEmail(adminEmail);
            return existingUser;
        }
        throw error;
    }
}

async function createFamilyUsers() {
    try {
        console.log('Creating family users...\n');
        console.log('⚠️  Family users will be created WITHOUT password.');
        console.log('   They must use "Forgot Password" to set their password on first login.\n');

        // Get all families from Firestore
        const familiesSnapshot = await db.collection('families').get();
        const families = [];

        familiesSnapshot.forEach(doc => {
            families.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Found ${families.length} families\n`);

        let created = 0;
        let existing = 0;

        for (const family of families) {
            try {
                // Create user in Authentication WITHOUT password
                // User will need to use "Forgot Password" to set password
                const userRecord = await auth.createUser({
                    email: family.email,
                    emailVerified: false,
                    displayName: family.displayName,
                    disabled: false
                });

                console.log(`✓ Created: ${family.familyCode} (${family.email})`);
                console.log(`  UID: ${userRecord.uid}`);
                console.log(`  ⚠️  NO PASSWORD SET - User must reset password to login`);

                // Create user document for role mapping
                await db.collection('users').doc(userRecord.uid).set({
                    role: 'family',
                    familyId: family.id,
                    email: family.email,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    passwordSet: false
                });

                console.log(`  User document created\n`);
                created++;

            } catch (error) {
                if (error.code === 'auth/email-already-exists') {
                    console.log(`⚠️  Already exists: ${family.familyCode} (${family.email})\n`);
                    existing++;
                } else {
                    console.error(`❌ Error creating ${family.familyCode}:`, error.message);
                }
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   - Created: ${created} users`);
        console.log(`   - Already existed: ${existing} users`);
        console.log(`   - Total: ${families.length} families\n`);

    } catch (error) {
        console.error('❌ Error creating family users:', error);
        throw error;
    }
}

async function sendPasswordResetEmails() {
    console.log('\n📧 Sending password reset emails to families...\n');

    try {
        const familiesSnapshot = await db.collection('families').get();
        let sent = 0;
        let failed = 0;

        for (const doc of familiesSnapshot.docs) {
            const family = doc.data();
            try {
                await auth.generatePasswordResetLink(family.email);
                console.log(`✓ Password reset email queued for: ${family.email}`);
                sent++;
            } catch (error) {
                console.error(`❌ Failed to send to ${family.email}:`, error.message);
                failed++;
            }
        }

        console.log(`\n📊 Email Summary:`);
        console.log(`   - Sent: ${sent}`);
        console.log(`   - Failed: ${failed}\n`);

    } catch (error) {
        console.error('❌ Error sending password reset emails:', error);
    }
}

async function main() {
    try {
        console.log('👥 Creating users for Portal de Crucero\n');
        console.log('='.repeat(50));
        console.log('\n');

        // Create admin user
        await createAdminUser();

        // Create family users (without passwords)
        await createFamilyUsers();

        console.log('='.repeat(50));
        console.log('\n✅ All users created successfully!\n');
        console.log('📝 Login credentials:');
        console.log(`   Admin: dplotnik@trevello.com / ${ADMIN_PASSWORD}`);
        console.log(`   Families: Must use "Forgot Password" to set password\n`);
        console.log('⚠️  IMPORTANT:');
        console.log('   1. Change admin password in production!');
        console.log('   2. Families must reset password before first login');
        console.log('   3. Send password reset emails manually or use Firebase Console\n');

        // Ask if user wants to send password reset emails
        console.log('💡 TIP: You can send password reset emails from Firebase Console:');
        console.log('   Authentication → Users → Select user → Reset password\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run
main();
