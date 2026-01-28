import './i18n/config'; // ← Inicializar i18n
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { GroupProvider } from './contexts/GroupContext';
import { AgencyProvider } from './contexts/AgencyContext';
import Loading from './components/shared/Loading';
import BrandingWrapper from './components/shared/BrandingWrapper';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Eager load (critical for initial render)
import Login from './components/auth/Login';
import LoginWhiteLabel from './components/auth/LoginWhiteLabel';
import ForgotPassword from './components/auth/ForgotPassword';

// Lazy load (heavy components)
const FamilyDashboard = lazy(() => import('./components/family/FamilyDashboard'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const MigrationTool = lazy(() => import('./components/admin/MigrationTool'));
const AgencyManager = lazy(() => import('./components/admin/AgencyManager'));
const AgencyRequests = lazy(() => import('./components/admin/AgencyRequests'));
const AgencyBrandingConfig = lazy(() => import('./components/admin/AgencyBranding/AgencyBrandingConfig'));
const AgencySettings = lazy(() => import('./components/admin/AgencySettings'));
const ActivityLog = lazy(() => import('./components/admin/ActivityLog'));
const DesignPreview = lazy(() => import('./pages/DesignPreview'));
const RequestAccessForm = lazy(() => import('./components/auth/RequestAccessForm'));
const RequestAccessSuccess = lazy(() => import('./components/auth/RequestAccessSuccess'));
const Signup = lazy(() => import('./components/auth/Signup'));
const BillingDashboard = lazy(() => import('./components/billing/BillingDashboard'));
const PlanSelector = lazy(() => import('./components/billing/PlanSelector'));
const OnboardingWizard = lazy(() => import('./components/onboarding/OnboardingWizard'));
const TravelerDashboard = lazy(() => import('./components/traveler/TravelerDashboard'));
const SuperAdminPanel = lazy(() => import('./components/superadmin/SuperAdminPanel'));
const ContractImportPage = lazy(() => import('./components/admin/ContractImport/ContractImportPage'));
const AcceptInvite = lazy(() => import('./components/auth/AcceptInvite'));

// Guards
import SuperAdminGuard from './components/guards/SuperAdminGuard';

import './styles/index.css';

function App() {
  const { user, isAdmin, loading, onboardingCompleted } = useAuth();

  if (loading) {
    return <Loading message="Cargando aplicación..." />;
  }

  return (
    <AgencyProvider>
      <GroupProvider>
        <BrowserRouter>
          <BrandingWrapper>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={user ? <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace /> : <Login />}
              />
              <Route
                path="/login-v2"
                element={user ? <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace /> : <LoginWhiteLabel />}
              />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/accept-invite" element={<Suspense fallback={<Loading />}><AcceptInvite /></Suspense>} />

              {/* Request Access Routes */}
              <Route path="/request-access" element={<Suspense fallback={<Loading />}><RequestAccessForm lang="es" /></Suspense>} />
              <Route path="/request-access/success" element={<Suspense fallback={<Loading />}><RequestAccessSuccess lang="es" /></Suspense>} />

              {/* Signup Route */}
              <Route path="/signup" element={<Suspense fallback={<Loading />}><Signup /></Suspense>} />

              {/* Design Preview - Public for testing */}
              <Route path="/design-preview" element={<DesignPreview />} />

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
                    {!onboardingCompleted ? <Navigate to="/onboarding" replace /> : <AdminDashboard />}
                  </ProtectedRoute>
                }
              />

              {/* Onboarding Wizard */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute adminOnly>
                    <OnboardingWizard />
                  </ProtectedRoute>
                }
              />

              {/* Traveler Dashboard */}
              <Route
                path="/traveler"
                element={
                  <Suspense fallback={<Loading />}>
                    <TravelerDashboard />
                  </Suspense>
                }
              />

              {/* Migration Tool - Temporary */}
              <Route
                path="/admin/migrate"
                element={
                  <ProtectedRoute adminOnly>
                    <MigrationTool />
                  </ProtectedRoute>
                }
              />

              {/* Agency Manager */}
              <Route
                path="/admin/agencies"
                element={
                  <ProtectedRoute adminOnly>
                    <Suspense fallback={<Loading />}>
                      <AgencyManager />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/requests"
                element={
                  <ProtectedRoute adminOnly>
                    <Suspense fallback={<Loading />}>
                      <AgencyRequests />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* Agency Branding Configuration */}
              <Route
                path="/admin/branding"
                element={
                  <ProtectedRoute adminOnly>
                    <AgencyBrandingConfig />
                  </ProtectedRoute>
                }
              />

              {/* Agency Settings */}
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute adminOnly>
                    <AgencySettings />
                  </ProtectedRoute>
                }
              />

              {/* Activity Log */}
              <Route
                path="/admin/activity-log"
                element={
                  <ProtectedRoute adminOnly>
                    <ActivityLog />
                  </ProtectedRoute>
                }
              />

              {/* Contract Import (OCR) */}
              <Route
                path="/admin/import-contract"
                element={
                  <ProtectedRoute adminOnly>
                    <Suspense fallback={<Loading />}>
                      <ContractImportPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* SuperAdmin Panel */}
              <Route
                path="/superadmin"
                element={
                  <ProtectedRoute adminOnly>
                    <Suspense fallback={<Loading />}>
                      <SuperAdminGuard>
                        <SuperAdminPanel />
                      </SuperAdminGuard>
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* Billing Routes */}
              <Route
                path="/billing"
                element={
                  <ProtectedRoute adminOnly>
                    <Suspense fallback={<Loading />}>
                      <BillingDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/billing/plans"
                element={
                  <ProtectedRoute adminOnly>
                    <Suspense fallback={<Loading />}>
                      <PlanSelector />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/billing/success"
                element={
                  <ProtectedRoute adminOnly>
                    <Suspense fallback={<Loading />}>
                      <div className="success-page">
                        <div className="success-content">
                          <div className="success-icon">✓</div>
                          <h1>Subscription Successful!</h1>
                          <p>Thank you for subscribing to TravelPoint.</p>
                          <p>Your subscription is now active and you can start using all features.</p>
                          <a href="/billing" className="btn-primary">View Billing Dashboard</a>
                        </div>
                      </div>
                    </Suspense>
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
          </BrandingWrapper>
        </BrowserRouter>
      </GroupProvider>
    </AgencyProvider>
  );
}

export default App;

