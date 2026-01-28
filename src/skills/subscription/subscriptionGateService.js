/**
 * Subscription Gate Service
 * 
 * Skill #5: SaaS Subscription Manager
 * 
 * Provides feature gating based on subscription plan, with bilingual upsell
 * messages when features are restricted.
 * 
 * INPUT:
 *   agencyProfile: { subscriptionStatus, planKey, billing }
 *   requestedFeature: string (feature key)
 * 
 * OUTPUT:
 *   { allowed: boolean, upsellMessage?: { en, es }, upgradeUrl?: string }
 */

import { validateSubscriptionStatus, validatePlanKey, validateAll } from '../_shared/validators.js';

// Feature definitions by plan tier
const FEATURE_MATRIX = {
    // Feature: [plans that have access]
    'basic_dashboard': ['trial', 'solo_groups', 'pro', 'enterprise'],
    'single_group': ['trial', 'solo_groups', 'pro', 'enterprise'],
    'multi_group': ['pro', 'enterprise'],
    'bulk_import': ['pro', 'enterprise'],
    'email_reminders': ['trial', 'solo_groups', 'pro', 'enterprise'],
    'mass_communications': ['pro', 'enterprise'],
    'document_manager': ['solo_groups', 'pro', 'enterprise'],
    'analytics_basic': ['solo_groups', 'pro', 'enterprise'],
    'analytics_advanced': ['pro', 'enterprise'],
    'branding_basic': ['solo_groups', 'pro', 'enterprise'],
    'branding_full': ['pro', 'enterprise'],
    'api_access': ['enterprise'],
    'custom_domain': ['enterprise'],
    'multi_currency': ['pro', 'enterprise'],
    'ocr_parsing': ['pro', 'enterprise']  // Changed from enterprise-only to include pro
};

// Plan limits
const PLAN_LIMITS = {
    'trial': { maxGroups: 1, maxTravelers: 50, maxEmailsPerMonth: 100 },
    'solo_groups': { maxGroups: 1, maxTravelers: 120, maxEmailsPerMonth: 1500 },
    'pro': { maxGroups: Infinity, maxTravelers: 500, maxEmailsPerMonth: 5000 },
    'enterprise': { maxGroups: Infinity, maxTravelers: Infinity, maxEmailsPerMonth: Infinity }
};

// Upsell messages by feature
const UPSELL_MESSAGES = {
    'multi_group': {
        en: 'Upgrade to Pro to manage unlimited groups',
        es: 'Actualiza a Pro para gestionar grupos ilimitados'
    },
    'bulk_import': {
        en: 'Upgrade to Pro to unlock bulk CSV import',
        es: 'Actualiza a Pro para desbloquear importación masiva de CSV'
    },
    'mass_communications': {
        en: 'Upgrade to Pro to send mass communications',
        es: 'Actualiza a Pro para enviar comunicaciones masivas'
    },
    'analytics_advanced': {
        en: 'Upgrade to Pro for advanced analytics and reports',
        es: 'Actualiza a Pro para análisis y reportes avanzados'
    },
    'branding_full': {
        en: 'Upgrade to Pro for complete white-label branding',
        es: 'Actualiza a Pro para marca blanca completa'
    },
    'api_access': {
        en: 'Contact sales for Enterprise API access',
        es: 'Contacta ventas para acceso a la API Enterprise'
    },
    'custom_domain': {
        en: 'Contact sales for custom domain setup',
        es: 'Contacta ventas para configurar tu dominio personalizado'
    },
    'multi_currency': {
        en: 'Upgrade to Pro to track payments in multiple currencies',
        es: 'Actualiza a Pro para rastrear pagos en múltiples monedas'
    },
    'ocr_parsing': {
        en: 'Contact sales for AI-powered contract parsing',
        es: 'Contacta ventas para extracción de contratos con IA'
    },
    'document_manager': {
        en: 'Subscribe to access the document manager',
        es: 'Suscríbete para acceder al gestor de documentos'
    },
    'analytics_basic': {
        en: 'Subscribe to access analytics',
        es: 'Suscríbete para acceder a las analíticas'
    },
    'default': {
        en: 'Upgrade your plan to unlock this feature',
        es: 'Actualiza tu plan para desbloquear esta función'
    }
};

