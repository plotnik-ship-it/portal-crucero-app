import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToRequests, getRequestStats } from '../../services/requestService';
import RequestDetailsModal from './RequestDetailsModal';
import './AgencyRequests.css';

export default function AgencyRequests() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Subscribe to requests
    useEffect(() => {
        const unsubscribe = subscribeToRequests((data) => {
            setRequests(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filter and search
    useEffect(() => {
        let filtered = requests;

        // Apply status filter
        if (filter !== 'all') {
            filtered = filtered.filter(r => r.status === filter);
        }

        // Apply search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(r =>
                r.agencyName.toLowerCase().includes(term) ||
                r.contactEmail.toLowerCase().includes(term)
            );
        }

        setFilteredRequests(filtered);
    }, [requests, filter, searchTerm]);

    const stats = getRequestStats(requests);

    const handleViewDetails = (request) => {
        setSelectedRequest(request);
        setShowModal(true);
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { label: t('requests.status.pending', 'Pendiente'), className: 'status-pending' },
            approved: { label: t('requests.status.approved', 'Aprobado'), className: 'status-approved' },
            rejected: { label: t('requests.status.rejected', 'Rechazado'), className: 'status-rejected' }
        };
        const badge = badges[status] || badges.pending;
        return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="agency-requests-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>{t('requests.loading', 'Cargando solicitudes...')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="agency-requests-container">
            {/* Header */}
            <div className="requests-header">
                <div>
                    <button
                        onClick={() => navigate('/admin')}
                        className="btn btn-secondary"
                        style={{ marginBottom: '1rem' }}
                    >
                        ← {t('common.backToHome', 'Volver al Inicio')}
                    </button>
                    <h1>{t('requests.title', 'Solicitudes de Acceso Beta')}</h1>
                    <p className="subtitle">{t('requests.subtitle', 'Gestiona las solicitudes de nuevas agencias')}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon total">📋</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">{t('requests.stats.total', 'Total')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon pending">⏳</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.pending}</div>
                        <div className="stat-label">{t('requests.stats.pending', 'Pendientes')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon approved">✅</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.approved}</div>
                        <div className="stat-label">{t('requests.stats.approved', 'Aprobadas')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon rejected">❌</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.rejected}</div>
                        <div className="stat-label">{t('requests.stats.rejected', 'Rechazadas')}</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-group">
                    <label>{t('requests.filter.label', 'Filtrar por estado:')}</label>
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
                        <option value="all">{t('requests.filter.all', 'Todas')} ({stats.total})</option>
                        <option value="pending">{t('requests.filter.pending', 'Pendientes')} ({stats.pending})</option>
                        <option value="approved">{t('requests.filter.approved', 'Aprobadas')} ({stats.approved})</option>
                        <option value="rejected">{t('requests.filter.rejected', 'Rechazadas')} ({stats.rejected})</option>
                    </select>
                </div>

                <div className="search-group">
                    <input
                        type="text"
                        placeholder={t('requests.search.placeholder', 'Buscar por agencia o email...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            {/* Requests Table */}
            {filteredRequests.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>{t('requests.empty.title', 'No hay solicitudes')}</h3>
                    <p>
                        {searchTerm
                            ? t('requests.empty.noResults', 'No se encontraron resultados para tu búsqueda')
                            : filter !== 'all'
                                ? t('requests.empty.noStatus', `No hay solicitudes con estado "${filter}"`)
                                : t('requests.empty.none', 'Aún no hay solicitudes de acceso beta')}
                    </p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="requests-table">
                        <thead>
                            <tr>
                                <th>{t('requests.table.agency', 'Agencia')}</th>
                                <th>{t('requests.table.email', 'Email')}</th>
                                <th>{t('requests.table.type', 'Tipo')}</th>
                                <th>{t('requests.table.status', 'Estado')}</th>
                                <th>{t('requests.table.date', 'Fecha')}</th>
                                <th>{t('requests.table.actions', 'Acciones')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.map((request) => (
                                <tr key={request.id} onClick={() => handleViewDetails(request)} className="clickable-row">
                                    <td className="agency-cell">
                                        <div className="agency-name">{request.agencyName}</div>
                                    </td>
                                    <td className="email-cell">{request.contactEmail}</td>
                                    <td className="type-cell">
                                        <span className="type-badge">{request.groupType}</span>
                                    </td>
                                    <td className="status-cell">
                                        {getStatusBadge(request.status)}
                                    </td>
                                    <td className="date-cell">{formatDate(request.createdAt)}</td>
                                    <td className="actions-cell">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewDetails(request);
                                            }}
                                            className="btn-view"
                                        >
                                            {t('requests.table.viewDetails', 'Ver Detalles')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Details Modal */}
            {showModal && selectedRequest && (
                <RequestDetailsModal
                    request={selectedRequest}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedRequest(null);
                    }}
                    adminEmail={user?.email}
                />
            )}
        </div>
    );
}
