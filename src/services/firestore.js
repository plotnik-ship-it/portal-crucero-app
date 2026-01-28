import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
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
import { generateInvoice } from './invoiceService';
import { logActivity, ACTIVITY_TYPES, SEVERITY_LEVELS } from './activityLogService';

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
 * Get booking data
 */
export const getBookingData = async (bookingId) => {
    try {
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
        if (bookingDoc.exists()) {
            return { id: bookingDoc.id, ...bookingDoc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting booking data:', error);
        throw error;
    }
};

/**
 * Get booking payments
 */
export const getBookingPayments = async (bookingId) => {
    try {
        console.log(`📡 [Firestore] Intentando leer: bookings/${bookingId}/payments (Auth UID: ${auth.currentUser?.uid})`);
        const paymentsRef = collection(db, 'bookings', bookingId, 'payments');
        const snapshot = await getDocs(paymentsRef);
        console.log(`✅ [Firestore] Lectura exitosa: bookings/${bookingId}/payments (${snapshot.size} docs)`);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`!!!! DEBUG !!!! Error en bookings/${bookingId}/payments:`, error);
        throw error;
    }
};

/**
 * Get booking payment requests
 */
export const getBookingPaymentRequests = async (bookingId) => {
    try {
        console.log(`📡 [Firestore] Intentando leer: bookings/${bookingId}/paymentRequests (Auth UID: ${auth.currentUser?.uid})`);
        const requestsRef = collection(db, 'bookings', bookingId, 'paymentRequests');
        const snapshot = await getDocs(requestsRef);
        console.log(`✅ [Firestore] Lectura exitosa: bookings/${bookingId}/paymentRequests (${snapshot.size} docs)`);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`!!!! DEBUG !!!! Error en bookings/${bookingId}/paymentRequests:`, error);
        throw error;
    }
};

/**
 * Create payment request
 */
