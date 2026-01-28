import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import { getInvoicesByFamily } from '../../services/invoiceService';
import { downloadInvoicePDF } from '../../utils/pdfGenerator';
import { formatTimestamp } from '../../utils/formatters';
import { formatCurrencyWithLabel } from '../../services/currencyService';

const InvoiceList = ({ bookingId, familyData, agencyBranding }) => {
    const { t, i18n } = useTranslation();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showRequestModal, setShowRequestModal] = useState(false);

    useEffect(() => {
        loadInvoices();
    }, [bookingId]);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const data = await getInvoicesByFamily(bookingId);
            setInvoices(data);
        } catch (err) {
            console.error('Error loading invoices:', err);
            setError('Error al cargar los recibos');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (invoice) => {
        try {
            downloadInvoicePDF(invoice, agencyBranding, i18n.language);
        } catch (err) {
            console.error('Error downloading invoice:', err);
            alert('Error al descargar el recibo');
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
            <Card>
                <div className="card-header">
                    <h3 className="card-title">📄 {t('invoice.myInvoices')}</h3>
                </div>
                <div className="card-body">
                    <p className="text-center text-muted">{t('common.loading')}</p>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="card-header">
                <h3 className="card-title">📄 {t('invoice.myInvoices')}</h3>
                {invoices.length > 0 && (
                    <button
                        onClick={() => setShowRequestModal(true)}
                        className="btn btn-outline btn-sm"
                    >
                        {t('invoice.requestInvoice')}
                    </button>
                )}
            </div>

            <div className="card-body">
                {error && (
                    <div className="alert alert-error mb-md">
                        {error}
                    </div>
                )}

                {invoices.length === 0 ? (
                    <div className="text-center">
                        <p className="text-muted mb-md">{t('invoice.noInvoices')}</p>
                        <button
                            onClick={() => setShowRequestModal(true)}
                            className="btn btn-primary"
                        >
                            {t('invoice.requestInvoice')}
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('invoice.invoiceNumber')}</th>
                                    <th>{t('invoice.issuedDate')}</th>
                                    <th>{t('common.total')}</th>
                                    <th>{t('invoice.status')}</th>
                                    <th>{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td className="font-semibold">
                                            {invoice.invoiceNumber}
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
                                        <td>
                                            <button
                                                onClick={() => handleDownload(invoice)}
                                                className="btn btn-sm btn-outline"
                                                title={t('invoice.download')}
                                            >
                                                📥 {t('invoice.download')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* TODO: Add InvoiceRequestModal component */}
            {showRequestModal && (
                <div className="modal-backdrop" onClick={() => setShowRequestModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{t('invoice.requestInvoice')}</h3>
                            <button onClick={() => setShowRequestModal(false)} className="btn-close">×</button>
                        </div>
                        <div className="modal-body">
                            <p className="text-muted">
                                Funcionalidad de solicitud de recibo en desarrollo.
                                Por ahora, los recibos se generan automáticamente cuando se aplican pagos.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowRequestModal(false)} className="btn btn-outline">
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default InvoiceList;
