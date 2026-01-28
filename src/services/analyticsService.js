/**
 * Analytics Service
 * Calculates financial metrics and statistics for groups
 */

/**
 * Calculate analytics for a group
 * @param {Array} families - Array of family objects
 * @returns {Object} Analytics data
 */
export const calculateGroupAnalytics = (families) => {
    if (!families || families.length === 0) {
        return {
            totalSales: 0,
            totalPaid: 0,
            totalBalance: 0,
            familiesCount: 0,
            familiesUpToDate: 0,
            familiesBehind: 0,
            paymentProgress: { paid: 0, pending: 100 },
            topDebtors: [],
            depositStats: { withDeposit: 0, withoutDeposit: 0 }
        };
    }

    // Calculate totals
    const totalSales = families.reduce((sum, f) => sum + (f.totalCadGlobal || 0), 0);
    const totalPaid = families.reduce((sum, f) => sum + (f.paidCadGlobal || 0), 0);
    const totalBalance = families.reduce((sum, f) => sum + (f.balanceCadGlobal || 0), 0);

    // Calculate payment progress percentage
    const paymentProgress = {
        paid: totalSales > 0 ? (totalPaid / totalSales) * 100 : 0,
        pending: totalSales > 0 ? (totalBalance / totalSales) * 100 : 100
    };

    // Count families up to date vs behind
    const familiesUpToDate = families.filter(f => (f.balanceCadGlobal || 0) === 0).length;
    const familiesBehind = families.length - familiesUpToDate;

    // Get top 10 debtors (families with highest balance)
    const topDebtors = [...families]
        .filter(f => (f.balanceCadGlobal || 0) > 0)
        .sort((a, b) => (b.balanceCadGlobal || 0) - (a.balanceCadGlobal || 0))
        .slice(0, 10)
        .map(f => ({
            familyCode: f.familyCode,
            displayName: f.displayName,
            balance: f.balanceCadGlobal || 0,
            total: f.totalCadGlobal || 0,
            paid: f.paidCadGlobal || 0
        }));

    // Calculate deposit statistics
    const depositStats = families.reduce((stats, family) => {
        const hasDeposit = family.cabinAccounts?.some(cabin => cabin.depositPaid);
        if (hasDeposit) {
            stats.withDeposit++;
        } else {
            stats.withoutDeposit++;
        }
        return stats;
    }, { withDeposit: 0, withoutDeposit: 0 });

    return {
        totalSales,
        totalPaid,
        totalBalance,
        familiesCount: families.length,
        familiesUpToDate,
        familiesBehind,
        paymentProgress,
        topDebtors,
        depositStats
    };
};

/**
 * Calculate monthly payment projection
 * @param {Array} families - Array of family objects
 * @param {Object} groupData - Group data with deadlines
 * @returns {Array} Monthly projection data
 */
export const calculateMonthlyProjection = (families, groupData) => {
    // This is a simplified version
    // In a real scenario, you'd analyze payment deadlines and history
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const totalBalance = families.reduce((sum, f) => sum + (f.balanceCadGlobal || 0), 0);
    const monthlyTarget = totalBalance / 6;

    return months.map((month, index) => ({
        month,
        projected: monthlyTarget * (index + 1),
        actual: 0 // Would come from actual payment history
    }));
};

/**
 * Get payment statistics by status
 * @param {Array} payments - Array of payment objects
 * @returns {Object} Payment statistics
 */
export const getPaymentStatistics = (payments) => {
    if (!payments || payments.length === 0) {
        return {
            totalPayments: 0,
            totalAmount: 0,
            averagePayment: 0,
            lastPaymentDate: null
        };
    }

    const totalAmount = payments.reduce((sum, p) => sum + (p.amountCad || 0), 0);
    const averagePayment = totalAmount / payments.length;

    // Get most recent payment
    const sortedPayments = [...payments].sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
    });

    return {
        totalPayments: payments.length,
        totalAmount,
        averagePayment,
        lastPaymentDate: sortedPayments[0]?.date
    };
};