/**
 * Validates agency profile input
 * @param {Object} agencyProfile
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAgencyProfile(agencyProfile) {
    if (!agencyProfile || typeof agencyProfile !== 'object') {
        return { valid: false, errors: ['agencyProfile is required'] };
    }

    const validations = [];

    if (agencyProfile.subscriptionStatus) {
        validations.push({
            validation: validateSubscriptionStatus(agencyProfile.subscriptionStatus),
            fieldPath: 'subscriptionStatus'
        });
    }

    if (agencyProfile.planKey) {
        validations.push({
            validation: validatePlanKey(agencyProfile.planKey),
            fieldPath: 'planKey'
        });
    }

    return validateAll(validations);
}

/**
 * Checks if an agency can access a specific feature
 * 
 * @param {Object} agencyProfile - Agency profile with subscription data
 * @param {string} featureKey - Feature to check access for
 * @returns {Object} { allowed, upsellMessage?, upgradeUrl? }
 */
export function checkFeatureAccess(agencyProfile, featureKey) {
    // Validate input
    const profileValidation = validateAgencyProfile(agencyProfile);
    if (!profileValidation.valid) {
        return {
            allowed: false,
            error: profileValidation.errors.join('; '),
            upsellMessage: UPSELL_MESSAGES['default']
        };
    }

    // Check subscription status first
    const status = agencyProfile.subscriptionStatus || agencyProfile.billing?.status;
    const planKey = agencyProfile.planKey || agencyProfile.billing?.planKey || 'trial';

    // Blocked statuses
    if (['canceled', 'past_due', 'suspended', 'incomplete'].includes(status)) {
        return {
            allowed: false,
            blocked: true,
            reason: status,
            upsellMessage: {
                en: 'Your subscription requires attention. Please update your billing.',
                es: 'Tu suscripción requiere atención. Por favor actualiza tu facturación.'
            },
            upgradeUrl: '/settings/billing'
        };
    }

    // Check feature access
    const allowedPlans = FEATURE_MATRIX[featureKey] || [];
    const hasAccess = allowedPlans.includes(planKey);

    if (hasAccess) {
        return { allowed: true };
    }

    // Feature not available - return upsell
    return {
        allowed: false,
        upsellMessage: UPSELL_MESSAGES[featureKey] || UPSELL_MESSAGES['default'],
        upgradeUrl: featureKey.includes('enterprise') || featureKey === 'api_access'
            ? '/contact-sales'
            : '/settings/billing'
    };
}

/**
 * Gets the upsell message for a feature in a specific locale
 * 
 * @param {string} featureKey - Feature key
 * @param {string} locale - 'en' or 'es'
 * @returns {string} Localized upsell message
 */
export function getUpsellMessage(featureKey, locale = 'en') {
    const messages = UPSELL_MESSAGES[featureKey] || UPSELL_MESSAGES['default'];
    return messages[locale] || messages['en'];
}

/**
 * Gets plan limits for a given plan
 * 
 * @param {string} planKey - Plan key
 * @returns {Object} { maxGroups, maxTravelers, maxEmailsPerMonth }
 */
export function getFeatureLimits(planKey) {
    return PLAN_LIMITS[planKey] || PLAN_LIMITS['trial'];
}

/**
 * Checks if agency can create a new group based on limits
 * 
 * @param {Object} agencyProfile - Agency profile
 * @param {number} currentGroupCount - Current number of active groups
 * @returns {Object} { allowed, remaining?, upsellMessage? }
 */
export function canCreateGroup(agencyProfile, currentGroupCount = 0) {
    const accessCheck = checkFeatureAccess(agencyProfile, 'single_group');
    if (!accessCheck.allowed) {
        return accessCheck;
    }

    const planKey = agencyProfile.planKey || agencyProfile.billing?.planKey || 'trial';
    const limits = getFeatureLimits(planKey);

    if (currentGroupCount >= limits.maxGroups) {
        // Check if multi_group is available
        return checkFeatureAccess(agencyProfile, 'multi_group');
    }

    return {
        allowed: true,
        remaining: limits.maxGroups === Infinity ? Infinity : limits.maxGroups - currentGroupCount
    };
}

/**
 * Gets all features available for a plan
 * 
 * @param {string} planKey - Plan key
 * @returns {string[]} Array of feature keys
 */
export function getFeaturesForPlan(planKey) {
    const features = [];
    for (const [feature, plans] of Object.entries(FEATURE_MATRIX)) {
        if (plans.includes(planKey)) {
            features.push(feature);
        }
    }
    return features;
}

/**
 * Checks if plan is currently active (not expired, not canceled)
 * 
 * @param {Object} agencyProfile - Agency profile
 * @returns {boolean}
 */
export function isSubscriptionActive(agencyProfile) {
    const status = agencyProfile.subscriptionStatus || agencyProfile.billing?.status;
    return ['trialing', 'active'].includes(status);
}
