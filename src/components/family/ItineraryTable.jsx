import Card from '../shared/Card';

const ItineraryTable = ({ itinerary }) => {
    if (!itinerary || itinerary.length === 0) return null;

    return (
        <Card>
            <div className="card-header">
                <h3 className="card-title">🗺️ Itinerario</h3>
            </div>
            <div className="card-body">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Día</th>
                                <th>Puerto</th>
                                <th>Llegada</th>
                                <th>Salida</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itinerary.map((stop, index) => (
                                <tr key={index}>
                                    <td className="font-semibold">{stop.day}</td>
                                    <td>{stop.port}</td>
                                    <td className="text-small">{stop.arrive || '-'}</td>
                                    <td className="text-small">{stop.depart || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    );
};

export default ItineraryTable;
