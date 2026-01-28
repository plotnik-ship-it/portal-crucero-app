import { useTranslation } from 'react-i18next';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import { formatCurrencyWithLabel } from '../../services/currencyService';
import { formatTimestamp } from '../../utils/formatters';

const PaymentHistory = ({ payments }) => {
    const { t } = useTranslation();

    if (!payments || payments.length === 0) {
        return (
            <Card>
                <div className="card-header">
                    <h3 className="card-title">{t('family.paymentHistoryTitle')}</h3>
                </div>
                <div className="card-body">
                    <p className="text-muted text-center">{t('family.noPaymentsYet')}</p>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="card-header">
                <h3 className="card-title">{t('family.paymentHistoryTitle')}</h3>
            </div>
            <div className="card-body">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('family.paymentDate')}</th>
                                <th>{t('family.paymentAmount')}</th>
                                <th>{t('family.paymentMethod')}</th>
                                <th>{t('family.paymentReference')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((payment) => (
                                <tr key={payment.id}>
                                    <td className="text-small">
                                        {formatTimestamp(payment.date)}
                                    </td>
                                    <td className="font-semibold">
                                        {formatCurrencyWithLabel(payment.amountCad)}
                                    </td>
                                    <td>{payment.method || 'N/A'}</td>
                                    <td className="text-small text-muted">
                                        {payment.reference || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    );
};

export default PaymentHistory;
