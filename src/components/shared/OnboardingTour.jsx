import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './OnboardingTour.css';

/**
 * OnboardingTour Component
 * Interactive tour for new users with spotlight and tooltips
 */
const OnboardingTour = ({ isActive, onComplete, onSkip }) => {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [elementPosition, setElementPosition] = useState(null);

    const steps = [
        {
            target: '.page-header',
            title: t('onboarding.welcome.title', '¡Bienvenido!'),
            content: t('onboarding.welcome.content', 'Este es tu portal de crucero. Aquí podrás ver toda la información de tu viaje y gestionar tus pagos.'),
            position: 'bottom'
        },
        {
            target: '.cost-breakdown',
            title: t('onboarding.financial.title', 'Resumen Financiero'),
            content: t('onboarding.financial.content', 'Aquí puedes ver el desglose completo de costos de tu crucero, incluyendo el total, lo pagado y el saldo pendiente.'),
            position: 'bottom'
        },
        {
            target: '.payment-request-form',
            title: t('onboarding.request.title', 'Solicitar Adelanto'),
            content: t('onboarding.request.content', 'Usa este formulario para solicitar un adelanto de pago. El administrador revisará y aprobará tu solicitud.'),
            position: 'top'
        },
        {
            target: '.payment-history',
            title: t('onboarding.history.title', 'Historial de Pagos'),
            content: t('onboarding.history.content', 'Aquí encontrarás todos tus pagos registrados con fechas, montos y métodos de pago.'),
            position: 'top'
        },
        {
            target: '.language-selector',
            title: t('onboarding.language.title', 'Cambiar Idioma'),
            content: t('onboarding.language.content', 'Puedes cambiar el idioma del portal entre Español e Inglés en cualquier momento.'),
            position: 'bottom'
        }
    ];

    const currentStepData = steps[currentStep];

    const updateElementPosition = () => {
        if (!currentStepData) return;

        const element = document.querySelector(currentStepData.target);
        if (element) {
            const rect = element.getBoundingClientRect();
            setElementPosition({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height
            });
        }
    };

    useEffect(() => {
        if (isActive && currentStepData) {
            updateElementPosition();

            const element = document.querySelector(currentStepData.target);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Update position on resize
            window.addEventListener('resize', updateElementPosition);
            return () => window.removeEventListener('resize', updateElementPosition);
        }
    }, [currentStep, isActive, currentStepData]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('onboarding_completed_date', new Date().toISOString());
        onComplete();
    };

    const handleSkipTour = () => {
        localStorage.setItem('onboarding_skipped', 'true');
        localStorage.setItem('onboarding_skipped_date', new Date().toISOString());
        onSkip();
    };

    const getTooltipPosition = () => {
        if (!elementPosition) return {};

        const offset = 20;
        const tooltipWidth = 400;

        switch (currentStepData.position) {
            case 'top':
                return {
                    top: `${elementPosition.top - offset}px`,
                    left: `${elementPosition.left + elementPosition.width / 2}px`,
                    transform: 'translate(-50%, -100%)'
                };
            case 'bottom':
                return {
                    top: `${elementPosition.top + elementPosition.height + offset}px`,
                    left: `${elementPosition.left + elementPosition.width / 2}px`,
                    transform: 'translateX(-50%)'
                };
            case 'left':
                return {
                    top: `${elementPosition.top + elementPosition.height / 2}px`,
                    left: `${elementPosition.left - offset}px`,
                    transform: 'translate(-100%, -50%)'
                };
            case 'right':
                return {
                    top: `${elementPosition.top + elementPosition.height / 2}px`,
                    left: `${elementPosition.left + elementPosition.width + offset}px`,
                    transform: 'translateY(-50%)'
                };
            default:
                return {};
        }
    };

    if (!isActive || !currentStepData || !elementPosition) return null;

    return (
        <>
            {/* Overlay */}
            <div className="onboarding-overlay" onClick={handleSkipTour} />

            {/* Spotlight */}
            <div
                className="onboarding-spotlight"
                style={{
                    top: `${elementPosition.top - 8}px`,
                    left: `${elementPosition.left - 8}px`,
                    width: `${elementPosition.width + 16}px`,
                    height: `${elementPosition.height + 16}px`
                }}
            />

            {/* Tooltip */}
            <div
                className="onboarding-tooltip"
                style={getTooltipPosition()}
            >
                <div className="onboarding-tooltip-header">
                    <h3>{currentStepData.title}</h3>
                    <button
                        className="btn-close-tour"
                        onClick={handleSkipTour}
                        title="Cerrar tour"
                    >
                        ✕
                    </button>
                </div>
                <div className="onboarding-tooltip-body">
                    <p>{currentStepData.content}</p>
                </div>
                <div className="onboarding-tooltip-footer">
                    <div className="onboarding-progress">
                        <div className="progress-dots">
                            {steps.map((_, index) => (
                                <div
                                    key={index}
                                    className={`progress-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                                />
                            ))}
                        </div>
                        <span className="progress-text">
                            {currentStep + 1} / {steps.length}
                        </span>
                    </div>
                    <div className="onboarding-actions">
                        {currentStep > 0 && (
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={handlePrevious}
                            >
                                ← {t('onboarding.previous', 'Anterior')}
                            </button>
                        )}
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleNext}
                        >
                            {currentStep < steps.length - 1
                                ? t('onboarding.next', 'Siguiente') + ' →'
                                : t('onboarding.finish', '¡Entendido!')}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default OnboardingTour;
