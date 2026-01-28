import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Request Service - Manage agency beta access requests
 */

/**
 * Generate unique approval code in format TP-XXXXXX
 */
export const generateApprovalCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'TP-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

/**
 * Subscribe to all agency requests with real-time updates
 * @param {Function} callback - Called with array of requests on each update
 * @returns {Function} Unsubscribe function
 */
export const subscribeToRequests = (callback) => {
    const requestsRef = collection(db, 'agencyRequests');
    const q = query(requestsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const requests = [];
        snapshot.forEach((doc) => {
            requests.push({
                id: doc.id,
                ...doc.data()
            });
        });
        callback(requests);
    }, (error) => {
        console.error('Error fetching requests:', error);
        callback([]);
    });
};

/**
 * Get a single request by ID
 */
export const getRequest = async (requestId) => {
    try {
        const requestRef = doc(db, 'agencyRequests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (requestSnap.exists()) {
            return {
                id: requestSnap.id,
                ...requestSnap.data()
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching request:', error);
        throw error;
    }
};

/**
 * Approve a request and generate approval code
 * @param {string} requestId - Request document ID
 * @param {string} adminEmail - Email of admin approving
 * @returns {Object} Updated request with approval code
 */
export const approveRequest = async (requestId, adminEmail) => {
    try {
        const approvalCode = generateApprovalCode();
        const requestRef = doc(db, 'agencyRequests', requestId);

        await updateDoc(requestRef, {
            status: 'approved',
            approvalCode: approvalCode,
            approvedBy: adminEmail,
            approvedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Request approved:', requestId, 'Code:', approvalCode);

        // Return updated request
        const updatedRequest = await getRequest(requestId);
        return updatedRequest;
    } catch (error) {
        console.error('❌ Error approving request:', error);
        throw error;
    }
};

/**
 * Reject a request with optional notes
 * @param {string} requestId - Request document ID
 * @param {string} adminEmail - Email of admin rejecting
 * @param {string} notes - Optional rejection notes
 */
export const rejectRequest = async (requestId, adminEmail, notes = '') => {
    try {
        const requestRef = doc(db, 'agencyRequests', requestId);

        await updateDoc(requestRef, {
            status: 'rejected',
            rejectedBy: adminEmail,
            rejectedAt: serverTimestamp(),
            rejectionNotes: notes || null,
            updatedAt: serverTimestamp()
        });

        console.log('✅ Request rejected:', requestId);

        // Return updated request
        const updatedRequest = await getRequest(requestId);
        return updatedRequest;
    } catch (error) {
        console.error('❌ Error rejecting request:', error);
        throw error;
    }
};

/**
 * Cancel beta access for an approved request
 * @param {string} requestId - Request document ID
 * @param {string} agencyId - Agency ID to revoke beta access from
 * @param {string} adminEmail - Email of admin cancelling
 * @returns {Object} Updated request
 */
export const cancelBetaAccess = async (requestId, agencyId, adminEmail) => {
    try {
        const requestRef = doc(db, 'agencyRequests', requestId);
        const agencyRef = doc(db, 'agencies', agencyId);

        // Update request status to cancelled
        await updateDoc(requestRef, {
            status: 'cancelled',
            cancelledBy: adminEmail,
            cancelledAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Remove beta flag from agency
        await updateDoc(agencyRef, {
            isBeta: false,
            betaEndDate: null
        });

        console.log('✅ Beta access cancelled:', requestId);

        // Return updated request
        const updatedRequest = await getRequest(requestId);
        return updatedRequest;
    } catch (error) {
        console.error('❌ Error cancelling beta access:', error);
        throw error;
    }
};

/**
 * Generate signup link with approval code
 * @param {string} approvalCode - The approval code
 * @param {string} email - User's email
 * @returns {string} Full signup URL
 */
export const generateSignupLink = (approvalCode, email) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/signup?code=${approvalCode}&email=${encodeURIComponent(email)}`;
};

/**
 * Get request statistics
 */
export const getRequestStats = (requests) => {
    return {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length
    };
};

/**
 * Validate approval code for signup
 * @param {string} code - Approval code (TP-XXXXXX)
 * @param {string} email - Email to validate against
 * @returns {Object} Validation result with request data
 */
export const validateApprovalCode = async (code, email) => {
    try {
        if (!code) {
            return {
                valid: false,
                error: 'CODE_MISSING',
                message: 'No se proporcionó código de aprobación',
                request: null
            };
        }

        // Query for request with this approval code
        const requestsRef = collection(db, 'agencyRequests');
        const q = query(requestsRef, where('approvalCode', '==', code));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return {
                valid: false,
                error: 'CODE_INVALID',
                message: 'Código de aprobación inválido',
                request: null
            };
        }

        const requestDoc = snapshot.docs[0];
        const request = {
            id: requestDoc.id,
            ...requestDoc.data()
        };

        // Check if request is approved
        if (request.status !== 'approved') {
            return {
                valid: false,
                error: 'NOT_APPROVED',
                message: 'Esta solicitud aún no ha sido aprobada',
                request: null
            };
        }

        // Check if code has already been used
        if (request.codeUsed) {
            return {
                valid: false,
                error: 'CODE_USED',
                message: 'Este código ya ha sido utilizado',
                request: null
            };
        }

        // Check if email matches (case-insensitive)
        if (email && request.contactEmail.toLowerCase() !== email.toLowerCase()) {
            return {
                valid: false,
                error: 'EMAIL_MISMATCH',
                message: 'El email no coincide con la solicitud aprobada',
                request: null
            };
        }

        // All validations passed
        return {
            valid: true,
            error: null,
            message: null,
            request: request
        };
    } catch (error) {
        console.error('Error validating approval code:', error);
        return {
            valid: false,
            error: 'VALIDATION_ERROR',
            message: 'Error al validar el código',
            request: null
        };
    }
};

/**
 * Mark approval code as used after successful signup
 * @param {string} requestId - Request document ID
 * @param {string} agencyId - Created agency ID
 */
export const markCodeAsUsed = async (requestId, agencyId) => {
    try {
        const requestRef = doc(db, 'agencyRequests', requestId);
        await updateDoc(requestRef, {
            codeUsed: true,
            codeUsedAt: serverTimestamp(),
            agencyId: agencyId,
            updatedAt: serverTimestamp()
        });
        console.log('✅ Approval code marked as used:', requestId);
    } catch (error) {
        console.error('❌ Error marking code as used:', error);
        throw error;
    }
};
