import Card from '../shared/Card';
import Badge from '../shared/Badge';
import { formatCurrencyWithLabel, convertCadToMxn } from '../../services/currencyService';
import { formatDate } from '../../utils/formatters';

const CostBreakdown = ({ familyData, exchangeRate }) => {
    if (!familyData) return null;

    const totalMxn = convertCadToMxn(familyData.totalCad, exchangeRate);
    const paidMxn = convertCadToMxn(familyData.paidCad, exchangeRate);
    const balanceMxn = convertCadToMxn(familyData.balanceCad, exchangeRate);

    return (
        <Card>
            <div className="card-header">
                <h3 className="card-title">💰 Desglose de Costos</h3>
            </div>
            <div className="card-body">
                {/* Cost Breakdown */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="flex justify-between mb-sm">
                        <span className="text-muted">Crucero</span>
                        <span className="font-semibold">
                            {formatCurrencyWithLabel(familyData.subtotalCad)}
                        </span>
                    </div>

                    <div className="flex justify-between mb-sm">
                        <span className="text-muted">Propinas</span>
                        <span className="font-semibold">
                            {formatCurrencyWithLabel(familyData.gratuitiesCad)}
                        </span>
                    </div>

                    <div
                        className="flex justify-between mb-sm"
                        style={{
                            paddingTop: '0.75rem',
                            borderTop: '2px solid var(--color-border)',
                            marginTop: '0.75rem'
                        }}
                    >
                        <span className="font-bold">Total</span>
                        <div className="text-right">
                            <div className="font-bold">
                                {formatCurrencyWithLabel(familyData.totalCad)}
                            </div>
                            <div className="text-small text-muted">
                                ≈ {formatCurrencyWithLabel(totalMxn, 'MXN')}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between mb-sm">
                        <span className="text-muted">Pagado</span>
                        <div className="text-right">
                            <div className="font-semibold" style={{ color: 'var(--color-success)' }}>
                                {formatCurrencyWithLabel(familyData.paidCad)}
                            </div>
                            <div className="text-small text-muted">
                                ≈ {formatCurrencyWithLabel(paidMxn, 'MXN')}
                            </div>
                        </div>
                    </div>

                    <div
                        className="flex justify-between"
                        style={{
                            paddingTop: '0.75rem',
                            borderTop: '2px solid var(--color-border)',
                            marginTop: '0.75rem'
                        }}
                    >
                        <span className="font-bold">Saldo Pendiente</span>
                        <div className="text-right">
                            <div className="font-bold" style={{
                                color: familyData.balanceCad > 0 ? 'var(--color-error)' : 'var(--color-success)',
                                fontSize: '1.25rem'
                            }}>
                                {formatCurrencyWithLabel(familyData.balanceCad)}
                            </div>
                            <div className="text-small text-muted">
                                ≈ {formatCurrencyWithLabel(balanceMxn, 'MXN')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exchange Rate Disclaimer */}
                <div className="alert alert-info" style={{ fontSize: '0.875rem', padding: '0.75rem' }}>
                    <strong>Nota:</strong> Conversión aproximada. El banco determina el tipo de cambio final.
                    <br />
                    <span className="text-small">Tasa actual: 1 CAD = {exchangeRate.toFixed(4)} MXN</span>
                </div>

                {/* Payment Deadlines */}
                {familyData.paymentDeadlines && familyData.paymentDeadlines.length > 0 && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <h4 className="font-semibold mb-md">Fechas Límite de Pago</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {familyData.paymentDeadlines.map((deadline, index) => (
                                <div
                                    key={index}
                                    className="flex justify-between items-center"
                                    style={{
                                        padding: '0.75rem',
                                        background: 'var(--color-bg)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-border)'
                                    }}
                                >
                                    <div>
                                        <div className="font-semibold">{deadline.label}</div>
                                        <div className="text-small text-muted">
                                            {formatDate(deadline.dueDate)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-md">
                                        <span className="font-semibold">
                                            {formatCurrencyWithLabel(deadline.amountCad)}
                                        </span>
                                        <Badge status={deadline.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default CostBreakdown;
