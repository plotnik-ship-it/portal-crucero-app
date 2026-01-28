/**
 * Stripe Helper Functions
 * 
 * Provides utility functions for Stripe integration:
 * - Price ID mapping for plans
 * - Plan limits and feature gating
 */

/**
 * Get Stripe Price ID for a plan key
 * Price IDs are stored in environment variables
 * 
 * @param {string} planKey - 'solo_groups' or 'pro'
 * @returns {string|null} Stripe Price ID
 */
function getPriceIdForPlan(planKey) {
    const priceMap = {
        'solo_groups': process.env.STRIPE_PRICE_SOLO_GROUPS,
        'pro': process.env.STRIPE_PRICE_PRO
    };

    return priceMap[planKey] || null;
}

/**
 * Get plan key from Stripe Price ID
 * 
 * @param {string} priceId - Stripe Price ID
 * @returns {string|null} Plan key
 */
function getPlanKeyFromPriceId(priceId) {
    const priceMap = {
        [process.env.STRIPE_PRICE_SOLO_GROUPS]: 'solo_groups',
        [process.env.STRIPE_PRICE_PRO]: 'pro'
    };

    return priceMap[priceId] || null;
}

/**
 * Get max groups allowed for a plan
 * 
 * @param {string} planKey - Plan key
 * @returns {number} Max groups (Infinity for unlimited)
 */
function getMaxGroupsForPlan(planKey) {
    const limits = {
        'trial': Infinity,
        'solo_groups': 1,
        'pro': Infinity
    };

    return limits[planKey] || 0;
}

/**
 * Check if a billing status is considered active
 * 
 * @param {string} status - Billing status
 * @returns {boolean} True if active
 */
function isActiveBillingStatus(status) {
    return ['trialing', 'active'].includes(status);
}

module.exports = {
    getPriceIdForPlan,
    getPlanKeyFromPriceId,
    getMaxGroupsForPlan,
    isActiveBillingStatus
};
