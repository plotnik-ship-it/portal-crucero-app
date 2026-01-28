/**
 * Dashboard Data Service
 * 
 * Skill #4: Visual Dashboard Composer
 * 
 * Generates chart-ready JSON from booking and payment data for KPIs,
 * risk semaphore, and visualization components.
 * 
 * INPUT:
 *   bookings: [{ cabinNumber, costCents, paidCents, deadline, ... }]
 *   groupData: { totalCabins, sailDate, ... }
 * 
 * OUTPUT:
 *   { kpis, riskSemaphore, charts }
 */

import { validateCents, validateAll } from '../_shared/validators.js';
import { fromCents, formatCents } from '../_shared/moneyUtils.js';

// Risk thresholds
const RISK_THRESHOLDS = {
    green: { minCollection: 0.75, minDaysToSail: 30 },
    yellow: { minCollection: 0.50, minDaysToSail: 14 },
    // Below yellow thresholds = red
};

/**
 * Validates a booking object
 * @param {Object} booking - Booking to validate
 * @returns {{ valid: boolean, errors?: string[] }}
 */
export function validateBooking(booking) {
    if (!booking || typeof booking !== 'object') {
        return { valid: false, errors: ['booking must be an object'] };
    }

    const validations = [
        { validation: validateCents(booking.costCents, 'costCents'), fieldPath: 'costCents' },
        { validation: validateCents(booking.paidCents ?? 0, 'paidCents'), fieldPath: 'paidCents' }
    ];

    return validateAll(validations);
}

/**
 * Calculates days until a date
 * @param {string|Date} targetDate - Target date
 * @returns {number} Days until date (negative if past)
 */
export function daysUntil(targetDate) {
    if (!targetDate) return Infinity;
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates occupancy and collection KPIs
 * 
 * @param {Array} bookings - Array of booking objects
 * @param {Object} groupData - Group metadata
 * @returns {Object} KPI object
 */
export function calculateOccupancyKPIs(bookings = [], groupData = {}) {
    const { totalCabins = 0 } = groupData;

    // Count active bookings (with cost assigned)
    const activeBookings = bookings.filter(b => b.costCents > 0);
    const occupiedCabins = activeBookings.length;

    // Calculate financials
    let totalRevenueCents = 0;
    let totalCollectedCents = 0;
    let totalPassengers = 0;

    for (const booking of activeBookings) {
        const validation = validateBooking(booking);
        if (!validation.valid) continue;

        totalRevenueCents += booking.costCents || 0;
        totalCollectedCents += booking.paidCents || 0;
        totalPassengers += booking.passengerCount || 0;
    }

    const occupancyRate = totalCabins > 0 ? occupiedCabins / totalCabins : 0;
    const collectionRate = totalRevenueCents > 0 ? totalCollectedCents / totalRevenueCents : 0;
    const outstandingCents = totalRevenueCents - totalCollectedCents;

    return {
        occupiedCabins,
        totalCabins,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        occupancyPercent: Math.round(occupancyRate * 100),
        totalPassengers,
        totalRevenueCents,
        totalCollectedCents,
        outstandingCents,
        collectionRate: Math.round(collectionRate * 100) / 100,
        collectionPercent: Math.round(collectionRate * 100),
        formatted: {
            totalRevenue: formatCents(totalRevenueCents, groupData.baseCurrency || 'CAD'),
            totalCollected: formatCents(totalCollectedCents, groupData.baseCurrency || 'CAD'),
            outstanding: formatCents(outstandingCents, groupData.baseCurrency || 'CAD')
        }
    };
}

/**
 * Determines risk level based on collection rate and time to sail
 * 
 * @param {number} collectionRate - Collection rate (0-1)
 * @param {number} daysToSail - Days until sail date
 * @returns {Object} Risk assessment
 */
export function determineRiskLevel(collectionRate, daysToSail) {
    let level;
    let message;
    let urgency;

    if (collectionRate >= RISK_THRESHOLDS.green.minCollection &&
        daysToSail >= RISK_THRESHOLDS.green.minDaysToSail) {
        level = 'green';
        message = { en: 'On track', es: 'En camino' };
        urgency = 1;
    } else if (collectionRate >= RISK_THRESHOLDS.yellow.minCollection &&
        daysToSail >= RISK_THRESHOLDS.yellow.minDaysToSail) {
        level = 'yellow';
        message = { en: 'Attention needed', es: 'Requiere atención' };
        urgency = 2;
    } else {
        level = 'red';
        message = { en: 'At risk - Action required', es: 'En riesgo - Acción requerida' };
        urgency = 3;
    }

    return {
        level,
        message,
        urgency,
        factors: {
            collectionRate: Math.round(collectionRate * 100),
            daysToSail,
            belowCollectionTarget: collectionRate < RISK_THRESHOLDS.green.minCollection,
            approachingSailDate: daysToSail < RISK_THRESHOLDS.green.minDaysToSail
        }
    };
}

/**
 * Generates chart-ready data for payment progress visualization
 * 
 * @param {Array} bookings - Array of bookings with payment data
 * @returns {Object} Chart data
 */
export function generateChartData(bookings = []) {
    // Cabin status distribution
    const statusCounts = { paid: 0, partial: 0, unpaid: 0 };

    for (const booking of bookings) {
        if (!booking.costCents || booking.costCents === 0) continue;

        const paidRatio = (booking.paidCents || 0) / booking.costCents;

        if (paidRatio >= 1) {
            statusCounts.paid++;
        } else if (paidRatio > 0) {
            statusCounts.partial++;
        } else {
            statusCounts.unpaid++;
        }
    }

    const cabinStatusChart = [
        { status: 'paid', count: statusCounts.paid, color: '#22c55e', label: { en: 'Paid', es: 'Pagado' } },
        { status: 'partial', count: statusCounts.partial, color: '#f59e0b', label: { en: 'Partial', es: 'Parcial' } },
        { status: 'unpaid', count: statusCounts.unpaid, color: '#ef4444', label: { en: 'Unpaid', es: 'Sin pagar' } }
    ];

    // Payment progress by deadline (if available)
    const deadlineProgress = [];
    const deadlineGroups = {};

    for (const booking of bookings) {
        if (!booking.deadline) continue;
        const deadlineKey = new Date(booking.deadline).toISOString().split('T')[0];
        if (!deadlineGroups[deadlineKey]) {
            deadlineGroups[deadlineKey] = { collected: 0, pending: 0, date: deadlineKey };
        }
        deadlineGroups[deadlineKey].collected += booking.paidCents || 0;
        deadlineGroups[deadlineKey].pending += (booking.costCents || 0) - (booking.paidCents || 0);
    }

    for (const key of Object.keys(deadlineGroups).sort()) {
        deadlineProgress.push(deadlineGroups[key]);
    }

    return {
        cabinStatus: cabinStatusChart,
        paymentProgress: deadlineProgress,
        summary: {
            totalPaid: statusCounts.paid,
            totalPartial: statusCounts.partial,
            totalUnpaid: statusCounts.unpaid,
            total: statusCounts.paid + statusCounts.partial + statusCounts.unpaid
        }
    };
}

/**
 * Composes the complete dashboard data
 * 
 * @param {Object} input - Dashboard input
 * @param {Array} input.bookings - Booking data
 * @param {Object} input.groupData - Group metadata
 * @returns {Object} Complete dashboard data
 */
export function composeDashboardData(input) {
    const { bookings = [], groupData = {} } = input;

    // Calculate KPIs
    const kpis = calculateOccupancyKPIs(bookings, groupData);

    // Calculate days to sail
    const daysToSail = groupData.sailDate ? daysUntil(groupData.sailDate) : Infinity;

    // Determine risk level
    const riskSemaphore = determineRiskLevel(kpis.collectionRate, daysToSail);

    // Generate chart data
    const charts = generateChartData(bookings);

    // Urgent deadlines (within 7 days)
    const urgentDeadlines = bookings
        .filter(b => b.deadline && daysUntil(b.deadline) <= 7 && daysUntil(b.deadline) >= 0)
        .filter(b => (b.paidCents || 0) < (b.costCents || 0))
        .map(b => ({
            cabinNumber: b.cabinNumber,
            deadline: b.deadline,
            daysRemaining: daysUntil(b.deadline),
            outstandingCents: (b.costCents || 0) - (b.paidCents || 0)
        }))
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
        success: true,
        generatedAt: new Date().toISOString(),
        groupId: groupData.id || null,
        kpis,
        riskSemaphore,
        charts,
        urgentDeadlines,
        metadata: {
            totalBookings: bookings.length,
            daysToSail: daysToSail === Infinity ? null : daysToSail,
            baseCurrency: groupData.baseCurrency || 'CAD'
        }
    };
}

