import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
        }}>
            <button
                onClick={() => changeLanguage('es')}
                style={{
                    padding: '0.5rem 1rem',
                    border: i18n.language === 'es' ? '2px solid #007bff' : '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: i18n.language === 'es' ? '#007bff' : 'white',
                    color: i18n.language === 'es' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: i18n.language === 'es' ? '600' : '400',
                    transition: 'all 0.2s'
                }}
            >
                🇲🇽 ES
            </button>
            <button
                onClick={() => changeLanguage('en')}
                style={{
                    padding: '0.5rem 1rem',
                    border: i18n.language === 'en' ? '2px solid #007bff' : '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: i18n.language === 'en' ? '#007bff' : 'white',
                    color: i18n.language === 'en' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: i18n.language === 'en' ? '600' : '400',
                    transition: 'all 0.2s'
                }}
            >
                🇨🇦 EN
            </button>
        </div>
    );
};

export default LanguageSwitcher;
