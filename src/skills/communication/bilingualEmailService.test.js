/**
 * Bilingual Communication Service - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    validateCommunicationInput,
    getLocalizedTemplate,
    interpolateTemplate,
    generateEmailForEvent,
    generateInvoiceData,
    getEventTypes,
    getInvoiceLabels
} from './bilingualEmailService.js';

describe('bilingualEmailService', () => {
    const validBranding = {
        agencyName: 'TravelPoint',
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#3B9FD8'
    };

    const validPaymentData = {
        travelerName: 'John Doe',
        travelerEmail: 'john@example.com',
        amountCents: 50000,
        currency: 'CAD',
        balanceCents: 150000,
        cabinNumber: '1234'
    };

    describe('validateCommunicationInput', () => {
        it('validates correct input', () => {
            const result = validateCommunicationInput({
                eventType: 'payment_received',
                locale: 'en',
                branding: validBranding
            });
            expect(result.valid).toBe(true);
        });

        it('rejects null input', () => {
            const result = validateCommunicationInput(null);
            expect(result.valid).toBe(false);
        });

        it('rejects invalid event type', () => {
            const result = validateCommunicationInput({
                eventType: 'invalid_event',
                branding: validBranding
            });
            expect(result.valid).toBe(false);
        });

        it('rejects invalid locale', () => {
            const result = validateCommunicationInput({
                eventType: 'payment_received',
                locale: 'fr',
                branding: validBranding
            });
            expect(result.valid).toBe(false);
        });

        it('rejects missing agency name', () => {
            const result = validateCommunicationInput({
                eventType: 'payment_received',
                branding: { primaryColor: '#000' }
            });
            expect(result.valid).toBe(false);
        });
    });

    describe('getLocalizedTemplate', () => {
        it('returns English template', () => {
            const template = getLocalizedTemplate('payment_received', 'en');
            expect(template.subject).toContain('Payment Received');
            expect(template.greeting).toContain('Dear');
        });

        it('returns Spanish template', () => {
            const template = getLocalizedTemplate('payment_received', 'es');
            expect(template.subject).toContain('Pago Recibido');
            expect(template.greeting).toContain('Estimado');
        });

        it('falls back to English for unknown locale', () => {
            const template = getLocalizedTemplate('payment_received', 'de');
            expect(template.subject).toContain('Payment Received');
        });

        it('throws for unknown event type', () => {
            expect(() => getLocalizedTemplate('unknown_event', 'en')).toThrow();
        });

        it('returns templates for all event types', () => {
            const events = ['payment_received', 'payment_reminder', 'deadline_warning', 'payment_applied'];
            for (const event of events) {
                const template = getLocalizedTemplate(event, 'en');
                expect(template.subject).toBeDefined();
                expect(template.body).toBeDefined();
            }
        });
    });

    describe('interpolateTemplate', () => {
        it('replaces simple variables', () => {
            const result = interpolateTemplate('Hello {{name}}!', { name: 'World' });
            expect(result).toBe('Hello World!');
        });

        it('replaces multiple variables', () => {
            const result = interpolateTemplate('{{greeting}} {{name}}, your balance is {{balance}}', {
                greeting: 'Hi',
                name: 'John',
                balance: '$500'
            });
            expect(result).toBe('Hi John, your balance is $500');
        });

        it('preserves unknown variables', () => {
            const result = interpolateTemplate('Hello {{unknown}}!', {});
            expect(result).toBe('Hello {{unknown}}!');
        });

        it('handles empty text', () => {
            expect(interpolateTemplate('', { name: 'Test' })).toBe('');
            expect(interpolateTemplate(null, { name: 'Test' })).toBe('');
        });
    });

    describe('generateEmailForEvent', () => {
        it('generates payment received email in English', () => {
            const result = generateEmailForEvent({
                eventType: 'payment_received',
                locale: 'en',
                branding: validBranding,
                paymentData: validPaymentData
            });

            expect(result.subject).toContain('Payment Received');
            expect(result.subject).toContain('TravelPoint');
            expect(result.htmlBody).toContain('John Doe');
            expect(result.htmlBody).toContain('$500.00');
            expect(result.to).toBe('john@example.com');
        });

        it('generates payment reminder in Spanish', () => {
            const result = generateEmailForEvent({
                eventType: 'payment_reminder',
                locale: 'es',
                branding: validBranding,
                paymentData: {
                    ...validPaymentData,
                    deadline: '2025-03-15'
                }
            });

            expect(result.subject).toContain('Recordatorio');
            expect(result.htmlBody).toContain('saldo pendiente');
        });

        it('generates HTML with branding colors', () => {
            const result = generateEmailForEvent({
                eventType: 'payment_received',
                locale: 'en',
                branding: { ...validBranding, primaryColor: '#FF0000' },
                paymentData: validPaymentData
            });

            expect(result.htmlBody).toContain('#FF0000');
        });

        it('includes logo when provided', () => {
            const result = generateEmailForEvent({
                eventType: 'payment_received',
                locale: 'en',
                branding: validBranding,
                paymentData: validPaymentData
            });

            expect(result.htmlBody).toContain('logo.png');
        });

        it('handles missing payment data gracefully', () => {
            const result = generateEmailForEvent({
                eventType: 'payment_reminder',
                locale: 'en',
                branding: validBranding
            });

            expect(result.subject).toBeDefined();
            expect(result.htmlBody).toContain('Valued Customer');
        });

        it('throws on invalid input', () => {
            expect(() => generateEmailForEvent({
                eventType: 'invalid',
                branding: validBranding
            })).toThrow();
        });
    });

    describe('generateInvoiceData', () => {
        it('generates invoice data in English', () => {
            const result = generateInvoiceData(validPaymentData, validBranding, 'en');

            expect(result.invoiceNumber).toMatch(/^INV-\d{8}-[A-Z0-9]+$/);
            expect(result.labels.title).toBe('PAYMENT RECEIPT');
            expect(result.billedTo.name).toBe('John Doe');
            expect(result.formatted.amount).toContain('$500.00');
        });

        it('generates invoice data in Spanish', () => {
            const result = generateInvoiceData(validPaymentData, validBranding, 'es');

            expect(result.labels.title).toBe('RECIBO DE PAGO');
            expect(result.labels.thankYou).toContain('Gracias');
        });

        it('includes exchange rate when present', () => {
            const paymentWithRate = {
                ...validPaymentData,
                currency: 'USD',
                exchangeRateUsed: { numerator: 13600, denominator: 10000 },
                convertedCents: 68000,
                baseCurrency: 'CAD'
            };

            const result = generateInvoiceData(paymentWithRate, validBranding, 'en');

            expect(result.totals.exchangeRateUsed).toBeDefined();
            expect(result.formatted.converted).toContain('CAD');
        });

        it('includes branding information', () => {
            const result = generateInvoiceData(validPaymentData, validBranding, 'en');

            expect(result.branding.agencyName).toBe('TravelPoint');
            expect(result.branding.primaryColor).toBe('#3B9FD8');
        });
    });

    describe('getEventTypes', () => {
        it('returns event types in English', () => {
            const types = getEventTypes('en');
            expect(types).toHaveLength(4);
            expect(types[0].label).toBe('Payment Received');
        });

        it('returns event types in Spanish', () => {
            const types = getEventTypes('es');
            expect(types[0].label).toBe('Pago Recibido');
            expect(types[1].label).toBe('Recordatorio de Pago');
        });
    });

    describe('getInvoiceLabels', () => {
        it('returns English labels', () => {
            const labels = getInvoiceLabels('en');
            expect(labels.title).toBe('PAYMENT RECEIPT');
        });

        it('returns Spanish labels', () => {
            const labels = getInvoiceLabels('es');
            expect(labels.title).toBe('RECIBO DE PAGO');
        });

        it('falls back to English', () => {
            const labels = getInvoiceLabels('fr');
            expect(labels.title).toBe('PAYMENT RECEIPT');
        });
    });
});
