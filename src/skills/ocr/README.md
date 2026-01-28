# OCR Parser & Currency Detector (Skill #1 - Premium)

## Production-Grade v1.1.0 | Schema: `ocr.v1`

Parse cruise contract PDFs with bulletproof output contracts, telemetry, and UI reconciliation support.

---

## Output Contracts

### A. Success (Auto-Fill)
```javascript
{
  success: true,
  data: {
    baseCurrency: 'USD',
    baseCurrencyConfidence: 85,
    cabinInventory: [
      { 
        rowId: 'row_a1b2c3_0',   // Deterministic ID for UI reconciliation
        cabinNumber: '12345', 
        costCents: 350000, 
        currency: 'USD',         // Explicit per-row (consistency)
        confidence: 'high',
        lineNumber: 5
      }
    ],
    keyDates: {
      sailDate: '2025-06-15',
      depositDeadline: '2025-02-01',
      finalPaymentDeadline: '2025-04-15'
    }
  },
  partial: false,
  unparsedRows: [],
  missingFields: [],
  telemetry: { ... }
}
```

### B. Needs Review (No Guessing)
```javascript
{
  success: false,
  needsReview: true,
  phase: 'currency_detection',
  currencyCandidates: [
    { currency: 'USD', score: 30, confidence: 100 },
    { currency: 'CAD', score: 25, confidence: 83 }
  ],
  reason: 'Multiple currencies detected. Please select.',
  telemetry: {
    failureStage: 'currency',  // 'currency' | 'table' | 'dates' | 'input'
    ...
  }
}
```

---

## Guardrails (Non-Negotiable)

| Rule | Behavior |
|------|----------|
| `$` alone does NOT determine currency | Requires explicit: USD, CAD, MXN |
| Multiple explicit currencies | → `needsReview: true` |
| Parse rate < threshold | → `partial: true` + review |
| Missing required dates | → Listed in `missingFields[]` |
| FX context (exchange rate) | Ignored for base currency |

---

## Configurable Thresholds

```javascript
import { THRESHOLDS } from './ocrParserService.js';

// Override at runtime if needed:
THRESHOLDS.currencyConfidenceThreshold = 40;  // Min confidence to auto-accept
THRESHOLDS.tableParseRateThreshold = 80;      // Min % rows parsed to avoid partial
THRESHOLDS.datesRequiredForComplete = 1;      // Min dates to avoid needsReview
```

---

## Telemetry

Every parse includes telemetry for debugging and analytics:

```javascript
{
  parserVersion: '1.1.0',
  outputSchemaVersion: 'ocr.v1',       // For frontend compatibility
  contractFingerprint: 'fp_a1b2c3_420', // Group similar templates
  parseTimeMs: 15,
  baseCurrencyConfidence: 75,
  cabinsParsed: 4,
  cabinsUnparsed: 1,
  parseRate: 80,
  datesFound: 3,
  needsReview: true,
  failureStage: 'table',               // Why review is needed
  totalLines: 42,
  timestamp: '2026-01-27T12:00:00Z'
}
```

Use `logParseResult(result)` for console output.

---

## Deterministic Row IDs

For UI reconciliation (edit state preservation):

```javascript
// Each cabin and unparsed row has:
{
  rowId: 'row_a1b2c3_5',  // Hash of normalized text + line index
  lineNumber: 5,
  ...
}

// Same text always produces same rowId (deterministic)
```

---

## UI Flow

```
PDF Upload
    │
    ▼
parseContractText(pdfText, hints)
    │
    ├── success=true, needsReview=false
    │       ▼
    │   Pre-fill form → "Confirm Import" button
    │
    └── success=false OR needsReview=true
            ▼
        Open Review Modal:
        • Currency selector (from candidates)
        • Editable table (keys by rowId)
        • Date pickers with detected values
        • "Confirm & Import" button
```

---

## Test Coverage

```
36/36 tests passing
```

Including 6 bulletproof feature tests for schema version, thresholds, rowId, fingerprint, failureStage, and currency consistency.
