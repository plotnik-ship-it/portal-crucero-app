import { doc, updateDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Agency Management Service - Suspend and reactivate agencies
 */

/**
 * Get all agencies (SuperAdmin only)
 * @returns {Promise<Array>} Array of all agencies
 */
export const getAllAgencies = async () => {
    try {
        const agenciesRef = collection(db, 'agencies');
        const snapshot = await getDocs(agenciesRef);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('❌ Error fetching agencies:', error);
        throw error;
    }
};

/**
 * Suspend an agency
 * @param {string} agencyId - Agency ID to suspend
 * @param {string} reason - Suspension reason (required)
 * @param {string} suspendedBy - User ID or email of who suspended
 * @returns {Promise<void>}
 */
export const suspendAgency = async (agencyId, reason, suspendedBy) => {
    try {
        const agencyRef = doc(db, 'agencies', agencyId);
        await updateDoc(agencyRef, {
            status: 'suspended',
            suspendedAt: serverTimestamp(),
            suspendedBy: suspendedBy,
            suspensionReason: reason
        });
        console.log('✅ Agency suspended:', agencyId);
    } catch (error) {
        console.error('❌ Error suspending agency:', error);
        throw error;
    }
};

/**
 * Reactivate a suspended agency
 * @param {string} agencyId - Agency ID to reactivate
 * @param {string} reactivatedBy - User ID or email of who reactivated
 * @returns {Promise<void>}
 */
export const reactivateAgency = async (agencyId, reactivatedBy) => {
    try {
        const agencyRef = doc(db, 'agencies', agencyId);
        await updateDoc(agencyRef, {
            status: 'active',
            reactivatedAt: serverTimestamp(),
            reactivatedBy: reactivatedBy,
            suspensionReason: null
        });
        console.log('✅ Agency reactivated:', agencyId);
    } catch (error) {
        console.error('❌ Error reactivating agency:', error);
        throw error;
    }
};
