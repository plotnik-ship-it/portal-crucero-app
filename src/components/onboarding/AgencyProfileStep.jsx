/**
 * Step 1: Agency Profile
 * Agency profile configuration form
 */

import { useTranslation } from 'react-i18next';

const AgencyProfileStep = ({ data, onChange }) => {
    const { t } = useTranslation();

    const handleChange = (field, value) => {
        onChange({
            ...data,
            [field]: value
        });
    };

    return (
        <div className="onboarding-form">
            <div className="step-header">
                <h2>📋 {t('onboarding.step1Title')}</h2>
                <p className="step-description">
                    {t('onboarding.step1Subtitle')}
                </p>
            </div>

            <div className="form-group">
                <label>
                    {t('onboarding.agencyName')} <span className="required">*</span>
                </label>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder={t('onboarding.agencyNamePlaceholder')}
                    required
                />
                <span className="help-text">{t('onboarding.agencyNameHelp')}</span>
            </div>

            <div className="form-group">
                <label>
                    {t('onboarding.contactEmail')} <span className="required">*</span>
                </label>
                <input
                    type="email"
                    value={data.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder={t('onboarding.contactEmailHelp')}
                    required
                />
                <span className="help-text">{t('onboarding.contactEmailHelp')}</span>
            </div>

            <div className="form-group">
                <label>{t('onboarding.phoneNumber')}</label>
                <input
                    type="tel"
                    value={data.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder={t('onboarding.phonePlaceholder')}
                />
            </div>

            <div className="form-group">
                <label>{t('onboarding.website')}</label>
                <input
                    type="url"
                    value={data.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder={t('onboarding.websitePlaceholder')}
                />
            </div>

            <div className="form-group">
                <label>{t('onboarding.businessAddress')}</label>
                <textarea
                    value={data.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder={t('onboarding.addressPlaceholder')}
                    rows="3"
                />
                <span className="help-text">{t('onboarding.addressHelp')}</span>
            </div>
        </div>
    );
};

export default AgencyProfileStep;
