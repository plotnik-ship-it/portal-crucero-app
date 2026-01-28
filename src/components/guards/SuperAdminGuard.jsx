import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * SuperAdminGuard - Protect routes that require superAdmin role
 */
export default function SuperAdminGuard({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!user?.isSuperAdmin) {
        return <Navigate to="/admin" replace />;
    }

    return children;
}
