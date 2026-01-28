import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '../../services/billingService';
import './PlanSelector.css';

export default function PlanSelector() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState('');

    const plans = [
        {
            key: 'solo_groups',
            name: 'Solo Groups',
            price: 39,
            description: 'Perfect for agencies managing one group at a time',
            features: [
                '1 active group at a time',
                'Unlimited travelers per group',
                'Payment tracking & reminders',
                'Email notifications',
                'Document management',
                'PDF import with AI'
            ]
        },
        {
            key: 'pro',
            name: 'Pro',
            price: 79,
            recommended: true,
            description: 'For agencies managing multiple groups simultaneously',
            features: [
                'Unlimited active groups',
                'Unlimited travelers',
                'Payment tracking & reminders',
                'Email notifications',
                'Document management',
                'PDF import with AI',
                'Priority support'
            ]
        }
    ];

    const handleSubscribe = async (planKey) => {
        try {
            setLoading(planKey);
            setError('');

            const { checkoutUrl } = await createCheckoutSession(planKey, 'en');

            // Redirect to Stripe Checkout
            window.location.href = checkoutUrl;
        } catch (err) {
            console.error('Checkout error:', err);
            setError('Failed to start checkout. Please try again.');
            setLoading(null);
        }
    };

    return (
        <div className="plan-selector-container">
            <div className="plan-selector-header">
                <h1>Choose Your Plan</h1>
                <p className="header-subtitle">
                    Select the plan that best fits your agency's needs
                </p>
                <div className="trial-info">
                    <span className="trial-badge">14-Day Free Trial</span>
                    <span className="trial-text">No credit card required to start</span>
                </div>
            </div>

            <div className="plans-grid">
                {plans.map((plan) => (
                    <div
                        key={plan.key}
                        className={`plan-card ${plan.recommended ? 'recommended' : ''}`}
                    >
                        {plan.recommended && (
                            <div className="recommended-badge">
                                <span>⭐</span> Recommended
                            </div>
                        )}

                        <div className="plan-header">
                            <h2 className="plan-name">{plan.name}</h2>
                            <p className="plan-description">{plan.description}</p>
                        </div>

                        <div className="plan-price">
                            <span className="currency">CAD</span>
                            <span className="amount">${plan.price}</span>
                            <span className="period">/month</span>
                        </div>

                        <ul className="plan-features">
                            {plan.features.map((feature, index) => (
                                <li key={index}>
                                    <span className="checkmark">✓</span>
                                    <span className="feature-text">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSubscribe(plan.key)}
                            className={`btn-subscribe ${plan.recommended ? 'btn-recommended' : ''}`}
                            disabled={loading === plan.key}
                        >
                            {loading === plan.key ? (
                                <>
                                    <span className="spinner"></span>
                                    Loading...
                                </>
                            ) : (
                                'Subscribe Now'
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {error && (
                <div className="error-alert">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            <div className="plan-selector-footer">
                <p>All plans include a 14-day free trial. Cancel anytime.</p>
                <button onClick={() => navigate('/billing')} className="btn-back">
                    ← Back to Billing
                </button>
            </div>
        </div>
    );
}
