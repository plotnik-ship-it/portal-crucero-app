import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgency } from '../../contexts/AgencyContext';
import { createCustomerPortalSession, getPlanName } from '../../services/billingService';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import './BillingDashboard.css';

export default function BillingDashboard() {
    const { agency } = useAgency();
    const navigate = useNavigate();
    const { planKey, status, getDaysUntilTrialEnd } = useFeatureAccess();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const billing = agency?.billing || {};
    const { currentPeriodEnd, trialEnd, cancelAtPeriodEnd } = billing;

    const handleManageSubscription = async () => {
        try {
            setLoading(true);
            setError('');
            const { portalUrl } = await createCustomerPortalSession();
            window.location.href = portalUrl;
        } catch (err) {
            console.error('Portal error:', err);
            setError('Failed to open billing portal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = () => {
        navigate('/billing/plans');
    };

    const getStatusBadge = (status) => {
        const badges = {
            'trialing': { text: 'Trial', className: 'status-trial' },
            'active': { text: 'Active', className: 'status-active' },
            'past_due': { text: 'Past Due', className: 'status-past-due' },
            'canceled': { text: 'Canceled', className: 'status-canceled' },
            'incomplete': { text: 'Incomplete', className: 'status-incomplete' }
        };
        return badges[status] || { text: status, className: '' };
    };

    const statusBadge = getStatusBadge(status);
    const daysLeft = getDaysUntilTrialEnd();

    return (
        <div className="billing-dashboard">
            <div className="billing-header">
                <h1>Billing & Subscription</h1>
            </div>

            {/* Trial Warning */}
            {status === 'trialing' && daysLeft !== null && daysLeft <= 7 && (
                <div className="trial-warning-banner">
                    <div className="warning-icon">⏰</div>
                    <div className="warning-content">
                        <h3>Your trial ends in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}</h3>
                        <p>Subscribe now to continue using TravelPoint without interruption</p>
                    </div>
                    <button onClick={handleUpgrade} className="btn-warning-action">
                        Choose a Plan
                    </button>
                </div>
            )}

            {/* Past Due Alert */}
            {status === 'past_due' && (
                <div className="alert alert-danger">
                    <strong>⚠️ Payment Failed</strong>
                    <p>Your last payment failed. Please update your payment method to continue using TravelPoint.</p>
                    <button onClick={handleManageSubscription} className="btn-alert-action">
                        Update Payment Method
                    </button>
                </div>
            )}

            {/* Canceled Alert */}
            {status === 'canceled' && (
                <div className="alert alert-warning">
                    <strong>Subscription Canceled</strong>
                    <p>Your subscription has been canceled. Subscribe to a plan to continue using TravelPoint.</p>
                    <button onClick={handleUpgrade} className="btn-alert-action">
                        View Plans
                    </button>
                </div>
            )}

            {/* Current Plan Card */}
            <div className="billing-card current-plan-card">
                <h2>Current Plan</h2>
                <div className="plan-info">
                    <div className="plan-name-section">
                        <span className="plan-name">{getPlanName(planKey)}</span>
                        <span className={`status-badge ${statusBadge.className}`}>
                            {statusBadge.text}
                        </span>
                    </div>
                </div>

                {status === 'trialing' && trialEnd && (
                    <div className="billing-info-section">
                        <p className="billing-info-label">Trial Period</p>
                        <p className="billing-info-value">
                            Ends {new Date(trialEnd.toDate()).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                )}

                {status === 'active' && currentPeriodEnd && (
                    <div className="billing-info-section">
                        <p className="billing-info-label">
                            {cancelAtPeriodEnd ? 'Subscription Ends' : 'Next Billing Date'}
                        </p>
                        <p className="billing-info-value">
                            {new Date(currentPeriodEnd.toDate()).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                        {cancelAtPeriodEnd && (
                            <p className="billing-info-note">
                                Your subscription will not renew
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Usage Stats Card */}
            <div className="billing-card usage-card">
                <h2>Usage This Month</h2>
                <div className="usage-stats">
                    <div className="stat-item">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                            <span className="stat-label">Active Groups</span>
                            <span className="stat-value">
                                {agency?.activeGroupsCount || 0}
                                {planKey === 'solo_groups' && <span className="stat-limit"> / 1</span>}
                            </span>
                        </div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-icon">👥</div>
                        <div className="stat-content">
                            <span className="stat-label">Travelers</span>
                            <span className="stat-value">{agency?.activeTravelersCount || 0}</span>
                        </div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-icon">📧</div>
                        <div className="stat-content">
                            <span className="stat-label">Emails Sent</span>
                            <span className="stat-value">{agency?.emailsSentThisMonth || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Card */}
            <div className="billing-card actions-card">
                <h2>Manage Subscription</h2>
                <div className="billing-actions">
                    {planKey === 'trial' && (
                        <button onClick={handleUpgrade} className="btn-primary btn-large">
                            Choose a Plan
                        </button>
                    )}

                    {planKey !== 'trial' && (
                        <>
                            <button
                                onClick={handleManageSubscription}
                                className="btn-secondary btn-large"
                                disabled={loading}
                            >
                                {loading ? 'Loading...' : 'Manage Subscription'}
                            </button>
                            <p className="action-description">
                                Update payment method, view invoices, or cancel subscription
                            </p>
                        </>
                    )}

                    {planKey === 'solo_groups' && (
                        <button onClick={handleUpgrade} className="btn-primary btn-large">
                            Upgrade to Pro
                        </button>
                    )}
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
