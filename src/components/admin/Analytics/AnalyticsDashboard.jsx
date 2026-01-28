import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getBookingsByGroup } from '../../../services/firestore';
import { calculateGroupAnalytics } from '../../../services/analyticsService';
import { formatCurrencyWithLabel } from '../../../services/currencyService';
import MetricCard from '../../shared/MetricCard';
import PaymentProgressChart from './PaymentProgressChart';
import { SkeletonCard } from '../../shared/Skeleton';
import Card from '../../shared/Card';

const AnalyticsDashboard = ({ groupId, groupData }) => {
    const { t } = useTranslation();
    const [families, setFamilies] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (groupId) {
            loadAnalytics();
        }
    }, [groupId]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const familiesData = await getBookingsByGroup(groupId);
            setFamilies(familiesData);

            const analyticsData = calculateGroupAnalytics(familiesData);
            setAnalytics(analyticsData);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-md">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

    if (!analytics) {
        return (
            <Card>
                <div className="card-body text-center">
                    <p className="text-muted">No hay datos disponibles</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="page-header">
                <h2 className="page-title">📊 Analytics Dashboard</h2>
                <p className="page-subtitle">
                    Métricas financieras y estadísticas del grupo
                </p>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-4 gap-md">
                <MetricCard
                    title="Total Ventas"
                    value={formatCurrencyWithLabel(analytics.totalSales)}
                    icon="💰"
                    color="primary"
                    subtitle={`${analytics.familiesCount} familias`}
                />
                <MetricCard
                    title="Total Pagado"
                    value={formatCurrencyWithLabel(analytics.totalPaid)}
                    icon="✅"
                    color="success"
                    subtitle={`${analytics.paymentProgress.paid.toFixed(1)}% del total`}
                />
                <MetricCard
                    title="Saldo Pendiente"
                    value={formatCurrencyWithLabel(analytics.totalBalance)}
                    icon="⏳"
                    color="warning"
                    subtitle={`${analytics.familiesBehind} familias`}
                />
                <MetricCard
                    title="Familias al Día"
                    value={`${analytics.familiesUpToDate}/${analytics.familiesCount}`}
                    icon="🎯"
                    color="success"
                    subtitle={`${((analytics.familiesUpToDate / analytics.familiesCount) * 100).toFixed(0)}% completado`}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-md">
                {/* Payment Progress Chart */}
                <PaymentProgressChart
                    totalPaid={analytics.totalPaid}
                    totalBalance={analytics.totalBalance}
                />

                {/* Deposit Status */}
                <Card>
                    <div className="card-header">
                        <h3 className="card-title">💳 Estado de Depósitos</h3>
                    </div>
                    <div className="card-body">
                        <div className="space-y-md">
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                background: 'var(--color-success-light)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div>
                                    <p className="text-small text-muted" style={{ margin: 0 }}>Con Depósito</p>
                                    <p className="text-xl font-bold" style={{ margin: '0.25rem 0 0 0', color: 'var(--color-success)' }}>
                                        {analytics.depositStats.withDeposit}
                                    </p>
                                </div>
                                <span style={{ fontSize: '2rem' }}>✅</span>
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                background: 'var(--color-warning-light)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div>
                                    <p className="text-small text-muted" style={{ margin: 0 }}>Sin Depósito</p>
                                    <p className="text-xl font-bold" style={{ margin: '0.25rem 0 0 0', color: 'var(--color-warning)' }}>
                                        {analytics.depositStats.withoutDeposit}
                                    </p>
                                </div>
                                <span style={{ fontSize: '2rem' }}>⏳</span>
                            </div>

                            {analytics.depositStats.withoutDeposit === 0 && (
                                <div className="alert alert-success" style={{ marginTop: '1rem' }}>
                                    🎉 ¡Todas las familias tienen depósito pagado!
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Top Debtors Table */}
            {analytics.topDebtors.length > 0 && (
                <Card>
                    <div className="card-header">
                        <h3 className="card-title">🔝 Top 10 - Mayor Saldo Pendiente</h3>
                    </div>
                    <div className="card-body">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Código</th>
                                        <th>Nombre</th>
                                        <th>Total</th>
                                        <th>Pagado</th>
                                        <th>Saldo</th>
                                        <th>% Pendiente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.topDebtors.map((family, index) => (
                                        <tr key={family.bookingCode}>
                                            <td className="font-semibold">{index + 1}</td>
                                            <td>{family.bookingCode}</td>
                                            <td>{family.displayName}</td>
                                            <td>{formatCurrencyWithLabel(family.total)}</td>
                                            <td style={{ color: 'var(--color-success)' }}>
                                                {formatCurrencyWithLabel(family.paid)}
                                            </td>
                                            <td style={{ color: 'var(--color-danger)' }}>
                                                {formatCurrencyWithLabel(family.balance)}
                                            </td>
                                            <td>
                                                <span className="badge badge-warning">
                                                    {((family.balance / family.total) * 100).toFixed(0)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
