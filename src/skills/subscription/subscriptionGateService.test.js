/**
 * Subscription Gate Service - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    checkFeatureAccess,
    getUpsellMessage,
    getFeatureLimits,
    canCreateGroup,
    getFeaturesForPlan,
    isSubscriptionActive,
    validateAgencyProfile
} from './subscriptionGateService.js';

describe('subscriptionGateService', () => {
    describe('validateAgencyProfile', () => {
        it('returns error for null profile', () => {
            const result = validateAgencyProfile(null);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('agencyProfile is required');
        });

        it('validates valid profile', () => {
            const result = validateAgencyProfile({
                subscriptionStatus: 'active',
                planKey: 'pro'
            });
            expect(result.valid).toBe(true);
        });

        it('rejects invalid subscription status', () => {
            const result = validateAgencyProfile({
                subscriptionStatus: 'invalid_status',
                planKey: 'pro'
            });
            expect(result.valid).toBe(false);
        });

        it('rejects invalid plan key', () => {
            const result = validateAgencyProfile({
                subscriptionStatus: 'active',
                planKey: 'mega_ultra_plan'
            });
            expect(result.valid).toBe(false);
        });
    });

    describe('checkFeatureAccess', () => {
        it('allows basic features for trial', () => {
            const result = checkFeatureAccess(
                { subscriptionStatus: 'trialing', planKey: 'trial' },
                'basic_dashboard'
            );
            expect(result.allowed).toBe(true);
        });

        it('allows multi_group for pro plan', () => {
            const result = checkFeatureAccess(
                { subscriptionStatus: 'active', planKey: 'pro' },
                'multi_group'
            );
            expect(result.allowed).toBe(true);
        });

        it('denies multi_group for solo_groups plan', () => {
            const result = checkFeatureAccess(
                { subscriptionStatus: 'active', planKey: 'solo_groups' },
                'multi_group'
            );
            expect(result.allowed).toBe(false);
            expect(result.upsellMessage).toBeDefined();
            expect(result.upsellMessage.en).toContain('Pro');
            expect(result.upsellMessage.es).toContain('Pro');
        });

        it('denies access for canceled subscription', () => {
            const result = checkFeatureAccess(
                { subscriptionStatus: 'canceled', planKey: 'pro' },
                'basic_dashboard'
            );
            expect(result.allowed).toBe(false);
            expect(result.blocked).toBe(true);
            expect(result.reason).toBe('canceled');
        });

        it('denies access for past_due subscription', () => {
            const result = checkFeatureAccess(
                { subscriptionStatus: 'past_due', planKey: 'pro' },
                'multi_group'
            );
            expect(result.allowed).toBe(false);
            expect(result.blocked).toBe(true);
        });

        it('allows enterprise features only for enterprise', () => {
            const proResult = checkFeatureAccess(
                { subscriptionStatus: 'active', planKey: 'pro' },
                'api_access'
            );
            expect(proResult.allowed).toBe(false);

            const enterpriseResult = checkFeatureAccess(
                { subscriptionStatus: 'active', planKey: 'enterprise' },
                'api_access'
            );
            expect(enterpriseResult.allowed).toBe(true);
        });

        it('falls back to billing object if top-level fields missing', () => {
            const result = checkFeatureAccess(
                { billing: { status: 'active', planKey: 'pro' } },
                'multi_group'
            );
            expect(result.allowed).toBe(true);
        });
    });

    describe('getUpsellMessage', () => {
        it('returns English message by default', () => {
            const message = getUpsellMessage('multi_group');
            expect(message).toContain('Pro');
        });

        it('returns Spanish message when requested', () => {
            const message = getUpsellMessage('multi_group', 'es');
            expect(message).toContain('Pro');
            expect(message).toContain('Actualiza');
        });

        it('returns default message for unknown feature', () => {
            const message = getUpsellMessage('unknown_feature', 'en');
            expect(message).toContain('Upgrade');
        });
    });

    describe('getFeatureLimits', () => {
        it('returns trial limits', () => {
            const limits = getFeatureLimits('trial');
            expect(limits.maxGroups).toBe(1);
            expect(limits.maxTravelers).toBe(50);
            expect(limits.maxEmailsPerMonth).toBe(100);
        });

        it('returns solo_groups limits', () => {
            const limits = getFeatureLimits('solo_groups');
            expect(limits.maxGroups).toBe(1);
            expect(limits.maxTravelers).toBe(120);
            expect(limits.maxEmailsPerMonth).toBe(1500);
        });

        it('returns pro unlimited groups', () => {
            const limits = getFeatureLimits('pro');
            expect(limits.maxGroups).toBe(Infinity);
            expect(limits.maxTravelers).toBe(500);
        });

        it('returns enterprise unlimited everything', () => {
            const limits = getFeatureLimits('enterprise');
            expect(limits.maxGroups).toBe(Infinity);
            expect(limits.maxTravelers).toBe(Infinity);
            expect(limits.maxEmailsPerMonth).toBe(Infinity);
        });

        it('falls back to trial for unknown plan', () => {
            const limits = getFeatureLimits('unknown_plan');
            expect(limits.maxGroups).toBe(1);
        });
    });

    describe('canCreateGroup', () => {
        it('allows first group for solo_groups', () => {
            const result = canCreateGroup(
                { subscriptionStatus: 'active', planKey: 'solo_groups' },
                0
            );
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(1);
        });

        it('denies second group for solo_groups', () => {
            const result = canCreateGroup(
                { subscriptionStatus: 'active', planKey: 'solo_groups' },
                1
            );
            expect(result.allowed).toBe(false);
            expect(result.upsellMessage).toBeDefined();
        });

        it('allows unlimited groups for pro', () => {
            const result = canCreateGroup(
                { subscriptionStatus: 'active', planKey: 'pro' },
                99
            );
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(Infinity);
        });
    });

    describe('getFeaturesForPlan', () => {
        it('returns limited features for trial', () => {
            const features = getFeaturesForPlan('trial');
            expect(features).toContain('basic_dashboard');
            expect(features).toContain('single_group');
            expect(features).not.toContain('multi_group');
            expect(features).not.toContain('api_access');
        });

        it('returns more features for pro', () => {
            const features = getFeaturesForPlan('pro');
            expect(features).toContain('multi_group');
            expect(features).toContain('bulk_import');
            expect(features).toContain('analytics_advanced');
            expect(features).not.toContain('api_access');
        });

        it('returns all features for enterprise', () => {
            const features = getFeaturesForPlan('enterprise');
            expect(features).toContain('api_access');
            expect(features).toContain('custom_domain');
            expect(features).toContain('ocr_parsing');
        });
    });

    describe('isSubscriptionActive', () => {
        it('returns true for trialing', () => {
            expect(isSubscriptionActive({ subscriptionStatus: 'trialing' })).toBe(true);
        });

        it('returns true for active', () => {
            expect(isSubscriptionActive({ subscriptionStatus: 'active' })).toBe(true);
        });

        it('returns false for canceled', () => {
            expect(isSubscriptionActive({ subscriptionStatus: 'canceled' })).toBe(false);
        });

        it('returns false for past_due', () => {
            expect(isSubscriptionActive({ subscriptionStatus: 'past_due' })).toBe(false);
        });

        it('falls back to billing.status', () => {
            expect(isSubscriptionActive({ billing: { status: 'active' } })).toBe(true);
        });
    });
});
