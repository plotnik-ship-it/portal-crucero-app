/**
 * Dashboard Data Service - Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    validateBooking,
    daysUntil,
    calculateOccupancyKPIs,
    determineRiskLevel,
    generateChartData,
    composeDashboardData,
    formatKPIsForDisplay
} from './dashboardDataService.js';

describe('dashboardDataService', () => {
    describe('validateBooking', () => {
        it('validates correct booking', () => {
            const result = validateBooking({ costCents: 100000, paidCents: 50000 });
            expect(result.valid).toBe(true);
        });

        it('rejects null booking', () => {
            const result = validateBooking(null);
            expect(result.valid).toBe(false);
        });

        it('accepts booking without paidCents (defaults to 0)', () => {
            const result = validateBooking({ costCents: 100000 });
            expect(result.valid).toBe(true);
        });

        it('rejects non-integer costCents', () => {
            const result = validateBooking({ costCents: 100.50, paidCents: 50 });
            expect(result.valid).toBe(false);
        });
    });

    describe('daysUntil', () => {
        it('returns positive days for future date', () => {
            const future = new Date();
            future.setDate(future.getDate() + 10);
            const result = daysUntil(future);
            expect(result).toBeGreaterThanOrEqual(9);
            expect(result).toBeLessThanOrEqual(11);
        });

        it('returns negative days for past date', () => {
            const past = new Date();
            past.setDate(past.getDate() - 5);
            const result = daysUntil(past);
            expect(result).toBeLessThan(0);
        });

        it('returns Infinity for null date', () => {
            expect(daysUntil(null)).toBe(Infinity);
        });
    });

    describe('calculateOccupancyKPIs', () => {
        it('calculates basic KPIs correctly', () => {
            const bookings = [
                { costCents: 100000, paidCents: 50000, passengerCount: 2 },
                { costCents: 150000, paidCents: 150000, passengerCount: 3 },
                { costCents: 200000, paidCents: 100000, passengerCount: 4 }
            ];
            const groupData = { totalCabins: 10 };

            const result = calculateOccupancyKPIs(bookings, groupData);

            expect(result.occupiedCabins).toBe(3);
            expect(result.totalCabins).toBe(10);
            expect(result.occupancyRate).toBe(0.30);
            expect(result.occupancyPercent).toBe(30);
            expect(result.totalRevenueCents).toBe(450000);
            expect(result.totalCollectedCents).toBe(300000);
            expect(result.outstandingCents).toBe(150000);
            expect(result.collectionRate).toBeCloseTo(0.67, 1);
            expect(result.totalPassengers).toBe(9);
        });

        it('handles empty bookings', () => {
            const result = calculateOccupancyKPIs([], { totalCabins: 5 });
            expect(result.occupiedCabins).toBe(0);
            expect(result.totalRevenueCents).toBe(0);
            expect(result.collectionRate).toBe(0);
        });

        it('handles 100% collection', () => {
            const bookings = [
                { costCents: 100000, paidCents: 100000 },
                { costCents: 200000, paidCents: 200000 }
            ];
            const result = calculateOccupancyKPIs(bookings, { totalCabins: 2 });
            expect(result.collectionRate).toBe(1);
            expect(result.outstandingCents).toBe(0);
        });

        it('formats currency correctly', () => {
            const bookings = [{ costCents: 123456, paidCents: 100000 }];
            const result = calculateOccupancyKPIs(bookings, { totalCabins: 1, baseCurrency: 'CAD' });
            expect(result.formatted.totalRevenue).toContain('1,234.56');
        });
    });

    describe('determineRiskLevel', () => {
        it('returns green for high collection with time', () => {
            const result = determineRiskLevel(0.80, 45);
            expect(result.level).toBe('green');
            expect(result.urgency).toBe(1);
        });

        it('returns yellow for moderate collection approaching sail', () => {
            const result = determineRiskLevel(0.60, 20);
            expect(result.level).toBe('yellow');
            expect(result.urgency).toBe(2);
        });

        it('returns red for low collection near sail', () => {
            const result = determineRiskLevel(0.40, 10);
            expect(result.level).toBe('red');
            expect(result.urgency).toBe(3);
        });

        it('returns red for low collection even with time', () => {
            const result = determineRiskLevel(0.30, 60);
            expect(result.level).toBe('red');
        });

        it('returns red for high collection but no time', () => {
            const result = determineRiskLevel(0.90, 5);
            expect(result.level).toBe('red');
        });

        it('includes bilingual messages', () => {
            const result = determineRiskLevel(0.80, 45);
            expect(result.message.en).toBeDefined();
            expect(result.message.es).toBeDefined();
        });
    });

    describe('generateChartData', () => {
        it('categorizes bookings by payment status', () => {
            const bookings = [
                { costCents: 100000, paidCents: 100000 }, // paid
                { costCents: 100000, paidCents: 50000 },  // partial
                { costCents: 100000, paidCents: 50000 },  // partial
                { costCents: 100000, paidCents: 0 },      // unpaid
            ];

            const result = generateChartData(bookings);

            expect(result.cabinStatus[0].count).toBe(1); // paid
            expect(result.cabinStatus[1].count).toBe(2); // partial
            expect(result.cabinStatus[2].count).toBe(1); // unpaid
            expect(result.summary.total).toBe(4);
        });

        it('handles bookings with no cost (skips them)', () => {
            const bookings = [
                { costCents: 0, paidCents: 0 },
                { costCents: 100000, paidCents: 100000 }
            ];
            const result = generateChartData(bookings);
            expect(result.summary.total).toBe(1);
        });

        it('groups payments by deadline', () => {
            const bookings = [
                { costCents: 100000, paidCents: 50000, deadline: '2025-03-15' },
                { costCents: 100000, paidCents: 100000, deadline: '2025-03-15' },
                { costCents: 200000, paidCents: 50000, deadline: '2025-04-01' }
            ];
            const result = generateChartData(bookings);
            expect(result.paymentProgress).toHaveLength(2);
            expect(result.paymentProgress[0].date).toBe('2025-03-15');
        });

        it('includes color codes for chart', () => {
            const result = generateChartData([{ costCents: 100000, paidCents: 100000 }]);
            expect(result.cabinStatus[0].color).toBe('#22c55e'); // green for paid
        });
    });

    describe('composeDashboardData', () => {
        it('composes complete dashboard data', () => {
            const future = new Date();
            future.setMonth(future.getMonth() + 2);

            const input = {
                bookings: [
                    { cabinNumber: '1234', costCents: 100000, paidCents: 80000, passengerCount: 2 },
                    { cabinNumber: '1235', costCents: 100000, paidCents: 100000, passengerCount: 2 }
                ],
                groupData: {
                    id: 'group123',
                    totalCabins: 10,
                    sailDate: future.toISOString(),
                    baseCurrency: 'CAD'
                }
            };

            const result = composeDashboardData(input);

            expect(result.success).toBe(true);
            expect(result.kpis.occupiedCabins).toBe(2);
            expect(result.riskSemaphore.level).toBeDefined();
            expect(result.charts.cabinStatus).toHaveLength(3);
            expect(result.metadata.baseCurrency).toBe('CAD');
        });

        it('identifies urgent deadlines', () => {
            const urgentDate = new Date();
            urgentDate.setDate(urgentDate.getDate() + 3);

            const input = {
                bookings: [
                    { cabinNumber: '1234', costCents: 100000, paidCents: 50000, deadline: urgentDate.toISOString() }
                ],
                groupData: { totalCabins: 1 }
            };

            const result = composeDashboardData(input);

            expect(result.urgentDeadlines).toHaveLength(1);
            expect(result.urgentDeadlines[0].cabinNumber).toBe('1234');
            expect(result.urgentDeadlines[0].daysRemaining).toBeLessThanOrEqual(4);
        });

        it('handles missing sail date gracefully', () => {
            const result = composeDashboardData({
                bookings: [],
                groupData: { totalCabins: 5 }
            });
            expect(result.metadata.daysToSail).toBeNull();
        });
    });

    describe('formatKPIsForDisplay', () => {
        const mockKpis = {
            occupiedCabins: 8,
            totalCabins: 10,
            occupancyRate: 0.8,
            occupancyPercent: 80,
            totalPassengers: 20,
            totalRevenueCents: 500000,
            totalCollectedCents: 400000,
            outstandingCents: 100000,
            collectionRate: 0.8,
            collectionPercent: 80,
            formatted: {
                totalRevenue: '$5,000.00 CAD',
                totalCollected: '$4,000.00 CAD',
                outstanding: '$1,000.00 CAD'
            }
        };

        it('formats KPIs in English', () => {
            const result = formatKPIsForDisplay(mockKpis, 'en');
            expect(result).toHaveLength(4);
            expect(result[0].label).toBe('Occupancy');
            expect(result[0].value).toBe('80%');
        });

        it('formats KPIs in Spanish', () => {
            const result = formatKPIsForDisplay(mockKpis, 'es');
            expect(result[0].label).toBe('Ocupación');
            expect(result[1].label).toBe('Cobranza');
        });

        it('applies color coding correctly', () => {
            const result = formatKPIsForDisplay(mockKpis, 'en');
            expect(result[0].color).toBe('success'); // 80% occupancy
            expect(result[1].color).toBe('success'); // 80% collection
        });

        it('shows warning for medium KPIs', () => {
            const lowKpis = { ...mockKpis, occupancyRate: 0.5, occupancyPercent: 50 };
            const result = formatKPIsForDisplay(lowKpis, 'en');
            expect(result[0].color).toBe('warning');
        });
    });
});
