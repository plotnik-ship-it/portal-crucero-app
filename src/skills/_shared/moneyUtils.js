/**
 * Money Utilities - Shared utilities for cents-based arithmetic
 * 
 * All monetary values are represented in cents (integers) to avoid
 * floating-point precision issues.
 * 
 * NON-NEGOTIABLE: No floats for money. All amounts in cents.
 */

/**
 * Converts a decimal amount to cents
 * @param {number} decimalAmount - Amount like 199.99
 * @returns {number} Amount in cents (19999)
 */
export function toCents(decimalAmount) {
    if (typeof decimalAmount !== 'number' || isNaN(decimalAmount)) {
        throw new Error('Invalid amount: must be a number');
    }
    return Math.round(decimalAmount * 100);
}

/**
 * Converts cents to a decimal amount
 * @param {number} cents - Amount in cents (19999)
 * @returns {number} Decimal amount (199.99)
 */
export function fromCents(cents) {
    if (!Number.isInteger(cents)) {
        throw new Error('Invalid cents: must be an integer');
    }
    return cents / 100;
}

/**
 * Multiplies cents by an exchange rate using integer fraction
 * Avoids floating-point multiplication
 * 
 * Exchange rates are stored as { numerator, denominator }
 * Example: USD→CAD 1.36 = { numerator: 136, denominator: 100 }
 * 
 * @param {number} amountCents - Amount in cents
 * @param {Object} rate - { numerator: number, denominator: number }
 * @returns {number} Converted amount in cents (integer)
 */
export function multiplyByRate(amountCents, rate) {
    if (!Number.isInteger(amountCents)) {
        throw new Error('amountCents must be an integer');
    }
    if (!rate || !Number.isInteger(rate.numerator) || !Number.isInteger(rate.denominator)) {
        throw new Error('rate must have integer numerator and denominator');
    }
    if (rate.denominator === 0) {
        throw new Error('denominator cannot be zero');
    }

    // Use BigInt for precision in intermediate calculation
    const result = (BigInt(amountCents) * BigInt(rate.numerator)) / BigInt(rate.denominator);
    return Number(result);
}

/**
 * Creates a rate object from a decimal rate
 * Stores as integer fraction to avoid float storage
 * 
 * @param {number} decimalRate - Rate like 1.36
 * @param {number} precision - Decimal places (default 4 = 10000 denominator)
 * @returns {Object} { numerator, denominator }
 */
export function rateToFraction(decimalRate, precision = 4) {
    if (typeof decimalRate !== 'number' || isNaN(decimalRate) || decimalRate <= 0) {
        throw new Error('Invalid rate: must be a positive number');
    }
    const denominator = Math.pow(10, precision);
    const numerator = Math.round(decimalRate * denominator);
    return { numerator, denominator };
}

/**
 * Converts a rate fraction back to decimal (for display only)
 * @param {Object} rate - { numerator, denominator }
 * @returns {number} Decimal rate
 */
export function fractionToRate(rate) {
    if (!rate || !rate.numerator || !rate.denominator) {
        return 1;
    }
    return rate.numerator / rate.denominator;
}

/**
 * Formats cents as currency string
 * @param {number} cents - Amount in cents
 * @param {string} currency - Currency code (CAD, USD, MXN, EUR)
 * @param {string} locale - Locale for formatting (default: es-MX)
 * @returns {string} Formatted string like "$1,999.99 CAD"
 */
export function formatCents(cents, currency = 'CAD', locale = 'es-MX') {
    const symbols = { CAD: '$', USD: '$', MXN: '$', EUR: '€' };
    const val = Number.isInteger(cents) ? cents / 100 : 0;

    const formatted = val.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    return `${symbols[currency] || '$'}${formatted} ${currency}`;
}

/**
 * Safely adds two cent amounts
 * @param {number} a - Cents
 * @param {number} b - Cents
 * @returns {number} Sum in cents
 */
export function addCents(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
        throw new Error('Both amounts must be integers');
    }
    return a + b;
}

/**
 * Safely subtracts cent amounts
 * @param {number} a - Cents
 * @param {number} b - Cents to subtract
 * @returns {number} Difference in cents
 */
export function subtractCents(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
        throw new Error('Both amounts must be integers');
    }
    return a - b;
}
