import { useState } from 'react';
import { deleteGroup } from '../../services/firestore';

const DeleteGroupModal = ({ isOpen, group, onClose, onDeleted }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmed, setConfirmed] = useState(false);

    const handleDelete = async () => {
        if (!confirmed) {
            setError('Debes confirmar que deseas eliminar el grupo');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await deleteGroup(group.id);
            console.log('✅ Group deleted successfully');

            if (onDeleted) {
                onDeleted();
            }

            onClose();
        } catch (err) {
            console.error('Error deleting group:', err);
            setError(err.message || 'Error al eliminar el grupo');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px', padding: '2.5rem' }}>
                <div className="modal-header">
                    <h2 className="modal-title">⚠️ Eliminar Grupo</h2>
                    <button
                        className="modal-close"
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            fontSize: '1.5rem',
                            width: '2rem',
                            height: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                        <strong>¡Advertencia!</strong> Esta acción no se puede deshacer.
                    </div>

                    <p style={{ marginBottom: '1rem' }}>
                        Estás a punto de eliminar el grupo:
                    </p>

                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'var(--color-background-alt, #f5f5f5)',
                        borderRadius: '0.5rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {group?.name}
                        </div>
                        {group?.shipName && (
                            <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.25rem' }}>
                                🚢 {group.shipName}
                            </div>
                        )}
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                disabled={loading}
                                style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                            />
                            <span>Confirmo que deseo eliminar este grupo permanentemente</span>
                        </label>
                    </div>

                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        marginTop: '2rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px solid var(--color-border)'
                    }}>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={onClose}
                            disabled={loading}
                            style={{ flex: 1, padding: '0.75rem 1.5rem' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleDelete}
                            disabled={loading || !confirmed}
                            style={{
                                flex: 1,
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'var(--color-danger, #dc3545)',
                                borderColor: 'var(--color-danger, #dc3545)'
                            }}
                        >
                            {loading ? 'Eliminando...' : 'Eliminar Grupo'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteGroupModal;
