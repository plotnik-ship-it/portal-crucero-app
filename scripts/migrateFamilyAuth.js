/**
 * Family Password Migration Utility
 * 
 * This script migrates existing families to use the new auth subcollection pattern:
 * - Generates high-entropy base32 passwords (10 chars, ~50 bits)
 * - Hashes with PBKDF2-SHA256 (150k iterations)
 * - Stores auth data in families/{id}/auth/public subcollection
 * - Removes auth fields from main family document
 * - Exports credentials to secure CSV for admin distribution
 * 
 * SECURITY NOTES:
 * - Plaintext passwords are NEVER stored in Firestore
 * - Plaintext passwords are ONLY in the exported CSV (admin-only)
 * - CSV should be transmitted securely and deleted after distribution
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { generateTravelerPassword, hashPassword } from '../src/services/passwordService.js';
import fs from 'fs';
import path from 'path';

// Firebase config (use your actual config)
const firebaseConfig = {
    // Add your Firebase config here
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Migrate a single family to auth subcollection
 * @param {string} familyId
 * @param {object} familyData
 * @returns {Promise<{familyCode: string, password: string, success: boolean, error?: string}>}
 */
async function migrateFamilyAuth(familyId, familyData) {
    try {
        // Generate new high-entropy password
        const password = generateTravelerPassword(); // e.g., "K7T9P2M4QX"

        // Hash with PBKDF2 + salt
        const { hash, salt } = await hashPassword(password);

        // Create auth subcollection document
        const authRef = doc(db, 'families', familyId, 'auth', 'public');
        await setDoc(authRef, {
            travelerPasswordHash: hash,
            travelerPasswordSalt: salt,
            hashAlgo: 'pbkdf2-sha256',
            hashIterations: 150000,
            saltBytes: 32,
            hashVersion: 'v1.1',
            updatedAt: new Date()
        });

        // Remove auth fields from main family document
        const familyRef = doc(db, 'families', familyId);
        await updateDoc(familyRef, {
            travelerPasswordHash: deleteField(),
            travelerPasswordSalt: deleteField(),
            authFailedAttempts: deleteField(),
            authLastFailedAt: deleteField(),
            travelerPassword: deleteField() // Remove if exists (should never exist)
        });

        console.log(`✅ Migrated family: ${familyData.familyCode}`);

        return {
            familyCode: familyData.familyCode,
            displayName: familyData.displayName || 'Unknown',
            email: familyData.email || '',
            password: password, // For CSV export ONLY
            success: true
        };
    } catch (error) {
        console.error(`❌ Error migrating family ${familyData.familyCode}:`, error);
        return {
            familyCode: familyData.familyCode,
            displayName: familyData.displayName || 'Unknown',
            email: familyData.email || '',
            password: '',
            success: false,
            error: error.message
        };
    }
}

/**
 * Migrate all families to auth subcollection
 * @param {string} agencyId - Optional: migrate only families for specific agency
 * @returns {Promise<Array>}
 */
async function migrateAllFamilies(agencyId = null) {
    console.log('🔄 Starting family auth migration...');

    try {
        const familiesRef = collection(db, 'families');
        const snapshot = await getDocs(familiesRef);

        console.log(`📊 Found ${snapshot.size} families`);

        const results = [];
        let migrated = 0;
        let skipped = 0;
        let failed = 0;

        for (const familyDoc of snapshot.docs) {
            const familyData = familyDoc.data();

            // Filter by agency if specified
            if (agencyId && familyData.agencyId !== agencyId) {
                skipped++;
                continue;
            }

            // Check if already migrated (auth subcollection exists)
            const authRef = doc(db, 'families', familyDoc.id, 'auth', 'public');
            const authSnap = await getDoc(authRef);

            if (authSnap.exists()) {
                console.log(`⏭️  Skipping ${familyData.familyCode} (already migrated)`);
                skipped++;
                continue;
            }

            // Migrate family
            const result = await migrateFamilyAuth(familyDoc.id, familyData);
            results.push(result);

            if (result.success) {
                migrated++;
            } else {
                failed++;
            }

            // Rate limit to avoid overwhelming Firestore
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Migrated: ${migrated}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📝 Total: ${snapshot.size}`);

        return results;
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

/**
 * Export credentials to CSV
 * @param {Array} credentials
 * @param {string} outputPath
 */
function exportCredentialsToCSV(credentials, outputPath = './family_credentials.csv') {
    const successfulCreds = credentials.filter(c => c.success);

    if (successfulCreds.length === 0) {
        console.log('⚠️  No credentials to export');
        return;
    }

    // CSV header
    let csv = 'Family Code,Display Name,Email,Traveler Password\n';

    // CSV rows
    for (const cred of successfulCreds) {
        csv += `${cred.familyCode},"${cred.displayName}",${cred.email},${cred.password}\n`;
    }

    // Write to file
    fs.writeFileSync(outputPath, csv, 'utf-8');

    console.log(`\n📄 Credentials exported to: ${path.resolve(outputPath)}`);
    console.log(`⚠️  SECURITY WARNING: This file contains plaintext passwords!`);
    console.log(`   - Transmit securely (encrypted email, secure file share)`);
    console.log(`   - Delete after distribution`);
    console.log(`   - Never commit to version control`);
}

/**
 * Main migration function
 */
async function main() {
    try {
        console.log('🚀 Family Auth Migration Utility\n');

        // Get agency ID from command line args (optional)
        const agencyId = process.argv[2] || null;

        if (agencyId) {
            console.log(`🎯 Migrating families for agency: ${agencyId}\n`);
        } else {
            console.log(`🌐 Migrating ALL families\n`);
        }

        // Run migration
        const results = await migrateAllFamilies(agencyId);

        // Export credentials
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = agencyId
            ? `family_credentials_${agencyId}_${timestamp}.csv`
            : `family_credentials_all_${timestamp}.csv`;

        exportCredentialsToCSV(results, filename);

        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { migrateAllFamilies, migrateFamilyAuth, exportCredentialsToCSV };
