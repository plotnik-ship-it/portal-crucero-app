import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getAllBookingsByAgency } from '../../../services/firestore';
import { formatCurrencyWithLabel } from '../../../services/currencyService';
import Card from '../../shared/Card';
import ExportButton from './ExportButton';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const ReportsHome = ({ agencyId }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [families, setFamilies] = useState([]);
    const [stats, setStats] = useState({
        totalSales: 0,
        totalPaid: 0,
        totalBalance: 0,
        totalFamilies: 0,
        withDeposit: 0,
        withoutDeposit: 0
    });

    useEffect(() => {
        loadData();
    }, [agencyId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const allFamilies = await getAllBookingsByAgency(agencyId);
            setFamilies(allFamilies);

            // Calculate statistics
            const totalSales = allFamilies.reduce((sum, f) => sum + (f.totalCadGlobal || 0), 0);
            const totalPaid = allFamilies.reduce((sum, f) => sum + (f.paidCadGlobal || 0), 0);
            const totalBalance = allFamilies.reduce((sum, f) => sum + (f.balanceCadGlobal || 0), 0);
            const withDeposit = allFamilies.filter(f =>
                f.cabinAccounts?.some(cabin => cabin.depositPaid)
            ).length;

            setStats({
                totalSales,
                totalPaid,
                totalBalance,
                totalFamilies: allFamilies.length,
                withDeposit,
                withoutDeposit: allFamilies.length - withDeposit
            });
        } catch (error) {
            console.error('Error loading reports data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Data for payment status pie chart
    const paymentStatusData = [
        { name: 'Pagado', value: stats.totalPaid },
        { name: 'Saldo Pendiente', value: stats.totalBalance }
    ];

    // Data for deposit status
    const depositStatusData = [
        { name: 'Con Depósito', value: stats.withDeposit },
        { name: 'Sin Depósito', value: stats.withoutDeposit }
    ];

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="reports-container">
            <div className="flex justify-between items-center mb-xl">
                <div>
                    <h2 className="text-2xl font-bold">📊 {t('admin.dashboardTitle')}</h2>
                    <p className="text-muted">{t('admin.groupsFinanceSummary')}</p>
                </div>
                <ExportButton families={families} stats={stats} />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-4 gap-lg mb-xl">
                <Card>
                    <div className="text-center p-lg">
                        <div className="text-4xl mb-sm">💰</div>
                        <p className="text-small text-muted uppercase font-bold">{t('admin.totalSales')}</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrencyWithLabel(stats.totalSales)}</p>
                    </div>
                </Card>

                <Card>
                    <div className="text-center p-lg">
                        <div className="text-4xl mb-sm">✅</div>
                        <p className="text-small text-muted uppercase font-bold">{t('admin.totalPaid')}</p>
                        <p className="text-2xl font-bold text-success">{formatCurrencyWithLabel(stats.totalPaid)}</p>
                    </div>
                </Card>

                <Card>
                    <div className="text-center p-lg">
                        <div className="text-4xl mb-sm">⏳</div>
                        <p className="text-small text-muted uppercase font-bold">{t('admin.balanceDue')}</p>
                        <p className="text-2xl font-bold text-warning">{formatCurrencyWithLabel(stats.totalBalance)}</p>
                    </div>
                </Card>

                <Card>
                    <div className="text-center p-lg">
                        <div className="text-4xl mb-sm">👥</div>
                        <p className="text-small text-muted uppercase font-bold">{t('admin.totalFamilies')}</p>
                        <p className="text-2xl font-bold">{stats.totalFamilies}</p>
                    </div>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-2 gap-lg mb-xl">
                {/* Payment Status Chart */}
                <Card>
                    <div className="card-header">
                        <h3 className="card-title">Estado de Pagos</h3>
                    </div>
                    <div className="card-body">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={paymentStatusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {paymentStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrencyWithLabel(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Deposit Status Chart */}
                <Card>
                    <div className="card-header">
                        <h3 className="card-title">{t('admin.depositStatus')}</h3>
                    </div>
                    <div className="card-body">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={depositStatusData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Top Families by Balance */}
            <Card>
                <div className="card-header">
                    <h3 className="card-title">{t('admin.topFamilies')}</h3>
                </div>
                <div className="card-body">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('admin.code')}</th>
                                    <th>{t('admin.name')}</th>
                                    <th>{t('admin.total')}</th>
                                    <th>{t('admin.paid')}</th>
                                    <th>{t('admin.balance')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {families
                                    .sort((a, b) => (b.balanceCadGlobal || 0) - (a.balanceCadGlobal || 0))
                                    .slice(0, 10)
                                    .map((family) => (
                                        <tr key={family.id}>
                                            <td className="font-semibold">{family.bookingCode}</td>
                                            <td>{family.displayName}</td>
                                            <td>{formatCurrencyWithLabel(family.totalCadGlobal)}</td>
                                            <td className="text-success">{formatCurrencyWithLabel(family.paidCadGlobal)}</td>
                                            <td className="text-danger font-bold">{formatCurrencyWithLabel(family.balanceCadGlobal)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ReportsHome;
