import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { GroupProvider } from './contexts/GroupContext';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';
import FamilyDashboard from './components/family/FamilyDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import Loading from './components/shared/Loading';
import './styles/index.css';

function App() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <Loading message="Cargando aplicación..." />;
  }

  return (
    <GroupProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={user ? <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace /> : <Login />}
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {isAdmin ? <Navigate to="/admin" replace /> : <FamilyDashboard />}
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route
            path="/"
            element={
              user ? (
                <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GroupProvider>
  );
}

export default App;
