#!/usr/bin/env node

/**
 * Set Agency Plan
 * 
 * Usage:
 *   node scripts/setAgencyPlan.cjs <agencyId> <planKey>
 * 
 * Example:
 *   node scripts/setAgencyPlan.cjs agency_travelpoint enterprise
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

async function setAgencyPlan(agencyId, planKey) {
    console.log(`\n🔧 Updating agency plan...`);
    console.log(`   Agency: ${agencyId}`);
    console.log(`   New Plan: ${planKey}\n`);

    const validPlans = ['trial', 'solo_groups', 'pro', 'enterprise'];
    if (!validPlans.includes(planKey)) {
        console.error(`❌ Invalid plan. Must be one of: ${validPlans.join(', ')}`);
        process.exit(1);
    }

    try {
        const agencyRef = db.collection('agencies').doc(agencyId);
        const agencyDoc = await agencyRef.get();

        if (!agencyDoc.exists) {
            console.error(`❌ Agency not found: ${agencyId}`);
            process.exit(1);
        }

        const currentPlan = agencyDoc.data().planKey || 'N/A';
        console.log(`📋 Current plan: ${currentPlan}`);

        await agencyRef.update({
            planKey: planKey,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Plan updated to: ${planKey}`);
        console.log(`\n🔑 Agency now has access to all ${planKey} features`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

const agencyId = process.argv[2] || 'agency_travelpoint';
const planKey = process.argv[3] || 'enterprise';

setAgencyPlan(agencyId, planKey).then(() => {
    console.log('\n✅ Done!\n');
    process.exit(0);
});
