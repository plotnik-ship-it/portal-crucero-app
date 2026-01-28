import { signOut } from '../../services/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../shared/LanguageSwitcher';

const Header = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <header className="app-header" style={{
            // Logo is White (_bco). So header MUST be dark.
            background: 'rgba(15, 23, 42, 0.8)', // Dark semi-transparent
            backdropFilter: 'blur(10px)',
            color: 'white',
            padding: '1rem 0',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div className="container">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-md">
                        {/* Logo */}
                        <img
                            src="/logo%20travelpoint%20english_bco.png"
                            alt="TravelPoint"
                            className="logo"
                            style={{
                                height: '65px',
                                objectFit: 'contain'
                            }}
                        />

                        {isAdmin && (
                            <span className="badge hide-mobile" style={{
                                background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-info) 100%)',
                                color: 'white',
                                fontSize: '0.65rem',
                                padding: '0.2rem 0.6rem',
                                boxShadow: '0 2px 5px rgba(59, 130, 246, 0.4)'
                            }}>
                                ADMIN
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-md">
                        {isAdmin && (
                            <nav style={{ display: 'flex', gap: '1rem', marginRight: '1rem' }}>
                                <button
                                    onClick={() => navigate('/admin')}
                                    className="btn btn-sm"
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    🏠 Dashboard
                                </button>
                                <button
                                    onClick={() => navigate('/admin/requests')}
                                    className="btn btn-sm"
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    📋 Beta Requests
                                </button>
                                <button
                                    onClick={() => navigate('/admin/agencies')}
                                    className="btn btn-sm"
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    🏢 Agencies
                                </button>
                            </nav>
                        )}
                        {/* SuperAdmin Link - Only visible to superAdmins */}
                        {user?.isSuperAdmin && (
                            <button
                                onClick={() => navigate('/superadmin')}
                                className="btn btn-sm"
                                style={{
                                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                    color: 'white',
                                    border: 'none',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    boxShadow: '0 2px 8px rgba(251, 191, 36, 0.4)'
                                }}
                            >
                                👑 SuperAdmin
                            </button>
                        )}
                        <LanguageSwitcher />
                        <button
                            onClick={handleSignOut}
                            className="btn btn-sm"
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(4px)',
                                fontSize: '0.8rem'
                            }}
                        >
                            {t('common.logout')}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
