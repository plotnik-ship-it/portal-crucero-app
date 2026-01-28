import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RequestAccess.css';

export default function RequestAccessSuccess({ lang: initialLang = 'es' }) {
    const navigate = useNavigate();
    const [lang, setLang] = useState(initialLang);

    const translations = {
        es: {
            title: '¡Solicitud Enviada!',
            subtitle: 'Gracias por tu interés en TravelPoint',
            message: 'Hemos recibido tu solicitud de acceso beta. Nuestro equipo la revisará en las próximas 24-48 horas.',
            nextSteps: 'Próximos Pasos',
            step1: 'Revisaremos tu información',
            step2: 'Te enviaremos un correo con tu código de aprobación',
            step3: 'Podrás crear tu cuenta y comenzar a usar TravelPoint',
            note: 'Revisa tu bandeja de entrada (y spam) para el correo de confirmación.',
            backToLogin: 'Volver al Inicio de Sesión'
        },
        en: {
            title: 'Request Submitted!',
            subtitle: 'Thank you for your interest in TravelPoint',
            message: 'We have received your beta access request. Our team will review it within the next 24-48 hours.',
            nextSteps: 'Next Steps',
            step1: 'We will review your information',
            step2: 'You will receive an email with your approval code',
            step3: 'You can create your account and start using TravelPoint',
            note: 'Check your inbox (and spam folder) for the confirmation email.',
            backToLogin: 'Back to Login'
        }
    };

    const t = translations[lang] || translations.es;

    return (
        <div className="request-access-container">
            <div className="request-access-card success-card">
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

                <div className="success-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="32" r="32" fill="#10b981" fillOpacity="0.1" />
                        <circle cx="32" cy="32" r="24" fill="#10b981" fillOpacity="0.2" />
                        <path d="M20 32l8 8 16-16" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                <div className="success-content">
                    <h1 className="success-title">{t.title}</h1>
                    <p className="success-subtitle">{t.subtitle}</p>
                    <p className="success-message">{t.message}</p>

                    <div className="success-steps">
                        <h3>{t.nextSteps}</h3>
                        <ol>
                            <li>{t.step1}</li>
                            <li>{t.step2}</li>
                            <li>{t.step3}</li>
                        </ol>
                    </div>

                    <div className="success-note">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="8" stroke="#3b82f6" strokeWidth="1.5" />
                            <path d="M10 6v4M10 13v.5" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <span>{t.note}</span>
                    </div>

                    <button
                        onClick={() => navigate('/login-v2')}
                        className="btn-primary btn-full"
                    >
                        {t.backToLogin}
                    </button>
                </div>
            </div>
        </div>
    );
}
