/**
 * Input Validators - Shared validation utilities for all skills
 * 
 * Each skill must validate inputs strictly before processing.
 */

/**
 * Validates that a value is a non-negative integer (for cents)
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCents(value, fieldName = 'amount') {
    if (value === undefined || value === null) {
        return { valid: false, error: `${fieldName} is required` };
    }
    if (!Number.isInteger(value)) {
        return { valid: false, error: `${fieldName} must be an integer (cents)` };
    }
    if (value < 0) {
        return { valid: false, error: `${fieldName} cannot be negative` };
    }
    return { valid: true };
}

/**
 * Validates a currency code
 * @param {*} value - Currency code
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCurrency(value) {
    const supportedCurrencies = ['CAD', 'USD', 'EUR', 'MXN', 'GBP'];
    if (!value || typeof value !== 'string') {
        return { valid: false, error: 'currency is required' };
    }
    const upper = value.toUpperCase();
    if (!supportedCurrencies.includes(upper)) {
        return { valid: false, error: `currency must be one of: ${supportedCurrencies.join(', ')}` };
    }
    return { valid: true };
}

/**
 * Validates an exchange rate fraction
 * @param {*} rate - Rate object { numerator, denominator }
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateRateFraction(rate) {
    if (!rate || typeof rate !== 'object') {
        return { valid: false, error: 'rate must be an object with numerator and denominator' };
    }
    if (!Number.isInteger(rate.numerator) || rate.numerator <= 0) {
        return { valid: false, error: 'rate.numerator must be a positive integer' };
    }
    if (!Number.isInteger(rate.denominator) || rate.denominator <= 0) {
        return { valid: false, error: 'rate.denominator must be a positive integer' };
    }
    return { valid: true };
}

/**
 * Validates a locale code
 * @param {*} value - Locale string
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateLocale(value) {
    const supportedLocales = ['en', 'es'];
    if (!value || typeof value !== 'string') {
        return { valid: false, error: 'locale is required' };
    }
    if (!supportedLocales.includes(value.toLowerCase())) {
        return { valid: false, error: `locale must be one of: ${supportedLocales.join(', ')}` };
    }
    return { valid: true };
}

/**
 * Validates an email address
 * @param {*} value - Email string
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateEmail(value) {
    if (!value || typeof value !== 'string') {
        return { valid: false, error: 'email is required' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        return { valid: false, error: 'invalid email format' };
    }
    return { valid: true };
}

/**
 * Validates a subscription status
 * @param {*} value - Status string
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSubscriptionStatus(value) {
    const validStatuses = ['trialing', 'active', 'past_due', 'canceled', 'incomplete', 'suspended'];
    if (!value || typeof value !== 'string') {
        return { valid: false, error: 'status is required' };
    }
    if (!validStatuses.includes(value)) {
        return { valid: false, error: `status must be one of: ${validStatuses.join(', ')}` };
    }
    return { valid: true };
}

/**
 * Validates a plan key
 * @param {*} value - Plan key string
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePlanKey(value) {
    const validPlans = ['trial', 'solo_groups', 'pro', 'enterprise'];
    if (!value || typeof value !== 'string') {
        return { valid: false, error: 'planKey is required' };
    }
    if (!validPlans.includes(value)) {
        return { valid: false, error: `planKey must be one of: ${validPlans.join(', ')}` };
    }
    return { valid: true };
}

/**
 * Runs multiple validators and returns all errors
 * @param {Array<{validation: Object, fieldPath: string}>} validations
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAll(validations) {
    const errors = [];
    for (const { validation, fieldPath } of validations) {
        if (!validation.valid) {
            errors.push(`${fieldPath}: ${validation.error}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
