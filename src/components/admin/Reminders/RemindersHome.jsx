import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { getAllBookingsByAgency } from '../../../services/firestore';
import {
    getFamiliesWithUpcomingDeadlines,
    getFamiliesWithOverdueDeadlines,
    sendReminderEmails,
    logReminderSent,
    getReminderHistory
} from '../../../services/reminderService';
import { formatCurrencyWithLabel } from '../../../services/currencyService';
import Card from '../../shared/Card';

const RemindersHome = ({ agencyId }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [families, setFamilies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState([]);
    const [expandedSection, setExpandedSection] = useState(null);
    const [selectedSevenDay, setSelectedSevenDay] = useState([]);
    const [selectedOneDay, setSelectedOneDay] = useState([]);
    const [selectedOverdue, setSelectedOverdue] = useState([]);

    useEffect(() => {
        loadData();
    }, [agencyId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [familiesData, historyData] = await Promise.all([
                getAllBookingsByAgency(agencyId),
                getReminderHistory(agencyId, 5)
            ]);
            setFamilies(familiesData);
            setHistory(historyData);
        } catch (error) {
            console.error('Error loading reminders data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get deadline categories
    const upcomingSevenDays = getFamiliesWithUpcomingDeadlines(families, 7);
    const upcomingOneDay = getFamiliesWithUpcomingDeadlines(families, 1);
    const overdue = getFamiliesWithOverdueDeadlines(families);

    const toggleSelection = (item, category) => {
        const itemId = `${item.family.id}-${item.deadline.dueDate}`;
        const setSelected = category === '7-day' ? setSelectedSevenDay :
            category === '1-day' ? setSelectedOneDay :
                setSelectedOverdue;
        const selected = category === '7-day' ? selectedSevenDay :
            category === '1-day' ? selectedOneDay :
                selectedOverdue;

        if (selected.includes(itemId)) {
            setSelected(selected.filter(id => id !== itemId));
        } else {
            setSelected([...selected, itemId]);
        }
    };

    const toggleSelectAll = (items, category) => {
        const setSelected = category === '7-day' ? setSelectedSevenDay :
            category === '1-day' ? setSelectedOneDay :
                setSelectedOverdue;
        const selected = category === '7-day' ? selectedSevenDay :
            category === '1-day' ? selectedOneDay :
                selectedOverdue;

        if (selected.length === items.length) {
            setSelected([]);
        } else {
            setSelected(items.map(item => `${item.family.id}-${item.deadline.dueDate}`));
        }
    };

    const getSelectedItems = (items, category) => {
        const selected = category === '7-day' ? selectedSevenDay :
            category === '1-day' ? selectedOneDay :
                selectedOverdue;
        return items.filter(item => selected.includes(`${item.family.id}-${item.deadline.dueDate}`));
    };

    const handleSendReminders = async (allItems, reminderType, typeName, category) => {
        const selectedItems = getSelectedItems(allItems, category);

        if (selectedItems.length === 0) {
            alert(t('family.reminders.selectAtLeastOne'));
            return;
        }

        const confirmed = window.confirm(
            t('family.reminders.confirmSend', { count: selectedItems.length, type: typeName })
        );

        if (!confirmed) return;

        try {
            setSending(true);

            // Send emails
            const results = await sendReminderEmails(selectedItems, reminderType);

            // Clear selections after sending
            if (category === '7-day') setSelectedSevenDay([]);
            else if (category === '1-day') setSelectedOneDay([]);
            else setSelectedOverdue([]);

            // Log the reminder
            await logReminderSent({
                agencyId,
                reminderType,
                recipientCount: selectedItems.length,
                recipients: results.sent.concat(results.failed),
                sentBy: user.uid
            });

            // Reload history
            const newHistory = await getReminderHistory(agencyId, 5);
            setHistory(newHistory);

            // Show results
            if (results.failed.length === 0) {
                alert(t('family.reminders.successAll', { count: results.sent.length }));
            } else {
                alert(t('family.reminders.successPartial', { sent: results.sent.length, failed: results.failed.length }));
                console.log('Resultados detallados:', results);
            }
        } catch (error) {
            console.error('Error sending reminders:', error);
            alert(t('family.reminders.error', { error: error.message }));
        } finally {
            setSending(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-xl">
                <div>
                    <h2 className="text-2xl font-bold">⏰ {t('family.reminders.title')}</h2>
                    <p className="text-muted">{t('family.reminders.subtitle')}</p>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-3 gap-md mb-xl">
                <Card>
                    <div className="text-center p-md">
                        <div className="text-3xl mb-xs">📅</div>
                        <p className="text-small text-muted uppercase font-bold">{t('family.reminders.upcoming7Days')}</p>
                        <p className="text-xl font-bold text-warning">{upcomingSevenDays.length}</p>
                    </div>
                </Card>
                <Card>
                    <div className="text-center p-md">
                        <div className="text-3xl mb-xs">⚠️</div>
                        <p className="text-small text-muted uppercase font-bold">{t('family.reminders.urgent24h')}</p>
                        <p className="text-xl font-bold text-danger">{upcomingOneDay.length}</p>
                    </div>
                </Card>
                <Card>
                    <div className="text-center p-md">
                        <div className="text-3xl mb-xs">🔴</div>
                        <p className="text-small text-muted uppercase font-bold">{t('family.reminders.overdue')}</p>
                        <p className="text-xl font-bold text-danger">{overdue.length}</p>
                    </div>
                </Card>
            </div>

            {/* 7-Day Reminders Section */}
            <Card className="mb-lg">
                <div className="card-header">
                    <div className="flex justify-between items-center">
                        <h3 className="card-title">📅 {t('family.reminders.upcoming7DaysTitle')}</h3>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginLeft: '1.5rem' }}>
                            {expandedSection === '7-day' && upcomingSevenDays.length > 0 && (
                                <button
                                    onClick={() => toggleSelectAll(upcomingSevenDays, '7-day')}
                                    className="btn btn-outline btn-sm"
                                    disabled={sending}
                                >
                                    {selectedSevenDay.length === upcomingSevenDays.length ? `☐ ${t('family.reminders.deselectAll')}` : `☑ ${t('family.reminders.selectAll')}`}
                                </button>
                            )}
                            <button
                                onClick={() => handleSendReminders(upcomingSevenDays, '7-day', 'Recordatorio 7 días', '7-day')}
                                className="btn btn-primary"
                                style={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
                                disabled={sending || selectedSevenDay.length === 0}
                            >
                                {sending ? t('family.reminders.sending') : `📧 ${t('family.reminders.send')} (${selectedSevenDay.length})`}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    {upcomingSevenDays.length === 0 ? (
                        <p className="text-center text-muted p-lg">
                            {t('family.reminders.noUpcoming7Days')}
                        </p>
                    ) : (
                        <>
                            <p className="text-small text-muted mb-md">
                                {t('family.reminders.familiesWithPayments', { count: upcomingSevenDays.length })}
                            </p>
                            {expandedSection === '7-day' ? (
                                <div className="flex flex-col gap-sm mb-md">
                                    {upcomingSevenDays.map((item, idx) => {
                                        const itemId = `${item.family.id}-${item.deadline.dueDate}`;
                                        const isSelected = selectedSevenDay.includes(itemId);
                                        return (
                                            <div key={idx} className={`p-md rounded border ${isSelected ? 'border-primary bg-primary-light' : 'border-warning bg-light'}`}>
                                                <div className="flex items-center gap-md">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelection(item, '7-day')}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                    <div className="flex justify-between items-center" style={{ flex: 1 }}>
                                                        <div>
                                                            <p className="font-bold">
                                                                {item.family.bookingCode} - {item.family.displayName}
                                                            </p>
                                                            <p className="text-small text-muted">
                                                                {item.deadline.label} • Cabina {item.deadline.cabinNumber}
                                                            </p>
                                                            <p className="text-xs text-muted">
                                                                {t('family.reminders.dueDate')}: {item.deadline.dueDate} ({t('family.reminders.daysUntil', { count: item.daysUntil, plural: item.daysUntil !== 1 ? 's' : '' })})
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-warning">
                                                                {formatCurrencyWithLabel(item.deadline.amountCad)}
                                                            </p>
                                                            <p className="text-xs text-muted">
                                                                {t('family.reminders.balance')}: {formatCurrencyWithLabel(item.family.balanceCadGlobal)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <button
                                    onClick={() => toggleSection('7-day')}
                                    className="btn btn-outline btn-sm"
                                >
                                    {t('family.reminders.viewAll')} ({upcomingSevenDays.length})
                                </button>
                            )}
                            {expandedSection === '7-day' && (
                                <button
                                    onClick={() => toggleSection(null)}
                                    className="btn btn-outline btn-sm"
                                >
                                    {t('family.reminders.hide')}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </Card>

            {/* 1-Day Urgent Reminders Section */}
            <Card className="mb-lg">
                <div className="card-header">
                    <div className="flex justify-between items-center">
                        <h3 className="card-title">⚠️ {t('family.reminders.urgent24hTitle')}</h3>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {expandedSection === '1-day' && upcomingOneDay.length > 0 && (
                                <button
                                    onClick={() => toggleSelectAll(upcomingOneDay, '1-day')}
                                    className="btn btn-outline btn-sm"
                                    disabled={sending}
                                >
                                    {selectedOneDay.length === upcomingOneDay.length ? `☐ ${t('family.reminders.deselectAll')}` : `☑ ${t('family.reminders.selectAll')}`}
                                </button>
                            )}
                            <button
                                onClick={() => handleSendReminders(upcomingOneDay, '1-day', 'Recordatorio Urgente 24h', '1-day')}
                                className="btn btn-danger"
                                style={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
                                disabled={sending || selectedOneDay.length === 0}
                            >
                                {sending ? t('family.reminders.sending') : `📧 ${t('family.reminders.send')} (${selectedOneDay.length})`}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    {upcomingOneDay.length === 0 ? (
                        <p className="text-center text-muted p-lg">
                            {t('family.reminders.noUrgent24h')}
                        </p>
                    ) : (
                        <>
                            <p className="text-small text-danger mb-md">
                                ⚠️ {t('family.reminders.familiesUrgent', { count: upcomingOneDay.length })}
                            </p>
                            {expandedSection === '1-day' ? (
                                <div className="flex flex-col gap-sm mb-md">
                                    {upcomingOneDay.map((item, idx) => {
                                        const itemId = `${item.family.id}-${item.deadline.dueDate}`;
                                        const isSelected = selectedOneDay.includes(itemId);
                                        return (
                                            <div key={idx} className={`p-md rounded border ${isSelected ? 'border-primary bg-primary-light' : 'border-danger bg-light'}`}>
                                                <div className="flex items-center gap-md">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelection(item, '1-day')}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                    <div className="flex justify-between items-center" style={{ flex: 1 }}>
                                                        <div>
                                                            <p className="font-bold">
                                                                {item.family.bookingCode} - {item.family.displayName}
                                                            </p>
                                                            <p className="text-small text-muted">
                                                                {item.deadline.label} • Cabina {item.deadline.cabinNumber}
                                                            </p>
                                                            <p className="text-xs text-danger font-bold">
                                                                ⚠️ {t('family.reminders.dueDate')}: {item.deadline.dueDate} ({t('family.reminders.tomorrow')})
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-danger">
                                                                {formatCurrencyWithLabel(item.deadline.amountCad)}
                                                            </p>
                                                            <p className="text-xs text-muted">
                                                                {t('family.reminders.balance')}: {formatCurrencyWithLabel(item.family.balanceCadGlobal)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <button
                                    onClick={() => toggleSection('1-day')}
                                    className="btn btn-outline btn-sm"
                                >
                                    {t('family.reminders.viewAll')} ({upcomingOneDay.length})
                                </button>
                            )}
                            {expandedSection === '1-day' && (
                                <button
                                    onClick={() => toggleSection(null)}
                                    className="btn btn-outline btn-sm"
                                >
                                    {t('family.reminders.hide')}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </Card>

            {/* Overdue Reminders Section */}
            <Card className="mb-lg">
                <div className="card-header">
                    <div className="flex justify-between items-center">
                        <h3 className="card-title">🔴 {t('family.reminders.overdueTitle')}</h3>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {expandedSection === 'overdue' && overdue.length > 0 && (
                                <button
                                    onClick={() => toggleSelectAll(overdue, 'overdue')}
                                    className="btn btn-outline btn-sm"
                                    disabled={sending}
                                >
                                    {selectedOverdue.length === overdue.length ? `☐ ${t('family.reminders.deselectAll')}` : `☑ ${t('family.reminders.selectAll')}`}
                                </button>
                            )}
                            <button
                                onClick={() => handleSendReminders(overdue, 'overdue', 'Recordatorio Vencido', 'overdue')}
                                className="btn btn-danger"
                                style={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
                                disabled={sending || selectedOverdue.length === 0}
                            >
                                {sending ? t('family.reminders.sending') : `📧 ${t('family.reminders.send')} (${selectedOverdue.length})`}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    {overdue.length === 0 ? (
                        <p className="text-center text-success p-lg">
                            ✅ {t('family.reminders.noOverdue')}
                        </p>
                    ) : (
                        <>
                            <p className="text-small text-danger mb-md">
                                🔴 {t('family.reminders.familiesOverdue', { count: overdue.length })}
                            </p>
                            {expandedSection === 'overdue' ? (
                                <div className="flex flex-col gap-sm mb-md">
                                    {overdue.map((item, idx) => {
                                        const itemId = `${item.family.id}-${item.deadline.dueDate}`;
                                        const isSelected = selectedOverdue.includes(itemId);
                                        return (
                                            <div key={idx} className={`p-md rounded border ${isSelected ? 'border-primary bg-primary-light' : 'border-danger bg-light'}`}>
                                                <div className="flex items-center gap-md">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelection(item, 'overdue')}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                    <div className="flex justify-between items-center" style={{ flex: 1 }}>
                                                        <div>
                                                            <p className="font-bold">
                                                                {item.family.bookingCode} - {item.family.displayName}
                                                            </p>
                                                            <p className="text-small text-muted">
                                                                {item.deadline.label} • Cabina {item.deadline.cabinNumber}
                                                            </p>
                                                            <p className="text-xs text-danger font-bold">
                                                                🔴 {t('family.reminders.dueDate')}: {item.deadline.dueDate} ({t('family.reminders.overdueBy', { count: item.daysOverdue, plural: item.daysOverdue !== 1 ? 's' : '' })})
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-danger">
                                                                {formatCurrencyWithLabel(item.deadline.amountCad)}
                                                            </p>
                                                            <p className="text-xs text-muted">
                                                                {t('family.reminders.balance')}: {formatCurrencyWithLabel(item.family.balanceCadGlobal)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <button
                                    onClick={() => toggleSection('overdue')}
                                    className="btn btn-outline btn-sm"
                                >
                                    {t('family.reminders.viewAll')} ({overdue.length})
                                </button>
                            )}
                            {expandedSection === 'overdue' && (
                                <button
                                    onClick={() => toggleSection(null)}
                                    className="btn btn-outline btn-sm"
                                >
                                    {t('family.reminders.hide')}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </Card>

            {/* Reminder History */}
            <Card>
                <div className="card-header">
                    <h3 className="card-title">📜 {t('family.reminders.historyTitle')}</h3>
                </div>
                <div className="card-body">
                    {history.length === 0 ? (
                        <p className="text-center text-muted p-lg">
                            {t('family.reminders.noHistory')}
                        </p>
                    ) : (
                        <div className="flex flex-col gap-sm">
                            {history.map((log) => (
                                <div key={log.id} className="p-sm border-b border-light">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">
                                                {log.reminderType === '7-day' && `📅 ${t('family.reminders.reminder7Day')}`}
                                                {log.reminderType === '1-day' && `⚠️ ${t('family.reminders.reminderUrgent')}`}
                                                {log.reminderType === 'overdue' && `🔴 ${t('family.reminders.reminderOverdue')}`}
                                            </p>
                                            <p className="text-xs text-muted">
                                                {log.sentAt?.toLocaleDateString('es-MX', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-small font-semibold">
                                                {t('family.reminders.familiesCount', { count: log.recipientCount })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default RemindersHome;
