import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import { getInvoicesByAgency, deleteInvoice } from '../../services/invoiceService';
import { downloadInvoicePDF } from '../../utils/pdfGenerator';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { formatTimestamp } from '../../utils/formatters';
import { formatCurrencyWithLabel } from '../../services/currencyService';
import { useAuth } from '../../hooks/useAuth';
import { generateRetroactiveInvoices } from '../../utils/retroactiveInvoices';
import { debugFirestoreStructure } from '../../utils/debugFirestore';
import { findActualAgencyId, debugAgencyIdProp } from '../../utils/findAgencyId';
import { hexToRgb } from '../../utils/colorUtils';

const AdminInvoiceManager = ({ agencyId }) => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generationResult, setGenerationResult] = useState(null);
    const [branding, setBranding] = useState(null);

    // Fetch agency branding
    useEffect(() => {
        const fetchBranding = async () => {
            if (!agencyId) return;
            try {
                // Determine the correct collection path based on how agencyId is stored
                // It's likely in 'agencies' collection
                const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));
                if (agencyDoc.exists()) {
                    const data = agencyDoc.data();
                    // Branding data is nested under 'branding' field
                    const brandingData = data.branding || data;
                    console.log('🏢 Agency branding data:', {
                        ...brandingData,
                        logoUrl: brandingData.logoUrl ? `${brandingData.logoUrl.substring(0, 50)}... (${brandingData.logoUrl.length} chars)` : 'undefined'
                    });
                    setBranding(brandingData);
                } else {
                    console.warn('Agency branding not found for:', agencyId);
                }
            } catch (err) {
                console.error('Error fetching branding:', err);
            }
        };

        fetchBranding();
    }, [agencyId]);

    // Debug: Log the agencyId being received
    useEffect(() => {
        console.log('🏢 AdminInvoiceManager received agencyId:', agencyId);
        debugAgencyIdProp(agencyId);
    }, [agencyId]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => {
        loadInvoices();
    }, [agencyId]);

    // Debug: Log the agencyId being received
    useEffect(() => {
        console.log('🏢 AdminInvoiceManager received agencyId:', agencyId);
        debugAgencyIdProp(agencyId);
    }, [agencyId]);

    useEffect(() => {
        applyFilters();
    }, [invoices, searchTerm, statusFilter, sortBy, sortOrder]);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const data = await getInvoicesByAgency(agencyId);
            setInvoices(data);
        } catch (err) {
            console.error('Error loading invoices:', err);
            setError('Error al cargar las facturas');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...invoices];

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(inv =>
                inv.invoiceNumber.toLowerCase().includes(term) ||
                inv.passengerInfo.name.toLowerCase().includes(term) ||
                inv.passengerInfo.familyCode.toLowerCase().includes(term) ||
                inv.passengerInfo.email.toLowerCase().includes(term)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(inv => inv.status === statusFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal, bVal;

            switch (sortBy) {
                case 'invoiceNumber':
                    aVal = a.invoiceNumber;
                    bVal = b.invoiceNumber;
                    break;
                case 'total':
                    aVal = a.total;
                    bVal = b.total;
                    break;
                case 'familyName':
                    aVal = a.passengerInfo.name;
                    bVal = b.passengerInfo.name;
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

        setFilteredInvoices(filtered);
    };

    const handleDownload = async (invoice) => {
        try {
            // Use fetched branding or fallback to invoice data or defaults
            const agencyBranding = {
                name: branding?.name || 'Travel Point',
                email: branding?.email || 'info@travelpoint.com',
                phone: branding?.phone || '+1 (555) 123-4567',
                primaryColor: branding?.primaryColor ?
                    (typeof branding.primaryColor === 'string' ? hexToRgb(branding.primaryColor) : branding.primaryColor) :
                    [41, 128, 185],
                secondaryColor: branding?.secondaryColor ?
                    (typeof branding.secondaryColor === 'string' ? hexToRgb(branding.secondaryColor) : branding.secondaryColor) :
                    [52, 73, 94],
                logoUrl: branding?.logoUrl
            };
            console.log('📋 Branding data for PDF:', agencyBranding);
            await downloadInvoicePDF(invoice, agencyBranding, i18n.language);
        } catch (err) {
            console.error('Error downloading invoice:', err);
            alert(t('invoice.downloadError', { defaultValue: 'Error downloading invoice' }));
        }
    };

    const handleDelete = async (invoice) => {
        const confirmMessage = t('invoice.deleteConfirm', {
            invoiceNumber: invoice.invoiceNumber,
            defaultValue: `Are you sure you want to delete invoice ${invoice.invoiceNumber}?\n\nThis action cannot be undone.`
        });
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            await deleteInvoice(invoice.id, true); // force = true for admin deletion
            alert(t('invoice.deleteSuccess', {
                invoiceNumber: invoice.invoiceNumber,
                defaultValue: `✅ Invoice ${invoice.invoiceNumber} deleted successfully`
            }));
            // Reload invoices
            await loadInvoices();
        } catch (err) {
            console.error('Error deleting invoice:', err);
            alert(t('invoice.deleteError', {
                error: err.message,
                defaultValue: `❌ Error deleting invoice: ${err.message}`
            }));
        }
    };

    const handleGenerateRetroactive = async () => {
        if (!window.confirm('¿Generar facturas para todos los pagos existentes que no tienen factura?\n\nEsto procesará TODAS las familias con pagos.\n\nEsto puede tomar unos momentos.')) {
            return;
        }

        try {
            setGenerating(true);
            setError('');
            setGenerationResult(null);

            // Import the simplified function dynamically
            const { generateInvoicesForAllFamilies } = await import('../../utils/generateInvoicesSimple');
            // Pass the current agencyId to ensure invoices are assigned to this agency
            const result = await generateInvoicesForAllFamilies(agencyId);
            setGenerationResult(result);

            // Reload invoices
            await loadInvoices();

            alert(`✅ Generación completada!\n\n` +
                `📄 Facturas generadas: ${result.totalInvoicesGenerated}\n` +
                `💰 Pagos procesados: ${result.totalPaymentsProcessed}\n` +
                `👥 Familias totales: ${result.totalFamilies}\n` +
                `💵 Familias con pagos: ${result.familiesWithPayments}\n` +
                (result.errors.length > 0 ? `\n⚠️ Errores: ${result.errors.length}` : '')
            );
        } catch (err) {
            console.error('Error generating retroactive invoices:', err);
            setError('Error al generar facturas retroactivas: ' + err.message);
            alert('❌ Error al generar facturas retroactivas. Revisa la consola para más detalles.');
        } finally {
            setGenerating(false);
        }
    };

    const handleDebugStructure = async () => {
        try {
            setGenerating(true);
            console.clear();
            console.log('Starting Firestore structure debug...');
            await debugFirestoreStructure(agencyId);
            alert('✅ Debug complete! Check the browser console (F12) for detailed output.');
        } catch (err) {
            console.error('Error debugging structure:', err);
            alert('❌ Error debugging structure. Check console for details.');
        } finally {
            setGenerating(false);
        }
    };

    const handleFindAgencyId = async () => {
        try {
            setGenerating(true);
            console.clear();
            console.log('Finding actual agency IDs in Firestore...');
            const agencyIds = await findActualAgencyId();
            alert(`✅ Found ${agencyIds.length} agency ID(s):\n\n${agencyIds.join('\n')}\n\nCheck console for details.`);
        } catch (err) {
            console.error('Error finding agency IDs:', err);
            alert('❌ Error finding agency IDs. Check console.');
        } finally {
            setGenerating(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            draft: 'warning',
            issued: 'success',
            sent: 'info',
            cancelled: 'error'
        };
        return (
            <Badge variant={statusMap[status] || 'default'}>
                {t(`invoice.statuses.${status}`)}
            </Badge>
        );
    };


    if (loading) {
        return (
            <>
                <style>{`
                /* Mobile-first responsive design */
                .mobile-only {
                    display: block !important;
                }
                .desktop-only {
                    display: none !important;
                }
                
                /* Desktop view (tablets and above) */
                @media (min-width: 768px) {
                    .mobile-only {
                        display: none !important;
                    }
                    .desktop-only {
                        display: block !important;
                    }
                }
                
                /* Improve button spacing on mobile */
                @media (max-width: 767px) {
                    .btn-sm {
                        padding: 0.5rem 0.75rem;
                        font-size: 1rem;
                    }
                }
            `}</style>

                <Card>
                    <div className="card-header">
                        <h3 className="card-title">📄 {t('invoice.title')}</h3>
                    </div>
                    <div className="card-body">
                        <p className="text-center text-muted">{t('common.loading')}</p>
                    </div>
                </Card>
            </>
        );
    }

    return (
        <>
            <style>{`
                /* Mobile-first responsive design */
                .mobile-only {
                    display: block !important;
                }
                .desktop-only {
                    display: none !important;
                }
                
                /* Desktop view (tablets and above) */
                @media (min-width: 768px) {
                    .mobile-only {
                        display: none !important;
                    }
                    .desktop-only {
                        display: block !important;
                    }
                }
                
                /* Improve button spacing on mobile */
                @media (max-width: 767px) {
                    .btn-sm {
                        padding: 0.5rem 0.75rem;
                        font-size: 1rem;
                    }
                }
            `}</style>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Header Card */}
                <Card>
                    <div className="card-header">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="card-title">📄 {t('invoice.title')}</h3>
                                <span className="badge badge-info mt-xs">
                                    {filteredInvoices.length} {filteredInvoices.length === 1 ? 'factura' : 'facturas'}
                                </span>
                            </div>
                            <div className="flex gap-sm">
                                <button
                                    onClick={handleFindAgencyId}
                                    className="btn btn-outline"
                                    disabled={generating}
                                    title="Buscar IDs de agencia reales"
                                >
                                    🏬 Find Agency ID
                                </button>
                                <button
                                    onClick={handleDebugStructure}
                                    className="btn btn-outline"
                                    disabled={generating}
                                    title="Inspeccionar estructura de Firestore"
                                >
                                    🔍 Debug
                                </button>
                                <button
                                    onClick={handleGenerateRetroactive}
                                    className="btn btn-success"
                                    disabled={generating}
                                >
                                    {generating ? '⏳ Generando...' : '✨ Generar Facturas Retroactivas'}
                                </button>
                            </div>
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
                                    placeholder={t('invoice.searchPlaceholder', { defaultValue: 'Invoice no., name, code...' })}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="form-group">
                                <label className="form-label">{t('invoice.status')}</label>
                                <select
                                    className="form-input"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">{t('invoice.allStatuses', { defaultValue: 'All statuses' })}</option>
                                    <option value="draft">{t('invoice.statuses.draft')}</option>
                                    <option value="issued">{t('invoice.statuses.issued')}</option>
                                    <option value="sent">{t('invoice.statuses.sent')}</option>
                                    <option value="cancelled">{t('invoice.statuses.cancelled')}</option>
                                </select>
                            </div>

                            {/* Sort By */}
                            <div className="form-group">
                                <label className="form-label">{t('invoice.sortBy', { defaultValue: 'Sort by' })}</label>
                                <select
                                    className="form-input"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="createdAt">{t('invoice.sortByCreatedAt', { defaultValue: 'Creation date' })}</option>
                                    <option value="invoiceNumber">{t('invoice.sortByInvoiceNumber', { defaultValue: 'Invoice no.' })}</option>
                                    <option value="familyName">{t('invoice.sortByName', { defaultValue: 'Name' })}</option>
                                    <option value="total">{t('invoice.sortByAmount', { defaultValue: 'Amount' })}</option>
                                </select>
                            </div>

                            {/* Sort Order */}
                            <div className="form-group">
                                <label className="form-label">Orden</label>
                                <select
                                    className="form-input"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                >
                                    <option value="desc">⬇️ Descendente</option>
                                    <option value="asc">⬆️ Ascendente</option>
                                </select>
                            </div>
                        </div>

                        {/* Results */}
                        {filteredInvoices.length === 0 ? (
                            <div className="text-center">
                                <p className="text-muted">
                                    {searchTerm || statusFilter !== 'all'
                                        ? 'No se encontraron facturas con los filtros aplicados'
                                        : 'No hay facturas generadas aún'}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="mobile-only">
                                    {filteredInvoices.map((invoice) => (
                                        <div key={invoice.id} className="card mb-sm" style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                                <div>
                                                    <div className="font-semibold" style={{ fontSize: '1.1rem' }}>
                                                        {invoice.invoiceNumber}
                                                    </div>
                                                    <div className="text-small text-muted">
                                                        {invoice.passengerInfo.name}
                                                    </div>
                                                </div>
                                                {getStatusBadge(invoice.status)}
                                            </div>

                                            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span className="text-muted">Código:</span>
                                                    <span>{invoice.passengerInfo.familyCode}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span className="text-muted">Cabinas:</span>
                                                    <span>{invoice.passengerInfo.cabinNumbers.join(', ')}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span className="text-muted">Fecha:</span>
                                                    <span>{formatTimestamp(invoice.issuedAt)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span className="text-muted font-semibold">Total:</span>
                                                    <span className="font-semibold">{formatCurrencyWithLabel(invoice.total, invoice.currency)}</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleDownload(invoice)}
                                                    className="btn btn-sm btn-outline"
                                                    title={t('invoice.download')}
                                                >
                                                    📥
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(invoice)}
                                                    className="btn btn-sm btn-outline-danger"
                                                    title="Eliminar factura"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="table-container desktop-only">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>{t('invoice.invoiceNumber')}</th>
                                                <th>Familia</th>
                                                <th>Código</th>
                                                <th>Cabinas</th>
                                                <th>{t('invoice.issueDate')}</th>
                                                <th>{t('common.total')}</th>
                                                <th>{t('invoice.status')}</th>
                                                <th>Auto</th>
                                                <th>{t('common.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredInvoices.map((invoice) => (
                                                <tr key={invoice.id}>
                                                    <td className="font-semibold">
                                                        {invoice.invoiceNumber}
                                                    </td>
                                                    <td>{invoice.passengerInfo.name}</td>
                                                    <td className="text-small">
                                                        {invoice.passengerInfo.familyCode}
                                                    </td>
                                                    <td className="text-small">
                                                        {invoice.passengerInfo.cabinNumbers.join(', ')}
                                                    </td>
                                                    <td className="text-small">
                                                        {formatTimestamp(invoice.issuedAt)}
                                                    </td>
                                                    <td className="font-semibold">
                                                        {formatCurrencyWithLabel(invoice.total, invoice.currency)}
                                                    </td>
                                                    <td>
                                                        {getStatusBadge(invoice.status)}
                                                    </td>
                                                    <td className="text-center">
                                                        {invoice.autoGenerated && (
                                                            <span title="Generada automáticamente">🤖</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="flex gap-xs">
                                                            <button
                                                                onClick={() => handleDownload(invoice)}
                                                                className="btn btn-sm btn-outline"
                                                                title={t('invoice.download')}
                                                            >
                                                                📥
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(invoice)}
                                                                className="btn btn-sm btn-outline-danger"
                                                                title="Eliminar factura"
                                                            >
                                                                🗑️
                                                            </button>
                                                            {/* TODO: Add send email button */}
                                                            {/* TODO: Add cancel button for issued invoices */}
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
                        <h3 className="card-title">📊 Estadísticas</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                            <div className="stat-box">
                                <div className="stat-label">Total Facturas</div>
                                <div className="stat-value">{invoices.length}</div>
                            </div>
                            <div className="stat-box">
                                <div className="stat-label">Emitidas</div>
                                <div className="stat-value text-success">
                                    {invoices.filter(i => i.status === 'issued').length}
                                </div>
                            </div>
                            <div className="stat-box">
                                <div className="stat-label">Enviadas</div>
                                <div className="stat-value text-info">
                                    {invoices.filter(i => i.status === 'sent').length}
                                </div>
                            </div>
                            <div className="stat-box">
                                <div className="stat-label">Automáticas</div>
                                <div className="stat-value">
                                    {invoices.filter(i => i.autoGenerated).length}
                                </div>
                            </div>
                            <div className="stat-box">
                                <div className="stat-label">Monto Total</div>
                                <div className="stat-value">
                                    {formatCurrencyWithLabel(
                                        invoices.reduce((sum, i) => sum + i.total, 0),
                                        'CAD'
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
};

export default AdminInvoiceManager;
