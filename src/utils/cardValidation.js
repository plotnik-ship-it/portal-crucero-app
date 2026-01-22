/**
 * Credit Card Validation Utilities
 * Provides card validation, formatting, and brand detection
 */

/**
 * Luhn Algorithm - Validates credit card numbers
 */
export const validateCardNumber = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');

    if (!/^\d+$/.test(cleaned)) {
        return false;
    }

    if (cleaned.length < 13 || cleaned.length > 19) {
        return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
};

/**
 * Detect card brand from card number
 */
export const detectCardBrand = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');

    // Visa: starts with 4
    if (/^4/.test(cleaned)) {
        return 'Visa';
    }

    // Mastercard: starts with 51-55 or 2221-2720
    if (/^5[1-5]/.test(cleaned) || /^2(22[1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720)/.test(cleaned)) {
        return 'Mastercard';
    }

    // American Express: starts with 34 or 37
    if (/^3[47]/.test(cleaned)) {
        return 'American Express';
    }

    // Discover: starts with 6011, 622126-622925, 644-649, or 65
    if (/^6011|^622(12[6-9]|1[3-9]\d|[2-8]\d{2}|9[01]\d|92[0-5])|^64[4-9]|^65/.test(cleaned)) {
        return 'Discover';
    }

    return 'Unknown';
};

/**
 * Format card number with spaces (4 digits per group)
 */
export const formatCardNumber = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
};

/**
 * Get last 4 digits of card
 */
export const getCardLast4 = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    return cleaned.slice(-4);
};

/**
 * Validate expiry date (MM/YY format)
 */
export const validateExpiryDate = (expiry) => {
    const cleaned = expiry.replace(/\s/g, '');

    if (!/^\d{2}\/\d{2}$/.test(cleaned)) {
        return false;
    }

    const [month, year] = cleaned.split('/').map(num => parseInt(num, 10));

    if (month < 1 || month > 12) {
        return false;
    }

    const now = new Date();
    const currentYear = now.getFullYear() % 100; // Get last 2 digits
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return false;
    }

    return true;
};

/**
 * Format expiry date as MM/YY
 */
export const formatExpiryDate = (value) => {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length >= 2) {
        return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }

    return cleaned;
};

/**
 * Validate CVV (3-4 digits)
 */
export const validateCVV = (cvv, cardBrand = '') => {
    const cleaned = cvv.replace(/\s/g, '');

    if (!/^\d+$/.test(cleaned)) {
        return false;
    }

    // Amex uses 4 digits, others use 3
    if (cardBrand === 'American Express') {
        return cleaned.length === 4;
    }

    return cleaned.length === 3;
};

/**
 * Mask card number (show only last 4 digits)
 */
export const maskCardNumber = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    const last4 = cleaned.slice(-4);
    const masked = '*'.repeat(Math.max(0, cleaned.length - 4));
    return formatCardNumber(masked + last4);
};
