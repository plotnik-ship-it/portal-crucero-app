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
    serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';

/**
 * Generate a unique quotation number
 * Format: QUOT-YYYY-NNNN (e.g., QUOT-2026-0001)
 */
const generateQuotationNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = `QUOT-${year}-`;

    // Get all quotations for current year to find the next number
    const quotationsRef = collection(db, 'quotations');
    const q = query(
        quotationsRef,
        where('quotationNumber', '>=', prefix),
        where('quotationNumber', '<', `QUOT-${year + 1}-`),
        orderBy('quotationNumber', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return `${prefix}0001`;
    }

    // Extract the number from the last quotation
    const lastQuotation = snapshot.docs[0].data();
    const lastNumber = parseInt(lastQuotation.quotationNumber.split('-')[2]);
    const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

    return `${prefix}${nextNumber}`;
};

/**
 * Create a new quotation
 * @param {Object} quotationData - Quotation data
 * @returns {Promise<Object>} - Created quotation with ID
 */
export const createQuotation = async (quotationData) => {
    try {
        // Generate quotation number
        const quotationNumber = await generateQuotationNumber();

        // Calculate totals
        const cabinSubtotal = quotationData.cabins.reduce((sum, cabin) => {
            return sum + (cabin.pricePerCabin * cabin.quantity);
        }, 0);

        const additionalCosts = quotationData.additionalCosts || {};
        const gratuities = additionalCosts.gratuities || 0;
        const taxes = additionalCosts.taxes || 0;
        const insurance = additionalCosts.insurance || 0;

        const subtotal = cabinSubtotal;
        const total = subtotal + gratuities + taxes + insurance;

        // Set expiration date (30 days from now by default)
        const expiresAt = quotationData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const newQuotation = {
            quotationNumber,
            agencyId: quotationData.agencyId,
            status: quotationData.status || 'draft',

            // Client information
            clientInfo: {
                name: quotationData.clientInfo.name,
                email: quotationData.clientInfo.email,
                phone: quotationData.clientInfo.phone || ''
            },

            // Cruise information
            cruiseInfo: {
                cruiseLine: quotationData.cruiseInfo.cruiseLine,
                shipName: quotationData.cruiseInfo.shipName,
                sailDate: quotationData.cruiseInfo.sailDate,
                duration: quotationData.cruiseInfo.duration,
                departurePort: quotationData.cruiseInfo.departurePort,
                itinerary: quotationData.cruiseInfo.itinerary || []
            },

            // Cabins
            cabins: quotationData.cabins,

            // Additional costs
            additionalCosts: {
                gratuities,
                taxes,
                insurance
            },

            // Totals
            subtotal,
            total,
            currency: quotationData.currency || 'CAD',

            // Notes and terms
            notes: quotationData.notes || '',
            termsAndConditions: quotationData.termsAndConditions || '',

            // Metadata
            createdBy: auth.currentUser?.email || 'system',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            sentAt: null,
            expiresAt,

            // PDF URL
            pdfUrl: null
        };

        const quotationsRef = collection(db, 'quotations');
        const docRef = await addDoc(quotationsRef, newQuotation);

        console.log(`✅ Quotation ${quotationNumber} created successfully`);

        return { id: docRef.id, ...newQuotation };
    } catch (error) {
        console.error('Error creating quotation:', error);
        throw error;
    }
};

/**
 * Get all quotations for an agency
 * @param {string} agencyId - Agency ID
 * @returns {Promise<Array>} - Array of quotations
 */
export const getQuotationsByAgency = async (agencyId) => {
    try {
        const quotationsRef = collection(db, 'quotations');

        // Query without orderBy to avoid requiring a composite index
        const q = query(
            quotationsRef,
            where('agencyId', '==', agencyId)
        );

        const snapshot = await getDocs(q);
        const quotations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || null,
            sentAt: doc.data().sentAt?.toDate() || null,
            expiresAt: doc.data().expiresAt?.toDate() || null
        }));

        // Sort in memory by createdAt descending
        quotations.sort((a, b) => {
            const aTime = a.createdAt?.getTime() || 0;
            const bTime = b.createdAt?.getTime() || 0;
            return bTime - aTime;
        });

        return quotations;
    } catch (error) {
        console.error('Error getting quotations by agency:', error);
        throw error;
    }
};

/**
 * Get quotation by ID
 * @param {string} quotationId - Quotation ID
 * @returns {Promise<Object|null>} - Quotation data or null
 */
export const getQuotationById = async (quotationId) => {
    try {
        const quotationDoc = await getDoc(doc(db, 'quotations', quotationId));
        if (quotationDoc.exists()) {
            const data = quotationDoc.data();
            return {
                id: quotationDoc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || null,
                sentAt: data.sentAt?.toDate() || null,
                expiresAt: data.expiresAt?.toDate() || null
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting quotation by ID:', error);
        throw error;
    }
};

/**
 * Update quotation
 * @param {string} quotationId - Quotation ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateQuotation = async (quotationId, updates) => {
    try {
        const quotationRef = doc(db, 'quotations', quotationId);
        await updateDoc(quotationRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        console.log(`✅ Quotation ${quotationId} updated successfully`);
    } catch (error) {
        console.error('Error updating quotation:', error);
        throw error;
    }
};

/**
 * Update quotation status
 * @param {string} quotationId - Quotation ID
 * @param {string} status - New status (draft, sent, approved, rejected, converted)
 * @returns {Promise<void>}
 */
export const updateQuotationStatus = async (quotationId, status) => {
    try {
        const quotationRef = doc(db, 'quotations', quotationId);
        const updates = {
            status,
            updatedAt: serverTimestamp()
        };

        if (status === 'sent') {
            updates.sentAt = serverTimestamp();
        }

        await updateDoc(quotationRef, updates);
        console.log(`✅ Quotation ${quotationId} status updated to ${status}`);
    } catch (error) {
        console.error('Error updating quotation status:', error);
        throw error;
    }
};

/**
 * Delete a quotation
 * @param {string} quotationId - Quotation ID
 * @returns {Promise<void>}
 */
export const deleteQuotation = async (quotationId) => {
    try {
        await deleteDoc(doc(db, 'quotations', quotationId));
        console.log(`✅ Quotation ${quotationId} deleted successfully`);
    } catch (error) {
        console.error('Error deleting quotation:', error);
        throw error;
    }
};

/**
 * Update quotation PDF URL
 * @param {string} quotationId - Quotation ID
 * @param {string} pdfUrl - PDF download URL
 * @returns {Promise<void>}
 */
export const updateQuotationPdfUrl = async (quotationId, pdfUrl) => {
    try {
        const quotationRef = doc(db, 'quotations', quotationId);
        await updateDoc(quotationRef, {
            pdfUrl,
            updatedAt: serverTimestamp()
        });
        console.log(`✅ Quotation ${quotationId} PDF URL updated`);
    } catch (error) {
        console.error('Error updating quotation PDF URL:', error);
        throw error;
    }
};
