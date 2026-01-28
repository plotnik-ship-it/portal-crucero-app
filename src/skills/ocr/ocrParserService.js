/**
 * OCR Parser & Currency Detector - Production-Grade Beta
 * 
 * Skill #1: Premium feature for parsing cruise contract PDFs
 * 
 * OUTPUT CONTRACTS:
 * A. Success (auto-fill):
 *    { success: true, data: { baseCurrency, cabinInventory[], keyDates }, telemetry }
 * 
 * B. Needs Review (no guessing):
 *    { success: false, needsReview: true, currencyCandidates[], unparsedRows[], reason }
 * 
 * GUARDRAILS:
 * - Never guess currency from $ alone
 * - Multiple explicit currencies → force review
 * - Incomplete table → partial: true + rowsUnparsed
 */

import { validateCurrency, validateCents } from '../_shared/validators.js';
import { toCents } from '../_shared/moneyUtils.js';

// ============================================================================
// VERSION & SCHEMA
// ============================================================================
export const PARSER_VERSION = '1.1.0';
export const OUTPUT_SCHEMA_VERSION = 'ocr.v1';

// ============================================================================
// CONFIGURABLE THRESHOLDS (not hardcoded)
// ============================================================================
export const THRESHOLDS = {
    /** Minimum confidence to auto-accept currency without review */
    currencyConfidenceThreshold: 30,
    /** Minimum parse rate to avoid partial flag */
    tableParseRateThreshold: 80,
    /** Minimum dates found to consider complete */
    datesRequiredForComplete: 1
};

/**
 * Generate deterministic row ID from text + index
 * @param {string} text - Raw line text
 * @param {number} index - Line index
 * @returns {string} Short hash ID
 */
function generateRowId(text, index) {
    const normalized = (text || '').toLowerCase().replace(/\s+/g, '').substring(0, 50);
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `row_${Math.abs(hash).toString(16)}_${index}`;
}

/**
 * Generate contract fingerprint from text
 * @param {string} text - Full PDF text
 * @returns {string} Short fingerprint for grouping similar contracts
 */
