import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Create a payment record in the payments subcollection
 * @param {string} bookingId - Family document ID
 * @param {Object} paymentData - Payment details
 * @returns {Promise<string>} - Created payment document ID
 */
export const createPaymentRecord = async (bookingId, paymentData) => {
    try {
        const paymentsRef = collection(db, 'families', bookingId, 'payments');

        const paymentDoc = {
            cabinNumber: paymentData.cabinNumber,
            amountCad: paymentData.amountCad,
            paymentMethod: paymentData.paymentMethod || 'Manual',
            paymentDate: paymentData.paymentDate || serverTimestamp(),
            appliedBy: paymentData.appliedBy,
            notes: paymentData.notes || '',
            createdAt: serverTimestamp(),
            // Optional fields
            transactionId: paymentData.transactionId || null,
            receiptUrl: paymentData.receiptUrl || null
        };

        const docRef = await addDoc(paymentsRef, paymentDoc);
        console.log('Payment record created:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error creating payment record:', error);
        throw error;
    }
};

/**
 * Get payment history for a family
 * @param {string} bookingId - Family document ID
 * @returns {Promise<Array>} - Array of payment records
 */
export const getPaymentHistory = async (bookingId) => {
    try {
        const paymentsRef = collection(db, 'families', bookingId, 'payments');
        const q = query(paymentsRef, orderBy('paymentDate', 'desc'));

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching payment history:', error);
        throw error;
    }
};

/**
 * Subscribe to real-time payment history updates
 * @param {string} bookingId - Family document ID
 * @param {Function} callback - Callback function to receive updates
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToPaymentHistory = (bookingId, callback) => {
    const paymentsRef = collection(db, 'families', bookingId, 'payments');
    const q = query(paymentsRef, orderBy('paymentDate', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const payments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(payments);
    }, (error) => {
        console.error('Error in payment history subscription:', error);
    });
};

/**
 * Update a payment record
 * @param {string} bookingId - Family document ID
 * @param {string} paymentId - Payment document ID
 * @param {Object} updates - Fields to update
 */
export const updatePaymentRecord = async (bookingId, paymentId, updates) => {
    try {
        const paymentRef = doc(db, 'families', bookingId, 'payments', paymentId);
        await updateDoc(paymentRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        console.log('Payment record updated:', paymentId);
    } catch (error) {
        console.error('Error updating payment record:', error);
        throw error;
    }
};

/**
 * Delete a payment record (admin only)
 * @param {string} bookingId - Family document ID
 * @param {string} paymentId - Payment document ID
 */
export const deletePaymentRecord = async (bookingId, paymentId) => {
    try {
        const paymentRef = doc(db, 'families', bookingId, 'payments', paymentId);
        await deleteDoc(paymentRef);
        console.log('Payment record deleted:', paymentId);
    } catch (error) {
        console.error('Error deleting payment:', error);
        throw error;
    }
};

/**
 * Get payments for a specific cabin
 * @param {string} bookingId - Family document ID
 * @param {string} cabinNumber - Cabin number
 * @returns {Promise<Array>} - Array of payment records for the cabin
 */
export const getCabinPayments = async (bookingId, cabinNumber) => {
    try {
        const paymentsRef = collection(db, 'families', bookingId, 'payments');
        const q = query(
            paymentsRef,
            where('cabinNumber', '==', cabinNumber),
            orderBy('paymentDate', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching cabin payments:', error);
        throw error;
    }
};
