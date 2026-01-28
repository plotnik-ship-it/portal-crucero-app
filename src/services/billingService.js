/**
 * Billing Service
 * 
 * Provides functions for interacting with Stripe billing via Cloud Functions.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

/**
 * Create Stripe Checkout session
 * 
 * @param {string} planKey - 'solo_groups' or 'pro'
 * @param {string} locale - 'en' or 'es' (default: 'en')
 * @returns {Promise<{checkoutUrl: string, sessionId: string}>}
 */
export const createCheckoutSession = async (planKey, locale = 'en') => {
    try {
        const createSession = httpsCallable(functions, 'createCheckoutSession');
        const result = await createSession({ planKey, locale });
        return result.data;
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
};

/**
 * Create Stripe Customer Portal session
 * 
 * @returns {Promise<{portalUrl: string}>}
 */
export const createCustomerPortalSession = async () => {
    try {
        const createPortal = httpsCallable(functions, 'createCustomerPortalSession');
        const result = await createPortal();
        return result.data;
    } catch (error) {
        console.error('Error creating portal session:', error);
        throw error;
    }
};

/**
 * Get max groups allowed for a plan
 * 
 * @param {string} planKey - Plan key
 * @returns {number} Max groups (Infinity for unlimited)
 */
export const getMaxGroupsForPlan = (planKey) => {
    const limits = {
        'trial': Infinity,
        'solo_groups': 1,
        'pro': Infinity
    };
    return limits[planKey] || 0;
};

/**
 * Check if agency can create a new group
 * 
 * @param {object} agency - Agency object from Firestore
 * @returns {boolean} True if can create group
 */
export const canCreateGroup = (agency) => {
    const { billing, activeGroupsCount = 0 } = agency;

    // Check billing status
    if (!billing || !['trialing', 'active'].includes(billing.status)) {
        return false;
    }

    // Check group limit
    const maxGroups = getMaxGroupsForPlan(billing.planKey || 'trial');
    return activeGroupsCount < maxGroups;
};

/**
 * Get plan display name
 * 
 * @param {string} planKey - Plan key
 * @returns {string} Display name
 */
export const getPlanName = (planKey) => {
    const names = {
        'trial': 'Trial',
        'solo_groups': 'Solo Groups',
        'pro': 'Pro'
    };
    return names[planKey] || planKey;
};

/**
 * Get plan price in CAD
 * 
 * @param {string} planKey - Plan key
 * @returns {number} Price in CAD
 */
export const getPlanPrice = (planKey) => {
    const prices = {
        'trial': 0,
        'solo_groups': 39,
        'pro': 79
    };
    return prices[planKey] || 0;
};
