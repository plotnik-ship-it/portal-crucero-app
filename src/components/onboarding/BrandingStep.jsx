/**
 * Step 2: Branding Configuration
 * Logo upload and primary color selection
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './BrandingStep.css';

const BrandingStep = ({ data, onChange }) => {
    const { t } = useTranslation();
    const [logoError, setLogoError] = useState(null);

    const handleLogoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            setLogoError(t('onboarding.logoTypeError'));
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            setLogoError(t('onboarding.logoSizeError'));
            return;
        }

        setLogoError(null);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            onChange({
                ...data,
                logoFile: file,
                logoPreview: reader.result
            });
        };
        reader.readAsDataURL(file);
    };

    const handleColorChange = (color) => {
        onChange({
            ...data,
            primaryColor: color
        });
    };

    return (
        <div className="onboarding-form">
            <div className="step-header">
                <h2>🎨 {t('onboarding.step2Title')}</h2>
                <p className="step-description">
                    {t('onboarding.step2Subtitle')}
                </p>
            </div>

            <div className="branding-grid">
                <div className="branding-config">
                    <div className="form-group">
                        <label>{t('onboarding.agencyLogo')}</label>
                        <div className="logo-upload-area">
                            {data.logoPreview ? (
                                <div className="logo-preview">
                                    <img src={data.logoPreview} alt="Logo preview" />
                                    <button
                                        type="button"
                                        onClick={() => onChange({ ...data, logoFile: null, logoPreview: null })}
                                        className="remove-logo-btn"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <div className="logo-placeholder">
                                    <span className="upload-icon">📁</span>
                                    <p>{t('onboarding.noLogoSelected')}</p>
                                </div>
                            )}
                        </div>

                        <input
                            type="file"
                            id="logo-upload"
                            accept="image/png,image/jpeg,image/svg+xml"
                            onChange={handleLogoSelect}
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="logo-upload" className="btn btn-upload">
                            {data.logoFile ? t('onboarding.changeLogo') : t('onboarding.uploadLogo')}
                        </label>

                        {logoError && <span className="error-text">{logoError}</span>}
                        <span className="help-text">{t('onboarding.logoRequirements')}</span>
                    </div>

                    <div className="form-group">
                        <label>
                            {t('onboarding.primaryColor')} <span className="required">*</span>
                        </label>
                        <div className="color-picker-group">
                            <input
                                type="color"
                                value={data.primaryColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="color-picker"
                            />
                            <input
                                type="text"
                                value={data.primaryColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="color-hex-input"
                                placeholder="#3B9FD8"
                            />
                        </div>
                        <span className="help-text">{t('onboarding.primaryColorHelp')}</span>
                    </div>
                </div>

                <div className="branding-preview">
                    <h3>{t('onboarding.preview')}</h3>
                    <div
                        className="preview-card"
                        style={{
                            background: `linear-gradient(135deg, ${data.primaryColor} 0%, ${adjustColor(data.primaryColor, -20)} 100%)`
                        }}
                    >
                        {data.logoPreview && (
                            <div className="preview-logo">
                                <img src={data.logoPreview} alt="Logo" />
                            </div>
                        )}
                        <h2 style={{ color: '#ffffff' }}>{t('onboarding.previewTitle')}</h2>
                        <p style={{ color: '#ffffff', opacity: 0.9 }}>
                            {t('onboarding.previewSubtitle')}
                        </p>
                        <div
                            className="preview-button"
                            style={{ backgroundColor: data.primaryColor }}
                        >
                            {t('onboarding.sampleButton')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to adjust color brightness
function adjustColor(color, amount) {
    const clamp = (val) => Math.min(Math.max(val, 0), 255);
    const num = parseInt(color.replace('#', ''), 16);
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0x00FF) + amount);
    const b = clamp((num & 0x0000FF) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default BrandingStep;
