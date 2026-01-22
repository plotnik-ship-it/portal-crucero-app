/**
 * Validate email format
 */
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate card number using Luhn algorithm
 */
export const validateCardNumber = (cardNumber) => {
    // Remove spaces and non-digits
    const cleaned = cardNumber.replace(/\D/g, '');

    if (cleaned.length < 13 || cleaned.length > 19) {
        return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i]);

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
 * Validate expiry date (MM/YY format)
 */
export const validateExpiry = (expiry) => {
    const cleaned = expiry.replace(/\D/g, '');

    if (cleaned.length !== 4) {
        return false;
    }

    const month = parseInt(cleaned.substring(0, 2));
    const year = parseInt('20' + cleaned.substring(2, 4));

    if (month < 1 || month > 12) {
        return false;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return false;
    }

    return true;
};

/**
 * Validate CVV
 */
export const validateCVV = (cvv, cardBrand = '') => {
    const cleaned = cvv.replace(/\D/g, '');

    // Amex requires 4 digits, others require 3
    if (cardBrand.toLowerCase() === 'amex') {
        return cleaned.length === 4;
    }

    return cleaned.length === 3;
};

/**
 * Get card brand from number
 */
export const getCardBrand = (cardNumber) => {
    const cleaned = cardNumber.replace(/\D/g, '');

    // Visa
    if (/^4/.test(cleaned)) {
        return 'Visa';
    }

    // Mastercard
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) {
        return 'Mastercard';
    }

    // American Express
    if (/^3[47]/.test(cleaned)) {
        return 'Amex';
    }

    // Discover
    if (/^6(?:011|5)/.test(cleaned)) {
        return 'Discover';
    }

    return 'Desconocida';
};
