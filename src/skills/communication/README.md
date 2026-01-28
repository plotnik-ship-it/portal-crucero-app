# Bilingual Communication Automator (Skill #3)

## Purpose
Event-driven email generation with localized templates (EN/ES) and PDF invoice data preparation.

## Event Types
- `payment_received` - Confirmation after payment
- `payment_reminder` - Balance due reminder
- `deadline_warning` - Urgent deadline approaching
- `payment_applied` - Admin applied payment

## Input Schema

```javascript
{
  eventType: 'payment_received',
  locale: 'es',              // 'en' | 'es'
  branding: {
    agencyName: 'TravelPoint',
    logoUrl: 'https://...',
    primaryColor: '#3B9FD8'
  },
  paymentData: {
    travelerName: 'Juan Pérez',
    travelerEmail: 'juan@email.com',
    amountCents: 50000,
    currency: 'CAD',
    balanceCents: 150000,
    deadline: '2025-03-15',
    cabinNumber: '1234'
  }
}
```

## Output Schema

```javascript
// Email
{
  subject: 'Pago Recibido - TravelPoint',
  htmlBody: '<html>...</html>',
  plainText: 'Dear Juan...',
  to: 'juan@email.com',
  locale: 'es'
}

// Invoice Data
{
  invoiceNumber: 'INV-20250127-ABC123',
  labels: { title: 'RECIBO DE PAGO', ... },
  branding: { ... },
  billedTo: { name, email, cabinNumber },
  totals: { amountCents, currency, exchangeRateUsed, ... },
  formatted: { amount: '$500.00 CAD', balance: '$1,500.00 CAD' }
}
```

## Functions

| Function | Description |
|----------|-------------|
| `generateEmailForEvent(input)` | Generate complete email |
| `generateInvoiceData(data, branding, locale)` | Invoice structure for PDF |
| `getLocalizedTemplate(event, locale)` | Get template for event |
| `interpolateTemplate(text, vars)` | Variable substitution |
| `getEventTypes(locale)` | List available events |
| `getInvoiceLabels(locale)` | Get localized labels |
