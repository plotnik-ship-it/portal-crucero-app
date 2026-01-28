import { useState } from 'react';
import { t } from '../../i18n/i18n';
import { submitAccessRequest, validateRequestForm, GROUP_TYPES } from '../../services/requestAccessService';
import './RequestAccessModal.css';

const RequestAccessModal = ({ isOpen, onClose, lang }) => {
    const [formData, setFormData] = useState({
        agencyName: '',
        contactEmail: '',
        contactPhone: '',
        groupType: '',
        message: ''
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate
        const validationErrors = validateRequestForm(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setSubmitting(true);
        setSubmitError(false);

        try {
            await submitAccessRequest(formData);
            setSubmitted(true);

            // Auto-close after 3 seconds
            setTimeout(() => {
                handleClose();
            }, 3000);
        } catch (error) {
            console.error('Error submitting request:', error);
            setSubmitError(true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            agencyName: '',
            contactEmail: '',
            contactPhone: '',
            groupType: '',
            message: ''
        });
        setErrors({});
        setSubmitted(false);
        setSubmitError(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="request-access-overlay" onClick={handleClose}>
            <div className="request-access-modal" onClick={(e) => e.stopPropagation()}>
                {/* Close Button */}
                <button
                    className="request-access-close"
                    onClick={handleClose}
                    aria-label="Close"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>

                {/* Success State */}
                {submitted ? (
                    <div className="request-access-success">
                        <div className="success-icon">
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <circle cx="32" cy="32" r="30" fill="#10B981" opacity="0.1" />
                                <path d="M20 32l8 8 16-16" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2>{t('requestAccess.successTitle', lang)}</h2>
                        <p>{t('requestAccess.successMessage', lang)}</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="request-access-header">
                            <h2>{t('requestAccess.title', lang)}</h2>
                            <p>{t('requestAccess.subtitle', lang)}</p>
                        </div>

                        {/* Error Alert */}
                        {submitError && (
                            <div className="request-access-error-alert">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M10 6v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <circle cx="10" cy="14" r="0.75" fill="currentColor" />
                                </svg>
                                <div>
                                    <strong>{t('requestAccess.errorTitle', lang)}</strong>
                                    <p>{t('requestAccess.errorMessage', lang)}</p>
                                </div>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="request-access-form">
                            {/* Agency Name */}
                            <div className="form-group">
                                <label htmlFor="agencyName">
                                    {t('requestAccess.agencyName', lang)} <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="agencyName"
                                    name="agencyName"
                                    value={formData.agencyName}
                                    onChange={handleChange}
                                    placeholder={t('requestAccess.agencyNamePlaceholder', lang)}
                                    className={errors.agencyName ? 'error' : ''}
                                />
                                {errors.agencyName && (
                                    <span className="error-message">{errors.agencyName}</span>
                                )}
                            </div>

                            {/* Contact Email */}
                            <div className="form-group">
                                <label htmlFor="contactEmail">
                                    {t('requestAccess.contactEmail', lang)} <span className="required">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="contactEmail"
                                    name="contactEmail"
                                    value={formData.contactEmail}
                                    onChange={handleChange}
                                    placeholder={t('requestAccess.contactEmailPlaceholder', lang)}
                                    className={errors.contactEmail ? 'error' : ''}
                                />
                                {errors.contactEmail && (
                                    <span className="error-message">{errors.contactEmail}</span>
                                )}
                            </div>

                            {/* Contact Phone */}
                            <div className="form-group">
                                <label htmlFor="contactPhone">
                                    {t('requestAccess.contactPhone', lang)}
                                </label>
                                <input
                                    type="tel"
                                    id="contactPhone"
                                    name="contactPhone"
                                    value={formData.contactPhone}
                                    onChange={handleChange}
                                    placeholder={t('requestAccess.contactPhonePlaceholder', lang)}
                                    className={errors.contactPhone ? 'error' : ''}
                                />
                                {errors.contactPhone && (
                                    <span className="error-message">{errors.contactPhone}</span>
                                )}
                            </div>

                            {/* Group Type */}
                            <div className="form-group">
                                <label htmlFor="groupType">
                                    {t('requestAccess.groupType', lang)} <span className="required">*</span>
                                </label>
                                <select
                                    id="groupType"
                                    name="groupType"
                                    value={formData.groupType}
                                    onChange={handleChange}
                                    className={errors.groupType ? 'error' : ''}
                                >
                                    <option value="">{t('requestAccess.groupTypePlaceholder', lang)}</option>
                                    {GROUP_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {t(type.labelKey, lang)}
                                        </option>
                                    ))}
                                </select>
                                {errors.groupType && (
                                    <span className="error-message">{errors.groupType}</span>
                                )}
                            </div>

                            {/* Message */}
                            <div className="form-group">
                                <label htmlFor="message">
                                    {t('requestAccess.message', lang)}
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    placeholder={t('requestAccess.messagePlaceholder', lang)}
                                    rows="4"
                                />
                            </div>

                            {/* Actions */}
                            <div className="request-access-actions">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="btn-cancel"
                                    disabled={submitting}
                                >
                                    {t('requestAccess.cancel', lang)}
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <span className="spinner"></span>
                                            {t('requestAccess.submitting', lang)}
                                        </>
                                    ) : (
                                        t('requestAccess.submit', lang)
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default RequestAccessModal;
