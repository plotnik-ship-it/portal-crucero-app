/**
 * Storage Service
 * 
 * Provides functions for uploading and managing files in Firebase Storage.
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload agency logo to Firebase Storage
 * 
 * @param {File} file - Logo file to upload
 * @param {string} agencyId - Agency ID
 * @returns {Promise<string>} Download URL of uploaded file
 */
export async function uploadAgencyLogo(file, agencyId) {
    if (!file) {
        throw new Error('No file provided');
    }

    if (!agencyId) {
        throw new Error('Agency ID is required');
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload PNG, JPG, or SVG.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit');
    }

    try {
        // Get file extension
        const extension = file.name.split('.').pop();

        // Create storage reference
        const storageRef = ref(storage, `agencies/${agencyId}/logo.${extension}`);

        // Upload file
        const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type,
            customMetadata: {
                uploadedAt: new Date().toISOString(),
                originalName: file.name
            }
        });

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading logo:', error);
        throw new Error('Failed to upload logo. Please try again.');
    }
}

/**
 * Delete agency logo from Firebase Storage
 * 
 * @param {string} logoUrl - Full URL of the logo to delete
 * @returns {Promise<void>}
 */
export async function deleteAgencyLogo(logoUrl) {
    if (!logoUrl) {
        return; // Nothing to delete
    }

    try {
        // Extract path from URL
        const url = new URL(logoUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+)\?/);

        if (!pathMatch) {
            throw new Error('Invalid logo URL');
        }

        const path = decodeURIComponent(pathMatch[1]);
        const storageRef = ref(storage, path);

        await deleteObject(storageRef);
    } catch (error) {
        console.error('Error deleting logo:', error);
        // Don't throw - deletion is not critical
    }
}

/**
 * Upload group document to Firebase Storage
 * 
 * @param {File} file - Document file to upload
 * @param {string} groupId - Group ID
 * @param {string} fileName - Custom file name (optional)
 * @returns {Promise<string>} Download URL of uploaded file
 */
export async function uploadGroupDocument(file, groupId, fileName = null) {
    if (!file) {
        throw new Error('No file provided');
    }

    if (!groupId) {
        throw new Error('Group ID is required');
    }

    try {
        const name = fileName || file.name;
        const storageRef = ref(storage, `groups/${groupId}/documents/${name}`);

        const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type,
            customMetadata: {
                uploadedAt: new Date().toISOString(),
                originalName: file.name
            }
        });

        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading document:', error);
        throw new Error('Failed to upload document. Please try again.');
    }
}

/**
 * Get file size in human-readable format
 * 
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
