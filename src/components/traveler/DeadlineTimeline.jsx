/**
 * DeadlineTimeline Component
 * 
 * Visual timeline of payment deadlines with status indicators
 */

import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/formatters';

const DeadlineTimeline = ({ deadlines, familyData }) => {
    const { t } = useTranslation();

    if (!deadlines || deadlines.length === 0) {
        return null;
    }

    const now = new Date();
    const totalAmount = familyData.totalAmount || 0;

    // Calculate status for each deadline
    const deadlinesWithStatus = deadlines.map(deadline => {
        const dueDate = new Date(deadline.dueDate);
        const amountDue = (totalAmount * (deadline.percentage / 100));

        let status = 'pending';
        if (dueDate < now) {
            // Check if this deadline has been paid
            // For simplicity, we'll mark as paid if total paid covers this percentage
            const paidAmount = familyData.paidAmount || 0;
            if (paidAmount >= amountDue) {
                status = 'paid';
            } else {
                status = 'overdue';
            }
        }

        return {
            ...deadline,
            dueDate,
            amountDue,
            status
        };
    });

    return (
        <div className="deadline-timeline">
            <h3>{t('traveler.deadlines.title')}</h3>

            <div className="timeline">
                {deadlinesWithStatus.map((deadline, index) => (
                    <div key={index} className={`timeline-item status-${deadline.status}`}>
                        <div className="timeline-marker">
                            {deadline.status === 'paid' ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                                    <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : deadline.status === 'overdue' ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                                    <path d="M12 8v5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx="12" cy="16" r="1" fill="white" />
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            )}
                        </div>

                        <div className="timeline-content">
                            <div className="timeline-header">
                                <h4>{deadline.label}</h4>
                                <span className={`status-badge status-${deadline.status}`}>
                                    {t(`traveler.deadlines.status.${deadline.status}`)}
                                </span>
                            </div>

                            <div className="timeline-details">
                                <div className="detail-row">
                                    <span className="label">{t('traveler.deadlines.dueDate')}:</span>
                                    <span className="value">
                                        {deadline.dueDate.toLocaleDateString(
                                            t('common.locale'),
                                            { year: 'numeric', month: 'long', day: 'numeric' }
                                        )}
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">{t('traveler.deadlines.amount')}:</span>
                                    <span className="value amount">{formatCurrency(deadline.amountDue)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">{t('traveler.deadlines.percentage')}:</span>
                                    <span className="value">{deadline.percentage}%</span>
                                </div>
                            </div>
                        </div>

                        {index < deadlinesWithStatus.length - 1 && (
                            <div className="timeline-connector"></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DeadlineTimeline;
