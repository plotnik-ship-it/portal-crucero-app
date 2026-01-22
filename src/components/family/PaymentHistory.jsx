import Card from '../shared/Card';
import Badge from '../shared/Badge';
import { formatCurrencyWithLabel } from '../../services/currencyService';
import { formatTimestamp } from '../../utils/formatters';

const PaymentHistory = ({ payments }) => {
    if (!payments || payments.length === 0) {
        return (
            <Card>
                <div className="card-header">
                    <h3 className="card-title">📋 Historial de Pagos</h3>
                </div>
                <div className="card-body">
                    <p className="text-muted text-center">No hay pagos registrados aún.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="card-header">
                <h3 className="card-title">📋 Historial de Pagos</h3>
            </div>
            <div className="card-body">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Monto</th>
                                <th>Método</th>
                                <th>Referencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((payment) => (
                                <tr key={payment.id}>
                                    <td className="text-small">
                                        {formatTimestamp(payment.date)}
                                    </td>
                                    <td className="font-semibold">
                                        {formatCurrencyWithLabel(payment.amountCad)}
                                    </td>
                                    <td>{payment.method || 'N/A'}</td>
                                    <td className="text-small text-muted">
                                        {payment.reference || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    );
};

export default PaymentHistory;
