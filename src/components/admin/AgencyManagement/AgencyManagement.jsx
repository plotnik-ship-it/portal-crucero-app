/**
 * Agency Management Module
 * 
 * Unified back office for agency administrators.
 * Provides tabs for: Team Management, Branding, General Settings.
 * 
 * Security: Admin-only access, multi-tenant isolation via agencyId.
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAgency } from '../../../contexts/AgencyContext';
import TeamManagement from '../TeamManagement';
import AgencySettings from '../AgencySettings/AgencySettings';
import SettingsTab from './tabs/SettingsTab';
import './AgencyManagement.css';

// Plan names and colors
const PLAN_CONFIG = {
    trial: { name: 'Trial', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' },
    solo_groups: { name: 'Solo', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
    pro: { name: 'Pro', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
    enterprise: { name: 'Enterprise', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' }
};

const TABS = {
    TEAM: 'team',
    BRANDING: 'branding',
    SETTINGS: 'settings'
};

const AgencyManagement = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { agency } = useAgency();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(TABS.TEAM);

    // Plan info
    const planKey = agency?.planKey || 'trial';
    const currentPlan = PLAN_CONFIG[planKey] || PLAN_CONFIG.trial;

    // Feedback toast state
    const [toast, setToast] = useState(null);

    const showToast = useCallback((type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    // Guard: Must have agencyId
    if (!user?.agencyId) {
        return (
            <div className="agency-management">
                <div className="agency-management__error">
                    <div className="error-icon">⚠️</div>
                    <h2>{t('agency.noAccess', 'No Agency Access')}</h2>
                    <p>{t('agency.noAccessDesc', 'You must be associated with an agency to access this module.')}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/admin')}
                        style={{ marginTop: '1rem' }}
                    >
                        ← {t('common.backToHome', 'Back to Dashboard')}
                    </button>
                </div>
            </div>
        );
    }

    const tabConfig = [
        {
            id: TABS.TEAM,
            icon: '👥',
            label: t('agency.tabs.team', 'Team'),
            description: t('agency.tabs.teamDesc', 'Manage members and invitations')
        },
        {
            id: TABS.BRANDING,
            icon: '🎨',
            label: t('agency.tabs.branding', 'Branding'),
            description: t('agency.tabs.brandingDesc', 'Logo, colors, and appearance')
        },
        {
            id: TABS.SETTINGS,
            icon: '⚙️',
            label: t('agency.tabs.settings', 'Settings'),
            description: t('agency.tabs.settingsDesc', 'Contact info and preferences')
        }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case TABS.TEAM:
                return <TeamManagement onToast={showToast} />;
            case TABS.BRANDING:
                return <AgencySettings onToast={showToast} />;
            case TABS.SETTINGS:
                return <SettingsTab onToast={showToast} />;
            default:
                return null;
        }
    };

    return (
        <div className="agency-management">
            {/* Header */}
            <header className="agency-management__header">
                <div className="header-content">
                    <div className="header-top-row">
                        <button
                            className="back-button"
                            onClick={() => navigate('/admin')}
                            title={t('common.backToHome', 'Back to Dashboard')}
                        >
                            ← {t('admin.dashboard', 'Dashboard')}
                        </button>

                        {/* Plan Badge */}
                        <button
                            className="plan-badge"
                            onClick={() => navigate('/billing')}
                            title={t('plan.managePlan', 'Manage Plan')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: `1px solid ${currentPlan.color}50`,
                                background: currentPlan.bgColor,
                                color: currentPlan.color,
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            📦 {t('plan.yourPlan', 'Plan')}: {currentPlan.name}
                        </button>
                    </div>
                    <h1>{t('agency.title', 'Agency Management')}</h1>
                    <p className="header-subtitle">
                        {t('agency.subtitle', 'Configure your agency settings and team')}
                    </p>
                </div>
            </header>

            {/* Toast Notification */}
            {toast && (
                <div className={`toast toast--${toast.type}`}>
                    <span className="toast__icon">
                        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
                    </span>
                    <span className="toast__message">{toast.message}</span>
                    <button
                        className="toast__close"
                        onClick={() => setToast(null)}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Tab Navigation */}
            <nav className="agency-management__tabs">
                {tabConfig.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        aria-selected={activeTab === tab.id}
                    >
                        <span className="tab-button__icon">{tab.icon}</span>
                        <div className="tab-button__content">
                            <span className="tab-button__label">{tab.label}</span>
                            <span className="tab-button__description">{tab.description}</span>
                        </div>
                    </button>
                ))}
            </nav>

            {/* Tab Content */}
            <main className="agency-management__content">
                {renderTabContent()}
            </main>
        </div>
    );
};

export default AgencyManagement;
