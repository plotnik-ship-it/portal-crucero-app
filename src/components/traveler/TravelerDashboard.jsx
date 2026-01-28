/**
 * TravelerDashboard Component
 * 
 * Main dashboard for travelers to view their booking information (read-only)
 */

import { useTranslation } from 'react-i18next';
import { useTravelerSession } from '../../hooks/useTravelerSession';
import PaymentSummaryCard from './PaymentSummaryCard';
import DeadlineTimeline from './DeadlineTimeline';
import CabinInfoCard from './CabinInfoCard';
import './TravelerDashboard.css';

const TravelerDashboard = () => {
    const { t } = useTranslation();
    const { session, familyData, groupData, loading, error, logout } = useTravelerSession();

    if (loading) {
        return (
            <div className="traveler-dashboard">
                <div className="dashboard-loading">
                    <div className="spinner"></div>
                    <p>{t('traveler.loading')}</p>
                </div>
            </div>
        );
    }

    if (error || !session || !familyData || !groupData) {
        return (
            <div className="traveler-dashboard">
                <div className="dashboard-error">
                    <h2>{t('traveler.error.title')}</h2>
                    <p>{error || t('traveler.error.generic')}</p>
                    <button onClick={logout} className="btn btn-primary">
                        {t('traveler.backToLogin')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="traveler-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="header-info">
                        <h1>{t('traveler.dashboard.title')}</h1>
                        <p className="subtitle">{t('traveler.dashboard.subtitle')}</p>
                    </div>
                    <button onClick={logout} className="btn btn-outline">
                        {t('traveler.logout')}
                    </button>
                </div>
            </div>

            {/* Read-Only Notice */}
            <div className="info-box">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 6v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="10" cy="14" r="0.75" fill="currentColor" />
                </svg>
                <p>{t('traveler.info.readOnly')}</p>
            </div>

            {/* Group Information */}
            <div className="group-info-card">
                <div className="card-icon">🚢</div>
                <div className="card-content">
                    <h2>{groupData.name}</h2>
                    <div className="group-details">
                        <div className="detail-item">
                            <span className="label">{t('traveler.group.ship')}:</span>
                            <span className="value">{groupData.shipName}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">{t('traveler.group.sailDate')}:</span>
                            <span className="value">
                                {new Date(groupData.sailDate).toLocaleDateString(
                                    t('common.locale'),
                                    { year: 'numeric', month: 'long', day: 'numeric' }
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Family Information */}
            <div className="family-info-section">
                <h3>{t('traveler.family.title')}</h3>
                <p className="family-name">{familyData.displayName}</p>
            </div>

            {/* Dashboard Grid */}
            <div className="dashboard-grid">
                {/* Payment Summary */}
                <PaymentSummaryCard familyData={familyData} />

                {/* Cabin Information */}
                <CabinInfoCard familyData={familyData} />
            </div>

            {/* Payment Deadlines Timeline */}
            <DeadlineTimeline
                deadlines={groupData.paymentDeadlines || []}
                familyData={familyData}
            />
        </div>
    );
};

export default TravelerDashboard;
