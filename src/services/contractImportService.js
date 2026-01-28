/**
 * Contract Import Service
 * 
 * Handles cruise contract PDF uploads, OCR parsing, validation,
 * and group creation with immutable import audit records.
 * 
 * Integrates with:
 * - OCR Parser (ocr.v1 schema)
 * - Subscription Gate (ocr_parsing feature)
 * - Multi-tenant isolation (agencyId scoping)
 */

import { db } from './firebase.js';
import {
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { extractTextFromPDF } from './pdfExtractor.js';
import {
    parseContractText,
    validateParsedData,
    PARSER_VERSION,
    OUTPUT_SCHEMA_VERSION
} from '../skills/ocr/ocrParserService.js';

// ============================================================================
// OCR PARSE
// ============================================================================

/**
 * Run OCR parse on uploaded PDF
 * @param {File} pdfFile - PDF file from input
 * @param {Object} hints - Optional hints { currency, shipName }
 * @returns {Promise<Object>} OCR result with ocr.v1 schema
 */
export async function runOcrParse(pdfFile, hints = {}) {
    if (!pdfFile || pdfFile.type !== 'application/pdf') {
        return {
            success: false,
            needsReview: true,
            reason: 'Invalid file type. Please upload a PDF.',
            telemetry: { error: 'invalid_file_type' }
        };
    }

    try {
        // Extract text from PDF
        const pdfText = await extractTextFromPDF(pdfFile);

        if (!pdfText || pdfText.trim().length < 50) {
            return {
                success: false,
                needsReview: true,
                reason: 'Could not extract text from PDF. The file may be image-based or corrupt.',
                telemetry: { error: 'extraction_failed' }
            };
        }

        // Run OCR parser
        const result = parseContractText({ pdfText, hints });

        return result;
    } catch (error) {
        console.error('[ContractImport] OCR parse error:', error);
        return {
            success: false,
            needsReview: true,
            reason: `Parse error: ${error.message}`,
            telemetry: { error: 'parse_exception', message: error.message }
        };
    }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate data before confirming import
 * Uses flexible schema: categoryCode/type/qty instead of requiring cabinNumber
 * 
 * @param {Object} data - Edited data to validate
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateForConfirm(data) {
    const errors = [];
    const warnings = [];

    // Base currency required
    if (!data.baseCurrency) {
        errors.push('Base currency is required');
    } else if (!['USD', 'CAD', 'EUR', 'MXN', 'GBP'].includes(data.baseCurrency)) {
        errors.push(`Unsupported currency: ${data.baseCurrency}`);
    }

    // Cabin inventory validation (flexible schema)
    if (!data.cabinInventory || data.cabinInventory.length === 0) {
        warnings.push('No cabin inventory - you can add cabins manually after import');
    } else {
        for (let i = 0; i < data.cabinInventory.length; i++) {
            const cabin = data.cabinInventory[i];

            // Must have either cabinNumber OR categoryCode
            if (!cabin.cabinNumber && !cabin.categoryCode) {
                errors.push(`Row ${i + 1}: Must have cabin number or category code`);
            }

            // Price validation
            if (cabin.priceCents !== undefined) {
                if (!Number.isInteger(cabin.priceCents) || cabin.priceCents < 0) {
                    errors.push(`Row ${i + 1}: Price must be a positive integer (cents)`);
                }
            }

            // Quantity validation (if present)
            if (cabin.qty !== undefined && (!Number.isInteger(cabin.qty) || cabin.qty < 1)) {
                errors.push(`Row ${i + 1}: Quantity must be a positive integer`);
            }

            // Currency consistency
            if (cabin.currency && cabin.currency !== data.baseCurrency) {
                warnings.push(`Row ${i + 1}: Currency (${cabin.currency}) differs from base (${data.baseCurrency})`);
            }
        }
    }

    // Key dates validation
    if (!data.keyDates?.sailDate) {
        warnings.push('Sail date not set - please add it manually');
    }

    // Group name if provided
    if (data.groupName && data.groupName.trim().length < 3) {
        errors.push('Group name must be at least 3 characters');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Normalize cabin inventory to consistent schema
 * Converts OCR output to flexible schema
 */
export function normalizeCabinInventory(ocrCabins, baseCurrency) {
    if (!ocrCabins || !Array.isArray(ocrCabins)) return [];

    return ocrCabins.map((cabin, index) => ({
        rowId: cabin.rowId || `manual_${index}`,
        cabinNumber: cabin.cabinNumber || null,
        categoryCode: cabin.categoryCode || cabin.type || null,
        type: cabin.type || cabin.categoryCode || null,
        qty: cabin.qty || 1,
        priceCents: cabin.costCents || cabin.priceCents || 0,
        currency: baseCurrency,
        cabinNumbers: cabin.cabinNumber ? [cabin.cabinNumber] : [],
        rawLine: cabin.rawLine || null
    }));
}

// ============================================================================
// IDEMPOTENCY CHECK
// ============================================================================

/**
 * Find existing import by fingerprint (scoped to agency)
 * @param {Object} params
 * @param {string} params.agencyId - Agency ID
 * @param {string} params.contractFingerprint - Contract fingerprint from OCR
 * @returns {Promise<Object|null>} Existing import or null
 */
export async function findImportByFingerprint({ agencyId, contractFingerprint }) {
    if (!agencyId || !contractFingerprint) return null;

    try {
        // Query all groups for this agency
        const groupsQuery = query(
            collection(db, 'groups'),
            where('agencyId', '==', agencyId),
            where('importMetadata.fingerprint', '==', contractFingerprint)
        );

        const snapshot = await getDocs(groupsQuery);

        if (snapshot.empty) return null;

        // Return first match with details
        const groupDoc = snapshot.docs[0];
        const groupData = groupDoc.data();

        return {
            groupId: groupDoc.id,
            groupName: groupData.name || groupData.groupName,
            importId: groupData.importMetadata?.importId,
            createdAt: groupData.createdAt,
            fingerprint: contractFingerprint
        };
    } catch (error) {
        console.error('[ContractImport] Fingerprint lookup error:', error);
        return null;
    }
}

// ============================================================================
// CONFIRM IMPORT
// ============================================================================

/**
 * Confirm import - creates group and immutable import record
 * 
 * @param {Object} params
 * @param {string} params.agencyId - Agency ID
 * @param {Object} params.editedData - Final edited data
 * @param {Object} params.ocrOriginal - Original OCR output (immutable)
 * @param {Object} params.telemetry - OCR telemetry
 * @param {string} params.createdBy - User ID
 * @param {string} params.duplicateOfImportId - If creating despite duplicate warning
 * @returns {Promise<{ success, groupId, importId, error? }>}
 */
export async function confirmImport({
    agencyId,
    editedData,
    ocrOriginal,
    telemetry,
    createdBy,
    duplicateOfImportId = null
}) {
    // Validate
    const validation = validateForConfirm(editedData);
    if (!validation.valid) {
        return {
            success: false,
            error: validation.errors.join('; ')
        };
    }

    try {
        // Normalize cabin inventory
        const normalizedCabins = normalizeCabinInventory(
            editedData.cabinInventory,
            editedData.baseCurrency
        );

        // Calculate user edits diff
        const userEdits = calculateEditsDiff(ocrOriginal, editedData);

        // Create group document
        const groupRef = doc(collection(db, 'groups'));
        const importRef = doc(collection(db, `groups/${groupRef.id}/imports`));

        const groupData = {
            agencyId,
            name: editedData.groupName || `Import ${new Date().toLocaleDateString()}`,
            baseCurrency: editedData.baseCurrency,
            cabinInventory: normalizedCabins,
            keyDates: {
                sailDate: editedData.keyDates?.sailDate || null,
                depositDeadline: editedData.keyDates?.depositDeadline || null,
                finalPaymentDeadline: editedData.keyDates?.finalPaymentDeadline || null,
                optionExpiration: editedData.keyDates?.optionExpiration || null
            },
            importMetadata: {
                importId: importRef.id,
                fingerprint: telemetry?.contractFingerprint || null,
                parserVersion: telemetry?.parserVersion || PARSER_VERSION,
                outputSchemaVersion: telemetry?.outputSchemaVersion || OUTPUT_SCHEMA_VERSION,
                duplicateOfImportId
            },
            status: 'active',
            createdAt: serverTimestamp(),
            createdBy,
            updatedAt: serverTimestamp()
        };

        // Create immutable import record
        const importData = {
            originalOcrOutput: ocrOriginal || {},
            userEdits,
            finalData: {
                baseCurrency: editedData.baseCurrency,
                cabinInventory: normalizedCabins,
                keyDates: groupData.keyDates
            },
            telemetry: {
                ...telemetry,
                parserVersion: PARSER_VERSION,
                outputSchemaVersion: OUTPUT_SCHEMA_VERSION
            },
            duplicateOfImportId,
            createdAt: serverTimestamp(),
            createdBy
        };

        // Write both documents
        await setDoc(groupRef, groupData);
        await setDoc(importRef, importData);

        console.log(`[ContractImport] Created group ${groupRef.id} with import ${importRef.id}`);

        return {
            success: true,
            groupId: groupRef.id,
            importId: importRef.id,
            warnings: validation.warnings
        };
    } catch (error) {
        console.error('[ContractImport] Confirm error:', error);
        return {
            success: false,
            error: `Failed to create group: ${error.message}`
        };
    }
}

/**
 * Calculate minimal diff between OCR original and user edits
 * Returns array of { path, from, to } for each changed field
 * Does NOT duplicate data - only stores actual changes
 */
function calculateEditsDiff(ocrOriginal, editedData) {
    const changes = [];

    if (!ocrOriginal?.data) {
        // No original data - everything is "new"
        return {
            changes: [],
            summary: { isNewImport: true }
        };
    }

    const original = ocrOriginal.data;

    // Currency change
    if (original.baseCurrency !== editedData.baseCurrency) {
        changes.push({
            path: 'baseCurrency',
            from: original.baseCurrency || null,
            to: editedData.baseCurrency
        });
    }

    // Group name (new field, not in OCR original)
    if (editedData.groupName) {
        changes.push({
            path: 'groupName',
            from: null,
            to: editedData.groupName
        });
    }

    // Key dates changes
    const dateFields = ['sailDate', 'depositDeadline', 'finalPaymentDeadline', 'optionExpiration'];
    for (const field of dateFields) {
        const originalValue = original.keyDates?.[field] || null;
        const editedValue = editedData.keyDates?.[field] || null;
        if (originalValue !== editedValue) {
            changes.push({
                path: `keyDates.${field}`,
                from: originalValue,
                to: editedValue
            });
        }
    }

    // Cabin inventory changes (track by rowId)
    const originalCabins = new Map(
        (original.cabinInventory || []).map(c => [c.rowId, c])
    );
    const editedCabins = new Map(
        (editedData.cabinInventory || []).map(c => [c.rowId, c])
    );

    // Added cabins (path format: cabinInventory[rowId=ROW123])
    for (const [rowId, cabin] of editedCabins) {
        if (!originalCabins.has(rowId)) {
            changes.push({
                path: `cabinInventory[rowId=${rowId}]`,
                from: null,
                to: { rowId, categoryCode: cabin.categoryCode, qty: cabin.qty }
            });
        }
    }

    // Removed cabins
    for (const [rowId] of originalCabins) {
        if (!editedCabins.has(rowId)) {
            changes.push({
                path: `cabinInventory[rowId=${rowId}]`,
                from: { rowId },
                to: null
            });
        }
    }

    // Modified cabins (compare specific fields only - money in cents)
    const cabinFields = ['categoryCode', 'type', 'qty', 'costCents', 'priceCents'];
    for (const [rowId, editedCabin] of editedCabins) {
        const originalCabin = originalCabins.get(rowId);
        if (originalCabin) {
            for (const field of cabinFields) {
                if (originalCabin[field] !== editedCabin[field]) {
                    changes.push({
                        path: `cabinInventory[rowId=${rowId}].${field}`,
                        from: originalCabin[field] ?? null,
                        to: editedCabin[field] ?? null
                    });
                }
            }
        }
    }

    // Calculate summary counts per spec:
    // - cabinsAdded: path == "cabinInventory[rowId=...]" AND from == null AND to != null
    // - cabinsRemoved: same path format AND from != null AND to == null
    // - cabinsModified: path startsWith "cabinInventory[rowId=" AND path includes "]." (field-level)
    const cabinRowPattern = /^cabinInventory\[rowId=/;

    const cabinsAdded = changes.filter(c =>
        cabinRowPattern.test(c.path) &&
        !c.path.includes('].') &&
        c.from === null &&
        c.to !== null
    ).length;

    const cabinsRemoved = changes.filter(c =>
        cabinRowPattern.test(c.path) &&
        !c.path.includes('].') &&
        c.from !== null &&
        c.to === null
    ).length;

    const cabinsModified = changes.filter(c =>
        c.path.startsWith('cabinInventory[rowId=') &&
        c.path.includes('].')
    ).length;

    return {
        changes,
        summary: {
            totalChanges: changes.length,
            currencyChanged: changes.some(c => c.path === 'baseCurrency'),
            cabinsAdded,
            cabinsRemoved,
            cabinsModified,
            datesModified: changes.filter(c => c.path.startsWith('keyDates.')).map(c => c.path.split('.')[1])
        }
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    runOcrParse,
    validateForConfirm,
    normalizeCabinInventory,
    findImportByFingerprint,
    confirmImport
};

// Named export for testing internal function
export { calculateEditsDiff };
