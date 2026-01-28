import { useTranslation } from 'react-i18next';
import { useGroupStats } from '../../hooks/useGroupStats';
import { useGroup } from '../../contexts/GroupContext';
import { formatCurrency } from '../../utils/formatters';
import StatCard from '../shared/StatCard';
import PlanStatusCard from './PlanStatusCard';

const AdminDashboardHome = ({ onSelectGroup, onCreateGroup }) => {
    const { t } = useTranslation();
    const { stats, loading } = useGroupStats();
    const { selectGroup } = useGroup();

    const handleSelectGroup = (groupId) => {
        selectGroup(groupId);
        if (onSelectGroup) {
            onSelectGroup(groupId);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    if (!stats || stats.totalGroups === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚢</div>
                <h2>{t('admin.noGroups', 'No hay grupos creados')}</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    {t('admin.createFirstGroup', 'Crea tu primer grupo de crucero para comenzar')}
                </p>
                <button onClick={onCreateGroup} className="btn btn-primary">
                    + {t('admin.createFirstGroupButton', 'Crear Primer Grupo')}
                </button>
            </div>
        );
    }

    const depositPercentage = stats.totalFamilies > 0
        ? Math.round((stats.totalFamiliesWithDeposit / stats.totalFamilies) * 100)
        : 0;

    return (
        <div>
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h1 className="page-title">{t('admin.dashboardTitle', 'Dashboard de Administración')}</h1>
                        <p className="page-subtitle">{t('admin.groupsFinanceSummary', 'Resumen de grupos y finanzas')}</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/admin/branding'}
                        className="btn btn-outline"
                        title="Configurar branding de la agencia"
                    >
                        🎨 Branding
                    </button>
                </div>
            </div>

            {/* Plan Status Card */}
            <PlanStatusCard />

            {/* Global Summary Cards - Using New StatCard Component */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2.5rem'
            }}>
                <StatCard
                    icon="🚢"
                    label={t('admin.activeGroups', 'Grupos Activos')}
                    value={stats.totalGroups}
                    color="primary"
                />

                <StatCard
                    icon="👨‍👩‍👧‍👦"
                    label={t('admin.totalBookings')}
                    value={stats.totalFamilies}
                    color="info"
                />

                <StatCard
                    icon="💰"
                    label={t('admin.totalSales', 'Total Ventas')}
                    value={formatCurrency(stats.totalSales, 'CAD')}
                    color="primary"
                />

                <StatCard
                    icon="✅"
                    label={t('admin.totalPaid')}
                    value={formatCurrency(stats.totalPaid, 'CAD')}
                    color="success"
                />

                <StatCard
                    icon="⏳"
                    label={t('admin.balanceDue', 'Saldo Pendiente')}
                    value={formatCurrency(stats.totalBalance, 'CAD')}
                    color="warning"
                />
            </div>

            {/* Payment Status Overview */}
            <div className="card" style={{ marginBottom: '2.5rem' }}>
                <div className="card-body">
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>📈 {t('admin.depositStatus', 'Estado de Depósitos')}</h3>

                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>{t('admin.withDeposit')}: <strong>{stats.totalFamiliesWithDeposit}</strong> {t('admin.bookings')}</span>
                            <span><strong>{depositPercentage}%</strong></span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '1.5rem',
                            backgroundColor: 'var(--color-background-alt, #e0e0e0)',
                            borderRadius: '0.75rem',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${depositPercentage}%`,
                                height: '100%',
                                backgroundColor: 'var(--color-success, #28a745)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>{t('admin.withoutDeposit')}: <strong>{stats.totalFamiliesWithoutDeposit}</strong> {t('admin.bookings')}</span>
                            <span><strong>{100 - depositPercentage}%</strong></span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '1.5rem',
                            backgroundColor: 'var(--color-background-alt, #e0e0e0)',
                            borderRadius: '0.75rem',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${100 - depositPercentage}%`,
                                height: '100%',
                                backgroundColor: 'var(--color-warning, #ffc107)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Groups Section */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>🚢 {t('admin.activeGroups', 'Grupos Activos')}</h2>
                <button onClick={onCreateGroup} className="btn btn-primary">
                    + {t('admin.createNewGroup', 'Crear Nuevo Grupo')}
                </button>
            </div>

            {/* Group Cards */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {stats.groups.map((group) => {
                    const paidPercentage = group.totalCad > 0
                        ? Math.round((group.paidCad / group.totalCad) * 100)
                        : 0;

                    return (
                        <div key={group.id} className="card">
                            <div className="card-body">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.25rem' }}>
                                            {group.name}
                                        </h3>
                                        {group.shipName && (
                                            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                                🚢 {group.shipName}
                                            </p>
                                        )}
                                        {group.departureDate && (
                                            <p style={{ margin: 0, marginTop: '0.25rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                                📅 {t('admin.departure', 'Salida')}: {new Date(group.departureDate).toLocaleDateString(t('common.locale', 'es-MX'))}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                            {group.familyCount}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                            {t('admin.reservations')}
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Summary */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '1rem',
                                    padding: '1rem',
                                    backgroundColor: 'var(--color-background-alt, #f5f5f5)',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1rem'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                            {t('admin.totalLabel')}
                                        </div>
                                        <div style={{ fontWeight: 'bold' }}>
                                            {formatCurrency(group.totalCad, 'CAD')}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                            {t('admin.paidLabel')}
                                        </div>
                                        <div style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>
                                            {formatCurrency(group.paidCad, 'CAD')}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                            {t('admin.balanceLabel')}
                                        </div>
                                        <div style={{ fontWeight: 'bold', color: 'var(--color-warning)' }}>
                                            {formatCurrency(group.balanceCad, 'CAD')}
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                        <span>{t('admin.paymentProgress', 'Progreso de pagos')}</span>
                                        <span><strong>{paidPercentage}%</strong></span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '0.75rem',
                                        backgroundColor: 'var(--color-background-alt, #e0e0e0)',
                                        borderRadius: '0.5rem',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${paidPercentage}%`,
                                            height: '100%',
                                            backgroundColor: 'var(--color-success, #28a745)',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                </div>

                                {/* Deposit Status */}
                                {group.familiesWithoutDeposit > 0 ? (
                                    <div className="alert alert-warning" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
                                        ⚠️ <strong>{group.familiesWithoutDeposit}</strong> {group.familiesWithoutDeposit === 1 ? t('admin.booking') : t('admin.bookings')} {t('admin.withoutDeposit')}
                                    </div>
                                ) : (
                                    <div className="alert alert-success" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
                                        ✅ {t('admin.allBookingsDeposit')}
                                    </div>
                                )}

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        onClick={() => handleSelectGroup(group.id)}
                                        className="btn btn-primary"
                                        style={{ flex: 1 }}
                                    >
                                        {t('admin.manageGroup', 'Gestionar Grupo')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminDashboardHome;
