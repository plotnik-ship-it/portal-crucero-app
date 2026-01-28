# Admin-Only Maintenance Guide

> **Last Updated**: January 27, 2026
> **Purpose**: Security documentation for OCR Contract Import feature

---

## 0. Debug Panel Security (HARDENED)

The OCR Debug Panel has **four security gates**:

| Gate | Mechanism | Default |
|------|-----------|---------|
| 1. DEV Mode | `import.meta.env.DEV` check | OFF in prod |
| 2. Query Param | `?debug=1` required in URL | OFF |
| 3. Dynamic Import | `import()` INSIDE guard - never bundled in prod | N/A |
| 4. State Gate | Component only loads after all checks pass | OFF |

**Implementation** (ContractImportPage.jsx):
```javascript
// Dynamic import INSIDE the guard - never executed in prod builds
useEffect(() => {
    if (isDebugEnabled && !DebugPanelComponent) {
        import('./OcrDebugPanel')
            .then(module => setDebugPanelComponent(() => module.default));
    }
}, [isDebugEnabled]);
```

**To enable debug panel**:
```
http://localhost:5173/admin/import-contract?debug=1
```

**Data Safety**:
- ✅ Shows: status flags, currency codes, counts, telemetry versions
- ❌ Does NOT show: passenger names, cabin numbers, prices, financial values
- Fingerprint is truncated to 16 characters

### Quick Verification Checklist

```bash
# 1. Verify debug panel NOT bundled in prod
npm run build
grep -r "OcrDebugPanel" dist/
# Expected: No results

# 2. Verify userEdits diff format
# Look for: { path: "cabinInventory[rowId=X].costCents", from, to }

# 3. Verify Firestore rules compile
firebase deploy --only firestore:rules --dry-run
# Expected: Success, no errors

# 4. DEV tests (manual):
# - /admin/import-contract → No debug panel
# - /admin/import-contract?debug=1 → Debug panel after PDF parse
# - Upload duplicate PDF → Only "Open Existing Group" button
```

---

## 1. Removed Bypass Scripts

The following temporary bypass scripts were removed to ensure production security:

| File Removed | Date Removed | Reason |
|--------------|--------------|--------|
| `scripts/upgradeToProTemp.cjs` | 2026-01-27 | Directly modified `planKey` and `subscriptionStatus` without Stripe billing |

---

## 2. Bypass Detection - Grep Patterns

Run these patterns regularly to ensure no bypasses are reintroduced:

```bash
# Core bypass flags (should return: No results)
grep -rn "forceEnterprise\|skipGate\|isEnterpriseOverride" ./src

# Subscription bypass patterns
grep -rn "bypassSubscription\|mockEnterprise\|skipBilling" ./src

# Direct plan mutation in scripts
grep -rn "planKey.*=.*'pro'\|planKey.*=.*'enterprise'" ./scripts
grep -rn "subscriptionStatus.*=.*'active'" ./scripts

# Temporary/debug overrides in source
grep -rn "TEMP_BYPASS\|TODO.*remove.*bypass\|DEBUG_ENTERPRISE" ./src

# Override flags in environment
grep -rn "FORCE_PLAN\|SKIP_SUBSCRIPTION\|MOCK_BILLING" ./src ./.env*
```

**Expected Result**: All commands should return empty (no matches).

---

## 3. Gating Validation - OCR Feature Access

### Test Case: Non-Enterprise User Cannot Access OCR

**Prerequisites**:
- Access to Firebase Console
- Dev environment running

**Steps**:
1. In Firestore Console, set agency document:
   ```
   agencies/{agencyId}: { planKey: 'free', subscriptionStatus: 'active' }
   ```
2. Login as admin of that agency
3. Navigate to `/admin` dashboard
4. Look for "Import Contract" or OCR-related buttons
5. **Expected**: 
   - OCR option is either hidden OR shows upgrade/upsell prompt
   - Attempting to access `/admin/import-contract` directly should redirect or block

### Test Case: Enterprise User Has Full OCR Access

1. In Firestore Console, set agency document:
   ```
   agencies/{agencyId}: { planKey: 'pro', subscriptionStatus: 'active' }
   ```
2. Login as admin
3. Navigate to `/admin/import-contract`
4. **Expected**:
   - Full OCR parsing UI is available
   - Upload PDF → Parse → Review → Confirm flow works

---

## 4. Security Checklist - Multi-Tenant Isolation

### Firestore Rules Verification

| Rule | Location | Expected |
|------|----------|----------|
| Imports immutable | `firestore.rules:125` | `allow update, delete: if false;` |
| Agency scoping on imports | `firestore.rules:120-123` | `canAccessParentGroup()` check |
| Null-safe parent lookup | `firestore.rules:104-119` | `exists()` before `get()` |
| Billing fields protected | `firestore.rules:190-192` | Update blocked if `diff.affectedKeys().hasAny(['billing'])` |
| Groups scoped by agency | `firestore.rules:86-98` | All operations require agency match |

### Null-Safe Pattern (IMPORTANT)

The imports subcollection uses a **null-safe pattern** to prevent errors when parent group doesn't exist:

```javascript
// Pattern: Always check exists() before get()
function parentGroupExists() {
  return exists(/databases/$(database)/documents/groups/$(groupId));
}

function canAccessParentGroup() {
  return parentGroupExists() && getParentGroupAgencyId() == getUserAgencyId();
}
```

**This prevents**:
- Errors when accessing orphaned import records
- Security bypasses via non-existent parent documents
- Cross-tenant access via deleted groups

### Cross-Tenant Isolation Tests

1. **Login as Agency A admin**
2. Note a `groupId` from Agency B (via Firebase Console)
3. Attempt to access: `/admin/group/{Agency-B-groupId}`
4. **Expected**: Access denied or redirect to own dashboard

### Import Record Immutability Test

1. Complete an OCR import successfully
2. In Firebase Console, navigate to: `groups/{groupId}/imports/{importId}`
3. Attempt to click "Edit" or modify any field
4. **Expected**: Firestore rules block the operation

---

## 5. Allowed Admin Scripts (Read-Only)

These scripts in `/scripts/` are **safe** for debugging (read-only or essential migrations):

| Script | Purpose | Safe? |
|--------|---------|-------|
| `checkAgency.cjs` | View agency details | ✅ Read-only |
| `checkUser.cjs` | View user details | ✅ Read-only |
| `testAgencyIsolation.cjs` | Verify multi-tenant rules | ✅ Read-only |
| `verifyMultiGroup.cjs` | Verify group structure | ✅ Read-only |
| `createBackup.cjs` | Export Firestore data | ✅ Read-only |

> **Warning**: Do NOT create scripts that modify `planKey`, `subscriptionStatus`, or `billing.*` fields. All subscription changes must go through Stripe webhooks.

---

## 6. Emergency Contacts

For billing/subscription issues:
- Check Stripe Dashboard for webhook failures
- Verify `billing.stripeCustomerId` exists on agency
- Do NOT manually modify billing fields

---

*Document maintained by: Engineering Team*
