import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrencyWithLabel } from '../../../services/currencyService';

/**
 * Payment Progress Chart Component
 * Shows paid vs pending amounts in a pie chart
 */
const PaymentProgressChart = ({ totalPaid, totalBalance }) => {
    const data = [
        { name: 'Pagado', value: totalPaid, color: 'var(--color-success)' },
        { name: 'Pendiente', value: totalBalance, color: 'var(--color-warning)' }
    ];

    const COLORS = [
        'var(--color-success)',
        'var(--color-warning)'
    ];

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                style={{ fontSize: '14px', fontWeight: 'bold' }}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'white',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
                    <p style={{ margin: '5px 0 0 0', color: payload[0].payload.color }}>
                        {formatCurrencyWithLabel(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">📊 Progreso de Pagos</h3>
            </div>
            <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomLabel}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>

                {/* Progress Bar */}
                <div style={{ marginTop: '2rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem'
                    }}>
                        <span className="text-small text-muted">Progreso General</span>
                        <span className="text-small font-semibold">
                            {totalPaid > 0 ? ((totalPaid / (totalPaid + totalBalance)) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                    <div style={{
                        width: '100%',
                        height: '24px',
                        background: 'var(--color-gray-200)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${totalPaid > 0 ? ((totalPaid / (totalPaid + totalBalance)) * 100) : 0}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--color-success), var(--color-primary))',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentProgressChart;
