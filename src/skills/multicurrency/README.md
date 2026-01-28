# Multi-Currency Financial Core (Skill #2)

## Purpose
Precision financial calculations with multi-currency support using cents and fractional exchange rates.

## Key Principles
- **All amounts in cents** (integers only)
- **Exchange rates as fractions** (`{ numerator, denominator }`)
- **Immutable exchange rates** - `exchangeRateUsed` is captured at payment time and NEVER recalculated

## Input Schema

```javascript
{
  payments: [
    {
      amountCents: 10000,           // $100.00 in cents
      currency: 'USD',
      exchangeRateUsed?: {          // Optional - set by preparePaymentForStorage
        numerator: 13600,
        denominator: 10000          // = 1.36
      }
    }
  ],
  cabinCostCents: 100000,           // $1,000.00 in cents
  baseCurrency: 'CAD',
  fxRates: {
    USD: { numerator: 13600, denominator: 10000 },  // 1.36
    EUR: { numerator: 15000, denominator: 10000 },  // 1.50
    MXN: { numerator: 740, denominator: 10000 }     // 0.074
  }
}
```

## Output Schema

```javascript
{
  success: true,
  cabinCostCents: 100000,
  totalPaidCents: 63600,
  balanceCents: 36400,
  baseCurrency: 'CAD',
  paymentProgress: 0.636,
  isPaidInFull: false,
  breakdown: [
    {
      originalCurrency: 'USD',
      originalAmountCents: 10000,
      exchangeRateUsed: { numerator: 13600, denominator: 10000 },
      exchangeRateDecimal: 1.36,
      convertedCents: 13600,
      convertedCurrency: 'CAD'
    }
  ],
  formatted: {
    totalCost: '$1,000.00 CAD',
    totalPaid: '$636.00 CAD',
    balance: '$364.00 CAD'
  }
}
```

## Agency fxPolicy Schema (Firestore)

```javascript
// agencies/{agencyId}/fxPolicy
{
  baseCurrency: 'CAD',
  fxRates: {
    USD: { numerator: 13600, denominator: 10000 },
    EUR: { numerator: 15000, denominator: 10000 }
  },
  rateSource: 'manual',
  lastUpdated: '2025-01-27T15:00:00Z',
  updatedBy: 'admin@agency.com'
}
```

## Functions

| Function | Description |
|----------|-------------|
| `validatePaymentInput(payment)` | Validates payment object |
| `convertToBaseCurrency(payment, base, rates)` | Converts single payment |
| `calculateFinancialState(input)` | Full state calculation |
| `preparePaymentForStorage(data, base, rates)` | Captures rate for persistence |
| `updateAgencyFxPolicy(existing, updates)` | Updates agency rates |

## Fallback Behavior
- Missing rate → Uses 1:1 with console warning
- Invalid payments → Skipped, includes in `validationErrors`
