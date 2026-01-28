import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useFamilyData } from '../../hooks/useFamilyData';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import Layout from '../layout/Layout';
import Loading from '../shared/Loading';
import ErrorMessage from '../shared/ErrorMessage';
import CabinInfo from './CabinInfo';
import CostBreakdown from './CostBreakdown';
import ItineraryTable from './ItineraryTable';
import PaymentHistory from './PaymentHistory';
import PaymentRequestForm from './PaymentRequestForm';
import InvoiceList from './InvoiceList';
import ChangePasswordModal from './ChangePasswordModal';
import OnboardingTour from '../shared/OnboardingTour';

const FamilyDashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const {
        familyData,
        groupData,
        payments,
        paymentRequests,
        loading,
        error,
        refreshData
    } = useFamilyData(user?.uid);

    const { rate: exchangeRate } = useExchangeRate(familyData?.groupId);
    const [activeTab, setActiveTab] = useState('global');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Check if user needs onboarding
    useEffect(() => {
        const onboardingCompleted = localStorage.getItem('onboarding_completed');
        const onboardingSkipped = localStorage.getItem('onboarding_skipped');

        if (!onboardingCompleted && !onboardingSkipped && !loading && familyData) {
            // Show onboarding after a short delay
            const timer = setTimeout(() => {
                setShowOnboarding(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loading, familyData]);

    if (loading) {
        return (
            <Layout>
                <Loading message={t('family.loadingInfo', 'Cargando tu información...')} />
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="container page">
                    <ErrorMessage message={error} onRetry={refreshData} />
                </div>
            </Layout>
        );
    }

    if (!familyData) {
        return (
            <Layout>
                <div className="container page">
                    <ErrorMessage message={t('family.noData', 'No se encontró información de la familia')} />
                </div>
            </Layout>
        );
    }

    // Determine data to show based on active tab
    const getDisplayData = () => {
        if (activeTab === 'global') {
            return {
                ...familyData,
                subtotalCad: familyData.subtotalCadGlobal,
                gratuitiesCad: familyData.gratuitiesCadGlobal,
                totalCad: familyData.totalCadGlobal,
                paidCad: familyData.paidCadGlobal,
                balanceCad: familyData.balanceCadGlobal,
                // For global view, we might not show deadlines or show them aggregated.
                // Current simple approach: Don't show specific deadlines in global summary 
                // to avoid confusion, or show them if they exist in cabinAccounts[0] as a fallback?
                // Better: Hide deadlines in global view (empty array) strictly.
                paymentDeadlines: []
            };
        } else {
            // activeTab is index of cabinAccount
            const index = parseInt(activeTab);
            const cabinAccount = familyData.cabinAccounts?.[index];
            if (!cabinAccount) return null;
            return {
                ...familyData, // keep base info like display name
                ...cabinAccount // override financial info
            };
        }
    };

    const displayData = getDisplayData();
    const activeCabinNumber = activeTab !== 'global'
        ? familyData.cabinAccounts?.[parseInt(activeTab)]?.cabinNumber
        : null;

    return (
        <Layout>
            <div className="container page">
                {/* Welcome Header */}
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">
                            {t('common.welcome')}, {familyData.displayName}
                        </h1>
                        <p className="page-subtitle">
                            {t('family.bookingCode', 'Código de Familia')}: <strong>{familyData.bookingCode}</strong>
                        </p>
                    </div>
                    <button
                        className="btn btn-outline"
                        onClick={() => setShowPasswordModal(true)}
                        title={t('family.changePassword', 'Cambiar contraseña')}
                    >
                        🔐 {t('family.changePassword', 'Cambiar Contraseña')}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-md mb-lg" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1px' }}>
                    <button
                        className={`btn ${activeTab === 'global' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: activeTab === 'global' ? 'none' : '' }}
                        onClick={() => setActiveTab('global')}
                    >
                        🌐 {t('family.globalSummary', 'Resumen Global')}
                    </button>
                    {familyData.cabinAccounts?.map((cabin, index) => (
                        <button
                            key={index}
                            className={`btn ${activeTab === String(index) ? 'btn-primary' : 'btn-outline'}`}
                            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: activeTab === String(index) ? 'none' : '' }}
                            onClick={() => setActiveTab(String(index))}
                        >
                            🛳️ Cabina {cabin.cabinNumber}
                        </button>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Cabin Info - Only show relevant info */}
                    <CabinInfo
                        familyData={activeTab === 'global'
                            ? familyData
                            : { ...familyData, cabinNumbers: [activeCabinNumber] }
                        }
                        groupData={groupData}
                    />

                    {/* Cost Breakdown */}
                    {displayData && (
                        <CostBreakdown
                            familyData={displayData}
                            exchangeRate={exchangeRate}
                        />
                    )}

                    {/* Payment Request Form */}
                    <PaymentRequestForm
                        familyData={familyData} // Pass full family data
                        exchangeRate={exchangeRate}
                        onSuccess={refreshData}
                        defaultNote={activeCabinNumber ? `${t('family.advancePayment', 'Pago adelantado')} - ${t('family.cabin')} ${activeCabinNumber}` : ''}
                    />

                    {/* Itinerary - Only show on Global Tab to reduce noise? Or always? Always is fine. */}
                    {activeTab === 'global' && groupData?.itinerary && groupData.itinerary.length > 0 && (
                        <ItineraryTable itinerary={groupData.itinerary} />
                    )}

                    {/* Payment History - Always visible (GLOBAL) */}
                    {activeTab === 'global' && (
                        <PaymentHistory payments={payments} />
                    )}

                    {/* Invoice List - Always visible (GLOBAL) */}
                    {activeTab === 'global' && (
                        <InvoiceList
                            bookingId={familyData.id}
                            familyData={familyData}
                            agencyBranding={{
                                name: 'Travel Point',
                                email: familyData.agencyEmail || 'info@travelpoint.com',
                                phone: '+1 (555) 123-4567',
                                primaryColor: [41, 128, 185],
                                secondaryColor: [52, 73, 94]
                            }}
                        />
                    )}

                    {/* Payment Requests Status - Always visible (GLOBAL) */}
                    {activeTab === 'global' && paymentRequests && paymentRequests.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">📝 {t('family.myRequests', 'Mis Solicitudes de Adelanto')}</h3>
                            </div>
                            <div className="card-body">
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>{t('payment.date', 'Fecha')}</th>
                                                <th>{t('payment.amount', 'Monto')}</th>
                                                <th>{t('payment.status', 'Estado')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paymentRequests.map((request) => (
                                                <tr key={request.id}>
                                                    <td className="text-small">
                                                        {request.createdAt?.toDate().toLocaleDateString('es-MX')}
                                                    </td>
                                                    <td className="font-semibold">
                                                        ${request.amountCad.toFixed(2)} CAD
                                                    </td>
                                                    <td>
                                                        <span className={`badge badge-${request.status === 'Applied' ? 'success' :
                                                            request.status === 'Rejected' ? 'error' :
                                                                'warning'
                                                            }`}>
                                                            {request.status === 'Applied' ? t('payment.applied', 'Aplicado') :
                                                                request.status === 'Rejected' ? t('payment.rejected', 'Rechazado') :
                                                                    t('payment.pending', 'Pendiente')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Change Password Modal */}
                <ChangePasswordModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                />

                {/* Onboarding Tour */}
                <OnboardingTour
                    isActive={showOnboarding}
                    onComplete={() => setShowOnboarding(false)}
                    onSkip={() => setShowOnboarding(false)}
                />
            </div>
        </Layout>
    );
};

export default FamilyDashboard;