function generateFingerprint(text) {
    if (!text) return 'empty';
    // Use first 500 chars normalized + length for fingerprint
    const sample = text.substring(0, 500).toLowerCase().replace(/\s+/g, '');
    let hash = 0;
    for (let i = 0; i < sample.length; i++) {
        const char = sample.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `fp_${Math.abs(hash).toString(16)}_${text.length}`;
}

// Currency patterns for detection - STRICT ($ alone doesn't count)
const CURRENCY_PATTERNS = {
    USD: {
        // Explicit patterns only - no bare $ signs
        explicit: [
            /\b(USD)\b/gi,
            /\bU\.S\.\s*Dollars?\b/gi,
            /\bUS\s*Dollars?\b/gi,
            /\bUnited\s*States\s*Dollars?\b/gi,
            /\ball\s+amounts?\s+(?:are\s+)?in\s+USD\b/gi,
            /\ball\s+amounts?\s+(?:are\s+)?in\s+U\.?S\.?\s*Dollars?\b/gi
        ],
        // Price patterns with explicit currency
        priced: [
            /\$[\d,]+\.?\d*\s*USD\b/gi,
            /\bUSD\s*\$[\d,]+\.?\d*/gi
        ]
    },
    CAD: {
        explicit: [
            /\b(CAD)\b/gi,
            /\bCanadian\s*Dollars?\b/gi,
            /\bC\$/gi,
            /\ball\s+amounts?\s+(?:are\s+)?in\s+CAD\b/gi,
            /\ball\s+amounts?\s+(?:are\s+)?in\s+Canadian\s*Dollars?\b/gi
        ],
        priced: [
            /\$[\d,]+\.?\d*\s*CAD\b/gi,
            /\bCAD\s*\$[\d,]+\.?\d*/gi,
            /\bC\$[\d,]+\.?\d*/gi
        ]
    },
    EUR: {
        explicit: [
            /\b(EUR)\b/gi,
            /\bEuros?\b/gi,
            /\ball\s+amounts?\s+(?:are\s+)?in\s+EUR\b/gi,
            /\ball\s+amounts?\s+(?:are\s+)?in\s+Euros?\b/gi
        ],
        priced: [
            /€[\d,]+\.?\d*/gi,
            /[\d,]+\.?\d*\s*€/gi,
            /\bEUR\s*[\d,]+\.?\d*/gi
        ]
    },
    MXN: {
        explicit: [
            /\b(MXN)\b/gi,
            /\bMexican\s*Pesos?\b/gi,
            /\bPesos?\s*Mexicanos?\b/gi,
            /\ball\s+amounts?\s+(?:are\s+)?in\s+MXN\b/gi
        ],
        priced: [
            /\$[\d,]+\.?\d*\s*MXN\b/gi,
            /\bMXN\s*\$[\d,]+\.?\d*/gi
        ]
    },
    GBP: {
        explicit: [
            /\b(GBP)\b/gi,
            /\bBritish\s*Pounds?\b/gi,
            /\bPounds?\s*Sterling\b/gi
        ],
        priced: [
            /£[\d,]+\.?\d*/gi
        ]
    }
};

// FX context patterns to IGNORE (these are conversions, not base currency)
const FX_IGNORE_PATTERNS = [
    /exchange\s*rate/gi,
    /conversion\s*rate/gi,
    /approximately/gi,
    /approx\.?\s*\$/gi,
    /equivalent\s+to/gi,
    /converted\s+(?:to|from)/gi
];

// Date patterns - simplified to match common formats
const DATE_PATTERNS = {
    sailDate: [
        /(?:sail(?:ing)?)\s*date\s*[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /(?:sail(?:ing)?)\s*date\s*[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
        /departure\s*[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ],
    depositDeadline: [
        /deposit\s*(?:due|deadline)\s*[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ],
    finalPayment: [
        /final\s*(?:payment\s*)?(?:due|deadline)\s*[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /balance\s*(?:due|deadline)\s*[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ]
};

/**
 * Detects currency with STRICT rules
 * $ alone does NOT determine currency
 * 
 * @param {string} text - Extracted PDF text
 * @param {Object} hints - Optional hints
 * @returns {Object} Currency detection result
 */
export function detectCurrency(text, hints = {}) {
    if (!text || typeof text !== 'string') {
        return {
            success: false,
            needsReview: true,
            error: 'No text provided',
            currencyCandidates: [],
            reason: 'No text provided for currency detection'
        };
    }

    // Remove FX context lines to avoid false positives
    let cleanText = text;
    for (const pattern of FX_IGNORE_PATTERNS) {
        cleanText = cleanText.replace(pattern, '');
    }

    const scores = {};
    const explicitMatches = {};

    // Count currency indicators - explicit patterns only
    for (const [currency, patterns] of Object.entries(CURRENCY_PATTERNS)) {
        scores[currency] = 0;
        explicitMatches[currency] = [];

        // Explicit mentions (high weight)
        for (const pattern of patterns.explicit) {
            const matches = cleanText.match(pattern);
            if (matches) {
                scores[currency] += matches.length * 15;
                explicitMatches[currency].push(...matches);
            }
        }

        // Priced patterns (medium weight)
        for (const pattern of patterns.priced) {
            const matches = cleanText.match(pattern);
            if (matches) {
                scores[currency] += matches.length * 10;
                explicitMatches[currency].push(...matches);
            }
        }
    }

    // Apply hints bonus (but not enough to overcome lack of evidence)
    if (hints.currency && scores[hints.currency] !== undefined) {
        scores[hints.currency] += 20;
    }

    // Find candidates with scores > 0
    const candidates = Object.entries(scores)
        .filter(([, score]) => score > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([currency, score]) => ({
            currency,
            score,
            confidence: Math.min(100, score),
            matches: explicitMatches[currency].slice(0, 3)
        }));

    // No currency detected
    if (candidates.length === 0) {
        return {
            success: false,
            needsReview: true,
            currencyCandidates: [],
            reason: 'No explicit currency indicators found. The $ symbol alone cannot determine currency.'
        };
    }

    const topCandidate = candidates[0];

    // Check for ambiguity - multiple explicit currencies detected
    if (candidates.length > 1 && candidates[1].score >= topCandidate.score * 0.5) {
        return {
            success: false,
            needsReview: true,
            currencyCandidates: candidates.slice(0, 3),
            reason: 'Multiple currencies detected with similar confidence. Please select the correct base currency.'
        };
    }

    // Check minimum confidence threshold (configurable)
    if (topCandidate.confidence < THRESHOLDS.currencyConfidenceThreshold) {
        return {
            success: false,
            needsReview: true,
            currencyCandidates: candidates.slice(0, 3),
            reason: `Currency confidence (${topCandidate.confidence}%) is below threshold (${THRESHOLDS.currencyConfidenceThreshold}%). Please confirm.`
        };
    }

    // Clear winner with sufficient confidence
    return {
        success: true,
        baseCurrency: topCandidate.currency,
        confidence: topCandidate.confidence,
        matches: topCandidate.matches,
        allCandidates: candidates
    };
}

/**
 * Extracts cabin inventory with 2-step parsing and partial support
 * @param {string} text - PDF text
 * @param {string} baseCurrency - Base currency for prices
 * @returns {Object} { cabins: [], unparsedRows: [], partial: boolean }
 */
export function extractCabinInventory(text, baseCurrency = 'CAD') {
    if (!text) return { cabins: [], unparsedRows: [], partial: false };

    const cabins = [];
    const unparsedRows = [];
    const lines = text.split('\n');

    // Context-aware cabin pattern
    const cabinContextPattern = /(?:cabin|stateroom|room|camarote|cabina)\s*[#:]?\s*(\d{4,5})/gi;

    // Price patterns - support multiple formats
    const pricePatterns = [
        /\$\s*([\d,]+\.?\d{0,2})/g,           // $1,500.00
        /USD\s*([\d,]+\.?\d{0,2})/gi,          // USD 1,500
        /CAD\s*([\d,]+\.?\d{0,2})/gi,          // CAD 1,500
        /([\d.]+,\d{2})\s*(?:USD|CAD|EUR)/gi   // 1.500,00 EUR (European format)
    ];

    // Step 1: Detect candidate rows (lines with cabin keywords)
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        cabinContextPattern.lastIndex = 0;
        const cabinMatch = cabinContextPattern.exec(line);

        if (cabinMatch) {
            const cabinNumber = cabinMatch[1];

            // Window: check current line and next 2 lines for price
            const windowText = [line, lines[i + 1] || '', lines[i + 2] || ''].join(' ');

            let priceFound = null;
            for (const pricePattern of pricePatterns) {
                pricePattern.lastIndex = 0;
                const priceMatches = windowText.match(pricePattern);
                if (priceMatches) {
                    const prices = priceMatches
                        .map(p => parsePrice(p))
                        .filter(p => p !== null && p > 10000); // > $100 in cents

                    if (prices.length > 0) {
                        priceFound = Math.max(...prices);
                        break;
                    }
                }
            }

            if (priceFound !== null && priceFound > 0) {
                cabins.push({
                    rowId: generateRowId(line, i),
                    cabinNumber,
                    costCents: priceFound,
                    currency: baseCurrency,
                    rawLine: line.substring(0, 100),
                    confidence: 'high',
                    lineNumber: i + 1
                });
            } else {
                // Cabin found but price not parseable
                unparsedRows.push({
                    rowId: generateRowId(line, i),
                    lineNumber: i + 1,
                    rawLine: line.substring(0, 150),
                    cabinNumber,
                    issue: 'Price not found or below threshold'
                });
            }
        }
    }

    // Step 2: Deduplicate by cabin number (keep highest price)
    const uniqueCabins = new Map();
    for (const cabin of cabins) {
        if (!uniqueCabins.has(cabin.cabinNumber) ||
            uniqueCabins.get(cabin.cabinNumber).costCents < cabin.costCents) {
            uniqueCabins.set(cabin.cabinNumber, cabin);
        }
    }

    // Validate each cabin
    const validatedCabins = [];
    for (const cabin of uniqueCabins.values()) {
        // Guardrail: no negative prices, no zero prices
        if (cabin.costCents > 0 && Number.isInteger(cabin.costCents)) {
            validatedCabins.push(cabin);
        } else {
            unparsedRows.push({
                lineNumber: cabin.lineNumber,
                rawLine: cabin.rawLine,
                cabinNumber: cabin.cabinNumber,
                issue: `Invalid price: ${cabin.costCents}`
            });
        }
    }

    return {
        cabins: validatedCabins,
        unparsedRows,
        partial: unparsedRows.length > 0
    };
}

/**
 * Parse price string to cents (deterministic)
 * Supports: 1,500.00 | 1.500,00 | USD 1,500 | $1,500
 */
function parsePrice(priceStr) {
    if (!priceStr) return null;

    // Remove currency symbols and codes
    let clean = priceStr.replace(/[$€£]|USD|CAD|EUR|MXN|GBP/gi, '').trim();

    // Detect format: US (1,500.00) vs EU (1.500,00)
    const hasCommaDecimal = /\d+\.\d{3},\d{2}$/.test(clean);

    if (hasCommaDecimal) {
        // European format: 1.500,00 -> 1500.00
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
        // US format: 1,500.00 -> 1500.00
        clean = clean.replace(/,/g, '');
    }

    const value = parseFloat(clean);
    if (isNaN(value)) return null;

    return toCents(value);
}

/**
 * Extracts key dates from text
 * @param {string} text - PDF text
 * @returns {Object} Key dates in ISO format
 */
export function extractKeyDates(text) {
    if (!text) return { dates: {}, missingFields: ['sailDate', 'depositDeadline', 'finalPaymentDeadline'] };

    const dates = {};
    const missingFields = [];

    // Try sail date patterns
    let found = false;
    for (const pattern of DATE_PATTERNS.sailDate) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const normalized = normalizeDate(match[1]);
            if (normalized) {
                dates.sailDate = normalized;
                found = true;
                break;
            }
        }
    }
    if (!found) missingFields.push('sailDate');

    // Try deposit deadline patterns
    found = false;
    for (const pattern of DATE_PATTERNS.depositDeadline) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const normalized = normalizeDate(match[1]);
            if (normalized) {
                dates.depositDeadline = normalized;
                found = true;
                break;
            }
        }
    }
    if (!found) missingFields.push('depositDeadline');

    // Try final payment patterns
    found = false;
    for (const pattern of DATE_PATTERNS.finalPayment) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const normalized = normalizeDate(match[1]);
            if (normalized) {
                dates.finalPaymentDeadline = normalized;
                found = true;
                break;
            }
        }
    }
    if (!found) missingFields.push('finalPaymentDeadline');

    return { dates, missingFields };
}

/**
 * Normalizes a date string to ISO format
 */
function normalizeDate(dateStr) {
    if (!dateStr) return null;

    try {
        // Try direct parsing first
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) {
            return parsed.toISOString().split('T')[0];
        }

        // Try MM/DD/YYYY or DD-MM-YYYY
        const slashMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (slashMatch) {
            let [, a, b, year] = slashMatch;
            year = year.length === 2 ? '20' + year : year;
            // Assume MM/DD/YYYY for US-style (month first if <= 12)
            const month = parseInt(a) <= 12 ? a.padStart(2, '0') : b.padStart(2, '0');
            const day = parseInt(a) <= 12 ? b.padStart(2, '0') : a.padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Main entry point - Production-Grade Parser
 * 
 * @param {Object} input - Input object
 * @param {string} input.pdfText - Extracted text from PDF
 * @param {Object} input.hints - Optional hints
 * @returns {Object} Parse result with stable contract
 */
export function parseContractText(input) {
    const startTime = Date.now();
    const { pdfText, hints = {} } = input;

    // Input validation
    if (!pdfText || typeof pdfText !== 'string') {
        return {
            success: false,
            needsReview: true,
            reason: 'pdfText is required and must be a string',
            telemetry: buildTelemetry('', startTime, { failureStage: 'input', error: 'invalid_input' })
        };
    }

    const totalLines = pdfText.split('\n').length;

    // Step 1: Detect currency (STRICT - no $ guessing)
    const currencyResult = detectCurrency(pdfText, hints);

    if (!currencyResult.success) {
        return {
            success: false,
            needsReview: true,
            phase: 'currency_detection',
            currencyCandidates: currencyResult.currencyCandidates || [],
            reason: currencyResult.reason,
            telemetry: buildTelemetry(pdfText, startTime, {
                failureStage: 'currency',
                currencyConfidence: 0,
                totalLines
            })
        };
    }

    // Step 2: Extract cabin inventory (with partial support)
    const inventoryResult = extractCabinInventory(pdfText, currencyResult.baseCurrency);

    // Step 3: Extract key dates
    const dateResult = extractKeyDates(pdfText);

    // Step 4: Build response based on completeness
    const cabinsParsed = inventoryResult.cabins.length;
    const cabinsUnparsed = inventoryResult.unparsedRows.length;
    const totalCabinRows = cabinsParsed + cabinsUnparsed;
    const parseRate = totalCabinRows > 0 ? Math.round((cabinsParsed / totalCabinRows) * 100) : 0;

    // Determine if review is needed (use configurable thresholds)
    const reviewReasons = [];
    let failureStage = null;

    if (inventoryResult.partial || (totalCabinRows > 0 && parseRate < THRESHOLDS.tableParseRateThreshold)) {
        reviewReasons.push(`${cabinsUnparsed} cabin rows could not be parsed (${parseRate}% parse rate)`);
        failureStage = failureStage || 'table';
    }
    if (cabinsParsed === 0) {
        reviewReasons.push('No cabins extracted - manual entry required');
        failureStage = failureStage || 'table';
    }
    if (dateResult.missingFields.length >= THRESHOLDS.datesRequiredForComplete) {
        reviewReasons.push(`Missing dates: ${dateResult.missingFields.join(', ')}`);
        failureStage = failureStage || 'dates';
    }

    const needsReview = reviewReasons.length > 0;

    // Build telemetry
    const telemetry = buildTelemetry(pdfText, startTime, {
        baseCurrencyConfidence: currencyResult.confidence,
        cabinsParsed,
        cabinsUnparsed,
        parseRate,
        datesFound: Object.keys(dateResult.dates).length,
        needsReview,
        failureStage: needsReview ? failureStage : null,
        totalLines
    });

    // Success response (may still need review for partial data)
    return {
        success: true,
        data: {
            baseCurrency: currencyResult.baseCurrency,
            baseCurrencyConfidence: currencyResult.confidence,
            cabinInventory: inventoryResult.cabins,
            keyDates: dateResult.dates
        },
        partial: inventoryResult.partial,
        unparsedRows: inventoryResult.unparsedRows,
        missingFields: dateResult.missingFields,
        needsReview,
        reviewReasons,
        telemetry
    };
}

/**
 * Build telemetry object for logging
 * @param {string} text - Original PDF text for fingerprinting
 * @param {number} startTime - Parse start time
 * @param {Object} data - Additional telemetry data
 */
function buildTelemetry(text, startTime, data = {}) {
    return {
        parserVersion: PARSER_VERSION,
        outputSchemaVersion: OUTPUT_SCHEMA_VERSION,
        contractFingerprint: generateFingerprint(text),
        parseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        ...data
    };
}

/**
 * Validates parsed contract data before import
 * @param {Object} data - Parsed data
 * @returns {{ valid: boolean, errors?: string[], warnings?: string[] }}
 */
export function validateParsedData(data) {
    const errors = [];
    const warnings = [];

    // Check currency
    if (!data.baseCurrency) {
        errors.push('Base currency is required');
    } else {
        const currencyValidation = validateCurrency(data.baseCurrency);
        if (!currencyValidation.valid) {
            errors.push(currencyValidation.error);
        }
    }

    // Check cabins
    if (!data.cabinInventory || data.cabinInventory.length === 0) {
        warnings.push('No cabins found - you may need to add them manually');
    } else {
        for (let i = 0; i < data.cabinInventory.length; i++) {
            const cabin = data.cabinInventory[i];
            if (!cabin.cabinNumber) {
                errors.push(`Cabin ${i + 1}: Missing cabin number`);
            }
            if (!Number.isInteger(cabin.costCents) || cabin.costCents <= 0) {
                errors.push(`Cabin ${cabin.cabinNumber}: Invalid cost (must be positive integer cents)`);
            }
            const costValidation = validateCents(cabin.costCents, 'costCents');
            if (!costValidation.valid) {
                errors.push(`Cabin ${cabin.cabinNumber}: ${costValidation.error}`);
            }
        }
    }

    // Check dates (warnings only, not blocking)
    if (!data.keyDates?.sailDate) {
        warnings.push('Sail date not detected - please verify manually');
    }

    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
    };
}

/**
 * Log parse result for telemetry (call this after parsing)
 * @param {Object} result - Parse result from parseContractText
 */
export function logParseResult(result) {
    const t = result.telemetry || {};
    console.log(`[OCR Parser v${PARSER_VERSION}] ` +
        `currency=${result.data?.baseCurrency || 'UNKNOWN'} ` +
        `confidence=${t.baseCurrencyConfidence || 0}% ` +
        `parsed=${t.cabinsParsed || 0}/${(t.cabinsParsed || 0) + (t.cabinsUnparsed || 0)} (${t.parseRate || 0}%) ` +
        `needsReview=${t.needsReview || false} ` +
        `time=${t.parseTimeMs || 0}ms`
    );
}
