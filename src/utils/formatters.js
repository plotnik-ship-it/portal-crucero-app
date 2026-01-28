import i18n from '../i18n/config';

/**
 * Format date with i18n support
 */
export const formatDate = (date, language = null) => {
    if (!date) return '';

    const lang = language || i18n.language || 'es';
    const locale = lang === 'en' ? 'en-CA' : 'es-MX';

    let d;
    if (date instanceof Date) {
        d = date;
    } else if (typeof date === 'string' && date.includes('-')) {
        // Handle YYYY-MM-DD string to avoid timezone shift
        const [year, month, day] = date.split('-').map(Number);
        d = new Date(year, month - 1, day);
    } else {
        d = new Date(date);
    }

    return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Format timestamp from Firestore with i18n support
 */
export const formatTimestamp = (timestamp, language = null) => {
    if (!timestamp) return '';

    const lang = language || i18n.language || 'es';
    const locale = lang === 'en' ? 'en-CA' : 'es-MX';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleString(locale, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

/**
 * Get status badge color
 */
export const getStatusColor = (status) => {
    const colors = {
        'Pending': 'warning',
        'Applied': 'success',
        'Rejected': 'error',
        'Paid': 'success',
        'Overdue': 'error',
        'Upcoming': 'info'
    };

    return colors[status] || 'default';
};

/**
 * Get status label with i18n support
 */
export const getStatusLabel = (status, t) => {
    if (!t) {
        // Fallback to Spanish if no translation function
        const labels = {
            'Pending': 'Pendiente',
            'Applied': 'Aplicado',
            'Rejected': 'Rechazado',
            'Paid': 'Pagado',
            'Overdue': 'Vencido',
            'Upcoming': 'Próximo'
        };
        return labels[status] || status;
    }

    // Use translation function
    const key = `payment.${status.toLowerCase()}`;
    return t(key, status);
};

/**
 * Format currency amount with i18n support
 */
export const formatCurrency = (amount, language = null) => {
    if (amount === null || amount === undefined) return '-';

    const lang = language || i18n.language || 'es';
    const locale = lang === 'en' ? 'en-CA' : 'es-MX';
    const currency = lang === 'en' ? 'CAD' : 'MXN';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};
