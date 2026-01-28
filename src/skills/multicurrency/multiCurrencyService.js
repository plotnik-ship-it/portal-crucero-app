/**
 * Multi-Currency Financial Core
 * 
 * Skill #2: Precision financial calculations with multi-currency support
 * 
 * All amounts are in cents (integers) to avoid floating-point precision issues.
 * Exchange rates are stored as integer fractions (numerator/denominator).
 * Each payment persists `exchangeRateUsed` and NEVER recalculates.
 * 
 * INPUT:
 *   payments: [{ amountCents, currency, exchangeRateUsed? }]
 *   baseCurrency: 'CAD'
 *   cabinCostCents: total cost in cents
 *   fxRates: { USD: { numerator, denominator }, ... }
 * 
 * OUTPUT:
 *   { totalPaidCents, balanceCents, baseCurrency, breakdown }
 */

import {
    multiplyByRate,
    rateToFraction,
    fractionToRate,
    formatCents,
    addCents,
    subtractCents
} from '../_shared/moneyUtils.js';

import {
    validateCents,
    validateCurrency,
    validateRateFraction,
    validateAll
} from '../_shared/validators.js';

// Default exchange rate (1:1)
const DEFAULT_RATE = { numerator: 10000, denominator: 10000 };

/**
 * Validates a payment input
 * @param {Object} payment - Payment object to validate
 * @returns {{ valid: boolean, errors?: string[] }}
 */
export function validatePaymentInput(payment) {
    if (!payment || typeof payment !== 'object') {
        return { valid: false, errors: ['payment must be an object'] };
    }

    const validations = [
        { validation: validateCents(payment.amountCents, 'amountCents'), fieldPath: 'amountCents' },
        { validation: validateCurrency(payment.currency), fieldPath: 'currency' }
    ];

    // exchangeRateUsed is optional but if present must be valid
    if (payment.exchangeRateUsed) {
        validations.push({
            validation: validateRateFraction(payment.exchangeRateUsed),
            fieldPath: 'exchangeRateUsed'
        });
    }

    return validateAll(validations);
}

/**
 * Validates fxRates object
 * @param {Object} fxRates - Exchange rates by currency
 * @returns {{ valid: boolean, errors?: string[] }}
 */
