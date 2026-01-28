# OCR Contract Import - Regression Test Cases

> **Version**: 1.0.0  
> **Last Updated**: January 27, 2026  
> **Parser Version**: ocr.v1.1.0

---

## Test Execution Instructions

### Prerequisites
1. Development environment running (`npm run dev`)
2. Logged in as admin with `planKey: 'pro'` or `planKey: 'enterprise'`
3. Navigate to `/admin/import-contract`
4. Enable Debug Panel (visible only in development mode)

### Debug Panel Location
The debug panel appears at the bottom of the Contract Import page when:
- `NODE_ENV === 'development'`
- A PDF has been parsed (after upload)

---

## Test Cases

### Case 1: Clear Currency PDF (Explicit USD)

**PDF File**: `TBD (user-provided)`  
**Description**: Contract with explicit "USD" currency markers

| Field | Expected Value |
|-------|----------------|
| `success` | `true` |
| `needsReview` | `false` |
| `partial` | `false` |
| `baseCurrency` | `USD` |
| `currencyConfidence` | `>= 0.9` |
| `parseRate` | `>= 80%` |
| `failureStage` | `null` |
| `cabinsParsed` | `> 0` |
| `cabinsUnparsed` | `0` |
| `unparsedRowsCount` | `0` |

**Verification Steps**:
1. Upload the PDF with clear USD markers
2. Wait for parse completion
3. Check Debug Panel output
4. Verify all green indicators
5. [ ] **PASS** / [ ] **FAIL**

**Result**: _________________  
**Notes**: _________________

---

### Case 2: Ambiguous Currency PDF ($ Only)

**PDF File**: `TBD (user-provided)`  
**Description**: Contract using only "$" symbol, no USD/CAD explicit

| Field | Expected Value |
|-------|----------------|
| `success` | `true` |
| `needsReview` | `true` |
| `partial` | `false` |
| `baseCurrency` | `USD` or `CAD` (best guess) |
| `currencyConfidence` | `< 0.9` |
| `currencyCandidates` | `['USD', 'CAD']` (populated) |
| `reviewReasons` | Contains "ambiguous_currency" |
| `parseRate` | `>= 70%` |

**Verification Steps**:
1. Upload the PDF with "$" only
2. Wait for parse completion
3. Check Debug Panel shows `needsReview: true`
4. Verify `currencyCandidates` array is populated
5. Review UI shows currency selector for user
6. [ ] **PASS** / [ ] **FAIL**

**Result**: _________________  
**Notes**: _________________

---

### Case 3: Incomplete Table PDF (Partial Parse)

**PDF File**: `TBD (user-provided)`  
**Description**: Contract with malformed or incomplete pricing table

| Field | Expected Value |
|-------|----------------|
| `success` | `true` |
| `needsReview` | `true` |
| `partial` | `true` |
| `parseRate` | `< 80%` |
| `failureStage` | `null` or specific stage |
| `cabinsParsed` | `>= 1` |
| `cabinsUnparsed` | `> 0` |
| `unparsedRowsCount` | `> 0` |
| `unparsedRows` | Array with raw lines |

**Verification Steps**:
1. Upload the PDF with incomplete table
2. Wait for parse completion
3. Check Debug Panel shows `partial: true`
4. Verify `unparsedRows` count > 0
5. Review UI shows unparsed rows for manual entry
6. [ ] **PASS** / [ ] **FAIL**

**Result**: _________________  
**Notes**: _________________

---

## Security Verification Checklist

### Import Record Immutability

**Verified**: ✅  
**Location**: `firestore.rules:118`  
**Rule**: `allow update, delete: if false;`

**Manual Verification**:
1. Complete an import successfully
2. In Firebase Console, locate: `groups/{groupId}/imports/{importId}`
3. Attempt to edit any field
4. **Expected**: Operation blocked

---

### confirmImport() Data Integrity

**Verified**: ✅  
**Location**: `contractImportService.js:286-302`

| Field | Saved | Evidence |
|-------|-------|----------|
| `originalOcrOutput` | ✅ | Line 287 |
| `userEdits` (diff) | ✅ | Line 288 |
| `finalData` | ✅ | Lines 289-293 |
| `telemetry` | ✅ | Lines 294-298 |
| `createdBy` | ✅ | Line 301 |
| `createdAt` | ✅ | Line 300 |
| `duplicateOfImportId` | ✅ | Line 299 |

---

### Idempotency - Fingerprint Detection

**Verified**: ✅  
**Location**: `contractImportService.js:182-211`

**How it works**:
1. On PDF parse, a `contractFingerprint` is generated from content hash
2. Before confirm, `findImportByFingerprint()` is called
3. If match found, warning is shown with existing import details
4. User can choose to skip or proceed (creating `duplicateOfImportId` reference)

**Manual Verification**:
1. Upload a PDF and complete import
2. Upload the exact same PDF again
3. **Expected**: Warning message with link to existing import
4. [ ] **PASS** / [ ] **FAIL**

---

## Test Results Summary

| Case | Status | Date Tested | Tester |
|------|--------|-------------|--------|
| Case 1: Clear Currency | ⏳ Pending | - | - |
| Case 2: Ambiguous Currency | ⏳ Pending | - | - |
| Case 3: Incomplete Table | ⏳ Pending | - | - |
| Immutability | ✅ Verified | 2026-01-27 | System |
| Data Integrity | ✅ Verified | 2026-01-27 | System |
| Idempotency | ⏳ Pending | - | - |

---

*Document maintained by: Engineering Team*
