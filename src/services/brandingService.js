import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../config/firebase';

/**
 * Upload agency logo to Firebase Storage
 * @param {File} file - Image file to upload
 * @param {string} agencyId - Agency ID
 * @returns {Promise<string>} Download URL of uploaded logo
 */
export const uploadLogo = async (file, agencyId) => {
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            throw new Error('File size must be less than 2MB');
        }

        // Create storage reference
        const fileExtension = file.name.split('.').pop();
        const fileName = `logo.${fileExtension}`;
        const storageRef = ref(storage, `agencies/${agencyId}/branding/${fileName}`);

        // Upload file
        await uploadBytes(storageRef, file, {
            contentType: file.type,
            customMetadata: {
                uploadedAt: new Date().toISOString(),
                originalName: file.name
            }
        });

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading logo:', error);
        throw error;
    }
};

/**
 * Upload agency favicon to Firebase Storage
 * @param {File} file - Favicon file to upload
 * @param {string} agencyId - Agency ID
 * @returns {Promise<string>} Download URL of uploaded favicon
 */
export const uploadFavicon = async (file, agencyId) => {
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }

        // Validate file size (500KB max for favicon)
        if (file.size > 500 * 1024) {
            throw new Error('Favicon size must be less than 500KB');
        }

        // Create storage reference
        const fileExtension = file.name.split('.').pop();
        const fileName = `favicon.${fileExtension}`;
        const storageRef = ref(storage, `agencies/${agencyId}/branding/${fileName}`);

        // Upload file
        await uploadBytes(storageRef, file, {
            contentType: file.type
        });

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading favicon:', error);
        throw error;
    }
};

/**
 * Delete file from Firebase Storage
 * @param {string} fileUrl - Full URL of file to delete
 */
export const deleteFile = async (fileUrl) => {
    try {
        if (!fileUrl) return;

        // Extract storage path from URL
        const baseUrl = 'https://firebasestorage.googleapis.com';
        if (!fileUrl.startsWith(baseUrl)) return;

        // Get reference from URL
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
    } catch (error) {
        console.error('Error deleting file:', error);
        // Don't throw - file might already be deleted
    }
};

/**
 * Update agency branding in Firestore
 * @param {string} agencyId - Agency ID
 * @param {Object} brandingData - Branding configuration
 * @returns {Promise<void>}
 */
export const updateBranding = async (agencyId, brandingData) => {
    try {
        const agencyRef = doc(db, 'agencies', agencyId);

        await updateDoc(agencyRef, {
            branding: brandingData,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating branding:', error);
        throw error;
    }
};

/**
 * Update agency email settings
 * @param {string} agencyId - Agency ID
 * @param {Object} emailSettings - Email configuration
 * @returns {Promise<void>}
 */
export const updateEmailSettings = async (agencyId, emailSettings) => {
    try {
        const agencyRef = doc(db, 'agencies', agencyId);

        await updateDoc(agencyRef, {
            emailSettings,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating email settings:', error);
        throw error;
    }
};

/**
 * Get agency branding configuration
 * @param {string} agencyId - Agency ID
 * @returns {Promise<Object>} Branding configuration
 */
export const getBranding = async (agencyId) => {
    try {
        const agencyRef = doc(db, 'agencies', agencyId);
        const agencyDoc = await getDoc(agencyRef);

        if (!agencyDoc.exists()) {
            throw new Error('Agency not found');
        }

        const data = agencyDoc.data();
        return data.branding || {
            logo: null,
            primaryColor: '#0F766E',
            portalName: 'Portal Crucero',
            favicon: null
        };
    } catch (error) {
        console.error('Error getting branding:', error);
        throw error;
    }
};

/**
 * Get agency email settings
 * @param {string} agencyId - Agency ID
 * @returns {Promise<Object>} Email settings
 */
export const getEmailSettings = async (agencyId) => {
    try {
        const agencyRef = doc(db, 'agencies', agencyId);
        const agencyDoc = await getDoc(agencyRef);

        if (!agencyDoc.exists()) {
            throw new Error('Agency not found');
        }

        const data = agencyDoc.data();
        return data.emailSettings || {
            senderName: 'Portal Crucero',
            replyTo: 'noreply@portalcrucero.com',
            emailSignature: 'Best regards,\nPortal Crucero Team'
        };
    } catch (error) {
        console.error('Error getting email settings:', error);
        throw error;
    }
};

/**
 * Reset branding to default values
 * @param {string} agencyId - Agency ID
 * @returns {Promise<void>}
 */
export const resetBranding = async (agencyId) => {
    try {
        const defaultBranding = {
            logo: null,
            primaryColor: '#0F766E',
            portalName: 'Portal Crucero',
            favicon: null
        };

        await updateBranding(agencyId, defaultBranding);
    } catch (error) {
        console.error('Error resetting branding:', error);
        throw error;
    }
};
