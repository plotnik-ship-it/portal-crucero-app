# Shared Skills Utilities

This directory contains shared utilities used across all modular skills.

## Files

### `moneyUtils.js`
Cents-based arithmetic utilities. All monetary values use integers (cents) to avoid floating-point precision issues.

**Key Functions:**
- `toCents(decimal)` - Convert decimal to cents
- `fromCents(cents)` - Convert cents to decimal (display only)
- `multiplyByRate(cents, rate)` - Multiply using integer fraction
- `rateToFraction(decimal)` - Convert decimal rate to fraction
- `formatCents(cents, currency)` - Format for display

**Exchange Rate Storage:**
Rates are stored as `{ numerator, denominator }` to avoid float storage.
Example: 1.36 → `{ numerator: 13600, denominator: 10000 }`

### `validators.js`
Strict input validation for all skills.

**Key Functions:**
- `validateCents(value)` - Integer cents validation
- `validateCurrency(value)` - Supported currency codes
- `validateRateFraction(rate)` - Rate object validation
- `validateLocale(value)` - EN/ES locale validation
- `validateSubscriptionStatus(value)` - Billing status validation
- `validatePlanKey(value)` - Plan tier validation
- `validateAll(validations)` - Batch validation

## Non-Negotiable Rules
- All amounts in cents (integers)
- No floats for monetary values
- Strict validation before processing
