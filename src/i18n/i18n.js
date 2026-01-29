/**
 * Simple i18n system for white-label login
 * Supports ES (Mexico) and EN (Canada)
 */

export const translations = {
    es: {
        login: {
            title: 'Iniciar Sesión',
            subtitle: 'Accede a tu cuenta',
            agencyMode: 'Inicio de Agencia',
            familyMode: 'Acceso de Viajero',
            agencyMicrocopy: 'Para asesores de viaje',
            travelerMicrocopy: 'Para huéspedes registrados',
            travelerDisclaimer: 'El viajero no paga aquí. Solo se registran solicitudes y fechas límite.',
            agencySubtitle: 'Administra viajeros, pagos y fechas límite',
            travelerSubtitle: 'Consulta tu saldo y envía pagos',
            agencyContext: 'Acceso para agentes autorizados',
            email: 'Correo Electrónico',
            emailPlaceholder: 'tu@email.com',
            password: 'Contraseña',
            passwordPlaceholder: '••••••••',
            groupCode: 'Código de Grupo',
            groupCodePlaceholder: 'ABC123',
            familyCode: 'Código de Familia',
            familyCodePlaceholder: 'FAM001',
            familyPassword: 'Contraseña de Viajero',
            rememberMe: 'Recordarme',
            submit: 'Ingresar',
            loading: 'Ingresando...',
            forgotPassword: '¿Olvidaste tu contraseña?',
            securityNote: 'Acceso seguro. Los pagos se gestionan directamente con tu agente.',
            switchToAgency: 'Cambiar a modo Agencia',
            switchToFamily: 'Cambiar a modo Viajero',
            tenantContext: 'Seguimiento de pagos y fechas límite',
            supportText: '¿Problemas para entrar?',
            contactAgency: 'Contacta a tu agencia',
            agencySignup: '¿Eres una agencia?',
            requestAccess: 'Unirme al programa beta',
            portalTagline: 'Gestión de Viajes Grupales'
        },
        requestAccess: {
            title: 'Solicitar Acceso',
            subtitle: 'Únete a nuestro programa beta',
            agencyName: 'Nombre de la Agencia',
            agencyNamePlaceholder: 'Acme Travel',
            contactEmail: 'Email de Contacto',
            contactEmailPlaceholder: 'contacto@tuagencia.com',
            contactPhone: 'Número de Teléfono (opcional)',
            contactPhonePlaceholder: '+1 (Canadá/US)',
            groupType: 'Tipo de Grupos',
            groupTypePlaceholder: 'Selecciona un tipo',
            message: 'Mensaje (opcional)',
            messagePlaceholder: 'Cuéntanos sobre tu agencia y necesidades...',
            cancel: 'Cancelar',
            submit: 'Unirme al Programa Beta',
            submitting: 'Enviando...',
            successTitle: '¡Solicitud Enviada!',
            successMessage: 'Gracias por tu interés. Revisaremos tu solicitud y te contactaremos pronto.',
            errorTitle: 'Error',
            errorMessage: 'Hubo un problema al enviar tu solicitud. Por favor intenta de nuevo.',
            groupTypes: {
                cruise: 'Grupos de Cruceros',
                wedding: 'Bodas Destino',
                school: 'Viajes Escolares',
                corporate: 'Incentivos Corporativos',
                religious: 'Viajes Religiosos',
                sports: 'Equipos Deportivos',
                tour: 'Operadores de Tours',
                other: 'Otro'
            }
        },
        errors: {
            invalidCredentials: 'Credenciales inválidas',
            networkError: 'Error de conexión. Intenta de nuevo.',
            familyNotFound: 'Código de viajero no encontrado',
            generic: 'Ocurrió un error. Intenta de nuevo.'
        }
    },
    en: {
        login: {
            title: 'Sign In',
            subtitle: 'Access your account',
            agencyMode: 'Agency Login',
            familyMode: 'Traveler Access',
            agencyMicrocopy: 'For travel advisors',
            travelerMicrocopy: 'For booked guests',
            travelerDisclaimer: 'Travelers do not pay here. This portal tracks requests and deadlines.',
            agencySubtitle: 'Manage travelers, payments and deadlines',
            travelerSubtitle: 'View your balance and submit payments',
            agencyContext: 'Access for authorized agents',
            email: 'Email Address',
            emailPlaceholder: 'your@email.com',
            password: 'Password',
            passwordPlaceholder: '••••••••',
            groupCode: 'Group Code',
            groupCodePlaceholder: 'ABC123',
            familyCode: 'Family Code',
            familyCodePlaceholder: 'FAM001',
            familyPassword: 'Traveler Password',
            rememberMe: 'Remember me',
            submit: 'Sign In',
            loading: 'Signing in...',
            forgotPassword: 'Forgot your password?',
            securityNote: 'Secure login. Payments are handled directly by your travel advisor.',
            switchToAgency: 'Switch to Agency mode',
            switchToFamily: 'Switch to Traveler mode',
            tenantContext: 'Payment tracking & deadlines',
            supportText: 'Having trouble signing in?',
            contactAgency: 'Contact your agency',
            agencySignup: 'Are you an agency?',
            requestAccess: 'Join the beta program',
            portalTagline: 'Group Travel Management'
        },
        requestAccess: {
            title: 'Request Access',
            subtitle: 'Join our beta program',
            agencyName: 'Agency Name',
            agencyNamePlaceholder: 'Acme Travel',
            contactEmail: 'Contact Email',
            contactEmailPlaceholder: 'contact@youragency.com',
            contactPhone: 'Phone Number (optional)',
            contactPhonePlaceholder: '+1 (Canada/US)',
            groupType: 'Type of Groups',
            groupTypePlaceholder: 'Select a type',
            message: 'Message (optional)',
            messagePlaceholder: 'Tell us about your agency and needs...',
            cancel: 'Cancel',
            submit: 'Join the Beta Program',
            submitting: 'Submitting...',
            successTitle: 'Request Submitted!',
            successMessage: 'Thank you for your interest. We will review your request and contact you soon.',
            errorTitle: 'Error',
            errorMessage: 'There was a problem submitting your request. Please try again.',
            groupTypes: {
                cruise: 'Cruise Groups',
                wedding: 'Destination Weddings',
                school: 'School Trips',
                corporate: 'Corporate Incentives',
                religious: 'Religious Travel',
                sports: 'Sports Teams',
                tour: 'Tour Operators',
                other: 'Other'
            }
        },
        errors: {
            invalidCredentials: 'Invalid credentials',
            networkError: 'Connection error. Please try again.',
            familyNotFound: 'Traveler code not found',
            generic: 'An error occurred. Please try again.'
        }
    }
};

/**
 * Get nested translation value
 * @param {string} key - Dot notation key (e.g., 'login.title')
 * @param {string} lang - Language code ('es' or 'en')
 * @returns {string} Translated text or key if not found
 */
export function t(key, lang = 'es') {
    const keys = key.split('.');
    let value = translations[lang];

    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            return key; // Return key if translation not found
        }
    }

    return value || key;
}

/**
 * Get language display name
 */
export function getLanguageName(lang) {
    return lang === 'es' ? 'MX ES' : 'CA EN';
}

/**
 * Toggle between languages
 */
export function toggleLanguage(currentLang) {
    return currentLang === 'es' ? 'en' : 'es';
}
