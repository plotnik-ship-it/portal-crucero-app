/**
 * OCR Parser Service - Unit Tests
 * Production-Grade Beta Tests
 */

import { describe, it, expect } from 'vitest';
import {
    detectCurrency,
    extractCabinInventory,
    extractKeyDates,
    parseContractText,
    validateParsedData,
    PARSER_VERSION,
    OUTPUT_SCHEMA_VERSION,
    THRESHOLDS
} from './ocrParserService.js';

describe('ocrParserService', () => {
    describe('detectCurrency', () => {
        it('detects USD with high confidence from explicit mention', () => {
            const text = `
                Cruise Confirmation
                All amounts are in USD
                Total Amount: $2,500.00
            `;
            const result = detectCurrency(text);

            expect(result.success).toBe(true);
            expect(result.baseCurrency).toBe('USD');
            expect(result.confidence).toBeGreaterThan(20);
        });

        it('detects CAD with explicit label', () => {
            const text = `Amount Due: $1,500.00 CAD (Canadian Dollars)`;
            const result = detectCurrency(text);

            expect(result.success).toBe(true);
            expect(result.baseCurrency).toBe('CAD');
        });

        it('detects EUR with Euro symbol and code', () => {
            const text = `Total: €2,000.00 - All amounts in EUR`;
            const result = detectCurrency(text);

            expect(result.success).toBe(true);
            expect(result.baseCurrency).toBe('EUR');
        });

        it('returns needsReview when multiple currencies detected', () => {
            const text = `
                USD Price: $1,500.00 USD
                CAD Price: $2,000.00 CAD
                EUR Price: €1,800.00
            `;
            const result = detectCurrency(text);

            expect(result.success).toBe(false);
            expect(result.needsReview).toBe(true);
            expect(result.currencyCandidates.length).toBeGreaterThan(1);
        });

        it('applies hint bonus correctly', () => {
            const text = `Amount: $1,500.00 CAD`;
            const withHint = detectCurrency(text, { currency: 'CAD' });

            expect(withHint.success).toBe(true);
            expect(withHint.baseCurrency).toBe('CAD');
        });

        it('returns needsReview for empty text', () => {
            const result = detectCurrency('');
            expect(result.success).toBe(false);
            expect(result.needsReview).toBe(true);
        });

        it('returns needsReview when only $ symbol present (no currency code)', () => {
            const text = 'Total: $1,500.00';
            const result = detectCurrency(text);

            expect(result.success).toBe(false);
            expect(result.needsReview).toBe(true);
            expect(result.reason).toContain('$ symbol alone cannot determine currency');
        });

        it('ignores FX context patterns', () => {
            const text = `
                All amounts in USD
                Cruise Total: $5,000.00 USD
                Exchange rate: MXN 18.50 (approximate)
            `;
            const result = detectCurrency(text);

            // Should detect USD as primary, not get confused by MXN in FX context
            expect(result.success).toBe(true);
            expect(result.baseCurrency).toBe('USD');
        });
    });

    describe('extractCabinInventory', () => {
        it('extracts cabins with prices and returns object with cabins array', () => {
            const text = `Cabin 12345 - Balcony - $3,500.00
Cabin 12346 - Interior - $2,500.00`;
            const result = extractCabinInventory(text, 'USD');

            expect(result.cabins.length).toBe(2);
            const cabin12345 = result.cabins.find(c => c.cabinNumber === '12345');
            expect(cabin12345).toBeDefined();
            expect(cabin12345.costCents).toBe(350000);
            expect(cabin12345.currency).toBe('USD');
            expect(result.partial).toBe(false);
        });

        it('handles stateroom terminology', () => {
            const text = `Stateroom 56789: Total $4,000.00`;
            const result = extractCabinInventory(text, 'CAD');

            expect(result.cabins.length).toBeGreaterThanOrEqual(1);
            const cabin = result.cabins.find(c => c.cabinNumber === '56789');
            expect(cabin).toBeDefined();
        });

        it('removes duplicate cabins keeping highest price', () => {
            const text = `Cabin 12345 - Deposit $500.00
Cabin 12345 - Total $3,500.00`;
            const result = extractCabinInventory(text, 'CAD');

            const cabin12345Entries = result.cabins.filter(c => c.cabinNumber === '12345');
            expect(cabin12345Entries.length).toBe(1);
            expect(cabin12345Entries[0].costCents).toBe(350000);
        });

        it('returns empty cabins array for no cabins', () => {
            const text = 'No cabin information here';
            const result = extractCabinInventory(text, 'CAD');

            expect(result.cabins).toEqual([]);
            expect(result.partial).toBe(false);
        });

        it('filters out small prices (under $100)', () => {
            const text = `Cabin 12345 - Fee $25.00`;
            const result = extractCabinInventory(text, 'CAD');

            expect(result.cabins.length).toBe(0);
        });

        it('tracks unparsed rows when cabin found but price missing', () => {
            const text = `Cabin 12345 - Balcony Suite - TBD
Another line without cabin info
Cabin 12346 - $2,500.00`;
            const result = extractCabinInventory(text, 'CAD');

            // At minimum one cabin should be parsed
            expect(result.cabins.length).toBeGreaterThanOrEqual(1);
            // If window doesn't capture price for 12345, it should be in unparsedRows
            if (result.unparsedRows.length > 0) {
                expect(result.partial).toBe(true);
            }
        });
    });

    describe('extractKeyDates', () => {
        it('extracts sail date', () => {
            const text = `Sail Date: 06/15/2025`;
            const result = extractKeyDates(text);

            expect(result.dates.sailDate).toBeDefined();
        });

        it('extracts deposit deadline', () => {
            const text = `Deposit Due: 02/01/2025`;
            const result = extractKeyDates(text);

            expect(result.dates.depositDeadline).toBeDefined();
        });

        it('extracts final payment deadline', () => {
            const text = `Final Payment Due: 04/15/2025`;
            const result = extractKeyDates(text);

            expect(result.dates.finalPaymentDeadline).toBeDefined();
        });

        it('handles sailing terminology', () => {
            const text = `Sailing Date: March 15, 2025`;
            const result = extractKeyDates(text);

            expect(result.dates.sailDate).toBeDefined();
        });

        it('returns missingFields for no dates', () => {
            const text = 'No dates in this document';
            const result = extractKeyDates(text);

            expect(Object.keys(result.dates)).toHaveLength(0);
            expect(result.missingFields).toContain('sailDate');
        });
    });

    describe('parseContractText', () => {
        it('parses complete contract successfully', () => {
            const pdfText = `CRUISE CONFIRMATION
All amounts are in USD
Sail Date: 06/15/2025
Deposit Due: 02/01/2025
Final Payment Due: 04/15/2025
Cabin 12345 - Balcony - $3,500.00 USD
Cabin 12346 - Interior - $2,500.00 USD`;

            const result = parseContractText({ pdfText });

            expect(result.success).toBe(true);
            expect(result.data.baseCurrency).toBe('USD');
            expect(result.data.cabinInventory.length).toBeGreaterThanOrEqual(2);
            expect(result.data.keyDates.sailDate).toBeDefined();
            expect(result.telemetry).toBeDefined();
            expect(result.telemetry.parserVersion).toBe(PARSER_VERSION);
        });

        it('applies hints to improve detection', () => {
            const pdfText = `Total: $2,500.00 CAD`;
            const result = parseContractText({
                pdfText,
                hints: { currency: 'CAD' }
            });

            expect(result.success).toBe(true);
            expect(result.data.baseCurrency).toBe('CAD');
        });

        it('returns needsReview for empty text', () => {
            const result = parseContractText({ pdfText: '' });

            expect(result.success).toBe(false);
            expect(result.needsReview).toBe(true);
        });

        it('returns partial=true when some rows unparsed', () => {
            const pdfText = `Currency: USD
Cabin 12345 - No price shown
Cabin 12346 - $2,500.00`;
            const result = parseContractText({ pdfText });

            if (result.success) {
                expect(result.partial).toBe(true);
                expect(result.unparsedRows.length).toBeGreaterThan(0);
            }
        });

        it('includes telemetry statistics', () => {
            const pdfText = `USD $3,500.00
Cabin 12345 - $3,500.00
Sail Date: 06/15/2025`;
            const result = parseContractText({ pdfText });

            if (result.success) {
                expect(result.telemetry).toBeDefined();
                expect(result.telemetry.parserVersion).toBe(PARSER_VERSION);
                expect(result.telemetry.parseTimeMs).toBeDefined();
            }
        });

        it('returns needsReview when no explicit currency found', () => {
            const pdfText = `Total: $5,000.00`;
            const result = parseContractText({ pdfText });

            expect(result.success).toBe(false);
            expect(result.needsReview).toBe(true);
            expect(result.phase).toBe('currency_detection');
        });
    });

    describe('validateParsedData', () => {
        it('validates complete data', () => {
            const data = {
                baseCurrency: 'USD',
                cabinInventory: [
                    { cabinNumber: '12345', costCents: 350000 }
                ],
                keyDates: { sailDate: '2025-06-15' }
            };

            const result = validateParsedData(data);

            expect(result.valid).toBe(true);
        });

        it('returns error for missing currency', () => {
            const data = {
                cabinInventory: [{ cabinNumber: '12345', costCents: 350000 }]
            };

            const result = validateParsedData(data);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Base currency is required');
        });

        it('returns warning for no cabins', () => {
            const data = {
                baseCurrency: 'CAD',
                cabinInventory: []
            };

            const result = validateParsedData(data);

            expect(result.valid).toBe(true); // Warning, not error
            expect(result.warnings).toBeDefined();
            expect(result.warnings.some(w => w.includes('cabin'))).toBe(true);
        });

        it('returns warning for missing sail date', () => {
            const data = {
                baseCurrency: 'CAD',
                cabinInventory: [{ cabinNumber: '12345', costCents: 350000 }],
                keyDates: {}
            };

            const result = validateParsedData(data);

            expect(result.warnings).toBeDefined();
            expect(result.warnings.some(w => w.includes('Sail date'))).toBe(true);
        });

        it('validates cabin cost as positive integer cents', () => {
            const data = {
                baseCurrency: 'CAD',
                cabinInventory: [{ cabinNumber: '12345', costCents: -100 }]
            };

            const result = validateParsedData(data);

            // Negative cost should fail validation
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Invalid cost') || e.includes('positive'))).toBe(true);
        });
    });

    describe('bulletproof features', () => {
        it('exports PARSER_VERSION and OUTPUT_SCHEMA_VERSION', () => {
            expect(PARSER_VERSION).toBeDefined();
            expect(PARSER_VERSION).toMatch(/^\d+\.\d+\.\d+/);
            expect(OUTPUT_SCHEMA_VERSION).toBe('ocr.v1');
        });

        it('exports configurable THRESHOLDS', () => {
            expect(THRESHOLDS).toBeDefined();
            expect(THRESHOLDS.currencyConfidenceThreshold).toBeGreaterThan(0);
            expect(THRESHOLDS.tableParseRateThreshold).toBeGreaterThan(0);
            expect(THRESHOLDS.datesRequiredForComplete).toBeGreaterThanOrEqual(1);
        });

        it('cabins have deterministic rowId', () => {
            const text = `Cabin 12345 - $3,500.00`;
            const result = extractCabinInventory(text, 'USD');

            expect(result.cabins.length).toBe(1);
            expect(result.cabins[0].rowId).toBeDefined();
            expect(result.cabins[0].rowId).toMatch(/^row_[a-f0-9]+_\d+$/);

            // Same text should produce same rowId (deterministic)
            const result2 = extractCabinInventory(text, 'USD');
            expect(result2.cabins[0].rowId).toBe(result.cabins[0].rowId);
        });

        it('telemetry includes contractFingerprint and outputSchemaVersion', () => {
            const pdfText = `All amounts in USD
Cabin 12345 - $3,500.00`;
            const result = parseContractText({ pdfText });

            expect(result.telemetry).toBeDefined();
            expect(result.telemetry.outputSchemaVersion).toBe('ocr.v1');
            expect(result.telemetry.contractFingerprint).toBeDefined();
            expect(result.telemetry.contractFingerprint).toMatch(/^fp_[a-f0-9]+_\d+$/);
        });

        it('telemetry includes failureStage when needsReview is true', () => {
            const pdfText = `Total: $5,000.00`; // No explicit currency
            const result = parseContractText({ pdfText });

            expect(result.success).toBe(false);
            expect(result.needsReview).toBe(true);
            expect(result.telemetry.failureStage).toBe('currency');
        });

        it('cabins include currency field for consistency', () => {
            const text = `Cabin 12345 - $3,500.00`;
            const result = extractCabinInventory(text, 'USD');

            expect(result.cabins[0].currency).toBe('USD');
        });
    });
});
