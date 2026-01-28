import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Debug utility to inspect Firestore structure and find where payments are stored
 */
export const debugFirestoreStructure = async (agencyId) => {
    try {
        console.log('🔍 DEBUGGING FIRESTORE STRUCTURE');
        console.log('='.repeat(60));

        // Get all families
        const familiesRef = collection(db, 'families');
        const familiesSnapshot = await getDocs(familiesRef);

        const agencyFamilies = familiesSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.agencyId === agencyId;
        });

        console.log(`\n📋 Found ${agencyFamilies.length} families for agency ${agencyId}`);

        // Sample first 3 families
        const samplesToCheck = Math.min(3, agencyFamilies.length);
        console.log(`\n🔬 Inspecting first ${samplesToCheck} families...\n`);

        for (let i = 0; i < samplesToCheck; i++) {
            const familyDoc = agencyFamilies[i];
            const bookingId = familyDoc.id;
            const familyData = familyDoc.data();

            console.log(`\n${'='.repeat(60)}`);
            console.log(`👥 Family ${i + 1}: ${familyData.displayName} (${familyData.bookingCode})`);
            console.log(`   ID: ${bookingId}`);
            console.log(`   Email: ${familyData.email}`);
            console.log(`   Group ID: ${familyData.groupId || 'N/A'}`);

            // Check family document structure
            console.log(`\n   📊 Family Document Fields:`);
            const fields = Object.keys(familyData);
            fields.forEach(field => {
                const value = familyData[field];
                const type = Array.isArray(value) ? 'array' : typeof value;
                console.log(`      - ${field}: ${type}`);
            });

            // Check for payments subcollection
            console.log(`\n   💰 Checking payments subcollection...`);
            const paymentsRef = collection(db, 'families', bookingId, 'payments');
            const paymentsSnapshot = await getDocs(paymentsRef);

            if (paymentsSnapshot.empty) {
                console.log(`      ⚠️ No payments found in subcollection`);
            } else {
                console.log(`      ✅ Found ${paymentsSnapshot.size} payments`);

                // Show first payment structure
                const firstPayment = paymentsSnapshot.docs[0];
                const paymentData = firstPayment.data();
                console.log(`\n      📝 First Payment Structure:`);
                console.log(`         ID: ${firstPayment.id}`);
                Object.keys(paymentData).forEach(field => {
                    const value = paymentData[field];
                    const type = Array.isArray(value) ? 'array' : typeof value;
                    let displayValue = value;
                    if (type === 'object' && value?.toDate) {
                        displayValue = value.toDate().toISOString();
                    } else if (type === 'object') {
                        displayValue = JSON.stringify(value);
                    }
                    console.log(`         - ${field}: ${type} = ${displayValue}`);
                });
            }

            // Check for paymentRequests subcollection
            console.log(`\n   📋 Checking paymentRequests subcollection...`);
            const requestsRef = collection(db, 'families', bookingId, 'paymentRequests');
            const requestsSnapshot = await getDocs(requestsRef);

            if (requestsSnapshot.empty) {
                console.log(`      ⚠️ No payment requests found`);
            } else {
                console.log(`      ✅ Found ${requestsSnapshot.size} payment requests`);
            }

            // Check if payments are stored in the family document itself
            if (familyData.payments && Array.isArray(familyData.payments)) {
                console.log(`\n   💡 Found payments array in family document!`);
                console.log(`      Count: ${familyData.payments.length}`);
                if (familyData.payments.length > 0) {
                    console.log(`      First payment:`, familyData.payments[0]);
                }
            }
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log('🏁 Debug inspection complete!');
        console.log('='.repeat(60));

        return {
            success: true,
            totalFamilies: agencyFamilies.length,
            samplesInspected: samplesToCheck
        };
    } catch (error) {
        console.error('❌ Error debugging Firestore structure:', error);
        throw error;
    }
};
