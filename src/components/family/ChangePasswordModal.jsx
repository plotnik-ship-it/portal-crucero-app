import { useState } from 'react';
import { changePassword } from '../../services/auth';

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Validation
        if (newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (currentPassword === newPassword) {
            setError('La nueva contraseña debe ser diferente a la actual');
            return;
        }

        setLoading(true);

        try {
            await changePassword(currentPassword, newPassword);
            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            // Close modal after 2 seconds
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">🔐 Cambiar Contraseña</h2>
                    <button className="modal-close" onClick={handleClose}>×</button>
                </div>

                <div className="modal-body">
                    {success && (
                        <div className="alert alert-success mb-lg">
                            ✅ ¡Contraseña cambiada exitosamente!
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-error mb-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="currentPassword" className="form-label required">
                                Contraseña Actual
                            </label>
                            <input
                                type="password"
                                id="currentPassword"
                                className="form-input"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoFocus
                                disabled={loading || success}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="newPassword" className="form-label required">
                                Nueva Contraseña
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                className="form-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                disabled={loading || success}
                            />
                            <small className="text-small text-muted">
                                Mínimo 6 caracteres
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label required">
                                Confirmar Nueva Contraseña
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                className="form-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                disabled={loading || success}
                            />
                        </div>

                        <div className="flex gap-md" style={{ marginTop: '1.5rem' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading || success}
                            >
                                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={handleClose}
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
