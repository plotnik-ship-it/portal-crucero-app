import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getBookingsByGroup, deleteBooking } from '../../services/firestore';
import { useAgency } from '../../contexts/AgencyContext';
import Card from '../shared/Card';
import { formatCurrencyWithLabel } from '../../services/currencyService';
import { SkeletonTable } from '../shared/Skeleton';
import AdvancedSearchFilters from './AdvancedSearchFilters';

const BookingList = ({ groupId, onSelectBooking }) => {
    const { t } = useTranslation();
    const { agency } = useAgency();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        searchTerm: '',
        balanceMin: '',
        balanceMax: '',
        depositStatus: 'all',
        sortBy: 'bookingCode',
        sortOrder: 'asc'
    });

    useEffect(() => {
        if (groupId) {
            loadBookings();
        }
    }, [groupId]);

    const loadBookings = async () => {
        if (!groupId || !agency?.id) {
            setBookings([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await getBookingsByGroup(groupId, agency.id);
            setBookings(data);
        } catch (error) {
            console.error('Error loading bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    // Apply filters and sorting
    const applyFilters = (bookingsList, currentFilters) => {
        let filtered = [...bookingsList];

        // Search term filter
        if (currentFilters.searchTerm) {
            const search = currentFilters.searchTerm.toLowerCase();
            filtered = filtered.filter(f =>
                f.displayName?.toLowerCase().includes(search) ||
                f.bookingCode?.toLowerCase().includes(search) ||
                f.cabinNumbers?.some(c => c.toLowerCase().includes(search))
            );
        }

        // Deposit status filter
        if (currentFilters.depositStatus !== 'all') {
            filtered = filtered.filter(f => {
                const hasDeposit = f.cabinAccounts?.some(c => c.depositPaid);
                return currentFilters.depositStatus === 'paid' ? hasDeposit : !hasDeposit;
            });
        }

        // Balance range filters
        if (currentFilters.balanceMin) {
            const min = parseFloat(currentFilters.balanceMin);
            filtered = filtered.filter(f => (f.balanceCadGlobal || 0) >= min);
        }
        if (currentFilters.balanceMax) {
            const max = parseFloat(currentFilters.balanceMax);
            filtered = filtered.filter(f => (f.balanceCadGlobal || 0) <= max);
        }

        // Sorting
        filtered.sort((a, b) => {
            let aVal, bVal;

            switch (currentFilters.sortBy) {
                case 'displayName':
                    aVal = a.displayName || '';
                    bVal = b.displayName || '';
                    break;
                case 'totalCad':
                    aVal = a.totalCadGlobal || 0;
                    bVal = b.totalCadGlobal || 0;
                    break;
                case 'paidCad':
                    aVal = a.paidCadGlobal || 0;
                    bVal = b.paidCadGlobal || 0;
                    break;
                case 'balanceCad':
                    aVal = a.balanceCadGlobal || 0;
                    bVal = b.balanceCadGlobal || 0;
                    break;
                default: // bookingCode
                    aVal = a.bookingCode || '';
                    bVal = b.bookingCode || '';
            }

            if (typeof aVal === 'string') {
                return currentFilters.sortOrder === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            } else {
                return currentFilters.sortOrder === 'asc'
                    ? aVal - bVal
                    : bVal - aVal;
            }
        });

        return filtered;
    };

    const filteredBookings = applyFilters(bookings, filters);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    const handleFilterReset = (resetFilters) => {
        setFilters(resetFilters);
    };

    const handleDelete = async (booking) => {
        if (window.confirm(`¿Estás seguro de eliminar la reserva ${booking.displayName}?\nEsta acción no se puede deshacer.`)) {
            try {
                await deleteBooking(booking.id);
                loadBookings();
            } catch (error) {
                alert('Error al eliminar la reserva');
            }
        }
    };

    // Calculate Global Totals
    const globalStats = bookings.reduce((stats, booking) => {
        return {
            total: stats.total + (booking.totalCadGlobal || 0),
            paid: stats.paid + (booking.paidCadGlobal || 0),
            balance: stats.balance + (booking.balanceCadGlobal || 0)
        };
    }, { total: 0, paid: 0, balance: 0 });

    if (loading) {
        return (
            <Card>
                <div className="card-header">
                    <h3 className="card-title">👥 {t('admin.cabins')}</h3>
                </div>
                <div className="card-body">
                    <SkeletonTable rows={8} columns={8} />
                </div>
            </Card>
        );
    }

    return (
        <>
            {/* Advanced Search Filters */}
            <div className="mb-lg">
                <AdvancedSearchFilters
                    onFilterChange={handleFilterChange}
                    onReset={handleFilterReset}
                />
            </div>

            <Card>
                <div className="card-header">
                    {/* Global Stats - Horizontal Cards */}
                    <div className="grid grid-cols-3 gap-md mb-xl">
                        <div className="p-md rounded bg-light border-light text-center">
                            <p className="text-small text-muted uppercase font-bold">{t('admin.totalGroup')}</p>
                            <p className="text-xl font-bold text-primary">{formatCurrencyWithLabel(globalStats.total)}</p>
                        </div>
                        <div className="p-md rounded bg-light border-light text-center">
                            <p className="text-small text-muted uppercase font-bold text-success">{t('admin.totalPaid')}</p>
                            <p className="text-xl font-bold text-success">{formatCurrencyWithLabel(globalStats.paid)}</p>
                        </div>
                        <div className="p-md rounded bg-light border-light text-center">
                            <p className="text-small text-muted uppercase font-bold text-warning">{t('admin.balanceDue')}</p>
                            <p className="text-xl font-bold text-warning">{formatCurrencyWithLabel(globalStats.balance)}</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-lg">
                        <h3 className="card-title">👥 {t('admin.cabins')} ({bookings.reduce((sum, f) => sum + (f.cabinNumbers?.length || 0), 0)})</h3>
                        <input
                            type="text"
                            className="form-input"
                            style={{ maxWidth: '300px' }}
                            placeholder={t('admin.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="card-body">
                    {filteredBookings.length === 0 ? (
                        <div className="text-center text-muted">
                            <p>{t('admin.noBookingsFound')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="mobile-only">
                                {filteredBookings.map((booking) => (
                                    <div key={booking.id} className="card mb-sm" style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                            <div>
                                                <div className="font-semibold" style={{ fontSize: '1.1rem' }}>
                                                    {booking.displayName}
                                                </div>
                                                <div className="text-small text-muted">
                                                    {booking.bookingCode}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="text-muted">Cabinas:</span>
                                                <span>{booking.cabinNumbers?.join(', ')}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="text-muted">Depósito:</span>
                                                <span>
                                                    {booking.cabinAccounts?.map((cabin, idx) => (
                                                        <span key={idx} style={{ marginRight: '0.25rem' }}>
                                                            {cabin.depositPaid ? '✅' : '❌'}
                                                        </span>
                                                    ))}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="text-muted">Total:</span>
                                                <span className="font-semibold">{formatCurrencyWithLabel(booking.totalCadGlobal || booking.totalCad)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="text-muted text-success">Pagado:</span>
                                                <span className="font-semibold text-success">{formatCurrencyWithLabel(booking.paidCadGlobal || booking.paidCad)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="text-muted" style={{ color: (booking.balanceCadGlobal || booking.balanceCad) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>Saldo:</span>
                                                <span className="font-semibold" style={{ color: (booking.balanceCadGlobal || booking.balanceCad) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                                    {formatCurrencyWithLabel(booking.balanceCadGlobal || booking.balanceCad)}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => onSelectBooking(booking)}
                                                className="btn btn-sm btn-outline-primary"
                                                title="Ver detalles"
                                            >
                                                👁️ {t('admin.viewDetail')}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(booking)}
                                                className="btn btn-sm btn-outline-danger"
                                                title="Eliminar reserva"
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
                                            <th>{t('admin.code')}</th>
                                            <th>{t('admin.name')}</th>
                                            <th>{t('admin.cabin')}(s)</th>
                                            <th>{t('admin.deposit')}</th>
                                            <th>{t('admin.total')}</th>
                                            <th>{t('admin.paid')}</th>
                                            <th>{t('admin.balance')}</th>
                                            <th className="text-right">{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBookings.map((booking) => (
                                            <tr key={booking.id}>
                                                <td className="font-semibold">{booking.bookingCode}</td>
                                                <td>{booking.displayName}</td>
                                                <td className="text-small">{booking.cabinNumbers?.join(', ')}</td>
                                                <td className="text-small">
                                                    {booking.cabinAccounts?.map((cabin, idx) => (
                                                        <div key={idx} title={`Cabina ${cabin.cabinNumber}`}>
                                                            {cabin.depositPaid ? '✅' : '❌'} <span className="text-muted text-xs">{cabin.cabinNumber}</span>
                                                        </div>
                                                    ))}
                                                </td>
                                                <td>{formatCurrencyWithLabel(booking.totalCadGlobal || booking.totalCad)}</td>
                                                <td style={{ color: 'var(--color-success)' }}>
                                                    {formatCurrencyWithLabel(booking.paidCadGlobal || booking.paidCad)}
                                                </td>
                                                <td style={{ color: (booking.balanceCadGlobal || booking.balanceCad) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                                    {formatCurrencyWithLabel(booking.balanceCadGlobal || booking.balanceCad)}
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex gap-sm justify-end">
                                                        <button
                                                            onClick={() => onSelectBooking(booking)}
                                                            className="btn btn-sm btn-outline-primary"
                                                            title="Ver detalles"
                                                        >
                                                            {t('admin.viewDetail')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(booking)}
                                                            className="btn btn-sm btn-outline-danger"
                                                            title="Eliminar reserva"
                                                            style={{ border: 'none' }}
                                                        >
                                                            🗑️
                                                        </button>
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
        </>
    );
};

export default BookingList;
