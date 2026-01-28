/**
 * Step Indicator Component
 * Visual progress indicator for onboarding wizard
 */

import { useTranslation } from 'react-i18next';
import './StepIndicator.css';

const StepIndicator = ({ currentStep, totalSteps, lang }) => {
    const { t } = useTranslation();

    const steps = [
        { number: 1, label: t('onboarding.step1Title') },
        { number: 2, label: t('onboarding.step2Title') },
        { number: 3, label: t('onboarding.step3Title') }
    ];

    return (
        <div className="step-indicator">
            {steps.map((step, index) => (
                <div key={step.number} className="step-item-container">
                    <div className={`step-item ${currentStep >= step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}>
                        <div className="step-number">
                            {currentStep > step.number ? '✓' : step.number}
                        </div>
                        <div className="step-label">{step.label}</div>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`step-connector ${currentStep > step.number ? 'completed' : ''}`} />
                    )}
                </div>
            ))}
        </div>
    );
};

export default StepIndicator;
