import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';

console.log('🚀 [Firestore] Archivo cargado correctamente v5. Project:', db.app?.options?.projectId);

/**
 * Get group data
 */
export const getGroupData = async (groupId) => {
    try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
            return { id: groupDoc.id, ...groupDoc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting group data:', error);
        throw error;
    }
};

/**
 * Get family data
 */
export const getFamilyData = async (familyId) => {
    try {
        const familyDoc = await getDoc(doc(db, 'families', familyId));
        if (familyDoc.exists()) {
            return { id: familyDoc.id, ...familyDoc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting family data:', error);
        throw error;
    }
};

/**
 * Get family payments
 */
export const getFamilyPayments = async (familyId) => {
    try {
        console.log(`📡 [Firestore] Intentando leer: families/${familyId}/payments (Auth UID: ${auth.currentUser?.uid})`);
        const paymentsRef = collection(db, 'families', familyId, 'payments');
        const snapshot = await getDocs(paymentsRef);
        console.log(`✅ [Firestore] Lectura exitosa: families/${familyId}/payments (${snapshot.size} docs)`);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`!!!! DEBUG !!!! Error en families/${familyId}/payments:`, error);
        throw error;
    }
};

/**
 * Get family payment requests
 */
export const getFamilyPaymentRequests = async (familyId) => {
    try {
        console.log(`📡 [Firestore] Intentando leer: families/${familyId}/paymentRequests (Auth UID: ${auth.currentUser?.uid})`);
        const requestsRef = collection(db, 'families', familyId, 'paymentRequests');
        const snapshot = await getDocs(requestsRef);
        console.log(`✅ [Firestore] Lectura exitosa: families/${familyId}/paymentRequests (${snapshot.size} docs)`);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`!!!! DEBUG !!!! Error en families/${familyId}/paymentRequests:`, error);
        throw error;
    }
};

/**
 * Create payment request
 */
