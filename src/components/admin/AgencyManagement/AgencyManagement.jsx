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
import { useAuth } from '../../../hooks/useAuth';
import TeamManagement from '../TeamManagement';
import AgencySettings from '../AgencySettings/AgencySettings';
import SettingsTab from './tabs/SettingsTab';
import './AgencyManagement.css';

const TABS = {
    TEAM: 'team',
    BRANDING: 'branding',
    SETTINGS: 'settings'
};

const AgencyManagement = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(TABS.TEAM);

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
