/**
 * Bilingual Communication Automator
 * 
 * Skill #3: Event-driven email generation with localized templates and PDF invoices
 * 
 * INPUT:
 *   eventType: 'payment_received' | 'payment_reminder' | 'deadline_warning'
 *   locale: 'en' | 'es'
 *   branding: { agencyName, logoUrl, primaryColor }
 *   paymentData: { travelerName, amountCents, currency, ... }
 * 
 * OUTPUT:
 *   { email: { subject, htmlBody, attachments }, invoice: { ... } }
 */

import { validateLocale, validateCents, validateEmail, validateAll } from '../_shared/validators.js';
import { formatCents, fromCents } from '../_shared/moneyUtils.js';

// Email templates organized by event type and locale
const EMAIL_TEMPLATES = {
    payment_received: {
        en: {
            subject: 'Payment Received - {{agencyName}}',
            greeting: 'Dear {{travelerName}},',
            body: 'We have received your payment of {{amount}}. Your remaining balance is {{balance}}.',
            closing: 'Thank you for your payment.',
            signature: 'Best regards,\nThe {{agencyName}} Team'
        },
        es: {
            subject: 'Pago Recibido - {{agencyName}}',
            greeting: 'Estimado/a {{travelerName}},',
            body: 'Hemos recibido tu pago de {{amount}}. Tu saldo pendiente es {{balance}}.',
            closing: 'Gracias por tu pago.',
            signature: 'Saludos cordiales,\nEl equipo de {{agencyName}}'
        }
    },
    payment_reminder: {
        en: {
            subject: 'Payment Reminder - {{agencyName}}',
            greeting: 'Dear {{travelerName}},',
            body: 'This is a friendly reminder that you have an outstanding balance of {{balance}}. The payment deadline is {{deadline}}.',
            closing: 'Please make your payment at your earliest convenience.',
            signature: 'Best regards,\nThe {{agencyName}} Team'
        },
        es: {
            subject: 'Recordatorio de Pago - {{agencyName}}',
            greeting: 'Estimado/a {{travelerName}},',
            body: 'Te recordamos que tienes un saldo pendiente de {{balance}}. La fecha límite de pago es {{deadline}}.',
            closing: 'Por favor realiza tu pago a la brevedad posible.',
            signature: 'Saludos cordiales,\nEl equipo de {{agencyName}}'
        }
    },
    deadline_warning: {
        en: {
            subject: 'URGENT: Payment Deadline Approaching - {{agencyName}}',
            greeting: 'Dear {{travelerName}},',
            body: 'Your payment deadline of {{deadline}} is approaching. Your outstanding balance is {{balance}}. Please ensure payment is made before the deadline to avoid any issues with your booking.',
            closing: 'If you have already made your payment, please disregard this message.',
            signature: 'Best regards,\nThe {{agencyName}} Team'
        },
        es: {
            subject: 'URGENTE: Fecha Límite de Pago Próxima - {{agencyName}}',
            greeting: 'Estimado/a {{travelerName}},',
            body: 'Tu fecha límite de pago {{deadline}} se acerca. Tu saldo pendiente es {{balance}}. Por favor asegúrate de realizar el pago antes de la fecha límite para evitar problemas con tu reserva.',
            closing: 'Si ya realizaste tu pago, por favor ignora este mensaje.',
            signature: 'Saludos cordiales,\nEl equipo de {{agencyName}}'
        }
    },
    payment_applied: {
        en: {
            subject: 'Payment Applied to Your Booking - {{agencyName}}',
            greeting: 'Dear {{travelerName}},',
            body: 'We have applied a payment of {{amount}} to your booking. Your remaining balance is {{balance}}.',
            closing: 'Thank you for your continued trust.',
            signature: 'Best regards,\nThe {{agencyName}} Team'
        },
        es: {
            subject: 'Pago Aplicado a Tu Reserva - {{agencyName}}',
            greeting: 'Estimado/a {{travelerName}},',
            body: 'Hemos aplicado un pago de {{amount}} a tu reserva. Tu saldo pendiente es {{balance}}.',
            closing: 'Gracias por tu confianza.',
            signature: 'Saludos cordiales,\nEl equipo de {{agencyName}}'
        }
    }
};

