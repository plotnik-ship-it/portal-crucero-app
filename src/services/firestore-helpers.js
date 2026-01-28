import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get all bookings for a specific agency (across all groups)
 */
export const getAllBookingsByAgency = async (agencyId) => {
    try {
        // First, get all groups for this agency
        const groupsQuery = query(
            collection(db, 'groups'),
            where('agencyId', '==', agencyId)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        const groupIds = groupsSnapshot.docs.map(doc => doc.id);

        if (groupIds.length === 0) {
            return [];
        }

        // Then get all bookings for these groups
        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('groupId', 'in', groupIds)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);

        return bookingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting bookings by agency:', error);
        throw error;
    }
};
