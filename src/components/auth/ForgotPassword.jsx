import { useState } from 'react';
import { resetPassword } from '../../services/auth';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        try {
            await resetPassword(email);
            setSuccess(true);
            setEmail('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e40af 0%, #0891b2 100%)'
        }}>
            <div className="container" style={{ maxWidth: '450px' }}>
                <div className="card">
                    <div className="card-header text-center">
                        <h1 className="card-title">Recuperar Contraseña</h1>
                        <p className="card-subtitle">
                            Ingresa tu correo y te enviaremos un link para restablecer tu contraseña
                        </p>
                    </div>

                    <div className="card-body">
                        {success && (
                            <div className="alert alert-success mb-lg">
                                ¡Email enviado! Revisa tu bandeja de entrada.
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-error mb-lg">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="email" className="form-label required">
                                    Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    className="form-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    required
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg btn-block"
                                disabled={loading}
                            >
                                {loading ? 'Enviando...' : 'Enviar Email'}
                            </button>
                        </form>

                        <div className="text-center mt-lg">
                            <Link to="/login" className="text-small">
                                ← Volver al inicio de sesión
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