// Invoice labels by locale
const INVOICE_LABELS = {
    en: {
        title: 'PAYMENT RECEIPT',
        invoiceNumber: 'Receipt #',
        date: 'Date',
        billedTo: 'Billed To',
        description: 'Description',
        amount: 'Amount',
        currency: 'Currency',
        exchangeRate: 'Exchange Rate',
        subtotal: 'Subtotal',
        total: 'Total',
        balance: 'Remaining Balance',
        thankYou: 'Thank you for your payment!',
        paymentMethod: 'Payment Method',
        cabinNumber: 'Cabin',
        booking: 'Booking',
        cruiseGroup: 'Cruise Group'
    },
    es: {
        title: 'RECIBO DE PAGO',
        invoiceNumber: 'Recibo #',
        date: 'Fecha',
        billedTo: 'Facturado a',
        description: 'Descripción',
        amount: 'Monto',
        currency: 'Moneda',
        exchangeRate: 'Tipo de Cambio',
        subtotal: 'Subtotal',
        total: 'Total',
        balance: 'Saldo Pendiente',
        thankYou: '¡Gracias por tu pago!',
        paymentMethod: 'Método de Pago',
        cabinNumber: 'Cabina',
        booking: 'Reserva',
        cruiseGroup: 'Grupo de Crucero'
    }
};

/**
 * Validates communication input
 * @param {Object} input - Input to validate
 * @returns {{ valid: boolean, errors?: string[] }}
 */
export function validateCommunicationInput(input) {
    if (!input || typeof input !== 'object') {
        return { valid: false, errors: ['input is required'] };
    }

    const validations = [];

    // Event type
    const validEvents = ['payment_received', 'payment_reminder', 'deadline_warning', 'payment_applied'];
    if (!input.eventType || !validEvents.includes(input.eventType)) {
        validations.push({
            validation: { valid: false, error: `eventType must be one of: ${validEvents.join(', ')}` },
            fieldPath: 'eventType'
        });
    }

    // Locale
    if (input.locale) {
        validations.push({
            validation: validateLocale(input.locale),
            fieldPath: 'locale'
        });
    }

    // Branding
    if (!input.branding || !input.branding.agencyName) {
        validations.push({
            validation: { valid: false, error: 'agencyName is required' },
            fieldPath: 'branding.agencyName'
        });
    }

    return validateAll(validations);
}

/**
 * Gets the localized template for an event
 * @param {string} eventType - Event type
 * @param {string} locale - Locale ('en' or 'es')
 * @returns {Object} Template object
 */
export function getLocalizedTemplate(eventType, locale = 'en') {
    const eventTemplates = EMAIL_TEMPLATES[eventType];
    if (!eventTemplates) {
        throw new Error(`Unknown event type: ${eventType}`);
    }
    return eventTemplates[locale] || eventTemplates['en'];
}

/**
 * Replaces template variables with actual values
 * @param {string} text - Template text with {{variables}}
 * @param {Object} variables - Variable values
 * @returns {string} Interpolated text
 */
export function interpolateTemplate(text, variables) {
    if (!text) return '';
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
    });
}

/**
 * Generates email content for an event
 * @param {Object} input - Event input
 * @returns {Object} Email object
 */
export function generateEmailForEvent(input) {
    const validation = validateCommunicationInput(input);
    if (!validation.valid) {
        throw new Error(`Invalid input: ${validation.errors.join('; ')}`);
    }

    const {
        eventType,
        locale = 'en',
        branding,
        paymentData = {}
    } = input;

    const template = getLocalizedTemplate(eventType, locale);

    // Prepare variables
    const variables = {
        agencyName: branding.agencyName,
        travelerName: paymentData.travelerName || 'Valued Customer',
        amount: paymentData.amountCents
            ? formatCents(paymentData.amountCents, paymentData.currency || 'CAD')
            : '',
        balance: paymentData.balanceCents !== undefined
            ? formatCents(paymentData.balanceCents, paymentData.baseCurrency || 'CAD')
            : formatCents(0, 'CAD'),
        deadline: paymentData.deadline
            ? new Date(paymentData.deadline).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')
            : '',
        cabinNumber: paymentData.cabinNumber || '',
        bookingRef: paymentData.bookingRef || ''
    };

    // Build email
    const subject = interpolateTemplate(template.subject, variables);
    const htmlBody = buildHtmlEmail(template, variables, branding, locale);

    return {
        subject,
        htmlBody,
        plainText: buildPlainTextEmail(template, variables),
        to: paymentData.travelerEmail,
        locale
    };
}

