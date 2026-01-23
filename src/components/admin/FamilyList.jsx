import { useState, useEffect } from 'react';
import { getFamiliesByGroup, deleteFamily } from '../../services/firestore';
import Card from '../shared/Card';
import { formatCurrencyWithLabel } from '../../services/currencyService';

const FamilyList = ({ groupId, onSelectFamily }) => {
    const [families, setFamilies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (groupId) {
            loadFamilies();
        }
    }, [groupId]);

    const loadFamilies = async () => {
        if (!groupId) {
            setFamilies([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await getFamiliesByGroup(groupId);
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

    const handleDelete = async (family) => {
        if (window.confirm(`¿Estás seguro de eliminar a la familia ${family.displayName}?\nEsta acción no se puede deshacer.`)) {
            try {
                await deleteFamily(family.id);
                loadFamilies();
            } catch (error) {
                alert('Error al eliminar la familia');
            }
        }
    };

    // Calculate Global Totals
    const globalStats = families.reduce((stats, family) => {
        return {
            total: stats.total + (family.totalCadGlobal || 0),
            paid: stats.paid + (family.paidCadGlobal || 0),
            balance: stats.balance + (family.balanceCadGlobal || 0)
        };
    }, { total: 0, paid: 0, balance: 0 });

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <Card>
            <div className="card-header">
                {/* Global Stats - Horizontal Cards */}
                <div className="grid grid-cols-3 gap-md mb-xl">
                    <div className="p-md rounded bg-light border-light text-center">
                        <p className="text-small text-muted uppercase font-bold">Total Grupo</p>
                        <p className="text-xl font-bold text-primary">{formatCurrencyWithLabel(globalStats.total)}</p>
                    </div>
                    <div className="p-md rounded bg-light border-light text-center">
                        <p className="text-small text-muted uppercase font-bold text-success">Total Pagado</p>
                        <p className="text-xl font-bold text-success">{formatCurrencyWithLabel(globalStats.paid)}</p>
                    </div>
                    <div className="p-md rounded bg-light border-light text-center">
                        <p className="text-small text-muted uppercase font-bold text-warning">Saldo Pendiente</p>
                        <p className="text-xl font-bold text-warning">{formatCurrencyWithLabel(globalStats.balance)}</p>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-lg">
                    <h3 className="card-title">👥 Cabinas ({families.reduce((sum, f) => sum + (f.cabinNumbers?.length || 0), 0)})</h3>
                    <input
                        type="text"
                        className="form-input"
                        style={{ maxWidth: '300px' }}
                        placeholder="Buscar por nombre, código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="card-body">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Cabina(s)</th>
                                <th>Depósito</th>
                                <th>Total</th>
                                <th>Pagado</th>
                                <th>Saldo</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFamilies.map((family) => (
                                <tr key={family.id}>
                                    <td className="font-semibold">{family.familyCode}</td>
                                    <td>{family.displayName}</td>
                                    <td className="text-small">{family.cabinNumbers?.join(', ')}</td>
                                    <td className="text-small">
                                        {family.cabinAccounts?.map((cabin, idx) => (
                                            <div key={idx} title={`Cabina ${cabin.cabinNumber}`}>
                                                {cabin.depositPaid ? '✅' : '❌'} <span className="text-muted text-xs">{cabin.cabinNumber}</span>
                                            </div>
                                        ))}
                                    </td>
                                    <td>{formatCurrencyWithLabel(family.totalCadGlobal || family.totalCad)}</td>
                                    <td style={{ color: 'var(--color-success)' }}>
                                        {formatCurrencyWithLabel(family.paidCadGlobal || family.paidCad)}
                                    </td>
                                    <td style={{ color: (family.balanceCadGlobal || family.balanceCad) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                        {formatCurrencyWithLabel(family.balanceCadGlobal || family.balanceCad)}
                                    </td>
                                    <td className="text-right">
                                        <div className="flex gap-sm justify-end">
                                            <button
                                                onClick={() => onSelectFamily(family)}
                                                className="btn btn-sm btn-outline-primary"
                                                title="Ver detalles"
                                            >
                                                Ver Detalle
                                            </button>
                                            <button
                                                onClick={() => handleDelete(family)}
                                                className="btn btn-sm btn-outline-danger"
                                                title="Eliminar familia"
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
            </div>
        </Card>
    );
};

export default FamilyList;
