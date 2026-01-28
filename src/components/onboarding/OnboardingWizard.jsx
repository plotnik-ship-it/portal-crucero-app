/**
 * Onboarding Wizard - Main Container
 * 3-step wizard for agency onboarding
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
    saveAgencyProfile,
    saveBranding,
    uploadLogoToStorage,
    createGroupWithTemplate,
    importFamiliesFromCSV,
    completeOnboarding
} from '../../services/onboardingService';
import StepIndicator from './StepIndicator';
import AgencyProfileStep from './AgencyProfileStep';
import BrandingStep from './BrandingStep';
import GroupCreationStep from './GroupCreationStep';
import Loading from '../shared/Loading';
import './OnboardingWizard.css';

const OnboardingWizard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t, i18n } = useTranslation();

    const [currentLang, setCurrentLang] = useState(i18n.language || 'es');

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Step 1: Agency Profile
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        website: '',
        address: ''
    });

    // Step 2: Branding
    const [brandingData, setBrandingData] = useState({
        logoFile: null,
        logoPreview: null,
        primaryColor: '#3B9FD8'
    });

    // Step 3: Group Creation
    const [groupData, setGroupData] = useState({
        name: '',
        shipName: '',
        sailDate: '',
        itinerary: [
            { day: 1, port: '', arrive: '', depart: '' }
        ],
        paymentDeadlines: [
            { label: 'Deposit', dueDate: '', percentage: 25 },
            { label: 'Second Payment', dueDate: '', percentage: 25 },
            { label: 'Final Payment', dueDate: '', percentage: 50 }
        ],
        csvFamilies: []
    });

    const handleNext = () => {
        setError(null);

        // Validate current step
        if (currentStep === 1) {
            if (!profileData.name || !profileData.email) {
                setError('Please fill in all required fields (Name and Email)');
                return;
            }
        }

        if (currentStep === 2) {
            if (!brandingData.primaryColor) {
                setError('Please select a primary color');
                return;
            }
        }

        if (currentStep === 3) {
            if (!groupData.name || !groupData.shipName || !groupData.sailDate) {
                setError('Please fill in all required group fields');
                return;
            }

            // Validate deadlines
            const totalPercentage = groupData.paymentDeadlines.reduce((sum, d) => sum + parseFloat(d.percentage || 0), 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                setError(`Payment deadline percentages must sum to 100% (current: ${totalPercentage}%)`);
                return;
            }

            // Complete onboarding
            handleComplete();
            return;
        }

        setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        setError(null);
        setCurrentStep(currentStep - 1);
    };

    const toggleLanguage = () => {
        const newLang = currentLang === 'es' ? 'en' : 'es';
        setCurrentLang(newLang);
        i18n.changeLanguage(newLang);
    };

    const handleSkipStep3 = async () => {
        setLoading(true);
        setError(null);

        try {
            const agencyId = user.agencyId;

            if (!agencyId) {
                throw new Error('No agency ID found for user');
            }

            // Step 1: Save agency profile
            console.log('💾 Saving agency profile...');
            await saveAgencyProfile(agencyId, profileData);

            // Step 2: Upload logo and save branding
            console.log('🎨 Saving branding...');
            let logoUrl = null;
            let logoPath = null;

            if (brandingData.logoFile) {
                const logoResult = await uploadLogoToStorage(agencyId, brandingData.logoFile);
                logoUrl = logoResult.url;
                logoPath = logoResult.path;
            }

            await saveBranding(agencyId, brandingData, logoUrl, logoPath);

            // Step 3: Mark onboarding as complete (skip group creation)
            console.log('✅ Completing onboarding...');
            await completeOnboarding(user.uid, agencyId);

            // Redirect to admin dashboard
            navigate('/admin');
        } catch (err) {
            console.error('Error completing onboarding:', err);
            setError(err.message || 'Failed to complete onboarding');
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        setError(null);

        try {
            const agencyId = user.agencyId;

            if (!agencyId) {
                throw new Error('No agency ID found for user');
            }

            // Step 1: Save agency profile
            console.log('💾 Saving agency profile...');
            await saveAgencyProfile(agencyId, profileData);

            // Step 2: Upload logo and save branding
            console.log('🎨 Saving branding...');
            let logoUrl = null;
            let logoPath = null;

            if (brandingData.logoFile) {
                const logoResult = await uploadLogoToStorage(agencyId, brandingData.logoFile);
                logoUrl = logoResult.url;
                logoPath = logoResult.path;
            }

            await saveBranding(agencyId, brandingData, logoUrl, logoPath);

            // Step 3: Create group
            console.log('🚢 Creating group...');
            const groupId = await createGroupWithTemplate(agencyId, groupData);

            // Step 4: Import families from CSV (if any)
            if (groupData.csvFamilies && groupData.csvFamilies.length > 0) {
                console.log('📥 Importing families from CSV...');
                const importResult = await importFamiliesFromCSV(agencyId, groupId, groupData.csvFamilies);
                console.log(`✅ Imported ${importResult.successful} families, ${importResult.failed} failed`);

                if (importResult.failed > 0) {
                    console.warn('Some families failed to import:', importResult.errors);
                }
            }

            // Step 5: Mark onboarding as complete
            console.log('✅ Completing onboarding...');
            await completeOnboarding(user.uid, agencyId);

            // Redirect to admin dashboard
            navigate('/admin');
        } catch (err) {
            console.error('Error completing onboarding:', err);
            setError(err.message || 'Failed to complete onboarding');
            setLoading(false);
        }
    };

    if (loading) {
        return <Loading message="Completing onboarding..." />;
    }

    return (
        <div className="onboarding-wizard">
            <div className="onboarding-container">
                {/* Language Toggle Button */}
                <button
                    className="language-toggle-btn"
                    onClick={toggleLanguage}
                    title={t('onboarding.language')}
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M2 9h14M9 2c-1.5 2-1.5 4 0 6M9 9c1.5 2 1.5 4 0 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>{currentLang === 'es' ? 'ES' : 'EN'}</span>
                </button>

                <div className="onboarding-header">
                    <h1>🚀 {t('onboarding.title')}</h1>
                    <p className="subtitle">{t('onboarding.subtitle')}</p>
                    <StepIndicator currentStep={currentStep} totalSteps={3} lang={currentLang} />
                </div>

                {error && (
                    <div className="onboarding-error">
                        <span className="error-icon">⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                <div className="onboarding-content">
                    {currentStep === 1 && (
                        <AgencyProfileStep
                            data={profileData}
                            onChange={setProfileData}
                        />
                    )}

                    {currentStep === 2 && (
                        <BrandingStep
                            data={brandingData}
                            onChange={setBrandingData}
                        />
                    )}

                    {currentStep === 3 && (
                        <GroupCreationStep
                            data={groupData}
                            onChange={setGroupData}
                        />
                    )}
                </div>

                <div className="onboarding-actions">
                    {currentStep > 1 && (
                        <button
                            onClick={handleBack}
                            className="btn btn-outline"
                            disabled={loading}
                        >
                            ← {t('onboarding.back')}
                        </button>
                    )}

                    {currentStep === 3 && (
                        <button
                            onClick={handleSkipStep3}
                            className="btn btn-secondary"
                            disabled={loading}
                        >
                            {t('onboarding.skipAndFinish')}
                        </button>
                    )}

                    <button
                        onClick={handleNext}
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {currentStep === 3 ? `✅ ${t('onboarding.complete')}` : `${t('onboarding.next')} →`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