/**
 * Formats KPIs for UI display with localization
 * 
 * @param {Object} kpis - KPI object from calculateOccupancyKPIs
 * @param {string} locale - 'en' or 'es'
 * @returns {Array} Formatted KPI cards
 */
export function formatKPIsForDisplay(kpis, locale = 'en') {
    const isEn = locale === 'en';

    return [
        {
            id: 'occupancy',
            label: isEn ? 'Occupancy' : 'Ocupación',
            value: `${kpis.occupancyPercent}%`,
            detail: `${kpis.occupiedCabins}/${kpis.totalCabins}`,
            color: kpis.occupancyRate >= 0.8 ? 'success' : kpis.occupancyRate >= 0.5 ? 'warning' : 'danger'
        },
        {
            id: 'collection',
            label: isEn ? 'Collection' : 'Cobranza',
            value: `${kpis.collectionPercent}%`,
            detail: kpis.formatted.totalCollected,
            color: kpis.collectionRate >= 0.75 ? 'success' : kpis.collectionRate >= 0.5 ? 'warning' : 'danger'
        },
        {
            id: 'revenue',
            label: isEn ? 'Total Revenue' : 'Ingresos Totales',
            value: kpis.formatted.totalRevenue,
            detail: `${kpis.totalPassengers} ${isEn ? 'passengers' : 'pasajeros'}`,
            color: 'neutral'
        },
        {
            id: 'outstanding',
            label: isEn ? 'Outstanding' : 'Pendiente',
            value: kpis.formatted.outstanding,
            detail: isEn ? 'Balance due' : 'Saldo pendiente',
            color: kpis.outstandingCents > 0 ? 'warning' : 'success'
        }
    ];
}
