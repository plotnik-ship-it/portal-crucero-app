import { signOut } from '../../services/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Header = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <header style={{
            background: 'var(--color-surface)', // Glassmorphism-like light header on top of the dark body or vice-versa
            // Wait, per user request, Logo is White (_bco). So header MUST be dark.
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
                            style={{
                                height: '65px',
                                objectFit: 'contain'
                            }}
                        />

                        {isAdmin && (
                            <span className="badge" style={{
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
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