/**
 * Builds HTML email from template
 * @param {Object} template - Template object
 * @param {Object} variables - Variable values
 * @param {Object} branding - Agency branding
 * @param {string} locale - Locale
 * @returns {string} HTML content
 */
function buildHtmlEmail(template, variables, branding, locale) {
    const primaryColor = branding.primaryColor || '#3B9FD8';

    return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.agencyName}" style="max-height: 60px;">` : ''}
    </div>

    <div style="border-left: 4px solid ${primaryColor}; padding-left: 20px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 16px;">${interpolateTemplate(template.greeting, variables)}</p>
    </div>

    <div style="margin-bottom: 20px;">
        <p>${interpolateTemplate(template.body, variables)}</p>
    </div>

    <div style="margin-bottom: 20px;">
        <p>${interpolateTemplate(template.closing, variables)}</p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="white-space: pre-line;">${interpolateTemplate(template.signature, variables)}</p>
    </div>

    <div style="margin-top: 30px; text-align: center; color: #888; font-size: 12px;">
        <p>${branding.footerText || `Powered by ${branding.agencyName}`}</p>
    </div>
</body>
</html>`;
}

/**
 * Builds plain text email from template
 * @param {Object} template - Template object
 * @param {Object} variables - Variable values
 * @returns {string} Plain text content
 */
function buildPlainTextEmail(template, variables) {
    return [
        interpolateTemplate(template.greeting, variables),
        '',
        interpolateTemplate(template.body, variables),
        '',
        interpolateTemplate(template.closing, variables),
        '',
        interpolateTemplate(template.signature, variables)
    ].join('\n');
}

/**
 * Generates invoice data structure for PDF generation
 * Note: Actual PDF generation requires jsPDF which is a UI-side concern
 * 
 * @param {Object} paymentData - Payment data
 * @param {Object} branding - Agency branding
 * @param {string} locale - Locale
 * @returns {Object} Invoice data structure
 */
export function generateInvoiceData(paymentData, branding, locale = 'en') {
    const labels = INVOICE_LABELS[locale] || INVOICE_LABELS['en'];
    const now = new Date();

    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    return {
        invoiceNumber,
        labels,
        branding: {
            agencyName: branding.agencyName,
            logoUrl: branding.logoUrl,
            primaryColor: branding.primaryColor || '#3B9FD8',
            email: branding.email,
            phone: branding.phone
        },
        date: now.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US'),
        billedTo: {
            name: paymentData.travelerName,
            email: paymentData.travelerEmail,
            cabinNumber: paymentData.cabinNumber
        },
        items: [
            {
                description: paymentData.description || (locale === 'es' ? 'Pago de crucero' : 'Cruise Payment'),
                quantity: 1,
                amountCents: paymentData.amountCents,
                currency: paymentData.currency || 'CAD'
            }
        ],
        totals: {
            amountCents: paymentData.amountCents,
            currency: paymentData.currency || 'CAD',
            exchangeRateUsed: paymentData.exchangeRateUsed,
            convertedCents: paymentData.convertedCents,
            baseCurrency: paymentData.baseCurrency || 'CAD',
            balanceCents: paymentData.balanceCents
        },
        formatted: {
            amount: formatCents(paymentData.amountCents, paymentData.currency || 'CAD'),
            converted: paymentData.convertedCents
                ? formatCents(paymentData.convertedCents, paymentData.baseCurrency || 'CAD')
                : null,
            balance: formatCents(paymentData.balanceCents || 0, paymentData.baseCurrency || 'CAD')
        },
        locale
    };
}

/**
 * Gets available event types with localized labels
 * @param {string} locale - Locale
 * @returns {Array} Event type options
 */
export function getEventTypes(locale = 'en') {
    const isEn = locale === 'en';
    return [
        { key: 'payment_received', label: isEn ? 'Payment Received' : 'Pago Recibido' },
        { key: 'payment_reminder', label: isEn ? 'Payment Reminder' : 'Recordatorio de Pago' },
        { key: 'deadline_warning', label: isEn ? 'Deadline Warning' : 'Alerta de Fecha Límite' },
        { key: 'payment_applied', label: isEn ? 'Payment Applied' : 'Pago Aplicado' }
    ];
}

/**
 * Gets invoice labels for a locale
 * @param {string} locale - Locale
 * @returns {Object} Labels object
 */
export function getInvoiceLabels(locale = 'en') {
    return INVOICE_LABELS[locale] || INVOICE_LABELS['en'];
}
