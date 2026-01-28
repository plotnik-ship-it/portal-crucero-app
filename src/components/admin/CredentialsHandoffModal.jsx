/**
 * CredentialsHandoffModal Component
 * 
 * Admin-only modal for displaying and copying generated family credentials.
 * Credentials are ephemeral - once the modal is closed, they are gone forever.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './CredentialsHandoffModal.css';

const CredentialsHandoffModal = ({ credentials, groupCode, onClose }) => {
    const { t } = useTranslation();
    const [showCloseWarning, setShowCloseWarning] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    if (!credentials || credentials.length === 0) {
        return null;
    }

    const handleCopySingle = (credential, index) => {
        const message = `🚢 ${t('credentials.accessTitle')}

${t('credentials.groupCode')}: ${groupCode}
${t('credentials.bookingCode')}: ${credential.bookingCode}
${t('credentials.password')}: ${credential.password}

${t('credentials.loginUrl')}: ${window.location.origin}/login-v2`;

        navigator.clipboard.writeText(message).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        });
    };

    const handleExportCSV = () => {
        const headers = [
            t('credentials.bookingCode'),
            t('credentials.password'),
            t('credentials.groupCode'),
            t('credentials.displayName'),
            t('credentials.cabins')
        ];

        const rows = credentials.map(cred => [
            cred.bookingCode,
            cred.password,
            groupCode,
            cred.displayName || '',
            (cred.cabins || []).join(', ')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `credentials_${groupCode}_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClose = () => {
        if (!showCloseWarning) {
            setShowCloseWarning(true);
        } else {
            onClose();
        }
    };

    return (
        <div className="credentials-modal-overlay">
            <div className="credentials-modal">
                {/* Header */}
                <div className="credentials-header">
                    <h2>{t('credentials.title')}</h2>
                    <button onClick={handleClose} className="close-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Warning Banner */}
                <div className="credentials-warning">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="12" cy="17" r="1" fill="currentColor" />
                    </svg>
                    <div>
                        <strong>{t('credentials.warningTitle')}</strong>
                        <p>{t('credentials.warningMessage')}</p>
                    </div>
                </div>

                {/* Close Confirmation Warning */}
                {showCloseWarning && (
                    <div className="credentials-close-warning">
                        <p>{t('credentials.closeConfirmation')}</p>
                        <div className="warning-actions">
                            <button onClick={() => setShowCloseWarning(false)} className="btn btn-secondary">
                                {t('common.cancel')}
                            </button>
                            <button onClick={onClose} className="btn btn-danger">
                                {t('credentials.confirmClose')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Credentials Table */}
                <div className="credentials-table-container">
                    <table className="credentials-table">
                        <thead>
                            <tr>
                                <th>{t('credentials.bookingCode')}</th>
                                <th>{t('credentials.password')}</th>
                                <th>{t('credentials.displayName')}</th>
                                <th>{t('credentials.cabins')}</th>
                                <th>{t('credentials.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {credentials.map((credential, index) => (
                                <tr key={index}>
                                    <td className="code-cell">{credential.bookingCode}</td>
                                    <td className="password-cell">{credential.password}</td>
                                    <td>{credential.displayName || '-'}</td>
                                    <td>{(credential.cabins || []).join(', ') || '-'}</td>
                                    <td>
                                        <button
                                            onClick={() => handleCopySingle(credential, index)}
                                            className="btn btn-copy"
                                            title={t('credentials.copyToClipboard')}
                                        >
                                            {copiedIndex === index ? (
                                                <>
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    {t('credentials.copied')}
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                                        <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.5" />
                                                    </svg>
                                                    {t('credentials.copy')}
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Actions */}
                <div className="credentials-actions">
                    <button onClick={handleExportCSV} className="btn btn-primary">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M16 11v4a1 1 0 01-1 1H3a1 1 0 01-1-1v-4M5 7l4 4m0 0l4-4m-4 4V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {t('credentials.exportCSV')}
                    </button>
                    <div className="credential-count">
                        {credentials.length} {credentials.length === 1 ? t('credentials.family') : t('credentials.families')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CredentialsHandoffModal;
