import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAllAgencies, suspendAgency, reactivateAgency } from '../../services/agencyManagementService';
import SuspendModal from './SuspendModal';
import ReactivateModal from './ReactivateModal';
import './SuperAdminPanel.css';

/**
 * SuperAdminPanel - Manage all agencies (suspend/reactivate)
 */
export default function SuperAdminPanel() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAgency, setSelectedAgency] = useState(null);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [showReactivateModal, setShowReactivateModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadAgencies();
    }, []);

    const loadAgencies = async () => {
        try {
            setLoading(true);
            const data = await getAllAgencies();
            setAgencies(data);
        } catch (err) {
            console.error('Error loading agencies:', err);
            setError('Failed to load agencies');
        } finally {
            setLoading(false);
        }
    };

    const handleSuspend = (agency) => {
        setSelectedAgency(agency);
        setShowSuspendModal(true);
    };

    const handleReactivate = (agency) => {
        setSelectedAgency(agency);
        setShowReactivateModal(true);
    };

    const confirmSuspend = async (reason) => {
        try {
            await suspendAgency(selectedAgency.id, reason, user.uid || user.email);
            setSuccess(t('superadmin.suspendSuccess'));
            setShowSuspendModal(false);
            setSelectedAgency(null);
            loadAgencies();
        } catch (err) {
            console.error('Error suspending agency:', err);
            setError('Failed to suspend agency');
        }
    };

    const confirmReactivate = async () => {
        try {
            await reactivateAgency(selectedAgency.id, user.uid || user.email);
            setSuccess(t('superadmin.reactivateSuccess'));
            setShowReactivateModal(false);
            setSelectedAgency(null);
            loadAgencies();
        } catch (err) {
            console.error('Error reactivating agency:', err);
            setError('Failed to reactivate agency');
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'suspended') {
            return (
                <span className="status-badge status-suspended">
                    ⏸️ {t('superadmin.suspended')}
                </span>
            );
        }
        return (
            <span className="status-badge status-active">
                ✅ {t('superadmin.active')}
            </span>
        );
    };

    const getBetaBadge = (isBeta) => {
        if (isBeta) {
            return <span className="beta-badge">🧪 Beta</span>;
        }
        return <span className="beta-badge beta-no">Standard</span>;
    };

    if (loading) {
        return (
            <div className="superadmin-container">
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                    <p>{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="superadmin-container">
            {/* Header */}
            <div className="superadmin-header">
                <button
                    onClick={() => navigate('/admin')}
                    className="btn btn-secondary"
                    style={{ marginBottom: '1rem' }}
                >
                    ← {t('common.backToHome')}
                </button>
                <div>
                    <h1>👑 {t('superadmin.title')}</h1>
                    <p className="subtitle">{t('superadmin.subtitle')}</p>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                    ❌ {error}
                    <button onClick={() => setError('')} className="alert-close">×</button>
                </div>
            )}

            {success && (
                <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
                    ✅ {success}
                    <button onClick={() => setSuccess('')} className="alert-close">×</button>
                </div>
            )}

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-icon">🏢</div>
                    <div className="stat-content">
                        <div className="stat-value">{agencies.length}</div>
                        <div className="stat-label">{t('superadmin.allAgencies')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {agencies.filter(a => a.status !== 'suspended').length}
                        </div>
                        <div className="stat-label">{t('superadmin.active')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⏸️</div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {agencies.filter(a => a.status === 'suspended').length}
                        </div>
                        <div className="stat-label">{t('superadmin.suspended')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🧪</div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {agencies.filter(a => a.isBeta).length}
                        </div>
                        <div className="stat-label">Beta</div>
                    </div>
                </div>
            </div>

            {/* Agencies Table */}
            <div className="card">
                <div className="card-body">
                    <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                        {t('superadmin.allAgencies')}
                    </h2>

                    {agencies.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
                            <p>No agencies found</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="agencies-table">
                                <thead>
                                    <tr>
                                        <th>{t('superadmin.agencyName')}</th>
                                        <th>{t('superadmin.agencyId')}</th>
                                        <th>{t('superadmin.billingEmail')}</th>
                                        <th>{t('superadmin.betaStatus')}</th>
                                        <th>{t('superadmin.status')}</th>
                                        <th>{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agencies.map((agency) => (
                                        <tr key={agency.id}>
                                            <td className="agency-name-cell">
                                                <strong>{agency.name}</strong>
                                            </td>
                                            <td>
                                                <code className="agency-id">{agency.id}</code>
                                            </td>
                                            <td>{agency.billingEmail || '-'}</td>
                                            <td>{getBetaBadge(agency.isBeta)}</td>
                                            <td>{getStatusBadge(agency.status)}</td>
                                            <td className="actions-cell">
                                                {agency.status === 'suspended' ? (
                                                    <button
                                                        onClick={() => handleReactivate(agency)}
                                                        className="btn btn-success btn-sm"
                                                    >
                                                        ▶️ {t('superadmin.reactivate')}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSuspend(agency)}
                                                        className="btn btn-warning btn-sm"
                                                    >
                                                        ⏸️ {t('superadmin.suspend')}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showSuspendModal && selectedAgency && (
                <SuspendModal
                    agency={selectedAgency}
                    onConfirm={confirmSuspend}
                    onCancel={() => {
                        setShowSuspendModal(false);
                        setSelectedAgency(null);
                    }}
                />
            )}

            {showReactivateModal && selectedAgency && (
                <ReactivateModal
                    agency={selectedAgency}
                    onConfirm={confirmReactivate}
                    onCancel={() => {
                        setShowReactivateModal(false);
                        setSelectedAgency(null);
                    }}
                />
            )}
        </div>
    );
}
