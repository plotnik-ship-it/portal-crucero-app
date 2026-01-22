import { useState, useEffect } from 'react';
import { getAllFamilies } from '../../services/firestore';
import Card from '../shared/Card';
import { formatCurrencyWithLabel } from '../../services/currencyService';

const FamilyList = ({ onSelectFamily }) => {
    const [families, setFamilies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadFamilies();
    }, []);

    const loadFamilies = async () => {
        try {
            const data = await getAllFamilies();
            setFamilies(data);
        } catch (error) {
            console.error('Error loading families:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredFamilies = families.filter(family => {
        const search = searchTerm.toLowerCase();
        return (
            family.displayName?.toLowerCase().includes(search) ||
            family.familyCode?.toLowerCase().includes(search) ||
            family.cabinNumbers?.some(cabin => cabin.toLowerCase().includes(search))
        );
    });

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <Card>
            <div className="card-header">
                <h3 className="card-title">👥 Familias ({families.length})</h3>
                <input
                    type="text"
                    className="form-input mt-md"
                    placeholder="Buscar por nombre, código o cabina..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="card-body">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Cabina(s)</th>
                                <th>Total</th>
                                <th>Pagado</th>
                                <th>Saldo</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFamilies.map((family) => (
                                <tr key={family.id}>
                                    <td className="font-semibold">{family.familyCode}</td>
                                    <td>{family.displayName}</td>
                                    <td className="text-small">{family.cabinNumbers?.join(', ')}</td>
                                    <td>{formatCurrencyWithLabel(family.totalCadGlobal || family.totalCad)}</td>
                                    <td style={{ color: 'var(--color-success)' }}>
                                        {formatCurrencyWithLabel(family.paidCadGlobal || family.paidCad)}
                                    </td>
                                    <td style={{ color: (family.balanceCadGlobal || family.balanceCad) > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                                        {formatCurrencyWithLabel(family.balanceCadGlobal || family.balanceCad)}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => onSelectFamily(family)}
                                            className="btn btn-sm btn-primary"
                                        >
                                            Ver
                                        </button>
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

export default FamilyList;