export function validateFxRates(fxRates) {
    if (!fxRates || typeof fxRates !== 'object') {
        return { valid: false, errors: ['fxRates must be an object'] };
    }

    const errors = [];
    for (const [currency, rate] of Object.entries(fxRates)) {
        const currencyValidation = validateCurrency(currency);
        if (!currencyValidation.valid) {
            errors.push(`fxRates.${currency}: ${currencyValidation.error}`);
        }
        const rateValidation = validateRateFraction(rate);
        if (!rateValidation.valid) {
            errors.push(`fxRates.${currency}: ${rateValidation.error}`);
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Gets the exchange rate for a currency to base currency
 * Uses the stored rate in payment if available (never recalculates)
 * 
 * @param {Object} payment - Payment object
 * @param {string} baseCurrency - Base currency code
 * @param {Object} fxRates - Current agency exchange rates
 * @returns {Object} Rate fraction { numerator, denominator }
 */
export function getExchangeRate(payment, baseCurrency, fxRates = {}) {
    // If payment already has a stored rate, use it (IMMUTABLE)
    if (payment.exchangeRateUsed) {
        return payment.exchangeRateUsed;
    }

    // Same currency = 1:1 rate
    if (payment.currency === baseCurrency) {
        return { numerator: 10000, denominator: 10000 };
    }

    // Look up in agency rates
    if (fxRates[payment.currency]) {
        return fxRates[payment.currency];
    }

    // Fallback to 1:1 with warning
    console.warn(`[MultiCurrency] No rate found for ${payment.currency}, using 1:1`);
    return DEFAULT_RATE;
}

/**
 * Converts a payment amount to base currency
 * 
 * @param {Object} payment - Payment with amountCents and currency
 * @param {string} baseCurrency - Target base currency
 * @param {Object} fxRates - Agency exchange rates
 * @returns {number} Amount in base currency cents
 */
export function convertToBaseCurrency(payment, baseCurrency, fxRates = {}) {
    const validation = validatePaymentInput(payment);
    if (!validation.valid) {
        throw new Error(`Invalid payment: ${validation.errors.join('; ')}`);
    }

    const rate = getExchangeRate(payment, baseCurrency, fxRates);
    return multiplyByRate(payment.amountCents, rate);
}

/**
 * Calculates the complete financial state for a booking
 * 
 * @param {Object} input - Input object
 * @param {Array} input.payments - Array of payment objects
 * @param {number} input.cabinCostCents - Total cost in cents
 * @param {string} input.baseCurrency - Base currency (default: 'CAD')
 * @param {Object} input.fxRates - Agency exchange rates
 * @returns {Object} Financial state
 */
export function calculateFinancialState(input) {
    const {
        payments = [],
        cabinCostCents = 0,
        baseCurrency = 'CAD',
        fxRates = {}
    } = input;

    // Validate cost
    const costValidation = validateCents(cabinCostCents, 'cabinCostCents');
    if (!costValidation.valid) {
        throw new Error(costValidation.error);
    }

    // Validate base currency
    const currencyValidation = validateCurrency(baseCurrency);
    if (!currencyValidation.valid) {
        throw new Error(currencyValidation.error);
    }

    let totalPaidCents = 0;
    const breakdown = [];
    const validationErrors = [];

    for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];
        const paymentValidation = validatePaymentInput(payment);

        if (!paymentValidation.valid) {
            validationErrors.push(`payment[${i}]: ${paymentValidation.errors.join('; ')}`);
            continue;
        }

        const rate = getExchangeRate(payment, baseCurrency, fxRates);
        const convertedCents = multiplyByRate(payment.amountCents, rate);

        totalPaidCents = addCents(totalPaidCents, convertedCents);

        breakdown.push({
            originalCurrency: payment.currency,
            originalAmountCents: payment.amountCents,
            exchangeRateUsed: rate,
            exchangeRateDecimal: fractionToRate(rate),
            convertedCents: convertedCents,
            convertedCurrency: baseCurrency
        });
    }

    const balanceCents = subtractCents(cabinCostCents, totalPaidCents);

    return {
        success: validationErrors.length === 0,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        cabinCostCents,
        totalPaidCents,
        balanceCents,
        baseCurrency,
        paymentProgress: cabinCostCents > 0 ? totalPaidCents / cabinCostCents : 0,
        isPaidInFull: balanceCents <= 0,
        breakdown,
        formatted: {
            totalCost: formatCents(cabinCostCents, baseCurrency),
            totalPaid: formatCents(totalPaidCents, baseCurrency),
            balance: formatCents(balanceCents, baseCurrency)
        }
    };
}

/**
 * Prepares a payment record with exchange rate for persistence
 * The exchange rate is captured at time of payment and never recalculated
 * 
 * @param {Object} paymentData - Raw payment data
 * @param {string} baseCurrency - Base currency
 * @param {Object} fxRates - Current agency rates
 * @returns {Object} Payment ready for Firestore
 */
export function preparePaymentForStorage(paymentData, baseCurrency, fxRates = {}) {
    const { amountCents, currency } = paymentData;

    // Validate
    const validation = validatePaymentInput({ amountCents, currency });
    if (!validation.valid) {
        throw new Error(`Invalid payment data: ${validation.errors.join('; ')}`);
    }

    // Capture the exchange rate at time of payment
    let exchangeRateUsed;

    if (currency === baseCurrency) {
        exchangeRateUsed = { numerator: 10000, denominator: 10000 };
    } else if (fxRates[currency]) {
        exchangeRateUsed = fxRates[currency];
    } else {
        // No rate available - use 1:1 but flag for review
        exchangeRateUsed = { numerator: 10000, denominator: 10000 };
        console.warn(`[MultiCurrency] No rate for ${currency}, using 1:1. Consider setting rate in fxRates.`);
    }

    return {
        ...paymentData,
        amountCents,
        currency,
        exchangeRateUsed, // IMMUTABLE - captured at payment time
        baseCurrency,
        convertedCents: multiplyByRate(amountCents, exchangeRateUsed)
    };
}

/**
 * Creates or updates agency fxPolicy and fxRates
 * 
 * @param {Object} existingPolicy - Current policy (or null for new)
 * @param {Object} updates - Updates to apply
 * @returns {Object} Updated fxPolicy document
 */
export function updateAgencyFxPolicy(existingPolicy, updates) {
    const now = new Date().toISOString();

    const policy = existingPolicy || {
        createdAt: now,
        baseCurrency: 'CAD',
        fxRates: {},
        rateSource: 'manual',
        lastUpdated: now
    };

    // Update base currency if provided
    if (updates.baseCurrency) {
        const validation = validateCurrency(updates.baseCurrency);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        policy.baseCurrency = updates.baseCurrency;
    }

    // Update individual rates
    if (updates.fxRates) {
        for (const [currency, rateValue] of Object.entries(updates.fxRates)) {
            // Validate currency
            const currValidation = validateCurrency(currency);
            if (!currValidation.valid) {
                throw new Error(`Invalid currency ${currency}: ${currValidation.error}`);
            }

            // Accept either decimal or fraction
            let rateFraction;
            if (typeof rateValue === 'number') {
                rateFraction = rateToFraction(rateValue);
            } else if (rateValue.numerator && rateValue.denominator) {
                rateFraction = rateValue;
            } else {
                throw new Error(`Invalid rate for ${currency}`);
            }

            policy.fxRates[currency] = rateFraction;
        }
    }

    policy.lastUpdated = now;
    policy.updatedBy = updates.updatedBy || 'system';

    return policy;
}

/**
 * Formats the financial summary for display
 * 
 * @param {Object} state - Financial state from calculateFinancialState
 * @param {string} locale - 'en' or 'es'
 * @returns {Object} Formatted strings for UI
 */
export function formatFinancialSummary(state, locale = 'en') {
    const isEn = locale === 'en';

    return {
        totalCost: state.formatted.totalCost,
        totalPaid: state.formatted.totalPaid,
        balance: state.formatted.balance,
        progressPercent: Math.round(state.paymentProgress * 100),
        statusLabel: state.isPaidInFull
            ? (isEn ? 'Paid in Full' : 'Pagado Completo')
            : (isEn ? 'Balance Due' : 'Saldo Pendiente'),
        statusClass: state.isPaidInFull ? 'success' : (state.paymentProgress >= 0.5 ? 'warning' : 'danger')
    };
}
