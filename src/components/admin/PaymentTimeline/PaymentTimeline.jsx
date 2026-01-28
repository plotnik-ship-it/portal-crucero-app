import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, isBefore, isAfter, addDays } from 'date-fns';
import { getAllBookingsByAgency } from '../../../services/firestore';
import { formatCurrencyWithLabel } from '../../../services/currencyService';
import Card from '../../shared/Card';

const PaymentTimeline = ({ agencyId }) => {
    const { t } = useTranslation();
    const [families, setFamilies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('upcoming'); // upcoming, overdue, all
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [agencyId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getAllBookingsByAgency(agencyId);
            setFamilies(data);
        } catch (error) {
            console.error('Error loading timeline data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Extract all payment deadlines from all families
    const getAllDeadlines = () => {
        const deadlines = [];
        const today = new Date();

        families.forEach(family => {
            family.cabinAccounts?.forEach((cabin, cabinIndex) => {
                cabin.paymentDeadlines?.forEach((deadline, deadlineIndex) => {
                    const dueDate = deadline.dueDate ? parseISO(deadline.dueDate) : null;
                    if (!dueDate) return;

                    const isPaid = deadline.status === 'paid';
                    const isOverdue = !isPaid && isBefore(dueDate, today);
                    const isUpcoming = !isPaid && isAfter(dueDate, today) && isBefore(dueDate, addDays(today, 30));

                    deadlines.push({
                        id: `${family.id}-${cabinIndex}-${deadlineIndex}`,
                        bookingId: family.id,
                        familyCode: family.familyCode,
                        familyName: family.displayName,
                        cabinNumber: cabin.cabinNumber,
                        label: deadline.label,
                        dueDate: dueDate,
                        dueDateStr: deadline.dueDate,
                        amount: deadline.amountCad || 0,
                        status: deadline.status || 'pending',
                        isPaid,
                        isOverdue,
                        isUpcoming,
                        balance: family.balanceCadGlobal || 0
                    });
                });
            });
        });

        return deadlines.sort((a, b) => a.dueDate - b.dueDate);
    };

    const allDeadlines = getAllDeadlines();

    // Filter deadlines based on view mode and search
    const filteredDeadlines = allDeadlines.filter(deadline => {
        // Filter by view mode
        if (viewMode === 'upcoming' && !deadline.isUpcoming) return false;
        if (viewMode === 'overdue' && !deadline.isOverdue) return false;

        // Filter by search term
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                deadline.familyName?.toLowerCase().includes(search) ||
                deadline.familyCode?.toLowerCase().includes(search) ||
                deadline.cabinNumber?.toLowerCase().includes(search) ||
                deadline.label?.toLowerCase().includes(search)
            );
        }

        return true;
    });

    // Group deadlines by date
    const groupedDeadlines = {};
    filteredDeadlines.forEach(deadline => {
        const dateKey = format(deadline.dueDate, 'yyyy-MM-dd');
        if (!groupedDeadlines[dateKey]) {
            groupedDeadlines[dateKey] = [];
        }
        groupedDeadlines[dateKey].push(deadline);
    });

    const getStatusColor = (deadline) => {
        if (deadline.isPaid) return 'success';
        if (deadline.isOverdue) return 'danger';
        if (deadline.isUpcoming) return 'warning';
        return 'muted';
    };

    const getStatusIcon = (deadline) => {
        if (deadline.isPaid) return '✅';
        if (deadline.isOverdue) return '🔴';
        if (deadline.isUpcoming) return '⚠️';
        return '⏳';
    };

    const stats = {
        total: allDeadlines.length,
        upcoming: allDeadlines.filter(d => d.isUpcoming).length,
        overdue: allDeadlines.filter(d => d.isOverdue).length,
        paid: allDeadlines.filter(d => d.isPaid).length
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-xl">
                <div>
                    <h2 className="text-2xl font-bold">📅 Timeline de Pagos</h2>
                    <p className="text-muted">Vista cronológica de fechas límite</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-4 gap-md mb-xl">
                <Card>
                    <div className="text-center p-md">
                        <div className="text-3xl mb-xs">📋</div>
                        <p className="text-small text-muted uppercase font-bold">Total</p>
                        <p className="text-xl font-bold">{stats.total}</p>
                    </div>
                </Card>
                <Card>
                    <div className="text-center p-md">
                        <div className="text-3xl mb-xs">⚠️</div>
                        <p className="text-small text-muted uppercase font-bold">Próximos 30 días</p>
                        <p className="text-xl font-bold text-warning">{stats.upcoming}</p>
                    </div>
                </Card>
                <Card>
                    <div className="text-center p-md">
                        <div className="text-3xl mb-xs">🔴</div>
                        <p className="text-small text-muted uppercase font-bold">Vencidos</p>
                        <p className="text-xl font-bold text-danger">{stats.overdue}</p>
                    </div>
                </Card>
                <Card>
                    <div className="text-center p-md">
                        <div className="text-3xl mb-xs">✅</div>
                        <p className="text-small text-muted uppercase font-bold">Pagados</p>
                        <p className="text-xl font-bold text-success">{stats.paid}</p>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <div className="card-header">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-sm">
                            <button
                                onClick={() => setViewMode('all')}
                                className={`btn btn-sm ${viewMode === 'all' ? 'btn-primary' : 'btn-outline'}`}
                            >
                                Todos ({stats.total})
                            </button>
                            <button
                                onClick={() => setViewMode('upcoming')}
                                className={`btn btn-sm ${viewMode === 'upcoming' ? 'btn-warning' : 'btn-outline'}`}
                            >
                                ⚠️ Próximos ({stats.upcoming})
                            </button>
                            <button
                                onClick={() => setViewMode('overdue')}
                                className={`btn btn-sm ${viewMode === 'overdue' ? 'btn-danger' : 'btn-outline'}`}
                            >
                                🔴 Vencidos ({stats.overdue})
                            </button>
                        </div>
                        <input
                            type="text"
                            className="form-input"
                            style={{ maxWidth: '300px' }}
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="card-body">
                    {Object.keys(groupedDeadlines).length === 0 ? (
                        <p className="text-center text-muted p-lg">
                            No hay fechas de pago en esta vista
                        </p>
                    ) : (
                        <div className="flex flex-col gap-lg">
                            {Object.entries(groupedDeadlines).map(([dateKey, deadlines]) => (
                                <div key={dateKey} className="border-b border-light pb-lg">
                                    <h4 className="font-bold mb-md text-primary">
                                        📅 {format(parseISO(dateKey), 'EEEE, d MMMM yyyy')}
                                    </h4>
                                    <div className="flex flex-col gap-sm">
                                        {deadlines.map((deadline) => (
                                            <div
                                                key={deadline.id}
                                                className={`p-md rounded border border-${getStatusColor(deadline)} bg-light flex justify-between items-center`}
                                            >
                                                <div className="flex items-center gap-md">
                                                    <div className="text-2xl">{getStatusIcon(deadline)}</div>
                                                    <div>
                                                        <p className="font-bold">
                                                            {deadline.familyCode} - {deadline.familyName}
                                                        </p>
                                                        <p className="text-small text-muted">
                                                            {deadline.label} • Cabina {deadline.cabinNumber}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-bold text-${getStatusColor(deadline)}`}>
                                                        {formatCurrencyWithLabel(deadline.amount)}
                                                    </p>
                                                    <p className="text-xs text-muted">
                                                        Saldo: {formatCurrencyWithLabel(deadline.balance)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
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

export default PaymentTimeline;
