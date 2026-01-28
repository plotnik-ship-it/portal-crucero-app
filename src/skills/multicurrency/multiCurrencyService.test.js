/**
 * Multi-Currency Financial Core - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    validatePaymentInput,
    validateFxRates,
    getExchangeRate,
    convertToBaseCurrency,
    calculateFinancialState,
    preparePaymentForStorage,
    updateAgencyFxPolicy,
    formatFinancialSummary
} from './multiCurrencyService.js';

describe('multiCurrencyService', () => {
    describe('validatePaymentInput', () => {
        it('validates correct payment', () => {
            const result = validatePaymentInput({
                amountCents: 15000,
                currency: 'CAD'
            });
            expect(result.valid).toBe(true);
        });

        it('rejects null payment', () => {
            const result = validatePaymentInput(null);
            expect(result.valid).toBe(false);
        });

        it('rejects non-integer cents', () => {
            const result = validatePaymentInput({
                amountCents: 150.50,
                currency: 'CAD'
            });
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('integer'))).toBe(true);
        });

        it('rejects negative cents', () => {
            const result = validatePaymentInput({
                amountCents: -100,
                currency: 'CAD'
            });
            expect(result.valid).toBe(false);
        });

        it('rejects invalid currency', () => {
            const result = validatePaymentInput({
                amountCents: 1000,
                currency: 'GOLD'
            });
            expect(result.valid).toBe(false);
        });

        it('validates payment with exchangeRateUsed', () => {
            const result = validatePaymentInput({
                amountCents: 1000,
                currency: 'USD',
                exchangeRateUsed: { numerator: 13600, denominator: 10000 }
            });
            expect(result.valid).toBe(true);
        });

        it('rejects invalid exchangeRateUsed', () => {
            const result = validatePaymentInput({
                amountCents: 1000,
                currency: 'USD',
                exchangeRateUsed: { numerator: 1.36, denominator: 1 }
            });
            expect(result.valid).toBe(false);
        });
    });

    describe('validateFxRates', () => {
        it('validates correct fxRates', () => {
            const result = validateFxRates({
                USD: { numerator: 13600, denominator: 10000 },
                EUR: { numerator: 15000, denominator: 10000 }
            });
            expect(result.valid).toBe(true);
        });

        it('rejects null fxRates', () => {
            const result = validateFxRates(null);
            expect(result.valid).toBe(false);
        });

        it('rejects invalid currency in fxRates', () => {
            const result = validateFxRates({
                GOLD: { numerator: 50000, denominator: 10000 }
            });
            expect(result.valid).toBe(false);
        });
    });

    describe('getExchangeRate', () => {
        it('uses stored rate from payment (immutable)', () => {
            const payment = {
                amountCents: 1000,
                currency: 'USD',
                exchangeRateUsed: { numerator: 14000, denominator: 10000 } // 1.40
            };
            const rate = getExchangeRate(payment, 'CAD', { USD: { numerator: 13600, denominator: 10000 } });
            expect(rate).toEqual({ numerator: 14000, denominator: 10000 }); // Uses stored, not current
        });

        it('returns 1:1 for same currency', () => {
            const rate = getExchangeRate({ amountCents: 1000, currency: 'CAD' }, 'CAD', {});
            expect(rate).toEqual({ numerator: 10000, denominator: 10000 });
        });

        it('looks up rate from fxRates', () => {
            const fxRates = { USD: { numerator: 13600, denominator: 10000 } };
            const rate = getExchangeRate({ amountCents: 1000, currency: 'USD' }, 'CAD', fxRates);
            expect(rate).toEqual({ numerator: 13600, denominator: 10000 });
        });

        it('falls back to 1:1 if rate not found', () => {
            const rate = getExchangeRate({ amountCents: 1000, currency: 'EUR' }, 'CAD', {});
            expect(rate).toEqual({ numerator: 10000, denominator: 10000 });
        });
    });

    describe('convertToBaseCurrency', () => {
        it('converts USD to CAD correctly', () => {
            const fxRates = { USD: { numerator: 13600, denominator: 10000 } }; // 1.36
            const result = convertToBaseCurrency(
                { amountCents: 10000, currency: 'USD' }, // $100 USD
                'CAD',
                fxRates
            );
            expect(result).toBe(13600); // $136 CAD in cents
        });

        it('returns same amount for same currency', () => {
            const result = convertToBaseCurrency(
                { amountCents: 10000, currency: 'CAD' },
                'CAD',
                {}
            );
            expect(result).toBe(10000);
        });

        it('throws on invalid payment', () => {
            expect(() => convertToBaseCurrency(null, 'CAD', {})).toThrow();
        });
    });

    describe('calculateFinancialState', () => {
        const fxRates = {
            USD: { numerator: 13600, denominator: 10000 }, // 1.36
            MXN: { numerator: 740, denominator: 10000 }    // 0.074
        };

        it('calculates state with single CAD payment', () => {
            const result = calculateFinancialState({
                payments: [{ amountCents: 50000, currency: 'CAD' }],
                cabinCostCents: 100000,
                baseCurrency: 'CAD'
            });

            expect(result.success).toBe(true);
            expect(result.totalPaidCents).toBe(50000);
            expect(result.balanceCents).toBe(50000);
            expect(result.paymentProgress).toBe(0.5);
            expect(result.isPaidInFull).toBe(false);
        });

        it('calculates state with multi-currency payments', () => {
            const result = calculateFinancialState({
                payments: [
                    { amountCents: 10000, currency: 'USD' },  // $100 USD = $136 CAD
                    { amountCents: 50000, currency: 'CAD' }   // $500 CAD
                ],
                cabinCostCents: 100000, // $1000 CAD
                baseCurrency: 'CAD',
                fxRates
            });

            expect(result.totalPaidCents).toBe(63600); // 13600 + 50000
            expect(result.balanceCents).toBe(36400);
            expect(result.breakdown).toHaveLength(2);
            expect(result.breakdown[0].convertedCents).toBe(13600);
        });

        it('handles paid in full correctly', () => {
            const result = calculateFinancialState({
                payments: [{ amountCents: 100000, currency: 'CAD' }],
                cabinCostCents: 100000,
                baseCurrency: 'CAD'
            });

            expect(result.isPaidInFull).toBe(true);
            expect(result.balanceCents).toBe(0);
        });

        it('handles overpayment (negative balance)', () => {
            const result = calculateFinancialState({
                payments: [{ amountCents: 120000, currency: 'CAD' }],
                cabinCostCents: 100000,
                baseCurrency: 'CAD'
            });

            expect(result.balanceCents).toBe(-20000);
            expect(result.isPaidInFull).toBe(true);
        });

        it('handles empty payments array', () => {
            const result = calculateFinancialState({
                payments: [],
                cabinCostCents: 100000,
                baseCurrency: 'CAD'
            });

            expect(result.totalPaidCents).toBe(0);
            expect(result.balanceCents).toBe(100000);
        });

        it('validates invalid payments but continues', () => {
            const result = calculateFinancialState({
                payments: [
                    { amountCents: 50000, currency: 'CAD' },
                    { amountCents: 'invalid', currency: 'CAD' }
                ],
                cabinCostCents: 100000,
                baseCurrency: 'CAD'
            });

            expect(result.success).toBe(false);
            expect(result.validationErrors).toHaveLength(1);
            expect(result.totalPaidCents).toBe(50000); // Valid payment still counted
        });

        it('uses stored exchangeRateUsed (immutability test)', () => {
            const payments = [{
                amountCents: 10000,
                currency: 'USD',
                exchangeRateUsed: { numerator: 14500, denominator: 10000 } // 1.45 (historical)
            }];

            const result = calculateFinancialState({
                payments,
                cabinCostCents: 100000,
                baseCurrency: 'CAD',
                fxRates: { USD: { numerator: 13600, denominator: 10000 } } // Current is 1.36
            });

            // Should use 1.45 (stored) not 1.36 (current)
            expect(result.breakdown[0].convertedCents).toBe(14500);
            expect(result.totalPaidCents).toBe(14500);
        });
    });

    describe('preparePaymentForStorage', () => {
        it('captures exchange rate at payment time', () => {
            const fxRates = { USD: { numerator: 13600, denominator: 10000 } };
            const result = preparePaymentForStorage(
                { amountCents: 10000, currency: 'USD' },
                'CAD',
                fxRates
            );

            expect(result.exchangeRateUsed).toEqual({ numerator: 13600, denominator: 10000 });
            expect(result.convertedCents).toBe(13600);
            expect(result.baseCurrency).toBe('CAD');
        });

        it('uses 1:1 for same currency', () => {
            const result = preparePaymentForStorage(
                { amountCents: 10000, currency: 'CAD' },
                'CAD',
                {}
            );

            expect(result.exchangeRateUsed).toEqual({ numerator: 10000, denominator: 10000 });
            expect(result.convertedCents).toBe(10000);
        });

        it('throws on invalid payment data', () => {
            expect(() => preparePaymentForStorage(
                { amountCents: -100, currency: 'CAD' },
                'CAD',
                {}
            )).toThrow();
        });
    });

    describe('updateAgencyFxPolicy', () => {
        it('creates new policy with defaults', () => {
            const result = updateAgencyFxPolicy(null, { baseCurrency: 'CAD' });
            expect(result.baseCurrency).toBe('CAD');
            expect(result.fxRates).toBeDefined();
            expect(result.createdAt).toBeDefined();
        });

        it('updates existing policy rates', () => {
            const existing = {
                baseCurrency: 'CAD',
                fxRates: { USD: { numerator: 13000, denominator: 10000 } },
                createdAt: '2025-01-01'
            };

            const result = updateAgencyFxPolicy(existing, {
                fxRates: { USD: { numerator: 13600, denominator: 10000 } }
            });

            expect(result.fxRates.USD).toEqual({ numerator: 13600, denominator: 10000 });
            expect(result.createdAt).toBe('2025-01-01'); // Preserved
        });

        it('accepts decimal rates and converts to fraction', () => {
            const result = updateAgencyFxPolicy(null, {
                fxRates: { USD: 1.36 }
            });

            expect(result.fxRates.USD.numerator).toBe(13600);
            expect(result.fxRates.USD.denominator).toBe(10000);
        });

        it('rejects invalid currency', () => {
            expect(() => updateAgencyFxPolicy(null, {
                fxRates: { GOLD: 50.0 }
            })).toThrow();
        });
    });

    describe('formatFinancialSummary', () => {
        const mockState = {
            formatted: {
                totalCost: '$1,000.00 CAD',
                totalPaid: '$650.00 CAD',
                balance: '$350.00 CAD'
            },
            paymentProgress: 0.65,
            isPaidInFull: false
        };

        it('formats summary in English', () => {
            const result = formatFinancialSummary(mockState, 'en');
            expect(result.statusLabel).toBe('Balance Due');
            expect(result.progressPercent).toBe(65);
            expect(result.statusClass).toBe('warning');
        });

        it('formats summary in Spanish', () => {
            const result = formatFinancialSummary(mockState, 'es');
            expect(result.statusLabel).toBe('Saldo Pendiente');
        });

        it('shows success status when paid in full', () => {
            const paidState = { ...mockState, isPaidInFull: true };
            const result = formatFinancialSummary(paidState, 'en');
            expect(result.statusLabel).toBe('Paid in Full');
            expect(result.statusClass).toBe('success');
        });

        it('shows danger status below 50%', () => {
            const lowState = { ...mockState, paymentProgress: 0.3 };
            const result = formatFinancialSummary(lowState, 'en');
            expect(result.statusClass).toBe('danger');
        });
    });
});
