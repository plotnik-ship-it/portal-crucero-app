/**
 * Format date to readable Spanish format
 */
export const formatDate = (date) => {
    if (!date) return '';

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

    return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Format timestamp from Firestore
 */
export const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleString('es-MX', {
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
 * Get status label in Spanish
 */
export const getStatusLabel = (status) => {
    const labels = {
        'Pending': 'Pendiente',
        'Applied': 'Aplicado',
        'Rejected': 'Rechazado',
        'Paid': 'Pagado',
        'Overdue': 'Vencido',
        'Upcoming': 'Próximo'
    };

    return labels[status] || status;
};
