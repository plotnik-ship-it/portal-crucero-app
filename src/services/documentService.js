import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import { db, storage, auth } from './firebase';

/**
 * Upload a document to Firebase Storage and create metadata in Firestore
 * @param {File} file - The file to upload
 * @param {Object} metadata - Document metadata
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Object>} - The created document data
 */
export const uploadDocument = (file, metadata, onProgress) => {
    return new Promise((resolve, reject) => {
        const { agencyId, groupId, familyCode, category } = metadata;
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `/documents/${agencyId}/${groupId}/${familyCode}/${category}/${timestamp}_${sanitizedFileName}`;

        // Create storage reference
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        // Monitor upload progress
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) {
                    onProgress(progress);
                }
            },
            (error) => {
                console.error('Upload error:', error);
                reject(error);
            },
            async () => {
                try {
                    // Get download URL
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

                    // Create document in Firestore
                    const docData = {
                        agencyId,
                        groupId,
                        familyCode,
                        category,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        storagePath,
                        downloadUrl,
                        uploadedBy: auth.currentUser?.email || 'unknown',
                        uploadedAt: serverTimestamp(),
                        sharedLink: null
                    };

                    const docRef = await addDoc(collection(db, 'documents'), docData);
                    resolve({ id: docRef.id, ...docData });
                } catch (error) {
                    console.error('Error creating document metadata:', error);
                    reject(error);
                }
            }
        );
    });
};

/**
 * Get all documents for a specific family
 * @param {string} agencyId - Agency ID
 * @param {string} groupId - Group ID
 * @param {string} familyCode - Family code
 * @returns {Promise<Array>} - Array of documents
 */
export const getDocumentsByFamily = async (agencyId, groupId, familyCode) => {
    try {
        const q = query(
            collection(db, 'documents'),
            where('agencyId', '==', agencyId),
            where('groupId', '==', groupId),
            where('familyCode', '==', familyCode),
            orderBy('uploadedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            uploadedAt: doc.data().uploadedAt?.toDate() || new Date()
        }));
    } catch (error) {
        console.error('Error fetching documents:', error);
        throw error;
    }
};

/**
 * Get all documents for a group (all families)
 * @param {string} agencyId - Agency ID
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>} - Array of documents
 */
export const getDocumentsByGroup = async (agencyId, groupId) => {
    try {
        const q = query(
            collection(db, 'documents'),
            where('agencyId', '==', agencyId),
            where('groupId', '==', groupId),
            orderBy('uploadedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            uploadedAt: doc.data().uploadedAt?.toDate() || new Date()
        }));
    } catch (error) {
        console.error('Error fetching group documents:', error);
        throw error;
    }
};

/**
 * Delete a document from Storage and Firestore
 * @param {string} documentId - Document ID
 * @param {string} storagePath - Storage path
 * @returns {Promise<void>}
 */
export const deleteDocument = async (documentId, storagePath) => {
    try {
        // Delete from Storage
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);

        // Delete from Firestore
        await deleteDoc(doc(db, 'documents', documentId));
    } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
    }
};

/**
 * Generate a shareable link for a document
 * @param {string} documentId - Document ID
 * @returns {Promise<string>} - Shareable link
 */
export const generateShareLink = async (documentId) => {
    try {
        // Generate secure token
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update document with share link
        await updateDoc(doc(db, 'documents', documentId), {
            sharedLink: {
                token,
                expiresAt,
                createdAt: new Date()
            }
        });

        return `${window.location.origin}/shared/${token}`;
    } catch (error) {
        console.error('Error generating share link:', error);
        throw error;
    }
};

/**
 * Get document by share token
 * @param {string} token - Share token
 * @returns {Promise<Object|null>} - Document data or null if not found/expired
 */
export const getDocumentByToken = async (token) => {
    try {
        const q = query(
            collection(db, 'documents'),
            where('sharedLink.token', '==', token)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const docData = snapshot.docs[0];
        const data = docData.data();

        // Check if link is expired
        if (data.sharedLink?.expiresAt?.toDate() < new Date()) {
            return null; // Link expired
        }

        return { id: docData.id, ...data };
    } catch (error) {
        console.error('Error getting document by token:', error);
        return null;
    }
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateFile = (file) => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/msword', // .doc
        'application/vnd.ms-excel' // .xls
    ];

    if (file.size > MAX_SIZE) {
        return {
            valid: false,
            error: 'File size exceeds 10MB limit'
        };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: 'File type not allowed. Allowed: PDF, JPG, PNG, DOCX, XLSX'
        };
    }

    return { valid: true, error: null };
};

/**
 * Get file icon based on file type
 * @param {string} fileType - MIME type
 * @returns {string} - Emoji icon
 */
export const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    return '📎';
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
