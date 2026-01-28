import { useTranslation } from 'react-i18next';
import './SuperAdminModals.css';

/**
 * ReactivateModal - Confirmation modal for reactivating a suspended agency
 */
export default function ReactivateModal({ agency, onConfirm, onCancel }) {
    const { t } = useTranslation();

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>▶️ {t('superadmin.reactivateAgency')}</h2>
                    <button onClick={onCancel} className="btn-close">×</button>
                </div>

                <div className="modal-body">
                    <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                        {t('superadmin.reactivateConfirm')}
                    </p>
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        marginBottom: '1rem'
                    }}>
                        <strong>{agency.name}</strong>
                        <br />
                        <small style={{ color: '#666' }}>{agency.id}</small>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.95rem' }}>
                        This will restore full access for all admin users and travelers.
                    </p>
                </div>

                <div className="modal-footer">
                    <button onClick={onCancel} className="btn btn-secondary">
                        {t('common.cancel')}
                    </button>
                    <button onClick={onConfirm} className="btn btn-success">
                        ▶️ {t('superadmin.reactivate')}
                    </button>
                </div>
            </div>
        </div>
    );
}
