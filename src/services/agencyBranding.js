
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get agency data by ID
 */
export const getAgencyData = async (agencyId) => {
    try {
        const agencyRef = doc(db, 'agencies', agencyId);
        const agencyDoc = await getDoc(agencyRef);
        if (agencyDoc.exists()) {
            return { id: agencyDoc.id, ...agencyDoc.data() };
        }

        // Agency document doesn't exist - return default structure
        console.warn(`Agency document ${agencyId} not found, returning default structure`);
        return {
            id: agencyId,
            branding: null
        };
    } catch (error) {
        console.error('Error getting agency data:', error);
        // Return default structure instead of throwing
        return {
            id: agencyId,
            branding: null
        };
    }
};

/**
 * Get agency branding configuration
 */
export const getAgencyBranding = async (agencyId) => {
    try {
        const agencyData = await getAgencyData(agencyId);
        return agencyData?.branding || null;
    } catch (error) {
        console.error('Error getting agency branding:', error);
        throw error;
    }
};

/**
 * Update agency branding configuration
 */
export const updateAgencyBranding = async (agencyId, brandingData) => {
    try {
        const agencyRef = doc(db, 'agencies', agencyId);

        // Use setDoc with merge to create the document if it doesn't exist
        await setDoc(agencyRef, {
            branding: brandingData,
            updatedAt: serverTimestamp()
        }, { merge: true });

        console.log('✅ Agency branding updated successfully');
        return true;
    } catch (error) {
        console.error('Error updating agency branding:', error);
        throw error;
    }
};
