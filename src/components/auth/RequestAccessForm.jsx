import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { emailAdapter } from '../../services/emailAdapter';
import './RequestAccess.css';

export default function RequestAccessForm({ lang: initialLang = 'es' }) {
    const navigate = useNavigate();
    const [lang, setLang] = useState(initialLang);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        agencyName: '',
        contactEmail: '',
        phoneNumber: '',
        groupType: '',
        message: ''
    });
    const [errors, setErrors] = useState({});

    const translations = {
        es: {
            title: 'Solicitar Acceso Beta',
            subtitle: 'Únete al programa beta de TravelPoint',
            description: 'Complete el formulario a continuación y nos pondremos en contacto con usted para configurar su cuenta.',
            agencyName: 'Nombre de la Agencia',
            agencyNamePlaceholder: 'Ej: Viajes Paraíso',
            contactEmail: 'Correo Electrónico de Contacto',
            emailPlaceholder: 'contacto@tuagencia.com',
            phoneNumber: 'Número de Teléfono (Opcional)',
            phonePlaceholder: '+1 (555) 123-4567',
            groupType: 'Tipo de Grupo',
            groupTypePlaceholder: 'Seleccione el tipo de grupo',
            message: 'Mensaje Adicional (Opcional)',
            messagePlaceholder: 'Cuéntanos sobre tus necesidades...',
            submit: 'Enviar Solicitud',
            submitting: 'Enviando...',
            backToLogin: 'Volver al Inicio de Sesión',
            groupTypes: {
                cruise: 'Crucero',
                tour: 'Tour Grupal',
                event: 'Evento Corporativo',
                other: 'Otro'
            },
            errors: {
                agencyNameRequired: 'El nombre de la agencia es requerido',
                emailRequired: 'El correo electrónico es requerido',
                emailInvalid: 'Por favor ingrese un correo electrónico válido',
                groupTypeRequired: 'Por favor seleccione un tipo de grupo'
            }
        },
        en: {
            title: 'Request Beta Access',
            subtitle: 'Join the TravelPoint Beta Program',
            description: 'Fill out the form below and we\'ll get in touch to set up your account.',
            agencyName: 'Agency Name',
            agencyNamePlaceholder: 'e.g., Paradise Travel',
            contactEmail: 'Contact Email',
            emailPlaceholder: 'contact@youragency.com',
            phoneNumber: 'Phone Number (Optional)',
            phonePlaceholder: '+1 (555) 123-4567',
            groupType: 'Group Type',
            groupTypePlaceholder: 'Select group type',
            message: 'Additional Message (Optional)',
            messagePlaceholder: 'Tell us about your needs...',
            submit: 'Submit Request',
            submitting: 'Submitting...',
            backToLogin: 'Back to Login',
            groupTypes: {
                cruise: 'Cruise Groups',
                tour: 'Group Tours',
                event: 'Corporate Events',
                other: 'Other'
            },
            errors: {
                agencyNameRequired: 'Agency name is required',
                emailRequired: 'Email is required',
                emailInvalid: 'Please enter a valid email',
                groupTypeRequired: 'Please select a group type'
            }
        }
    };

    const t = translations[lang] || translations.es;

    // Group types based on current language
    const GROUP_TYPES = [
        { value: 'cruise', label: t.groupTypes.cruise },
        { value: 'tour', label: t.groupTypes.tour },
        { value: 'event', label: t.groupTypes.event },
        { value: 'other', label: t.groupTypes.other }
    ];

    const validateForm = () => {
        const newErrors = {};

        if (!formData.agencyName.trim()) {
            newErrors.agencyName = t.errors.agencyNameRequired;
        }

        if (!formData.contactEmail.trim()) {
            newErrors.contactEmail = t.errors.emailRequired;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = t.errors.emailInvalid;
        }

        if (!formData.groupType) {
            newErrors.groupType = t.errors.groupTypeRequired;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Save to Firestore
            const requestData = {
                agencyName: formData.agencyName.trim(),
                contactEmail: formData.contactEmail.trim().toLowerCase(),
                phoneNumber: formData.phoneNumber.trim() || null,
                groupType: formData.groupType,
                message: formData.message.trim() || null,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                approvedBy: null,
                approvedAt: null,
                rejectedAt: null,
                approvalCode: null
            };

            const docRef = await addDoc(collection(db, 'agencyRequests'), requestData);

            // Send email notification to admin
            await emailAdapter.sendAdminNotification({
                id: docRef.id,
                ...requestData
            });

            // Redirect to success page
            navigate('/request-access/success');
        } catch (error) {
            console.error('Error submitting request:', error);
            setErrors({ submit: 'Hubo un error al enviar la solicitud. Por favor intente nuevamente.' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    return (
        <div className="request-access-container">
            <div className="request-access-card">
                {/* Language Selector */}
                <div className="language-selector">
                    <button
                        className={`lang-btn ${lang === 'es' ? 'active' : ''}`}
                        onClick={() => setLang('es')}
                    >
                        ES
                    </button>
                    <button
                        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                        onClick={() => setLang('en')}
                    >
                        EN
                    </button>
                </div>

                <div className="request-access-header">
                    <h1 className="request-access-title">{t.title}</h1>
                    <p className="request-access-subtitle">{t.subtitle}</p>
                    <p className="request-access-description">{t.description}</p>
                </div>

                <form onSubmit={handleSubmit} className="request-access-form">
                    {/* Agency Name */}
                    <div className="form-group">
                        <label htmlFor="agencyName" className="form-label">
                            {t.agencyName} <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            id="agencyName"
                            name="agencyName"
                            value={formData.agencyName}
                            onChange={handleChange}
                            placeholder={t.agencyNamePlaceholder}
                            className={`form-input ${errors.agencyName ? 'error' : ''}`}
                            disabled={loading}
                        />
                        {errors.agencyName && <span className="error-message">{errors.agencyName}</span>}
                    </div>

                    {/* Contact Email */}
                    <div className="form-group">
                        <label htmlFor="contactEmail" className="form-label">
                            {t.contactEmail} <span className="required">*</span>
                        </label>
                        <input
                            type="email"
                            id="contactEmail"
                            name="contactEmail"
                            value={formData.contactEmail}
                            onChange={handleChange}
                            placeholder={t.emailPlaceholder}
                            className={`form-input ${errors.contactEmail ? 'error' : ''}`}
                            disabled={loading}
                        />
                        {errors.contactEmail && <span className="error-message">{errors.contactEmail}</span>}
                    </div>

                    {/* Phone Number */}
                    <div className="form-group">
                        <label htmlFor="phoneNumber" className="form-label">
                            {t.phoneNumber}
                        </label>
                        <input
                            type="tel"
                            id="phoneNumber"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            placeholder={t.phonePlaceholder}
                            className="form-input"
                            disabled={loading}
                        />
                    </div>

                    {/* Group Type */}
                    <div className="form-group">
                        <label htmlFor="groupType" className="form-label">
                            {t.groupType} <span className="required">*</span>
                        </label>
                        <select
                            id="groupType"
                            name="groupType"
                            value={formData.groupType}
                            onChange={handleChange}
                            className={`form-input ${errors.groupType ? 'error' : ''}`}
                            disabled={loading}
                        >
                            <option value="">{t.groupTypePlaceholder}</option>
                            {GROUP_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        {errors.groupType && <span className="error-message">{errors.groupType}</span>}
                    </div>

                    {/* Message */}
                    <div className="form-group">
                        <label htmlFor="message" className="form-label">
                            {t.message}
                        </label>
                        <textarea
                            id="message"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder={t.messagePlaceholder}
                            className="form-input form-textarea"
                            rows="4"
                            disabled={loading}
                        />
                    </div>

                    {/* Submit Error */}
                    {errors.submit && (
                        <div className="error-message submit-error">
                            {errors.submit}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={() => navigate('/login-v2')}
                            className="btn-secondary"
                            disabled={loading}
                        >
                            {t.backToLogin}
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? t.submitting : t.submit}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
