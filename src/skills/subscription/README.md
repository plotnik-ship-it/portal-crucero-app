# Subscription Gate Service (Skill #5)

## Purpose
Feature gating based on subscription plan tier with bilingual upsell messages.

## Input Schema
```javascript
{
  agencyProfile: {
    subscriptionStatus: 'active', // 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended'
    planKey: 'pro',               // 'trial' | 'solo_groups' | 'pro' | 'enterprise'
    billing: { ... }              // Alternative location for status/planKey
  },
  requestedFeature: 'bulk_import' // Feature key from FEATURE_MATRIX
}
```

## Output Schema
```javascript
// Allowed
{ allowed: true }

// Denied with upsell
{
  allowed: false,
  upsellMessage: { en: '...', es: '...' },
  upgradeUrl: '/settings/billing'
}

// Blocked (subscription issue)
{
  allowed: false,
  blocked: true,
  reason: 'past_due',
  upsellMessage: { en: '...', es: '...' }
}
```

## Feature Matrix
| Feature | trial | solo_groups | pro | enterprise |
|---------|-------|-------------|-----|------------|
| basic_dashboard | ✓ | ✓ | ✓ | ✓ |
| single_group | ✓ | ✓ | ✓ | ✓ |
| multi_group | | | ✓ | ✓ |
| bulk_import | | | ✓ | ✓ |
| multi_currency | | | ✓ | ✓ |
| api_access | | | | ✓ |
| ocr_parsing | | | | ✓ |

## Plan Limits
| Plan | Groups | Travelers | Emails/mo |
|------|--------|-----------|-----------|
| trial | 1 | 50 | 100 |
| solo_groups | 1 | 120 | 1,500 |
| pro | ∞ | 500 | 5,000 |
| enterprise | ∞ | ∞ | ∞ |

## Fallback
- If billing service unavailable: Allow read-only access
- Unknown plan: Fallback to trial limits
