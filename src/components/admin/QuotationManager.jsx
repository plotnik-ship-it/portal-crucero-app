import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import { getQuotationsByAgency, updateQuotationStatus, deleteQuotation } from '../../services/quotationService';
import { downloadQuotationPDF } from '../../utils/quotationPdfGenerator';
import { formatTimestamp } from '../../utils/formatters';
import { formatCurrencyWithLabel } from '../../services/currencyService';
import QuotationBuilder from './QuotationBuilder';

const QuotationManager = ({ agencyId }) => {
    const { t, i18n } = useTranslation();
    const [quotations, setQuotations] = useState([]);
    const [filteredQuotations, setFilteredQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showBuilder, setShowBuilder] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => {
        loadQuotations();
    }, [agencyId]);

    useEffect(() => {
        applyFilters();
    }, [quotations, searchTerm, statusFilter, sortBy, sortOrder]);

    const loadQuotations = async () => {
        try {
            setLoading(true);
            const data = await getQuotationsByAgency(agencyId);
            setQuotations(data);
        } catch (err) {
            console.error('Error loading quotations:', err);
            setError('Error al cargar las cotizaciones');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...quotations];

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(quot =>
                quot.quotationNumber.toLowerCase().includes(term) ||
                quot.clientInfo.name.toLowerCase().includes(term) ||
                quot.clientInfo.email.toLowerCase().includes(term) ||
                quot.cruiseInfo.shipName.toLowerCase().includes(term)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(quot => quot.status === statusFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal, bVal;

            switch (sortBy) {
                case 'quotationNumber':
                    aVal = a.quotationNumber;
                    bVal = b.quotationNumber;
                    break;
                case 'total':
                    aVal = a.total;
                    bVal = b.total;
                    break;
                case 'clientName':
                    aVal = a.clientInfo.name;
                    bVal = b.clientInfo.name;
                    break;
                case 'expiresAt':
                    aVal = a.expiresAt?.getTime() || 0;
                    bVal = b.expiresAt?.getTime() || 0;
                    break;
                case 'createdAt':
                default:
                    aVal = a.createdAt?.getTime() || 0;
                    bVal = b.createdAt?.getTime() || 0;
                    break;
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        setFilteredQuotations(filtered);
    };

    const handleDownload = (quotation) => {
        try {
            const agencyBranding = {
                name: 'Travel Point',
                email: 'info@travelpoint.com',
                phone: '+1 (555) 123-4567',
                primaryColor: [41, 128, 185],
                secondaryColor: [52, 73, 94]
            };
            downloadQuotationPDF(quotation, agencyBranding, i18n.language);
        } catch (err) {
            console.error('Error downloading quotation:', err);
            alert('Error al descargar la cotización');
        }
    };

    const handleStatusChange = async (quotationId, newStatus) => {
        try {
            await updateQuotationStatus(quotationId, newStatus);
            await loadQuotations();
            alert(`Estado actualizado a: ${newStatus}`);
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Error al actualizar el estado');
        }
    };

    const handleDelete = async (quotationId, quotationNumber) => {
        if (!window.confirm(`¿Eliminar cotización ${quotationNumber}?`)) {
            return;
        }

        try {
            await deleteQuotation(quotationId);
            await loadQuotations();
            alert('Cotización eliminada');
        } catch (err) {
            console.error('Error deleting quotation:', err);
            alert('Error al eliminar la cotización');
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            draft: 'warning',
            sent: 'info',
            approved: 'success',
            rejected: 'error',
            converted: 'success'
        };
        return (
            <Badge variant={statusMap[status] || 'default'}>
                {t(`quotation.statuses.${status}`)}
            </Badge>
        );
    };

    const isExpired = (expiresAt) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    if (loading) {
        return (
            <Card>
                <div className="card-header">
                    <h3 className="card-title">📝 {t('quotation.title')}</h3>
                </div>
                <div className="card-body">
                    <p className="text-center text-muted">{t('common.loading')}</p>
                </div>
            </Card>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header Card */}
            <Card>
                <div className="card-header">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>📝 {t('quotation.title')}</h3>
                            <span className="badge badge-info">
                                {filteredQuotations.length} {filteredQuotations.length === 1 ? 'cotización' : 'cotizaciones'}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowBuilder(true)}
                            className="btn btn-success"
                            style={{ marginLeft: '1rem' }}
                        >
                            + {t('quotation.newQuotation')}
                        </button>
                    </div>
                </div>

                <div className="card-body">
                    {error && (
                        <div className="alert alert-error mb-md">
                            {error}
                        </div>
                    )}

                    {/* Filters */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {/* Search */}
                        <div className="form-group">
                            <label className="form-label">{t('common.search')}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('quotation.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="form-group">
                            <label className="form-label">{t('quotation.status')}</label>
                            <select
                                className="form-input"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">{t('quotation.allStatuses')}</option>
                                <option value="draft">{t('quotation.statuses.draft')}</option>
                                <option value="sent">{t('quotation.statuses.sent')}</option>
                                <option value="approved">{t('quotation.statuses.approved')}</option>
                                <option value="rejected">{t('quotation.statuses.rejected')}</option>
                                <option value="converted">{t('quotation.statuses.converted')}</option>
                            </select>
                        </div>

                        {/* Sort By */}
                        <div className="form-group">
                            <label className="form-label">{t('quotation.sortBy')}</label>
                            <select
                                className="form-input"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="createdAt">{t('quotation.createdAt')}</option>
                                <option value="quotationNumber">{t('quotation.quotationNumber')}</option>
                                <option value="clientName">{t('quotation.clientName')}</option>
                                <option value="total">{t('quotation.amount')}</option>
                                <option value="expiresAt">{t('quotation.expiresAt')}</option>
                            </select>
                        </div>

                        {/* Sort Order */}
                        <div className="form-group">
                            <label className="form-label">{t('quotation.order')}</label>
                            <select
                                className="form-input"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="desc">⬇️ {t('quotation.descending')}</option>
                                <option value="asc">⬆️ {t('quotation.ascending')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Results */}
                    {filteredQuotations.length === 0 ? (
                        <div className="text-center">
                            <p className="text-muted">
                                {searchTerm || statusFilter !== 'all'
                                    ? t('quotation.noQuotationsFound')
                                    : t('quotation.noQuotationsYet')}
                            </p>
                            {!searchTerm && statusFilter === 'all' && (
                                <button
                                    onClick={() => setShowBuilder(true)}
                                    className="btn btn-primary mt-md"
                                >
                                    + {t('quotation.createFirstQuotation')}
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="mobile-only">
                                {filteredQuotations.map((quotation) => (
                                    <div key={quotation.id} className="card mb-sm" style={{ padding: '1rem', opacity: isExpired(quotation.expiresAt) ? 0.6 : 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                            <div>
                                                <div className="font-semibold" style={{ fontSize: '1.1rem' }}>
                                                    {quotation.quotationNumber}
                                                    {isExpired(quotation.expiresAt) && (
                                                        <span className="badge badge-error ml-xs text-xs">{t('quotation.expired')}</span>
                                                    )}
                                                </div>
                                                <div className="text-small text-muted">
                                                    {quotation.clientInfo.name}
                                                </div>
                                            </div>
                                            <div>
                                                {getStatusBadge(quotation.status)}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="text-muted">{t('quotation.cruise')}:</span>
                                                <span className="font-semibold">{quotation.cruiseInfo.shipName}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="text-muted">{t('quotation.departure')}:</span>
                                                <span>{formatTimestamp(quotation.cruiseInfo.sailDate)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="text-muted">{t('quotation.expires')}:</span>
                                                <span>{formatTimestamp(quotation.expiresAt)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="text-muted">{t('common.total')}:</span>
                                                <span className="font-semibold">{formatCurrencyWithLabel(quotation.total, quotation.currency)}</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleDownload(quotation)}
                                                className="btn btn-xs btn-outline"
                                                title="Descargar PDF"
                                            >
                                                📥 PDF
                                            </button>
                                            {quotation.status === 'draft' && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusChange(quotation.id, 'sent')}
                                                        className="btn btn-xs btn-info"
                                                        title="Marcar como enviada"
                                                    >
                                                        📧
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(quotation.id, quotation.quotationNumber)}
                                                        className="btn btn-xs btn-danger"
                                                        title="Eliminar"
                                                    >
                                                        🗑️
                                                    </button>
                                                </>
                                            )}
                                            {quotation.status === 'sent' && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusChange(quotation.id, 'approved')}
                                                        className="btn btn-xs btn-success"
                                                        title="Aprobar"
                                                    >
                                                        ✅
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(quotation.id, 'rejected')}
                                                        className="btn btn-xs btn-error"
                                                        title="Rechazar"
                                                    >
                                                        ❌
                                                    </button>
                                                </>
                                            )}
                                            {quotation.status === 'approved' && (
                                                <button
                                                    onClick={() => handleStatusChange(quotation.id, 'converted')}
                                                    className="btn btn-xs btn-success"
                                                    title="Marcar como convertida"
                                                >
                                                    🎉
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="table-container desktop-only">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>{t('quotation.quotationNumber')}</th>
                                            <th>{t('quotation.clientName')}</th>
                                            <th>{t('quotation.cruise')}</th>
                                            <th>{t('quotation.departure')}</th>
                                            <th>{t('quotation.expires')}</th>
                                            <th>{t('common.total')}</th>
                                            <th>{t('quotation.status')}</th>
                                            <th>{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredQuotations.map((quotation) => (
                                            <tr key={quotation.id} style={{ opacity: isExpired(quotation.expiresAt) ? 0.6 : 1 }}>
                                                <td className="font-semibold">
                                                    {quotation.quotationNumber}
                                                    {isExpired(quotation.expiresAt) && (
                                                        <span className="badge badge-error ml-xs text-xs">{t('quotation.expired')}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="text-sm">{quotation.clientInfo.name}</div>
                                                    <div className="text-xs text-muted">{quotation.clientInfo.email}</div>
                                                </td>
                                                <td>
                                                    <div className="text-sm font-semibold">{quotation.cruiseInfo.shipName}</div>
                                                    <div className="text-xs text-muted">{quotation.cruiseInfo.cruiseLine}</div>
                                                </td>
                                                <td className="text-small">
                                                    {formatTimestamp(quotation.cruiseInfo.sailDate)}
                                                </td>
                                                <td className="text-small">
                                                    {formatTimestamp(quotation.expiresAt)}
                                                </td>
                                                <td className="font-semibold">
                                                    {formatCurrencyWithLabel(quotation.total, quotation.currency)}
                                                </td>
                                                <td>
                                                    {getStatusBadge(quotation.status)}
                                                </td>
                                                <td>
                                                    <div className="flex gap-xs">
                                                        <button
                                                            onClick={() => handleDownload(quotation)}
                                                            className="btn btn-xs btn-outline"
                                                            title="Descargar PDF"
                                                        >
                                                            📥
                                                        </button>
                                                        {quotation.status === 'draft' && (
                                                            <button
                                                                onClick={() => handleStatusChange(quotation.id, 'sent')}
                                                                className="btn btn-xs btn-info"
                                                                title="Marcar como enviada"
                                                            >
                                                                📧
                                                            </button>
                                                        )}
                                                        {quotation.status === 'sent' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleStatusChange(quotation.id, 'approved')}
                                                                    className="btn btn-xs btn-success"
                                                                    title="Aprobar"
                                                                >
                                                                    ✅
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusChange(quotation.id, 'rejected')}
                                                                    className="btn btn-xs btn-error"
                                                                    title="Rechazar"
                                                                >
                                                                    ❌
                                                                </button>
                                                            </>
                                                        )}
                                                        {quotation.status === 'approved' && (
                                                            <button
                                                                onClick={() => handleStatusChange(quotation.id, 'converted')}
                                                                className="btn btn-xs btn-success"
                                                                title="Marcar como convertida"
                                                            >
                                                                🎉
                                                            </button>
                                                        )}
                                                        {quotation.status === 'draft' && (
                                                            <button
                                                                onClick={() => handleDelete(quotation.id, quotation.quotationNumber)}
                                                                className="btn btn-xs btn-danger"
                                                                title="Eliminar"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </Card>

            {/* Stats Card */}
            <Card>
                <div className="card-header">
                    <h3 className="card-title">📊 {t('quotation.statistics')}</h3>
                </div>
                <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        <div className="stat-box">
                            <div className="stat-label">{t('quotation.totalQuotations')}</div>
                            <div className="stat-value">{quotations.length}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">{t('quotation.drafts')}</div>
                            <div className="stat-value text-warning">
                                {quotations.filter(q => q.status === 'draft').length}
                            </div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">{t('quotation.sent')}</div>
                            <div className="stat-value text-info">
                                {quotations.filter(q => q.status === 'sent').length}
                            </div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">{t('quotation.approved')}</div>
                            <div className="stat-value text-success">
                                {quotations.filter(q => q.status === 'approved').length}
                            </div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">{t('quotation.converted')}</div>
                            <div className="stat-value text-success">
                                {quotations.filter(q => q.status === 'converted').length}
                            </div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">{t('quotation.totalValue')}</div>
                            <div className="stat-value">
                                {formatCurrencyWithLabel(
                                    quotations.reduce((sum, q) => sum + q.total, 0),
                                    'CAD'
                                )}
                            </div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">{t('quotation.conversionRate')}</div>
                            <div className="stat-value">
                                {quotations.length > 0
                                    ? ((quotations.filter(q => q.status === 'converted').length / quotations.length) * 100).toFixed(1)
                                    : 0}%
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Quotation Builder Modal */}
            {showBuilder && (
                <QuotationBuilder
                    agencyId={agencyId}
                    onClose={() => setShowBuilder(false)}
                    onSuccess={() => {
                        setShowBuilder(false);
                        loadQuotations();
                    }}
                />
            )}
        </div>
    );
};

export default QuotationManager;
