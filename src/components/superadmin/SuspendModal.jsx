import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './SuperAdminModals.css';

/**
 * SuspendModal - Modal for suspending an agency with required reason
 */
export default function SuspendModal({ agency, onConfirm, onCancel }) {
    const { t } = useTranslation();
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (reason.trim().length < 10) {
            setError(t('superadmin.suspendReasonError'));
            return;
        }
        onConfirm(reason);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>⏸️ {t('superadmin.suspendAgency')}</h2>
                    <button onClick={onCancel} className="btn-close">×</button>
                </div>

                <div className="modal-body">
                    <p style={{ marginBottom: '1rem', color: '#666' }}>
                        <strong>{agency.name}</strong> ({agency.id})
                    </p>

                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        {t('superadmin.suspendReason')} *
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setError('');
                        }}
                        placeholder={t('superadmin.suspendReasonPlaceholder')}
                        rows="4"
                        className="form-control"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            fontSize: '1rem',
                            borderRadius: '6px',
                            border: error ? '2px solid #dc3545' : '1px solid #ddd'
                        }}
                    />
                    {error && (
                        <div style={{ color: '#dc3545', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                            ⚠️ {error}
                        </div>
                    )}
                    <small style={{ color: '#999', display: 'block', marginTop: '0.5rem' }}>
                        {reason.length}/10 characters minimum
                    </small>
                </div>

                <div className="modal-footer">
                    <button onClick={onCancel} className="btn btn-secondary">
                        {t('common.cancel')}
                    </button>
                    <button onClick={handleSubmit} className="btn btn-danger">
                        ⏸️ {t('superadmin.suspend')}
                    </button>
                </div>
            </div>
        </div>
    );
}
