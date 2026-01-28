import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { validateApprovalCode, markCodeAsUsed } from '../../services/requestService';
import AccessRequired from './AccessRequired';
import './Signup.css';

export default function Signup({ lang: initialLang = 'es' }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [lang, setLang] = useState(initialLang);

    const [validating, setValidating] = useState(true);
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        agencyName: '',
        acceptTerms: false
    });

    // Translations
    const translations = {
        es: {
            title: 'Crear Cuenta',
            subtitle: 'Completa tu registro para acceder a TravelPoint',
            validating: 'Validando código de acceso...',
            agencyName: 'Nombre de la Agencia',
            email: 'Email',
            emailHint: 'Este email será usado para iniciar sesión',
            password: 'Contraseña',
            passwordHint: 'Mínimo 6 caracteres',
            confirmPassword: 'Confirmar Contraseña',
            acceptTerms: 'Acepto los',
            termsLink: 'términos y condiciones',
            createAccount: 'Crear Cuenta',
            creating: 'Creando cuenta...',
            hasAccount: '¿Ya tienes una cuenta?',
            login: 'Iniciar sesión',
            errors: {
                allFieldsRequired: 'Por favor completa todos los campos requeridos',
                passwordTooShort: 'La contraseña debe tener al menos 6 caracteres',
                passwordMismatch: 'Las contraseñas no coinciden',
                acceptTermsRequired: 'Debes aceptar los términos y condiciones',
                emailInUse: 'Este email ya está registrado',
                weakPassword: 'La contraseña es muy débil',
                genericError: 'Error al crear la cuenta. Por favor intenta nuevamente.'
            }
        },
        en: {
            title: 'Create Account',
            subtitle: 'Complete your registration to access TravelPoint',
            validating: 'Validating access code...',
            agencyName: 'Agency Name',
            email: 'Email',
            emailHint: 'This email will be used for login',
            password: 'Password',
            passwordHint: 'Minimum 6 characters',
            confirmPassword: 'Confirm Password',
            acceptTerms: 'I accept the',
            termsLink: 'terms and conditions',
            createAccount: 'Create Account',
            creating: 'Creating account...',
            hasAccount: 'Already have an account?',
            login: 'Log in',
            errors: {
                allFieldsRequired: 'Please complete all required fields',
                passwordTooShort: 'Password must be at least 6 characters',
                passwordMismatch: 'Passwords do not match',
                acceptTermsRequired: 'You must accept the terms and conditions',
                emailInUse: 'This email is already registered',
                weakPassword: 'Password is too weak',
                genericError: 'Error creating account. Please try again.'
            }
        }
    };

    const t = translations[lang];

    // Validate approval code on mount
    useEffect(() => {
        const validateCode = async () => {
            const code = searchParams.get('code');
            const email = searchParams.get('email');

            const result = await validateApprovalCode(code, email);
            setValidation(result);

            if (result.valid) {
                // Prefill form with data from request
                setFormData(prev => ({
                    ...prev,
                    email: result.request.contactEmail,
                    agencyName: result.request.agencyName
                }));
            }

            setValidating(false);
        };

        validateCode();
    }, [searchParams]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateForm = () => {
        if (!formData.email || !formData.password || !formData.confirmPassword || !formData.agencyName) {
            setError(t.errors.allFieldsRequired);
            return false;
        }

        if (formData.password.length < 6) {
            setError(t.errors.passwordTooShort);
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError(t.errors.passwordMismatch);
            return false;
        }

        if (!formData.acceptTerms) {
            setError(t.errors.acceptTermsRequired);
            return false;
        }

        return true;
    };

    const createAgency = async (userId) => {
        try {
            const agencyId = `agency_${Date.now()}`;
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 days trial

            const agencyData = {
                id: agencyId,
                name: formData.agencyName,
                contactEmail: formData.email,
                phoneNumber: validation.request.phoneNumber || '',
                groupType: validation.request.groupType,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                requestId: validation.request.id,
                plan: 'trial',
                billingStatus: 'trialing',
                trialEndsAt: trialEndsAt,
                ownerId: userId,
                // Usage tracking
                activeGroupsCount: 0,
                activeTravelersCount: 0,
                emailsSentThisMonth: 0,
                storageUsedMB: 0
            };

            await setDoc(doc(db, 'agencies', agencyId), agencyData);
            console.log('✅ Agency created:', agencyId);
            return agencyId;
        } catch (error) {
            console.error('❌ Error creating agency:', error);
            throw error;
        }
    };

    const createAdminUser = async (userId, agencyId) => {
        try {
            const userData = {
                uid: userId,
                email: formData.email,
                role: 'admin',
                agencyId: agencyId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                displayName: formData.agencyName,
                isActive: true
            };

            await setDoc(doc(db, 'users', userId), userData);
            console.log('✅ Admin user created:', userId);
        } catch (error) {
            console.error('❌ Error creating user document:', error);
            throw error;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // 1. Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            const userId = userCredential.user.uid;
            console.log('✅ Auth user created:', userId);

            // 2. Create agency
            const agencyId = await createAgency(userId);

            // 3. Create admin user document
            await createAdminUser(userId, agencyId);

            // 4. Mark approval code as used
            await markCodeAsUsed(validation.request.id, agencyId);

            // 5. Success! Redirect to dashboard
            console.log('✅ Signup complete!');
            navigate('/admin');
        } catch (error) {
            console.error('❌ Signup error:', error);

            if (error.code === 'auth/email-already-in-use') {
                setError(t.errors.emailInUse);
            } else if (error.code === 'auth/weak-password') {
                setError(t.errors.weakPassword);
            } else {
                setError(t.errors.genericError);
            }
        } finally {
            setLoading(false);
        }
    };

    // Show loading while validating
    if (validating) {
        return (
            <div className="signup-container">
                <div className="signup-card">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>{t.validating}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show access required if validation failed
    if (!validation.valid) {
        return <AccessRequired error={validation.error} message={validation.message} />;
    }

    // Show signup form
    return (
        <div className="signup-container">
            <div className="signup-card">
                {/* Language Selector */}
                <div className="language-selector">
                    <button
                        onClick={() => setLang('es')}
                        className={`lang-btn ${lang === 'es' ? 'active' : ''}`}
                    >
                        ES
                    </button>
                    <button
                        onClick={() => setLang('en')}
                        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                    >
                        EN
                    </button>
                </div>

                <div className="signup-header">
                    <h1 className="signup-title">{t.title}</h1>
                    <p className="signup-subtitle">{t.subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="signup-form">
                    {/* Agency Name */}
                    <div className="form-group">
                        <label htmlFor="agencyName">
                            {t.agencyName} <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            id="agencyName"
                            name="agencyName"
                            value={formData.agencyName}
                            onChange={handleChange}
                            className="form-input"
                            disabled={loading}
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label htmlFor="email">
                            {t.email} <span className="required">*</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="form-input"
                            disabled={true} // Email is prefilled and readonly
                            required
                        />
                        <small className="field-hint">{t.emailHint}</small>
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label htmlFor="password">
                            {t.password} <span className="required">*</span>
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="form-input"
                            disabled={loading}
                            required
                            minLength={6}
                        />
                        <small className="field-hint">{t.passwordHint}</small>
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword">
                            {t.confirmPassword} <span className="required">*</span>
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="form-input"
                            disabled={loading}
                            required
                        />
                    </div>

                    {/* Terms & Conditions */}
                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="acceptTerms"
                                checked={formData.acceptTerms}
                                onChange={handleChange}
                                disabled={loading}
                                required
                            />
                            <span>
                                {t.acceptTerms} <a href="/terms" target="_blank">{t.termsLink}</a>
                            </span>
                        </label>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn-submit"
                        disabled={loading}
                    >
                        {loading ? t.creating : t.createAccount}
                    </button>
                </form>

                <div className="signup-footer">
                    <p>
                        {t.hasAccount}{' '}
                        <a href="/login-v2">{t.login}</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
