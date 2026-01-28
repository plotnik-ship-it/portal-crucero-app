import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload agency logo to Firebase Storage
 */
export const uploadAgencyLogo = async (agencyId, file) => {
    try {
        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Formato de archivo no válido. Use PNG, JPG o SVG.');
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            throw new Error('El archivo es demasiado grande. Máximo 2MB.');
        }

        // Create storage reference
        const fileExtension = file.name.split('.').pop();
        const storagePath = `agencies/${agencyId}/logo.${fileExtension}`;
        const storageRef = ref(storage, storagePath);

        // Upload file
        await uploadBytes(storageRef, file);

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        return {
            url: downloadURL,
            path: storagePath
        };
    } catch (error) {
        console.error('Error uploading logo:', error);
        throw error;
    }
};

/**
 * Delete agency logo from storage
 */
export const deleteAgencyLogo = async (storagePath) => {
    try {
        if (!storagePath) return;

        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
    } catch (error) {
        console.error('Error deleting logo:', error);
        // Don't throw - logo might not exist
    }
};

/**
 * Convert HEX color to RGB array for jsPDF
 */
export const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
};

/**
 * Convert RGB array to HEX color
 */
export const rgbToHex = (rgb) => {
    if (!Array.isArray(rgb) || rgb.length !== 3) return '#000000';

    const toHex = (n) => {
        const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
};
