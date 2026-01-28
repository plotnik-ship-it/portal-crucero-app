import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AccessRequired.css';

export default function AccessRequired({ error = 'CODE_MISSING', message }) {
    const navigate = useNavigate();

    const errorContent = {
        CODE_MISSING: {
            icon: '🔒',
            title: 'Código de Acceso Requerido',
            description: 'Para crear una cuenta necesitas un código de aprobación válido.',
            action: 'Solicita acceso al programa beta para obtener tu código.'
        },
        CODE_INVALID: {
            icon: '❌',
            title: 'Código Inválido',
            description: 'El código de aprobación que proporcionaste no es válido.',
            action: 'Verifica el código o solicita un nuevo acceso.'
        },
        CODE_USED: {
            icon: '⚠️',
            title: 'Código Ya Utilizado',
            description: 'Este código de aprobación ya ha sido utilizado para crear una cuenta.',
            action: 'Si crees que esto es un error, contacta a soporte.'
        },
        EMAIL_MISMATCH: {
            icon: '📧',
            title: 'Email No Coincide',
            description: 'El email proporcionado no coincide con la solicitud aprobada.',
            action: 'Usa el email correcto o contacta a soporte.'
        },
        NOT_APPROVED: {
            icon: '⏳',
            title: 'Solicitud Pendiente',
            description: 'Tu solicitud de acceso aún está siendo revisada.',
            action: 'Recibirás un email cuando sea aprobada.'
        },
        VALIDATION_ERROR: {
            icon: '⚠️',
            title: 'Error de Validación',
            description: 'Hubo un error al validar tu código de acceso.',
            action: 'Intenta nuevamente o contacta a soporte.'
        }
    };

    const content = errorContent[error] || errorContent.CODE_MISSING;

    return (
        <div className="access-required-container">
            <div className="access-required-card">
                <div className="access-icon">{content.icon}</div>

                <h1 className="access-title">{content.title}</h1>

                {message && (
                    <div className="error-message-box">
                        {message}
                    </div>
                )}

                <p className="access-description">{content.description}</p>
                <p className="access-action">{content.action}</p>

                <div className="access-actions">
                    {error !== 'CODE_USED' && error !== 'NOT_APPROVED' && (
                        <button
                            onClick={() => navigate('/request-access')}
                            className="btn-request-access"
                        >
                            📋 Solicitar Acceso Beta
                        </button>
                    )}

                    <button
                        onClick={() => navigate('/login-v2')}
                        className="btn-back-login"
                    >
                        ← Volver al Login
                    </button>
                </div>

                <div className="support-info">
                    <p>¿Necesitas ayuda?</p>
                    <a href="mailto:support@travelpoint.com">support@travelpoint.com</a>
                </div>
            </div>
        </div>
    );
}
