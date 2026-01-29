import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer style={{
            background: 'var(--color-primary-dark)',
            color: 'white',
            padding: 'var(--spacing-xl) 0',
            marginTop: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div className="container">
                <div className="flex flex-col items-center justify-center gap-md">
                    <div className="flex items-center justify-center gap-xl wrap">
                        <img
                            src="/CLIA_logo_white.png"
                            alt="CLIA Cruise Lines International Association"
                            style={{ height: '50px', objectFit: 'contain', opacity: 0.9 }}
                        />
                        <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.2)' }}></div>
                        <img
                            src="/Virtuoso_logo_white.png"
                            alt="Virtuoso Member"
                            style={{ height: '50px', objectFit: 'contain', opacity: 0.9 }}
                        />
                    </div>

                    <div className="text-center mt-md text-muted" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        <p className="mb-xs">© {new Date().getFullYear()} TravelPoint. {t('footer.allRightsReserved', 'All rights reserved.')}</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
