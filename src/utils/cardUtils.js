/**
 * Mask card number showing only last 4 digits
 */
export const maskCardNumber = (cardNumber) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    const last4 = cleaned.slice(-4);
    return `**** **** **** ${last4}`;
};

/**
 * Get last 4 digits of card
 */
export const getLast4Digits = (cardNumber) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    return cleaned.slice(-4);
};

/**
 * Format card number with spaces
 */
export const formatCardNumber = (cardNumber) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ');
};

/**
 * Format expiry as MM/YY
 */
export const formatExpiry = (expiry) => {
    const cleaned = expiry.replace(/\D/g, '');

    if (cleaned.length >= 2) {
        return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }

    return cleaned;
};
