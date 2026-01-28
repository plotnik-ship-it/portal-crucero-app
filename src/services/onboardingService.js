/**
 * Onboarding Service
 * Handles agency onboarding wizard data persistence
 */

import { db, storage } from './firebase';
import { doc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Generate unique 6-character alphanumeric group code
 * @returns {string} - Group code (e.g., "CRB26A")
 */
export function generateGroupCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Upload logo to Firebase Storage
 * @param {string} agencyId - Agency ID
 * @param {File} logoFile - Logo file
 * @returns {Promise<{url: string, path: string}>} - Download URL and storage path
 */
export async function uploadLogoToStorage(agencyId, logoFile) {
    try {
        // Get file extension
        const ext = logoFile.name.split('.').pop();
        const storagePath = `agencies/${agencyId}/logo.${ext}`;

        // Create storage reference
        const storageRef = ref(storage, storagePath);

        // Upload file
        await uploadBytes(storageRef, logoFile);

        // Get download URL
        const url = await getDownloadURL(storageRef);

        console.log('✅ Logo uploaded to Firebase Storage:', storagePath);

        return { url, path: storagePath };
    } catch (error) {
        console.error('Error uploading logo:', error);
        throw new Error('Failed to upload logo: ' + error.message);
    }
}

/**
 * Save agency profile
 * @param {string} agencyId - Agency ID
 * @param {Object} profileData - Profile data
 */
export async function saveAgencyProfile(agencyId, profileData) {
    try {
        const agencyRef = doc(db, 'agencies', agencyId);

        await updateDoc(agencyRef, {
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone || '',
            website: profileData.website || '',
            address: profileData.address || '',
            updatedAt: serverTimestamp()
        });

        console.log('✅ Agency profile saved:', agencyId);
    } catch (error) {
        console.error('Error saving agency profile:', error);
        throw new Error('Failed to save agency profile: ' + error.message);
    }
}

/**
 * Save branding configuration
 * @param {string} agencyId - Agency ID
 * @param {Object} brandingData - Branding data
 * @param {string} logoUrl - Logo download URL from Firebase Storage
 * @param {string} logoPath - Logo storage path
 */
export async function saveBranding(agencyId, brandingData, logoUrl, logoPath) {
    try {
        const agencyRef = doc(db, 'agencies', agencyId);

        // Helper to convert hex to RGB
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 0, g: 0, b: 0 };
        };

        await updateDoc(agencyRef, {
            branding: {
                logoUrl: logoUrl || null,
                logoStoragePath: logoPath || null,
                primaryColor: hexToRgb(brandingData.primaryColor),
                primaryColorHex: brandingData.primaryColor
            },
            updatedAt: serverTimestamp()
        });

        console.log('✅ Branding saved:', agencyId);
    } catch (error) {
        console.error('Error saving branding:', error);
        throw new Error('Failed to save branding: ' + error.message);
    }
}

/**
 * Validate payment deadlines
 * @param {Array} deadlines - Payment deadlines
 * @returns {{valid: boolean, errors: Array<string>}}
 */
export function validatePaymentDeadlines(deadlines) {
    const errors = [];

    // Check percentages sum to 100
    const totalPercentage = deadlines.reduce((sum, d) => sum + (parseFloat(d.percentage) || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push(`Percentages must sum to 100% (current: ${totalPercentage}%)`);
    }

    // Check chronological order
    const dates = deadlines.map(d => new Date(d.dueDate)).filter(d => !isNaN(d));
    for (let i = 1; i < dates.length; i++) {
        if (dates[i] < dates[i - 1]) {
            errors.push('Payment deadlines must be in chronological order');
            break;
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Create group with cruise template
 * @param {string} agencyId - Agency ID
 * @param {Object} groupData - Group data
 * @returns {Promise<string>} - Group ID
 */
export async function createGroupWithTemplate(agencyId, groupData) {
    try {
        // Validate payment deadlines
        const validation = validatePaymentDeadlines(groupData.paymentDeadlines);
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }

        // Generate group code
        const groupCode = generateGroupCode();

        // Create group document
        const groupsRef = collection(db, 'groups');
        const groupDoc = await addDoc(groupsRef, {
            agencyId,
            groupCode,
            name: groupData.name,
            shipName: groupData.shipName,
            sailDate: groupData.sailDate,
            itinerary: groupData.itinerary || [],
            paymentDeadlines: groupData.paymentDeadlines,
            currency: 'CAD',
            fxRateCadToMxn: 14.5, // Default exchange rate
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Group created:', groupDoc.id, 'with code:', groupCode);

        return groupDoc.id;
    } catch (error) {
        console.error('Error creating group:', error);
        throw new Error('Failed to create group: ' + error.message);
    }
}

/**
 * Import families from CSV
 * @param {string} agencyId - Agency ID
 * @param {string} groupId - Group ID
 * @param {Array} familiesData - Array of family objects from CSV parser
 * @returns {Promise<{successful: number, failed: number, errors: Array}>}
 */
export async function importFamiliesFromCSV(agencyId, groupId, familiesData) {
    const results = {
        successful: 0,
        failed: 0,
        errors: []
    };

    for (const family of familiesData) {
        try {
            // Create composite ID: {agencyId}_{groupId}_{bookingCode}
            const compositeId = `${agencyId}_${groupId}_${family.bookingCode}`;

            // Create family document
            const familyRef = doc(db, 'families', compositeId);

            await setDoc(familyRef, {
                agencyId,
                groupId,
                bookingCode: family.bookingCode,
                displayName: family.displayName,
                email: family.email,
                travelerPasswordHash: null, // Will be set separately
                cabinAccounts: family.cabinAccounts,
                totalCadGlobal: family.totalCadGlobal,
                paidCadGlobal: family.paidCadGlobal,
                balanceCadGlobal: family.balanceCadGlobal,
                subtotalCadGlobal: family.subtotalCadGlobal,
                gratuitiesCadGlobal: family.gratuitiesCadGlobal,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            results.successful++;
            console.log('✅ Family imported:', family.bookingCode);
        } catch (error) {
            results.failed++;
            results.errors.push({
                bookingCode: family.bookingCode,
                error: error.message
            });
            console.error('❌ Failed to import family:', family.bookingCode, error);
        }
    }

    return results;
}

/**
 * Complete onboarding
 * @param {string} userId - User ID
 * @param {string} agencyId - Agency ID
 */
export async function completeOnboarding(userId, agencyId) {
    try {
        // Update user document
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            onboardingCompleted: true,
            updatedAt: serverTimestamp()
        });

        // Update agency document
        const agencyRef = doc(db, 'agencies', agencyId);
        await updateDoc(agencyRef, {
            onboardingCompleted: true,
            onboardingCompletedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Onboarding completed for user:', userId);
    } catch (error) {
        console.error('Error completing onboarding:', error);
        throw new Error('Failed to complete onboarding: ' + error.message);
    }
}
