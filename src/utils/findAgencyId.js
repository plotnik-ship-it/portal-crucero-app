import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Find the actual agencyId being used in Firestore
 */
export const findActualAgencyId = async () => {
    try {
        console.log('🔍 SEARCHING FOR ACTUAL AGENCY ID');
        console.log('='.repeat(60));

        // Get first few families to see what agencyId they have
        const familiesRef = collection(db, 'families');
        const familiesSnapshot = await getDocs(query(familiesRef, limit(10)));

        console.log(`\n📋 Checking first ${familiesSnapshot.size} families...\n`);

        const agencyIds = new Set();

        familiesSnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`${index + 1}. Family: ${data.displayName || data.bookingCode || doc.id}`);
            console.log(`   agencyId: ${data.agencyId || 'MISSING'}`);
            console.log(`   groupId: ${data.groupId || 'MISSING'}`);

            if (data.agencyId) {
                agencyIds.add(data.agencyId);
            }
        });

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 FOUND ${agencyIds.size} UNIQUE AGENCY IDs:`);
        agencyIds.forEach(id => {
            console.log(`   - ${id}`);
        });
        console.log('='.repeat(60));

        return Array.from(agencyIds);
    } catch (error) {
        console.error('❌ Error finding agency IDs:', error);
        throw error;
    }
};

/**
 * Check what agencyId the AdminInvoiceManager is actually receiving
 */
export const debugAgencyIdProp = (agencyId) => {
    console.log('🔍 DEBUGGING AGENCY ID PROP');
    console.log('='.repeat(60));
    console.log(`Received agencyId: ${agencyId}`);
    console.log(`Type: ${typeof agencyId}`);
    console.log(`Is null/undefined: ${agencyId == null}`);
    console.log('='.repeat(60));
};
