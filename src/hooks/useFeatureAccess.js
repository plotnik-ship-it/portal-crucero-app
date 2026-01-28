/**
 * Feature Access Hook
 * 
 * Provides functions to check feature access based on billing status and plan.
 */

import { useAgency } from '../contexts/AgencyContext';
import { getMaxGroupsForPlan } from '../services/billingService';

export function useFeatureAccess() {
    const { agency } = useAgency();

    const billing = agency?.billing || {};
    const { planKey = 'trial', status } = billing;

    /**
     * Check if agency has active billing
     * @returns {boolean}
     */
    const hasActiveBilling = () => {
        return ['trialing', 'active'].includes(status);
    };

    /**
     * Check if agency can create a new group
     * @returns {boolean}
     */
    const canCreateGroup = () => {
        if (!hasActiveBilling()) return false;

        const maxGroups = getMaxGroupsForPlan(planKey);
        const currentGroups = agency?.activeGroupsCount || 0;

        return currentGroups < maxGroups;
    };

    /**
     * Get reason why group creation is blocked
     * @returns {string|null} Reason or null if not blocked
     */
    const getGroupCreationBlockReason = () => {
        if (!hasActiveBilling()) {
            if (status === 'past_due') {
                return 'Your payment is past due. Please update your payment method to continue.';
            }
            if (status === 'canceled') {
                return 'Your subscription has been canceled. Please subscribe to a plan to continue.';
            }
            return 'Your subscription is not active. Please update your billing.';
        }

        const maxGroups = getMaxGroupsForPlan(planKey);
        const currentGroups = agency?.activeGroupsCount || 0;

        if (currentGroups >= maxGroups) {
            return `You've reached the limit of ${maxGroups} active group(s) for your ${planKey.replace('_', ' ')} plan. Upgrade to Pro for unlimited groups.`;
        }

        return null;
    };

    /**
     * Check if billing requires attention
     * @returns {boolean}
     */
    const requiresBillingAttention = () => {
        return ['past_due', 'canceled', 'incomplete'].includes(status);
    };

    /**
     * Get days until trial ends
     * @returns {number|null} Days remaining or null if not on trial
     */
    const getDaysUntilTrialEnd = () => {
        if (status !== 'trialing' || !billing.trialEnd) return null;

        const trialEndDate = billing.trialEnd.toDate();
        const now = new Date();
        const diffTime = trialEndDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
    };

    return {
        hasActiveBilling,
        canCreateGroup,
        getGroupCreationBlockReason,
        requiresBillingAttention,
        getDaysUntilTrialEnd,
        planKey,
        status
    };
}
