import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateShareLink } from '../../../services/documentService';

const ShareLinkModal = ({ document, onClose }) => {
    const { t } = useTranslation();
    const [shareLink, setShareLink] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerateLink = async () => {
        setGenerating(true);
        try {
            const link = await generateShareLink(document.id);
            setShareLink(link);
        } catch (error) {
            console.error('Error generating share link:', error);
            alert(t('documents.shareLinkError'));
        } finally {
            setGenerating(false);
        }
    };

    const handleCopyLink = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">
                        🔗 {t('documents.shareLink')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="btn btn-sm btn-circle btn-ghost"
                    >
                        ✕
                    </button>
                </div>

                {/* Document Info */}
                <div className="bg-base-200 rounded-lg p-4 mb-4">
                    <p className="font-medium truncate">{document.fileName}</p>
                    <p className="text-xs text-muted mt-1">
                        {t('documents.linkExpires')}
                    </p>
                </div>

                {/* Generate Link */}
                {!shareLink && !document.sharedLink && (
                    <div className="text-center py-6">
                        <p className="text-sm text-muted mb-4">
                            {t('documents.generateLinkDescription')}
                        </p>
                        <button
                            onClick={handleGenerateLink}
                            className="btn btn-primary"
                            disabled={generating}
                        >
                            {generating ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    {t('documents.generating')}
                                </>
                            ) : (
                                <>
                                    🔗 {t('documents.generateLink')}
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Show Link */}
                {(shareLink || document.sharedLink) && (
                    <div className="space-y-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">{t('documents.shareLinkUrl')}</span>
                            </label>
                            <div className="join w-full">
                                <input
                                    type="text"
                                    value={shareLink || `${window.location.origin}/shared/${document.sharedLink.token}`}
                                    readOnly
                                    className="input input-bordered join-item flex-1 text-sm"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className="btn btn-primary join-item"
                                >
                                    {copied ? '✅' : '📋'} {copied ? t('documents.copied') : t('documents.copyLink')}
                                </button>
                            </div>
                        </div>

                        {/* Expiration Warning */}
                        <div className="alert alert-warning">
                            <span>
                                ⏰ {t('documents.linkExpiresIn24h')}
                            </span>
                        </div>

                        {/* Instructions */}
                        <div className="text-sm text-muted">
                            <p className="font-medium mb-2">{t('documents.howToShare')}:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>{t('documents.shareStep1')}</li>
                                <li>{t('documents.shareStep2')}</li>
                                <li>{t('documents.shareStep3')}</li>
                            </ol>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="modal-action">
                    <button onClick={onClose} className="btn">
                        {t('common.close')}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

export default ShareLinkModal;
