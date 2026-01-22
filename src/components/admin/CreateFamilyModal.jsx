import { useState } from 'react';
import { createFamily } from '../../services/firestore';

const CreateFamilyModal = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        familyCode: '',
        email: '',
        cabinCount: 1, // Default to 1 cabin
        password: 'password123' // Default password as per requirement (or empty to let them set it?)
        // User previously used 'password123' for bulk import. I'll stick to that default.
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Prepare cabin accounts based on count
            const cabinAccounts = Array.from({ length: parseInt(formData.cabinCount) }).map((_, idx) => ({
                cabinNumber: `Cabina ${idx + 1}`,
                bookingNumber: '',
                subtotalCad: 0,
                gratuitiesCad: 0,
                totalCad: 0,
                paidCad: 0,
                balanceCad: 0,
                paymentDeadlines: [],
                depositPaid: false
            }));

            const cabinNumbers = cabinAccounts.map(c => c.cabinNumber);

            const familyData = {
                displayName: formData.displayName,
                familyCode: formData.familyCode.toUpperCase(),
                email: formData.email,
                password: formData.password,
                cabinNumbers,
                cabinAccounts,
                role: 'family',
                subtotalCadGlobal: 0,
                gratuitiesCadGlobal: 0,
                totalCadGlobal: 0,
                paidCadGlobal: 0,
                balanceCadGlobal: 0
            };

            await createFamily(familyData);

            alert(`Familia ${formData.displayName} creada exitosamente.`);
            onSuccess();
            onClose();

        } catch (error) {
            console.error('Error creating family:', error);
            alert(`Error al crear la familia: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h3 className="modal-title">Nueva Familia</h3>
                    <button onClick={onClose} className="btn-close">&times;</button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleSubmit} id="createFamilyForm">
                        <div className="form-group">
                            <label className="form-label required">Código de Familia</label>
                            <input
                                className="form-input"
                                value={formData.familyCode}
                                onChange={(e) => setFormData({ ...formData, familyCode: e.target.value })}
                                placeholder="Ej: FAM028"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">Nombre de Familia</label>
                            <input
                                className="form-input"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                placeholder="Ej: Familia Rodriguez"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="correo@ejemplo.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Número Inicial de Cabinas</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.cabinCount}
                                onChange={(e) => setFormData({ ...formData, cabinCount: Math.max(1, parseInt(e.target.value) || 1) })}
                                min="1"
                                max="10"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">Contraseña Temporal</label>
                            <input
                                className="form-input"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                            <small className="text-muted">La familia usará esta contraseña para su primer ingreso.</small>
                        </div>
                    </form>
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-outline" type="button">Cancelar</button>
                    <button
                        type="submit"
                        form="createFamilyForm"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Creando...' : 'Crear Familia'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateFamilyModal;
