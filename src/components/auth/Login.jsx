import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signIn } from '../../services/auth';
import { useNavigate, Link } from 'react-router-dom';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import './Login.css';

const Login = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            // Navigation will be handled by App.jsx based on user role
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Animated Background */}
            <div className="login-background">
                <div className="login-gradient"></div>
                <div className="login-pattern"></div>
            </div>

            {/* Language Switcher - Top Right */}
            <div className="login-language-switcher">
                <LanguageSwitcher />
            </div>

            <div className="login-container">
                {/* Logo */}
                <div className="login-logo">
                    <img
                        src="/logo%20travelpoint%20english_bco.png"
                        alt="TravelPoint"
                    />
                </div>

                {/* Login Card */}
                <div className="login-card">
                    <div className="login-card-header">
                        <div className="login-icon">
                            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {/* Ship Hull */}
                                <path d="M15 50L20 45H60L65 50L62 58C61 60 59 61 57 61H23C21 61 19 60 18 58L15 50Z"
                                    fill="url(#hullGradient)" stroke="#1E7BA8" strokeWidth="2" />

                                {/* Ship Deck Levels */}
                                <rect x="22" y="35" width="36" height="10" rx="1" fill="#3B9FD8" stroke="#2D9CDB" strokeWidth="1.5" />
                                <rect x="26" y="27" width="28" height="8" rx="1" fill="#5AB9EA" stroke="#3B9FD8" strokeWidth="1.5" />
                                <rect x="30" y="21" width="20" height="6" rx="1" fill="#7DCEF5" stroke="#5AB9EA" strokeWidth="1.5" />

                                {/* Windows */}
                                <rect x="25" y="37" width="3" height="4" rx="0.5" fill="#E8F4F8" />
                                <rect x="30" y="37" width="3" height="4" rx="0.5" fill="#E8F4F8" />
                                <rect x="35" y="37" width="3" height="4" rx="0.5" fill="#E8F4F8" />
                                <rect x="40" y="37" width="3" height="4" rx="0.5" fill="#E8F4F8" />
                                <rect x="45" y="37" width="3" height="4" rx="0.5" fill="#E8F4F8" />
                                <rect x="50" y="37" width="3" height="4" rx="0.5" fill="#E8F4F8" />

                                {/* Smokestack */}
                                <rect x="36" y="15" width="8" height="6" rx="1" fill="#FF8A65" stroke="#FF6F4D" strokeWidth="1.5" />

                                {/* Smoke */}
                                <circle cx="38" cy="12" r="2" fill="#E0E6ED" opacity="0.6" />
                                <circle cx="42" cy="10" r="2.5" fill="#E0E6ED" opacity="0.5" />
                                <circle cx="40" cy="8" r="2" fill="#E0E6ED" opacity="0.4" />

                                {/* Waves */}
                                <path d="M10 62C12 60 14 60 16 62C18 64 20 64 22 62C24 60 26 60 28 62C30 64 32 64 34 62C36 60 38 60 40 62C42 64 44 64 46 62C48 60 50 60 52 62C54 64 56 64 58 62C60 60 62 60 64 62C66 64 68 64 70 62"
                                    stroke="#2D9CDB" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />

                                <defs>
                                    <linearGradient id="hullGradient" x1="40" y1="45" x2="40" y2="61" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#2D9CDB" />
                                        <stop offset="1" stopColor="#1E7BA8" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <h1 className="login-title">{t('login.title')}</h1>
                        <p className="login-subtitle">{t('login.subtitle', 'Ingresa a tu cuenta')}</p>
                    </div>

                    <div className="login-card-body">
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                                    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
                                    <path d="M10 6V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx="10" cy="14" r="1" fill="currentColor" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label htmlFor="email" className="form-label required">
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                        <rect x="2" y="4" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                        <path d="M2 5L9 10L16 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                    {t('login.email')}
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    className="form-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('login.emailPlaceholder', 'tu@email.com')}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password" className="form-label required">
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                        <rect x="4" y="8" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                        <path d="M6 8V5C6 3.34315 7.34315 2 9 2C10.6569 2 12 3.34315 12 5V8" stroke="currentColor" strokeWidth="1.5" />
                                        <circle cx="9" cy="11.5" r="1" fill="currentColor" />
                                    </svg>
                                    {t('login.password')}
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    className="form-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg btn-block login-submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="login-spinner"></span>
                                        {t('login.loading', 'Ingresando...')}
                                    </>
                                ) : (
                                    <>
                                        {t('login.submit')}
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginLeft: '0.5rem' }}>
                                            <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="login-footer">
                            <Link to="/forgot-password" className="login-forgot-link">
                                {t('login.forgotPassword')}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer Text */}
                <div className="login-bottom-text">
                    <p>{t('login.portalTagline', 'Group Travel Management')}</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
