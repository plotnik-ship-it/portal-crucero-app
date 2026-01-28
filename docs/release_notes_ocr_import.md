# OCR Contract Import - Release Notes (Beta)

> **Version**: 1.0.0-beta  
> **Status**: ✅ BETA READY  
> **Sign-Off Date**: January 27, 2026  
> **Feature Flag**: `ocr_parsing` (Pro/Enterprise tier)  
> **Signed-off by**: Daniel Plotnik

---

## Overview

The OCR Contract Import feature allows Enterprise agencies to automatically parse cruise contract PDFs and create group bookings with extracted cabin inventory, pricing, and key dates.

---

## Expected Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Upload PDF  │───▶│  OCR Parse   │───▶│   Preview    │───▶│   Confirm    │
│              │    │              │    │   & Edit     │    │   Import     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │                    │                    │
                           ▼                    ▼                    ▼
                    Parse contract       Review cabins,      Create group +
                    text, extract        currency, dates     immutable import
                    structured data                          audit record
```

### Step-by-Step

1. **Upload PDF**: Navigate to `/admin/import-contract`, upload a cruise contract PDF
2. **OCR Parse**: System extracts text and parses cabin inventory, pricing, dates
3. **Preview & Edit**: Review extracted data, edit fields if needed:
   - Select/confirm currency
   - Edit cabin rows (categoryCode, qty, priceCents)
   - Set sail date and deadlines
4. **Confirm Import**: Creates new group with immutable import audit record

---

## Beta Limitations

### Supported Formats
- ✅ Text-based PDFs (most cruise line contracts)
- ❌ Image-based/scanned PDFs (coming soon)
- ✅ Tabular cabin inventory layouts
- ⚠️ Mixed layouts may need manual review

### Supported Currency Formats
- `$3,500.00` / `USD 3500` / `3500 USD`
- `$1,234.56 CAD` / `CAD $1,234`
- `€1.234,56` / `EUR 1234.56`
- `$25,000 MXN` / `MXN $25,000`

### Known Limitations
1. **Deposit breakdowns**: Not automatically extracted (add manually)
2. **Multi-page cabin tables**: May need row review
3. **Promotional rates**: May parse as different line items
4. **Images/logos**: Ignored (text-only extraction)

---

## Duplicate Detection

The system prevents duplicate imports using contract fingerprinting:

- **Same contract = Same fingerprint**
- If a duplicate is detected, you'll see "Open Existing Group" only
- No "Create Anyway" option (strict data integrity)

---

## Data Stored

### Import Record (Immutable)
| Field | Content | PII? |
|-------|---------|------|
| `status` | `confirmed` / `failed` | No |
| `originalOcrOutput` | Parsed structure (no raw PDF) | No |
| `userEdits` | Diff of user changes | No |
| `finalData` | Confirmed cabin inventory | No |
| `telemetry` | Parse metrics | No |
| `createdBy` | User UID only | No |

### What is NOT Stored
- ❌ Raw PDF file (not persisted)
- ❌ Passenger names, emails, phones
- ❌ Payment card information
- ❌ Personal identifiers

---

## Reporting Problematic PDFs

If a PDF fails to parse correctly:

### 1. Collect Information
```
- Contract fingerprint (shown in debug panel if enabled)
- Screenshot of "Needs Review" screen
- Description of what's wrong (missing rows, wrong currency, etc.)
```

### 2. Submit Sample
- **Email**: support@trevello.com
- **Subject**: `[OCR Beta] Parse Issue - {Agency Name}`
- **Attach**: PDF sample (if permitted by contract terms)

### 3. What Happens Next
- Engineering reviews the sample
- Parser updated if needed
- You'll be notified when fix is deployed

---

## Verification Checklist (Admin)

| Test | Expected | Pass? |
|------|----------|-------|
| Upload clear PDF | Preview shown | ☐ |
| Confirm import | Group created | ☐ |
| Upload same PDF | "Open Existing Group" only | ☐ |
| Non-Enterprise access | Upsell shown | ☐ |
| Edit import in Console | Denied | ☐ |

---

## Support

- **Docs**: `/docs/release_notes_ocr_import.md`
- **Feature Flag**: `ocr_parsing` (Enterprise only)
- **Contact**: support@trevello.com
