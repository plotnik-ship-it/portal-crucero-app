import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use jsDelivr CDN with matching version
// Version must match installed pdfjs-dist (currently 5.4.530)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs';

/**
 * Extract text from PDF file using PDF.js
 * @param {File} file - PDF file object
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromPDF(file) {
    try {
        console.log('Starting PDF extraction for file:', file.name, 'Size:', file.size);

        const arrayBuffer = await file.arrayBuffer();
        console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        console.log('PDF loaded successfully. Pages:', pdf.numPages);

        let fullText = '';

        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
            console.log(`Page ${i} extracted, length:`, pageText.length);
        }

        console.log('Total extracted text length:', fullText.trim().length);
        return fullText.trim();
    } catch (error) {
        console.error('Detailed PDF extraction error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        // More specific error messages
        if (error.message?.includes('worker')) {
            throw new Error('Error al cargar el worker de PDF. Intenta recargar la página.');
        } else if (error.message?.includes('Invalid PDF')) {
            throw new Error('El archivo PDF está corrupto o no es válido.');
        } else {
            throw new Error('No se pudo extraer el texto del PDF: ' + error.message);
        }
    }
}

/**
 * Extract hints from text using regex patterns
 * Helps improve Gemini AI parsing accuracy
 * @param {string} text - Extracted PDF text
 * @returns {Object} Hints object
 */
export function extractHints(text) {
    const hints = {};

    // Ship names (common cruise lines)
    const shipPattern = /(MSC \w+|Royal Caribbean|Carnival \w+|Norwegian \w+|Celebrity \w+|Princess \w+|Disney \w+)/gi;
    const shipMatch = text.match(shipPattern);
    if (shipMatch) {
        hints.shipName = shipMatch[0];
    }

    // Sail date (various formats)
    const datePatterns = [
        /\b(\d{4}-\d{2}-\d{2})\b/,  // YYYY-MM-DD
        /\b(\d{2}\/\d{2}\/\d{4})\b/, // MM/DD/YYYY
        /\b(\d{2}-\d{2}-\d{4})\b/,  // DD-MM-YYYY
    ];

    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            hints.sailDate = match[1];
            break;
        }
    }

    // Booking/Confirmation reference (6+ alphanumeric)
    const bookingPattern = /\b([A-Z0-9]{6,})\b/g;
    const bookingMatches = text.match(bookingPattern);
    if (bookingMatches && bookingMatches.length > 0) {
        // Take the first one that looks like a booking ref
        hints.bookingRef = bookingMatches[0];
    }

    // Cabin numbers (4-5 digits)
    const cabinPattern = /\b(\d{4,5})\b/g;
    const cabinMatches = text.match(cabinPattern);
    if (cabinMatches) {
        hints.cabinNumbers = [...new Set(cabinMatches)]; // Remove duplicates
    }

    // Currency
    const currencyPattern = /\b(CAD|USD|EUR|GBP|MXN)\b/gi;
    const currencyMatch = text.match(currencyPattern);
    if (currencyMatch) {
        hints.currency = currencyMatch[0].toUpperCase();
    }

    // Totals (money amounts)
    const totalPattern = /\$[\d,]+\.?\d*/g;
    const totalMatches = text.match(totalPattern);
    if (totalMatches) {
        hints.totals = totalMatches.map(t => t.replace(/[$,]/g, ''));
    }

    // Passenger count hint
    const passengerPattern = /(\d+)\s+(passenger|guest|pax)/gi;
    const passengerMatch = text.match(passengerPattern);
    if (passengerMatch) {
        const count = parseInt(passengerMatch[0].match(/\d+/)[0]);
        hints.passengerCount = count;
    }

    return hints;
}

/**
 * Validate PDF file before processing
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
export function validatePDFFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!file) {
        return { valid: false, error: 'No se seleccionó ningún archivo' };
    }

    if (file.type !== 'application/pdf') {
        return { valid: false, error: 'El archivo debe ser un PDF' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'El archivo es demasiado grande (máximo 10MB)' };
    }

    return { valid: true };
}
