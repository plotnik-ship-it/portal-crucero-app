/**
 * PaymentSummaryCard Component
 * 
 * Displays payment summary with total, paid, and balance
 */

import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/formatters';

const PaymentSummaryCard = ({ familyData }) => {
    const { t } = useTranslation();

    const totalAmount = familyData.totalAmount || 0;
    const paidAmount = familyData.paidAmount || 0;
    const balance = totalAmount - paidAmount;
    const percentagePaid = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    // Determine status
    let status = 'pending';
    if (balance <= 0) {
        status = 'paid';
    } else if (familyData.paymentDeadlines && familyData.paymentDeadlines.length > 0) {
        // Check if any deadline is overdue
        const now = new Date();
        const hasOverdue = familyData.paymentDeadlines.some(deadline => {
            const dueDate = new Date(deadline.dueDate);
            return dueDate < now && deadline.amountDue > 0;
        });
        if (hasOverdue) {
            status = 'overdue';
        }
    }

    return (
        <div className="payment-summary-card">
            <div className="card-header">
                <h3>{t('traveler.payment.title')}</h3>
                <span className={`status-badge status-${status}`}>
                    {t(`traveler.payment.status.${status}`)}
                </span>
            </div>

            <div className="payment-amounts">
                <div className="amount-row">
                    <span className="amount-label">{t('traveler.payment.total')}</span>
                    <span className="amount-value total">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="amount-row">
                    <span className="amount-label">{t('traveler.payment.paid')}</span>
                    <span className="amount-value paid">{formatCurrency(paidAmount)}</span>
                </div>
                <div className="amount-row balance-row">
                    <span className="amount-label">{t('traveler.payment.balance')}</span>
                    <span className="amount-value balance">{formatCurrency(balance)}</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="payment-progress">
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${Math.min(percentagePaid, 100)}%` }}
                    ></div>
                </div>
                <span className="progress-label">
                    {Math.round(percentagePaid)}% {t('traveler.payment.paid')}
                </span>
            </div>
        </div>
    );
};

export default PaymentSummaryCard;
