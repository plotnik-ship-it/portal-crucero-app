/**
 * Convert CAD to MXN
 */
export const convertCadToMxn = (amountCad, rate) => {
    return amountCad * rate;
};

/**
 * Format currency with symbol
 */
export const formatCurrency = (amount, currency = 'CAD') => {
    const symbols = {
        CAD: '$',
        MXN: '$'
    };

    const val = (amount === undefined || amount === null || isNaN(amount)) ? 0 : amount;

    return `${symbols[currency]}${val.toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
};

/**
 * Format currency with full label
 */
export const formatCurrencyWithLabel = (amount, currency = 'CAD') => {
    return `${formatCurrency(amount, currency)} ${currency}`;
};
