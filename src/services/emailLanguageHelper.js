import i18n from '../i18n/config';

/**
 * Get the current user's language preference
 * @returns {'es' | 'en'} Language code
 */
export const getCurrentLanguage = () => {
    const lang = i18n.language || 'es';
    return lang.startsWith('en') ? 'en' : 'es';
};

/**
 * Get template ID based on template type and language
 * @param {string} templateType - 'mass_comm', 'reminder_7day', 'reminder_1day', 'overdue'
 * @param {string} language - 'es' or 'en' (optional, defaults to current language)
 * @returns {string} Template ID from environment variables
 */
export const getTemplateId = (templateType, language = null) => {
    const lang = language || getCurrentLanguage();

    const templateMap = {
        mass_comm: {
            es: import.meta.env.VITE_EMAILJS_TEMPLATE_MASS_COMM_ES,
            en: import.meta.env.VITE_EMAILJS_TEMPLATE_MASS_COMM_EN
        },
        reminder_7day: {
            es: import.meta.env.VITE_EMAILJS_TEMPLATE_REMINDER_7DAY_ES,
            en: import.meta.env.VITE_EMAILJS_TEMPLATE_REMINDER_7DAY_EN
        },
        reminder_1day: {
            es: import.meta.env.VITE_EMAILJS_TEMPLATE_REMINDER_1DAY_ES,
            en: import.meta.env.VITE_EMAILJS_TEMPLATE_REMINDER_1DAY_EN
        },
        overdue: {
            es: import.meta.env.VITE_EMAILJS_TEMPLATE_OVERDUE_ES,
            en: import.meta.env.VITE_EMAILJS_TEMPLATE_OVERDUE_EN
        }
    };

    const templateId = templateMap[templateType]?.[lang];

    // Fallback to Spanish if template not found
    if (!templateId) {
        console.warn(`Template ID not found for ${templateType} in ${lang}, falling back to Spanish`);
        return templateMap[templateType]?.es;
    }

    return templateId;
};

/**
 * Get localized text for email subjects and content
 * @param {string} key - Text key
 * @param {string} language - 'es' or 'en'
 * @returns {string} Localized text
 */
export const getLocalizedEmailText = (key, language = null) => {
    const lang = language || getCurrentLanguage();

    const texts = {
        reminder_7day_subject: {
            es: 'Recordatorio: Pago Próximo',
            en: 'Reminder: Upcoming Payment'
        },
        reminder_1day_subject: {
            es: '⚠️ URGENTE: Pago Mañana',
            en: '⚠️ URGENT: Payment Due Tomorrow'
        },
        overdue_subject: {
            es: '🔴 ATENCIÓN: Pago Vencido',
            en: '🔴 ATTENTION: Overdue Payment'
        }
    };

    return texts[key]?.[lang] || texts[key]?.es || key;
};
