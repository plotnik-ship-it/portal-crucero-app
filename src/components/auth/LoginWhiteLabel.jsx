import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '../../services/auth';
import { getAgencyWithBranding, getAgencyContext } from '../../services/agencyService';
import { travelerLogin } from '../../services/travelerAuthService';
import { t, getLanguageName, toggleLanguage } from '../../i18n/i18n';
import RequestAccessModal from './RequestAccessModal';
import './LoginWhiteLabel.css';

const LoginWhiteLabel = () => {
    // State
    const [mode, setMode] = useState('agency'); // 'agency' or 'family'
    const [lang, setLang] = useState('es'); // 'es' or 'en'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [groupCode, setGroupCode] = useState(''); // NEW: Group code for traveler login
    const [bookingCode, setbookingCode] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [branding, setBranding] = useState(null);
    const [loadingBranding, setLoadingBranding] = useState(true);
    const [showRequestAccess, setShowRequestAccess] = useState(false);

    const navigate = useNavigate();

    // Load agency branding on mount
    useEffect(() => {
        // Disabled: branding loading causes permission errors on public routes
        // loadBranding();
        setLoadingBranding(false);
    }, []);

    const loadBranding = async () => {
        // Disabled: causes permission errors on public routes
        // try {
        //     const agencyBranding = await getAgencyWithBranding();
        //     setBranding(agencyBranding);
        //     if (agencyBranding.branding?.primaryColor) {
        //         document.documentElement.style.setProperty(
        //             '--login-primary-color',
        //             agencyBranding.branding.primaryColor
        //         );
        //     }
        // } catch (err) {
        //     console.error('Error loading branding:', err);
        // } finally {
        //     setLoadingBranding(false);
        // }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'agency') {
                // Agency login with email/password
                await signIn(email, password);
                // Navigation handled by App.jsx based on user role
            } else {
                // Traveler login with Group Code + Family Code + Password
                console.log('👥 Traveler login attempt');

                // Detect current agency context
                const agencyId = getAgencyContext();

                if (!agencyId) {
                    throw new Error(lang === 'es'
                        ? 'No se pudo detectar el contexto de la agencia'
                        : 'Could not detect agency context'
                    );
                }

                // Perform traveler login
                await travelerLogin({
                    agencyId: agencyId,
                    groupCode: groupCode,
                    bookingCode: bookingCode,
                    password: password
                });

                // Navigate to traveler dashboard
                navigate('/traveler');
            }
        } catch (err) {
            console.error('Login error:', err);

            // Map error to translated message
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError(t('errors.invalidCredentials', lang));
            } else if (err.code === 'auth/network-request-failed') {
                setError(t('errors.networkError', lang));
            } else if (mode === 'family') {
                // Use error message from travelerAuthService
                setError(err.message);
            } else {
                setError(t('errors.generic', lang));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleModeToggle = () => {
        setMode(mode === 'agency' ? 'family' : 'agency');
        setError('');
        setEmail('');
        setPassword('');
        setGroupCode('');
        setbookingCode('');
    };

    const handleLangToggle = () => {
        setLang(toggleLanguage(lang));
    };

    if (loadingBranding) {
        return (
            <div className="login-white-label-page">
                <div className="login-loading">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="login-white-label-page">
            {/* Background */}
            <div className="login-background-neutral"></div>

            {/* Language Toggle - Top Right */}
            <button
                className="login-lang-toggle"
                onClick={handleLangToggle}
                aria-label="Toggle language"
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 8h12M8 2c-1.5 2-1.5 4 0 6M8 8c1.5 2 1.5 4 0 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {getLanguageName(lang)}
            </button>

            <div className="login-container-neutral">
                {/* Tenant Context Banner */}
                {branding?.name && (
                    <div className="login-tenant-context">
                        <h2 className="tenant-name">{branding.name}</h2>
                        <p className="tenant-subtitle">
                            {t('login.tenantContext', lang)}
                        </p>
                    </div>
                )}

                {/* Logo */}
                {branding?.logoUrl && (
                    <div className="login-logo-neutral">
                        <img
                            src={branding.logoUrl}
                            alt={branding.name}
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                )}

                {/* Login Card */}
                <div className="login-card-neutral">
                    {/* Mode Toggle */}
                    <div className="login-mode-toggle">
                        <button
                            type="button"
                            className={`mode-btn ${mode === 'agency' ? 'active' : ''}`}
                            onClick={() => mode !== 'agency' && handleModeToggle()}
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <rect x="2" y="3" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M2 6h14" stroke="currentColor" strokeWidth="1.5" />
                                <circle cx="5" cy="4.5" r="0.5" fill="currentColor" />
                                <circle cx="7" cy="4.5" r="0.5" fill="currentColor" />
                            </svg>
                            {t('login.agencyMode', lang)}
                        </button>
                        <button
                            type="button"
                            className={`mode-btn ${mode === 'family' ? 'active' : ''}`}
                            onClick={() => mode !== 'family' && handleModeToggle()}
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <circle cx="9" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M4 15c0-2.5 2-4.5 5-4.5s5 2 5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            {t('login.familyMode', lang)}
                        </button>
                    </div>

                    {/* Header */}
                    <div className="login-card-header-neutral">
                        <h1 className="login-title-neutral">{t('login.title', lang)}</h1>
                        <p className="login-subtitle-neutral">
                            {mode === 'agency'
                                ? t('login.agencySubtitle', lang)
                                : t('login.travelerSubtitle', lang)
                            }
                        </p>
                    </div>

                    {/* Body */}
                    <div className="login-card-body-neutral">
                        {error && (
                            <div className="login-alert-error">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M9 5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <circle cx="9" cy="13" r="0.75" fill="currentColor" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="login-form-neutral">
                            {mode === 'agency' ? (
                                <>
                                    {/* Agency Mode: Email + Password */}
                                    <div className="form-group-neutral">
                                        <label htmlFor="email" className="form-label-neutral">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                                <path d="M2 5l6 4 6-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            </svg>
                                            {t('login.email', lang)}
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            className="form-input-neutral"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder={t('login.emailPlaceholder', lang)}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div className="form-group-neutral">
                                        <label htmlFor="password" className="form-label-neutral">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <rect x="4" y="7" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                                <path d="M6 7V5c0-1.5 1-2.5 2-2.5s2 1 2 2.5v2" stroke="currentColor" strokeWidth="1.5" />
                                                <circle cx="8" cy="10" r="0.75" fill="currentColor" />
                                            </svg>
                                            {t('login.password', lang)}
                                        </label>
                                        <input
                                            type="password"
                                            id="password"
                                            className="form-input-neutral"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={t('login.passwordPlaceholder', lang)}
                                            required
                                        />
                                    </div>

                                    {/* Remember Me - Agency Only */}
                                    {mode === 'agency' && (
                                        <div className="form-checkbox-neutral">
                                            <input
                                                type="checkbox"
                                                id="rememberMe"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                            />
                                            <label htmlFor="rememberMe">{t('login.rememberMe', lang)}</label>
                                        </div>
                                    )}
                                    {/* Agency Context */}
                                    <p className="login-agency-context">
                                        {t('login.agencyContext', lang)}
                                    </p>
                                </>
                            ) : (
                                <>
                                    {/* Traveler Mode: Group Code + Family Code + Password */}

                                    {/* Group Code Field */}
                                    <div className="form-group-neutral">
                                        <label htmlFor="groupCode" className="form-label-neutral">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                                <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            </svg>
                                            {t('login.groupCode', lang)}
                                        </label>
                                        <input
                                            type="text"
                                            id="groupCode"
                                            className="form-input-neutral"
                                            value={groupCode}
                                            onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                                            placeholder={t('login.groupCodePlaceholder', lang)}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    {/* Family Code Field */}
                                    <div className="form-group-neutral">
                                        <label htmlFor="bookingCode" className="form-label-neutral">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <circle cx="8" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
                                                <path d="M4 14c0-2 1.5-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            </svg>
                                            {t('login.bookingCode', lang)}
                                        </label>
                                        <input
                                            type="text"
                                            id="bookingCode"
                                            className="form-input-neutral"
                                            value={bookingCode}
                                            onChange={(e) => setbookingCode(e.target.value.toUpperCase())}
                                            placeholder={t('login.bookingCodePlaceholder', lang)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group-neutral">
                                        <label htmlFor="familyPassword" className="form-label-neutral">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <rect x="4" y="7" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                                <path d="M6 7V5c0-1.5 1-2.5 2-2.5s2 1 2 2.5v2" stroke="currentColor" strokeWidth="1.5" />
                                                <circle cx="8" cy="10" r="0.75" fill="currentColor" />
                                            </svg>
                                            {t('login.familyPassword', lang)}
                                        </label>
                                        <input
                                            type="password"
                                            id="familyPassword"
                                            className="form-input-neutral"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={t('login.passwordPlaceholder', lang)}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="btn-submit-neutral"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="btn-spinner"></span>
                                        {t('login.loading', lang)}
                                    </>
                                ) : (
                                    <>
                                        {t('login.submit', lang)}
                                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                            <path d="M3 9h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </>
                                )}
                            </button>

                            {/* Traveler Disclaimer */}
                            {mode === 'family' && (
                                <div style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    background: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    color: '#0c4a6e',
                                    lineHeight: '1.5'
                                }}>
                                    <strong>ℹ️ {lang === 'es' ? 'Nota' : 'Note'}:</strong>{' '}
                                    {lang === 'es'
                                        ? 'Como viajero, puedes ver tu información de reserva y saldo, pero no puedes realizar pagos directamente. Contacta a tu agencia para procesar pagos.'
                                        : 'As a traveler, you can view your booking information and balance, but cannot make payments directly. Contact your agency to process payments.'
                                    }
                                </div>
                            )}

                            {/* Security Note */}
                            <p className="login-security-note">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <rect x="3" y="6" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
                                    <path d="M5 6V4c0-1.5 1-2.5 2-2.5s2 1 2 2.5v2" stroke="currentColor" strokeWidth="1.2" />
                                </svg>
                                {t('login.securityNote', lang)}
                            </p>

                            {/* Forgot Password - Only in Agency Mode */}
                            {mode === 'agency' && (
                                <div className="login-footer-neutral">
                                    <Link to="/forgot-password" className="login-forgot-link-neutral">
                                        {t('login.forgotPassword', lang)}
                                    </Link>
                                </div>
                            )}

                            {/* Support CTA - Only in Traveler Mode */}
                            {mode === 'family' && (
                                <div className="login-support-cta">
                                    <p className="support-text">
                                        {t('login.supportText', lang)}
                                    </p>
                                    <p className="support-link">
                                        {t('login.contactAgency', lang)}
                                    </p>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* Footer */}
                {branding?.showPoweredBy !== false && branding?.footerText && (
                    <div className="login-footer-text">
                        <p>{branding.footerText}</p>
                    </div>
                )}


                {/* Request Access CTA - Only in Agency Mode */}
                {mode === 'agency' && (
                    <div className="login-request-access-cta">
                        <p className="request-access-text">
                            {t('login.agencySignup', lang)}
                        </p>
                        <button
                            className="request-access-button"
                            onClick={() => navigate('/request-access')}
                        >
                            {t('login.requestAccess', lang)}
                        </button>
                    </div>
                )}
            </div>

            {/* Request Access Modal */}
            <RequestAccessModal
                isOpen={showRequestAccess}
                onClose={() => setShowRequestAccess(false)}
                lang={lang}
            />
        </div>
    );
};

export default LoginWhiteLabel;
