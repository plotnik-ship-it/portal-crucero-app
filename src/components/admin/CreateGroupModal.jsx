import { useState } from 'react';
import { createGroup } from '../../services/firestore';
import { useAuth } from '../../hooks/useAuth';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
    const { userData } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        shipName: '',
        departureDate: '',
        returnDate: '',
        departurePort: '',
        exchangeRate: '18.50'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name.trim()) {
            setError('El nombre del grupo es requerido');
            return;
        }

        if (!userData?.agencyId) {
            setError('No se encontró la agencia del usuario');
            return;
        }

        setLoading(true);

        try {
            const groupData = {
                name: formData.name.trim(),
                shipName: formData.shipName.trim() || null,
                departureDate: formData.departureDate || null,
                returnDate: formData.returnDate || null,
                departurePort: formData.departurePort.trim() || null,
                exchangeRate: parseFloat(formData.exchangeRate) || 18.50,
                agencyId: userData.agencyId,
                // Default itinerary structure
                itinerary: []
            };

            const groupId = await createGroup(groupData);
            console.log('✅ Group created:', groupId);

            // Reset form
            setFormData({
                name: '',
                shipName: '',
                departureDate: '',
                returnDate: '',
                departurePort: '',
                exchangeRate: '18.50'
            });

            // Notify parent
            if (onGroupCreated) {
                onGroupCreated(groupId);
            }

            onClose();
        } catch (err) {
            console.error('Error creating group:', err);
            setError(err.message || 'Error al crear el grupo');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Crear Nuevo Grupo de Crucero</h2>
                    <button
                        className="modal-close"
                        onClick={onClose}
                        disabled={loading}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">
                            Nombre del Grupo <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej: Grupo Crucero MSC Seascape 2027"
                            required
                            disabled={loading}
                        />
                        <small style={{ color: 'var(--color-text-muted)' }}>
                            Este nombre se mostrará en el selector de grupos
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="shipName">Nombre del Barco</label>
                        <input
                            type="text"
                            id="shipName"
                            name="shipName"
                            className="form-input"
                            value={formData.shipName}
                            onChange={handleChange}
                            placeholder="Ej: MSC SEASCAPE"
                            disabled={loading}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label htmlFor="departureDate">Fecha de Salida</label>
                            <input
                                type="date"
                                id="departureDate"
                                name="departureDate"
                                className="form-input"
                                value={formData.departureDate}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="returnDate">Fecha de Regreso</label>
                            <input
                                type="date"
                                id="returnDate"
                                name="returnDate"
                                className="form-input"
                                value={formData.returnDate}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="departurePort">Puerto de Salida</label>
                        <input
                            type="text"
                            id="departurePort"
                            name="departurePort"
                            className="form-input"
                            value={formData.departurePort}
                            onChange={handleChange}
                            placeholder="Ej: Miami, Florida"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="exchangeRate">Tipo de Cambio (CAD/MXN)</label>
                        <input
                            type="number"
                            id="exchangeRate"
                            name="exchangeRate"
                            className="form-input"
                            value={formData.exchangeRate}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            disabled={loading}
                        />
                        <small style={{ color: 'var(--color-text-muted)' }}>
                            Tipo de cambio para conversión de moneda
                        </small>
                    </div>

                    {error && (
                        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={onClose}
                            disabled={loading}
                            style={{ flex: 1 }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ flex: 1 }}
                        >
                            {loading ? 'Creando...' : 'Crear Grupo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;