export const createPaymentRequest = async (bookingId, requestData) => {
    try {
        const requestsRef = collection(db, 'bookings', bookingId, 'paymentRequests');
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
export const applyPaymentRequest = async (bookingId, requestId, paymentData) => {
    const { amountCad, targetCabinIndex, reference, adminNote, method, adminUid } = paymentData;

    try {
        await runTransaction(db, async (transaction) => {
            const bookingRef = doc(db, 'bookings', bookingId);
            const requestRef = doc(db, 'bookings', bookingId, 'paymentRequests', requestId);
            const newPaymentRef = doc(collection(db, 'bookings', bookingId, 'payments'));

            const bookingDoc = await transaction.get(bookingRef);
            if (!bookingDoc.exists()) throw new Error('Booking not found');

            const bookingData = bookingDoc.data();
            const cabinAccounts = bookingData.cabinAccounts || [];

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

            transaction.update(bookingRef, {
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

        // Generate invoice automatically after successful payment
        try {
            // Get the payment ID that was just created
            const paymentsSnapshot = await getDocs(
                query(
                    collection(db, 'bookings', bookingId, 'payments'),
                    where('fromRequestId', '==', requestId),
                    orderBy('date', 'desc')
                )
            );

            if (!paymentsSnapshot.empty) {
                const paymentId = paymentsSnapshot.docs[0].id;
                console.log('📄 Auto-generating invoice for payment:', paymentId);

                await generateInvoice(bookingId, [paymentId], { autoGenerated: true });
                console.log('✅ Invoice auto-generated successfully');
            }
        } catch (invoiceError) {
            // Don't fail the payment if invoice generation fails
            console.error('⚠️ Failed to auto-generate invoice:', invoiceError);
        }

        return true;
    } catch (error) {
        console.error('Error applying payment request:', error);
        throw error;
    }
};

/**
 * Reject Payment Request
 */
export const rejectPaymentRequest = async (bookingId, requestId, reason, adminUid) => {
    try {
        const requestRef = doc(db, 'bookings', bookingId, 'paymentRequests', requestId);
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
export const updatePaymentRequestNotificationStatus = async (bookingId, requestId, status, errorMsg = null) => {
    try {
        const requestRef = doc(db, 'bookings', bookingId, 'paymentRequests', requestId);
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
 * Get all bookings (admin only)
 */
export const getAllBookings = async (agencyId) => {
    try {
        if (!agencyId) {
            throw new Error('Agency ID is required to get bookings');
        }

        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('agencyId', '==', agencyId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting all bookings:', error);
        throw error;
    }
};

/**
 * Check if a booking code already exists within an agency
 */
export const checkBookingCodeExists = async (bookingCode, agencyId) => {
    try {
        if (!agencyId) {
            throw new Error('Agency ID is required to check booking code');
        }

        const bookingsRef = collection(db, 'bookings');
        const q = query(
            bookingsRef,
            where('bookingCode', '==', bookingCode.toUpperCase()),
            where('agencyId', '==', agencyId)
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking booking code:', error);
        throw error;
    }
};

/**
 * Create a new booking (admin only)
 * 
 * Supports auth subcollection pattern:
 * - If bookingData contains authData, writes to bookings/{id}/auth/public
 * - Main booking doc should NOT contain auth fields
 */
export const createBooking = async (bookingData, authData = null) => {
    try {
        // Validate agencyId is present
        if (!bookingData.agencyId) {
            throw new Error('Agency ID is required to create a booking');
        }

        // Check if booking code already exists within this agency
        const exists = await checkBookingCodeExists(bookingData.bookingCode, bookingData.agencyId);
        if (exists) {
            throw new Error(`Booking code ${bookingData.bookingCode} already exists in your agency`);
        }

        // Create main booking document (NO auth fields)
        const bookingsRef = collection(db, 'bookings');
        const docRef = await addDoc(bookingsRef, {
            ...bookingData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log(`✅ Booking ${bookingData.bookingCode} created with ID: ${docRef.id} for agency ${bookingData.agencyId}`);

        // Create auth subcollection if authData provided
        if (authData) {
            const authRef = doc(db, 'bookings', docRef.id, 'auth', 'public');
            await setDoc(authRef, {
                ...authData,
                updatedAt: serverTimestamp()
            });
            console.log(`✅ Auth subcollection created for booking ${bookingData.bookingCode}`);
        }

        // LOG ACTIVITY
        await logActivity({
            action: ACTIVITY_TYPES.FAMILY_CREATED,
            entityType: 'booking',
            entityId: docRef.id,
            entityName: bookingData.bookingCode,
            details: {
                groupId: bookingData.groupId,
                cabinNumber: bookingData.cabinNumber || bookingData.cabinAccounts?.[0]?.cabinNumber,
                totalCost: bookingData.totalCostCad,
                passengers: bookingData.passengers
            },
            severity: SEVERITY_LEVELS.INFO
        }).catch(err => console.error('Error logging activity:', err));

        return docRef.id;
    } catch (error) {
        console.error('Error creating booking:', error);
        throw error;
    }
};

/**
 * Bulk create bookings (admin only)
 * 
 * Supports auth subcollection pattern:
 * - Expects array of objects with { bookingData, authData, password }
 * - OR array of plain bookingData objects (legacy support)
 */
export const bulkCreateBookings = async (bookingsArray) => {
    const results = {
        successful: [],
        failed: []
    };

    for (const item of bookingsArray) {
        try {
            // Check if item has bookingData/authData structure (new format)
            const bookingData = item.bookingData || item;
            const authData = item.authData || null;

            // Create booking with auth subcollection
            const bookingId = await createBooking(bookingData, authData);

            results.successful.push({
                bookingCode: bookingData.bookingCode,
                bookingId,
                displayName: bookingData.displayName,
                password: item.password || null // For CSV export if provided
            });
        } catch (error) {
            const bookingData = item.bookingData || item;
            results.failed.push({
                bookingCode: bookingData.bookingCode,
                displayName: bookingData.displayName,
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
        const bookings = await getAllBookings();
        const allRequests = [];

        for (const booking of bookings) {
            const requestsRef = collection(db, 'bookings', booking.id, 'paymentRequests');
            // Simplified query for debug
            const snapshot = await getDocs(requestsRef);

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.status === 'Pending') {
                    allRequests.push({
                        id: doc.id,
                        bookingId: booking.id,
                        bookingCode: booking.bookingCode,
                        bookingName: booking.displayName,
                        cabinNumbers: booking.cabinNumbers,
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
 * Update booking data (admin only)
 */
export const updateBookingData = async (bookingId, updates) => {
    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, updates);
    } catch (error) {
        console.error('Error updating booking data:', error);
        throw error;
    }
};

/**
 * Delete a payment request (admin only)
 */
export const deletePaymentRequest = async (bookingId, requestId) => {
    try {
        const requestRef = doc(db, 'bookings', bookingId, 'paymentRequests', requestId);
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
export const addPayment = async (bookingId, paymentData) => {
    const { amountCad, targetCabinIndex, reference, note, method, adminUid, appliedAt } = paymentData;

    try {
        await runTransaction(db, async (transaction) => {
            const bookingRef = doc(db, 'bookings', bookingId);
            const newPaymentRef = doc(collection(db, 'bookings', bookingId, 'payments'));

            const bookingDoc = await transaction.get(bookingRef);
            if (!bookingDoc.exists()) throw new Error('Booking not found');

            const bookingData = bookingDoc.data();
            const cabinAccounts = bookingData.cabinAccounts || [];

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

            transaction.update(bookingRef, {
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

        // Generate invoice automatically after successful manual payment
        try {
            // Get the payment ID that was just created
            const paymentsSnapshot = await getDocs(
                query(
                    collection(db, 'bookings', bookingId, 'payments'),
                    where('isManualEntry', '==', true),
                    where('targetCabinIndex', '==', targetCabinIndex),
                    orderBy('appliedAt', 'desc')
                )
            );

            if (!paymentsSnapshot.empty) {
                const paymentId = paymentsSnapshot.docs[0].id;
                console.log('📄 Auto-generating invoice for manual payment:', paymentId);

                await generateInvoice(bookingId, [paymentId], { autoGenerated: true });
                console.log('✅ Invoice auto-generated successfully');
            }
        } catch (invoiceError) {
            // Don't fail the payment if invoice generation fails
            console.error('⚠️ Failed to auto-generate invoice:', invoiceError);
        }

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
export const deletePayment = async (bookingId, paymentId) => {
    try {
        console.log('🗑️ deletePayment called with:', { bookingId, paymentId });

        // Get payment and booking data before deleting for logging
        const paymentRef = doc(db, 'bookings', bookingId, 'payments', paymentId);
        const paymentDoc = await getDoc(paymentRef);
        const bookingData = await getBookingData(bookingId);

        const paymentData = paymentDoc.exists() ? paymentDoc.data() : null;

        await deleteDoc(paymentRef);
        console.log(`✅ Payment ${paymentId} deleted successfully`);

        // LOG ACTIVITY (CRITICAL severity for deletions)
        if (paymentData && bookingData) {
            await logActivity({
                action: ACTIVITY_TYPES.PAYMENT_DELETED,
                entityType: 'booking',
                entityId: bookingId,
                entityName: bookingData.bookingCode,
                details: {
                    paymentId,
                    amount: paymentData.amountCad,
                    method: paymentData.method,
                    reference: paymentData.reference,
                    reason: 'Admin deletion'
                },
                severity: SEVERITY_LEVELS.CRITICAL
            }).catch(err => console.error('Error logging activity:', err));
        }
    } catch (error) {
        console.error('❌ Error deleting payment:', error);
        throw error;
    }
};

/**
 * Delete a booking (admin only)
 */
export const deleteBooking = async (bookingId) => {
    try {
        // Get booking data before deleting for logging
        const bookingData = await getBookingData(bookingId);

        const bookingRef = doc(db, 'bookings', bookingId);
        await deleteDoc(bookingRef);
        console.log(`✅ Booking ${bookingId} deleted successfully`);

        // LOG ACTIVITY (CRITICAL severity for deletions)
        if (bookingData) {
            await logActivity({
                action: ACTIVITY_TYPES.FAMILY_DELETED,
                entityType: 'booking',
                entityId: bookingId,
                entityName: bookingData.bookingCode,
                details: {
                    cabinNumber: bookingData.cabinNumber || bookingData.cabinAccounts?.[0]?.cabinNumber,
                    totalCost: bookingData.totalCostCad,
                    balance: bookingData.balanceCad,
                    reason: 'Admin deletion'
                },
                severity: SEVERITY_LEVELS.CRITICAL
            }).catch(err => console.error('Error logging activity:', err));
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        throw error;
    }
};

/**
 * Get all groups for an agency
 */
export const getGroupsByAgency = async (agencyId) => {
    try {
        console.log('🔍 Fetching groups for agencyId:', agencyId);
        const groupsRef = collection(db, 'groups');
        const q = query(
            groupsRef,
            where('agencyId', '==', agencyId)
        );
        const snapshot = await getDocs(q);
        const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sort by createdAt on client side to avoid index requirement
        groups.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime; // desc order
        });

        console.log('✅ Found groups:', groups.length);
        return groups;
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
 * Get bookings by group ID (filtered by agency)
 */
export const getBookingsByGroup = async (groupId, agencyId) => {
    try {
        if (!agencyId) {
            throw new Error('Agency ID is required to get bookings by group');
        }

        const bookingsRef = collection(db, 'bookings');
        const q = query(
            bookingsRef,
            where('groupId', '==', groupId),
            where('agencyId', '==', agencyId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting bookings by group:', error);
        throw error;
    }
};

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

/**
 * Delete a group (admin only)
 * Safety checks: Cannot delete if group has bookings
 */
export const deleteGroup = async (groupId) => {
    try {
        // 1. Check if group has bookings
        const bookings = await getBookingsByGroup(groupId);
        if (bookings.length > 0) {
            throw new Error(`No se puede eliminar el grupo porque tiene ${bookings.length} reserva(s) asignada(s)`);
        }

        // 2. Delete group document
        const groupRef = doc(db, 'groups', groupId);
        await deleteDoc(groupRef);

        console.log(`✅ Group ${groupId} deleted successfully`);
        return true;
    } catch (error) {
        console.error('Error deleting group:', error);
        throw error;
    }
};