export const createPaymentRequest = async (familyId, requestData) => {
    try {
        const requestsRef = collection(db, 'families', familyId, 'paymentRequests');
        const docRef = await addDoc(requestsRef, {
            ...requestData,
            createdAt: serverTimestamp(),
            status: 'Pending'
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating payment request:', error);
        throw error;
    }
};

/**
 * Apply Payment Request (Transaction)
 */
export const applyPaymentRequest = async (familyId, requestId, paymentData) => {
    const { amountCad, targetCabinIndex, reference, adminNote, method, adminUid } = paymentData;

    try {
        await runTransaction(db, async (transaction) => {
            const familyRef = doc(db, 'families', familyId);
            const requestRef = doc(db, 'families', familyId, 'paymentRequests', requestId);
            const newPaymentRef = doc(collection(db, 'families', familyId, 'payments'));

            const familyDoc = await transaction.get(familyRef);
            if (!familyDoc.exists()) throw new Error('Family not found');

            const familyData = familyDoc.data();
            const cabinAccounts = familyData.cabinAccounts || [];

            if (targetCabinIndex === undefined || targetCabinIndex === null) {
                throw new Error("Target cabin is required for strictly cabin-based payments.");
            }

            if (!cabinAccounts[targetCabinIndex]) {
                throw new Error(`Cabin at index ${targetCabinIndex} not found.`);
            }

            const cabin = cabinAccounts[targetCabinIndex];
            const newPaid = (cabin.paidCad || 0) + amountCad;
            const newBalance = Math.round((cabin.totalCad - newPaid) * 100) / 100;

            cabinAccounts[targetCabinIndex] = {
                ...cabin,
                paidCad: Math.round(newPaid * 100) / 100,
                balanceCad: newBalance
            };

            const newPaidGlobal = cabinAccounts.reduce((sum, c) => sum + (c.paidCad || 0), 0);
            const newTotalGlobal = cabinAccounts.reduce((sum, c) => sum + (c.totalCad || 0), 0);
            const newGratuitiesGlobal = cabinAccounts.reduce((sum, c) => sum + (c.gratuitiesCad || 0), 0);
            const newSubtotalGlobal = cabinAccounts.reduce((sum, c) => sum + (c.subtotalCad || 0), 0);
            const newBalanceGlobal = Math.round((newTotalGlobal - newPaidGlobal) * 100) / 100;

            transaction.update(familyRef, {
                cabinAccounts: cabinAccounts,
                subtotalCadGlobal: newSubtotalGlobal,
                gratuitiesCadGlobal: newGratuitiesGlobal,
                totalCadGlobal: newTotalGlobal,
                paidCadGlobal: Math.round(newPaidGlobal * 100) / 100,
                balanceCadGlobal: newBalanceGlobal,
                updatedAt: serverTimestamp()
            });

            transaction.set(newPaymentRef, {
                amountCad: amountCad,
                date: serverTimestamp(),
                method: method || 'Card Charge',
                reference: reference || 'Auto-Payment',
                note: adminNote || '',
                createdBy: adminUid,
                fromRequestId: requestId,
                targetCabinIndex: targetCabinIndex
            });

            transaction.update(requestRef, {
                status: 'Applied',
                appliedAmountCad: amountCad,
                appliedAt: serverTimestamp(),
                adminNote: adminNote || '',
                processedBy: adminUid,
                notificationStatus: 'pending',
                notificationType: 'approved'
            });
        });

        return true;
    } catch (error) {
        console.error('Error applying payment request:', error);
        throw error;
    }
};

/**
 * Reject Payment Request
 */
export const rejectPaymentRequest = async (familyId, requestId, reason, adminUid) => {
    try {
        const requestRef = doc(db, 'families', familyId, 'paymentRequests', requestId);
        await updateDoc(requestRef, {
            status: 'Rejected',
            rejectedReason: reason,
            rejectedAt: serverTimestamp(),
            processedBy: adminUid,
            notificationStatus: 'pending',
            notificationType: 'rejected'
        });
    } catch (error) {
        console.error('Error rejecting payment request:', error);
        throw error;
    }
};

/**
 * Update payment request notification status
 */
export const updatePaymentRequestNotificationStatus = async (familyId, requestId, status, errorMsg = null) => {
    try {
        const requestRef = doc(db, 'families', familyId, 'paymentRequests', requestId);
        const updates = { notificationStatus: status };
        if (status === 'sent') {
            updates.notificationSentAt = serverTimestamp();
            updates.notificationError = null;
        }
        if (status === 'failed' && errorMsg) {
            updates.notificationError = errorMsg;
        }
        await updateDoc(requestRef, updates);
    } catch (error) {
        console.error('Error updating notification status:', error);
    }
};

/**
 * Get all families (admin only)
 */
export const getAllFamilies = async () => {
    try {
        const familiesRef = collection(db, 'families');
        const snapshot = await getDocs(familiesRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting all families:', error);
        throw error;
    }
};

/**
 * Check if a family code already exists
 */
export const checkFamilyCodeExists = async (familyCode) => {
    try {
        const familiesRef = collection(db, 'families');
        const q = query(familiesRef, where('familyCode', '==', familyCode.toUpperCase()));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking family code:', error);
        throw error;
    }
};

/**
 * Create a new family (admin only)
 */
export const createFamily = async (familyData) => {
    try {
        // Check if family code already exists
        const exists = await checkFamilyCodeExists(familyData.familyCode);
        if (exists) {
            throw new Error(`Family code ${familyData.familyCode} already exists`);
        }

        const familiesRef = collection(db, 'families');
        const docRef = await addDoc(familiesRef, {
            ...familyData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log(`✅ Family ${familyData.familyCode} created with ID: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error('Error creating family:', error);
        throw error;
    }
};

/**
 * Bulk create families (admin only)
 */
export const bulkCreateFamilies = async (familiesArray) => {
    const results = {
        successful: [],
        failed: []
    };

    for (const familyData of familiesArray) {
        try {
            const familyId = await createFamily(familyData);
            results.successful.push({
                familyCode: familyData.familyCode,
                familyId,
                displayName: familyData.displayName
            });
        } catch (error) {
            results.failed.push({
                familyCode: familyData.familyCode,
                displayName: familyData.displayName,
                error: error.message
            });
        }
    }

    return results;
};

/**
 * Get all pending payment requests (admin only)
 */
export const getAllPendingPaymentRequests = async () => {
    try {
        const families = await getAllFamilies();
        const allRequests = [];

        for (const family of families) {
            const requestsRef = collection(db, 'families', family.id, 'paymentRequests');
            // Simplified query for debug
            const snapshot = await getDocs(requestsRef);

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.status === 'Pending') {
                    allRequests.push({
                        id: doc.id,
                        familyId: family.id,
                        familyCode: family.familyCode,
                        familyName: family.displayName,
                        cabinNumbers: family.cabinNumbers,
                        ...data
                    });
                }
            });
        }

        return allRequests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
        console.error('Error getting pending requests:', error);
        throw error;
    }
};

/**
 * Update Group Data
 */
export const updateGroupData = async (groupId, updates) => {
    try {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating group data:', error);
        throw error;
    }
};

/**
 * Update family data (admin only)
 */
export const updateFamilyData = async (familyId, updates) => {
    try {
        const familyRef = doc(db, 'families', familyId);
        await updateDoc(familyRef, updates);
    } catch (error) {
        console.error('Error updating family data:', error);
        throw error;
    }
};

/**
 * Delete a payment request (admin only)
 */
export const deletePaymentRequest = async (familyId, requestId) => {
    try {
        const requestRef = doc(db, 'families', familyId, 'paymentRequests', requestId);
        await deleteDoc(requestRef);
        console.log(`✅ Payment request ${requestId} deleted successfully`);
    } catch (error) {
        console.error('Error deleting payment request:', error);
        throw error;
    }
};

/**
 * Add a manual payment (admin only) - Creates payment record and updates balances
 */
export const addPayment = async (familyId, paymentData) => {
    const { amountCad, targetCabinIndex, reference, note, method, adminUid, appliedAt } = paymentData;

    try {
        await runTransaction(db, async (transaction) => {
            const familyRef = doc(db, 'families', familyId);
            const newPaymentRef = doc(collection(db, 'families', familyId, 'payments'));

            const familyDoc = await transaction.get(familyRef);
            if (!familyDoc.exists()) throw new Error('Family not found');

            const familyData = familyDoc.data();
            const cabinAccounts = familyData.cabinAccounts || [];

            if (targetCabinIndex === undefined || targetCabinIndex === null) {
                throw new Error("Target cabin is required for payment.");
            }

            if (!cabinAccounts[targetCabinIndex]) {
                throw new Error(`Cabin at index ${targetCabinIndex} not found.`);
            }

            const cabin = cabinAccounts[targetCabinIndex];
            const newPaid = (cabin.paidCad || 0) + amountCad;
            const newBalance = Math.round((cabin.totalCad - newPaid) * 100) / 100;

            cabinAccounts[targetCabinIndex] = {
                ...cabin,
                paidCad: Math.round(newPaid * 100) / 100,
                balanceCad: newBalance
            };

            const newPaidGlobal = cabinAccounts.reduce((sum, c) => sum + (c.paidCad || 0), 0);
            const newTotalGlobal = cabinAccounts.reduce((sum, c) => sum + (c.totalCad || 0), 0);
            const newGratuitiesGlobal = cabinAccounts.reduce((sum, c) => sum + (c.gratuitiesCad || 0), 0);
            const newSubtotalGlobal = cabinAccounts.reduce((sum, c) => sum + (c.subtotalCad || 0), 0);
            const newBalanceGlobal = Math.round((newTotalGlobal - newPaidGlobal) * 100) / 100;

            transaction.update(familyRef, {
                cabinAccounts: cabinAccounts,
                subtotalCadGlobal: newSubtotalGlobal,
                gratuitiesCadGlobal: newGratuitiesGlobal,
                totalCadGlobal: newTotalGlobal,
                paidCadGlobal: Math.round(newPaidGlobal * 100) / 100,
                balanceCadGlobal: newBalanceGlobal,
                updatedAt: serverTimestamp()
            });

            // Create payment record
            transaction.set(newPaymentRef, {
                amountCad: amountCad,
                appliedAt: appliedAt || serverTimestamp(),
                method: method || 'Manual Entry',
                reference: reference || 'Manual Payment',
                note: note || '',
                createdBy: adminUid,
                targetCabinIndex: targetCabinIndex,
                targetCabinNumber: cabin.cabinNumber,
                isManualEntry: true
            });
        });

        console.log(`✅ Manual payment of ${amountCad} CAD added successfully`);
        return true;
    } catch (error) {
        console.error('Error adding manual payment:', error);
        throw error;
    }
};

/**
 * Delete an applied payment (admin only)
 */
export const deletePayment = async (familyId, paymentId) => {
    try {
        console.log('🗑️ deletePayment called with:', { familyId, paymentId });
        const paymentRef = doc(db, 'families', familyId, 'payments', paymentId);
        await deleteDoc(paymentRef);
        console.log(`✅ Payment ${paymentId} deleted successfully`);
    } catch (error) {
        console.error('❌ Error deleting payment:', error);
        throw error;
    }
};

/**
 * Delete a family (admin only)
 */
export const deleteFamily = async (familyId) => {
    try {
        const familyRef = doc(db, 'families', familyId);
        await deleteDoc(familyRef);
        console.log(`✅ Family ${familyId} deleted successfully`);
    } catch (error) {
        console.error('Error deleting family:', error);
        throw error;
    }
};

/**
 * Get all groups for an agency
 */
export const getGroupsByAgency = async (agencyId) => {
    try {
        const groupsRef = collection(db, 'groups');
        const q = query(
            groupsRef,
            where('agencyId', '==', agencyId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting groups by agency:', error);
        throw error;
    }
};

/**
 * Get group by ID
 */
export const getGroupById = async (groupId) => {
    try {
        const groupRef = doc(db, 'groups', groupId);
        const groupDoc = await getDoc(groupRef);
        if (groupDoc.exists()) {
            return { id: groupDoc.id, ...groupDoc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting group by ID:', error);
        throw error;
    }
};

/**
 * Create a new group
 */
export const createGroup = async (groupData) => {
    try {
        const groupsRef = collection(db, 'groups');
        const docRef = await addDoc(groupsRef, {
            ...groupData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        console.log(`✅ Group created with ID: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error('Error creating group:', error);
        throw error;
    }
};

/**
 * Get families by group ID (filtered)
 */
export const getFamiliesByGroup = async (groupId) => {
    try {
        const familiesRef = collection(db, 'families');
        const q = query(familiesRef, where('groupId', '==', groupId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting families by group:', error);
        throw error;
    }
};
