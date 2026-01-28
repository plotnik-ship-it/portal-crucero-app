import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Validate that an agency ID is provided
 * @param {string} agencyId - Agency ID to validate
 * @throws {Error} If agencyId is missing or invalid
 */
export const validateAgencyId = (agencyId) => {
    if (!agencyId) {
        throw new Error('Agency ID is required for this operation');
    }

    if (typeof agencyId !== 'string') {
        throw new Error('Agency ID must be a string');
    }

    return agencyId;
};

/**
 * Create a secure query that always includes agencyId filter
 * @param {string} collectionName - Firestore collection name
 * @param {string} agencyId - Agency ID to filter by
 * @param {Array} additionalConstraints - Additional query constraints
 * @returns {Query} Firestore query with agencyId filter
 */
export const createSecureQuery = (collectionName, agencyId, additionalConstraints = []) => {
    validateAgencyId(agencyId);

    const collectionRef = collection(db, collectionName);
    const constraints = [
        where('agencyId', '==', agencyId),
        ...additionalConstraints
    ];

    return query(collectionRef, ...constraints);
};

/**
 * Get all documents from a collection for a specific agency
 * @param {string} collectionName - Firestore collection name
 * @param {string} agencyId - Agency ID to filter by
 * @returns {Promise<Array>} Array of documents
 */
export const getAgencyDocuments = async (collectionName, agencyId) => {
    try {
        validateAgencyId(agencyId);

        const q = createSecureQuery(collectionName, agencyId);
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error getting ${collectionName} for agency ${agencyId}:`, error);
        throw error;
    }
};

/**
 * Get a single document and verify it belongs to the agency
 * @param {string} collectionName - Firestore collection name
 * @param {string} documentId - Document ID
 * @param {string} agencyId - Agency ID to verify against
 * @returns {Promise<Object>} Document data
 * @throws {Error} If document doesn't exist or doesn't belong to agency
 */
export const getSecureDocument = async (collectionName, documentId, agencyId) => {
    try {
        validateAgencyId(agencyId);

        const docRef = doc(db, collectionName, documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error(`${collectionName} document not found: ${documentId}`);
        }

        const data = docSnap.data();

        // Verify document belongs to agency
        if (data.agencyId !== agencyId) {
            console.warn(`Unauthorized access attempt: User from agency ${agencyId} tried to access ${collectionName}/${documentId} from agency ${data.agencyId}`);
            throw new Error('Unauthorized: Document does not belong to your agency');
        }

        return { id: docSnap.id, ...data };
    } catch (error) {
        console.error(`Error getting secure document ${collectionName}/${documentId}:`, error);
        throw error;
    }
};

/**
 * Validate that a document write includes correct agencyId
 * @param {Object} data - Document data to write
 * @param {string} agencyId - Agency ID that should be set
 * @returns {Object} Validated data with agencyId
 * @throws {Error} If trying to write with different agencyId
 */
export const validateDocumentWrite = (data, agencyId) => {
    validateAgencyId(agencyId);

    // If no agencyId in data, add it
    if (!data.agencyId) {
        return { ...data, agencyId };
    }

    // If agencyId exists but doesn't match, throw error
    if (data.agencyId !== agencyId) {
        throw new Error(`Cannot write document with different agencyId. Expected: ${agencyId}, Got: ${data.agencyId}`);
    }

    return data;
};

/**
 * Query documents with multiple filters, always including agencyId
 * @param {string} collectionName - Firestore collection name
 * @param {string} agencyId - Agency ID to filter by
 * @param {Array} filters - Array of {field, operator, value} objects
 * @returns {Promise<Array>} Array of matching documents
 */
export const queryAgencyDocuments = async (collectionName, agencyId, filters = []) => {
    try {
        validateAgencyId(agencyId);

        const constraints = filters.map(({ field, operator, value }) =>
            where(field, operator, value)
        );

        const q = createSecureQuery(collectionName, agencyId, constraints);
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error querying ${collectionName} for agency ${agencyId}:`, error);
        throw error;
    }
};

/**
 * Check if a document exists within an agency
 * @param {string} collectionName - Firestore collection name
 * @param {string} agencyId - Agency ID to filter by
 * @param {string} field - Field to check
 * @param {any} value - Value to check for
 * @returns {Promise<boolean>} True if document exists
 */
export const documentExistsInAgency = async (collectionName, agencyId, field, value) => {
    try {
        validateAgencyId(agencyId);

        const q = createSecureQuery(collectionName, agencyId, [
            where(field, '==', value)
        ]);

        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error(`Error checking document existence in ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Get user's agency ID from user document
 * Helper function to extract agencyId from auth context
 * @param {Object} user - Firebase auth user object
 * @returns {Promise<string>} Agency ID
 */
export const getUserAgencyId = async (user) => {
    if (!user) {
        throw new Error('User must be authenticated');
    }

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
            throw new Error('User document not found');
        }

        const agencyId = userDoc.data().agencyId;

        if (!agencyId) {
            throw new Error('User does not have an agency assigned');
        }

        return agencyId;
    } catch (error) {
        console.error('Error getting user agency ID:', error);
        throw error;
    }
};

/**
 * Verify user has access to a specific agency
 * @param {Object} user - Firebase auth user object
 * @param {string} agencyId - Agency ID to verify
 * @returns {Promise<boolean>} True if user has access
 */
export const verifyAgencyAccess = async (user, agencyId) => {
    try {
        const userAgencyId = await getUserAgencyId(user);
        return userAgencyId === agencyId;
    } catch (error) {
        console.error('Error verifying agency access:', error);
        return false;
    }
};
