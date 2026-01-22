import Card from '../shared/Card';
import { formatDate } from '../../utils/formatters';

const CabinInfo = ({ familyData, groupData }) => {
    if (!familyData) return null;

    // Helper to find booking number for a given cabin number string
    const getBookingNumber = (cabinNum) => {
        const account = familyData.cabinAccounts?.find(c => c.cabinNumber === cabinNum);
        return account?.bookingNumber || 'N/A';
    };

    return (
        <Card>
            <div className="card-header">
                <h3 className="card-title">📍 Información del Crucero</h3>
            </div>
            <div className="card-body">
                <div className="grid grid-2 gap-lg">
                    {/* Column 1: Cruise Details */}
                    <div className="flex flex-col gap-sm">
                        <div>
                            <p className="text-small text-muted">Barco</p>
                            <p className="font-semibold">{groupData?.shipName || 'Por definir'}</p>
                        </div>

                        <div>
                            <p className="text-small text-muted">Fecha de Salida</p>
                            <p className="font-semibold">{groupData?.sailDate ? formatDate(groupData.sailDate) : 'Por definir'}</p>
                        </div>

                        <div>
                            <p className="text-small text-muted">Pago Total (100%)</p>
                            <p className="font-semibold text-warning">
                                {groupData?.finalPaymentDate ? formatDate(groupData.finalPaymentDate) : 'Por definir'}
                            </p>
                        </div>
                    </div>

                    {/* Column 2: Cabin Details */}
                    <div>
                        <p className="text-small text-muted mb-sm">
                            {familyData.cabinNumbers.length > 1 ? 'Cabinas y Reservas' : 'Cabina y Reserva'}
                        </p>
                        <div className="flex flex-col gap-sm">
                            {familyData.cabinNumbers.map((num, idx) => (
                                <div key={idx} className="p-sm bg-light rounded flex justify-between items-center">
                                    <span className="font-bold">🚪 {num}</span>
                                    <span className="text-muted">Reserva: <strong className="text-dark">{getBookingNumber(num)}</strong></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default CabinInfo;
