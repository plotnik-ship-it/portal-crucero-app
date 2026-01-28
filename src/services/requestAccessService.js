import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Submit an agency access request
 * @param {Object} requestData - The request data
 * @param {string} requestData.agencyName - Name of the agency
 * @param {string} requestData.contactEmail - Contact email
 * @param {string} requestData.contactPhone - Contact phone number
 * @param {string} requestData.groupType - Type of groups (cruise, wedding, etc.)
 * @param {string} requestData.message - Optional message
 * @returns {Promise<string>} - The request ID
 */
export async function submitAccessRequest(requestData) {
    try {
        const requestsRef = collection(db, 'agencyRequests');

        const request = {
            agencyName: requestData.agencyName.trim(),
            contactEmail: requestData.contactEmail.trim().toLowerCase(),
            contactPhone: requestData.contactPhone.trim(),
            groupType: requestData.groupType,
            message: requestData.message?.trim() || '',
            status: 'pending',
            createdAt: serverTimestamp(),
            approvedAt: null,
            approvedBy: null,
            notes: ''
        };

        const docRef = await addDoc(requestsRef, request);

        console.log('[RequestAccessService] Request submitted:', {
            requestId: docRef.id,
            agencyName: request.agencyName,
            email: request.contactEmail,
            groupType: request.groupType
        });

        return docRef.id;
    } catch (error) {
        console.error('[RequestAccessService] Error submitting request:', error);
        throw error;
    }
}

/**
 * Validate request form data
 * @param {Object} data - Form data to validate
 * @returns {Object} - Validation errors (empty if valid)
 */
export function validateRequestForm(data) {
    const errors = {};

    if (!data.agencyName?.trim()) {
        errors.agencyName = 'Agency name is required';
    }

    if (!data.contactEmail?.trim()) {
        errors.contactEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
        errors.contactEmail = 'Invalid email format';
    }

    // Phone is now optional - no validation needed

    if (!data.groupType) {
        errors.groupType = 'Please select a group type';
    }

    return errors;
}

/**
 * Group type options for the dropdown
 */
export const GROUP_TYPES = [
    { value: 'cruise', labelKey: 'requestAccess.groupTypes.cruise' },
    { value: 'wedding', labelKey: 'requestAccess.groupTypes.wedding' },
    { value: 'school', labelKey: 'requestAccess.groupTypes.school' },
    { value: 'corporate', labelKey: 'requestAccess.groupTypes.corporate' },
    { value: 'religious', labelKey: 'requestAccess.groupTypes.religious' },
    { value: 'sports', labelKey: 'requestAccess.groupTypes.sports' },
    { value: 'tour', labelKey: 'requestAccess.groupTypes.tour' },
    { value: 'other', labelKey: 'requestAccess.groupTypes.other' }
];
