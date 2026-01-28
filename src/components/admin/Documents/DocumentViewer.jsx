import { useTranslation } from 'react-i18next';

const DocumentViewer = ({ document, onClose }) => {
    const { t } = useTranslation();

    const isPDF = document.fileType === 'application/pdf';
    const isImage = document.fileType.startsWith('image/');

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-4xl h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg truncate flex-1">
                        {document.fileName}
                    </h3>
                    <button
                        onClick={onClose}
                        className="btn btn-sm btn-circle btn-ghost"
                    >
                        ✕
                    </button>
                </div>

                {/* Viewer */}
                <div className="h-[calc(100%-4rem)] overflow-auto">
                    {isPDF && (
                        <iframe
                            src={document.downloadUrl}
                            className="w-full h-full border-0"
                            title={document.fileName}
                        />
                    )}

                    {isImage && (
                        <img
                            src={document.downloadUrl}
                            alt={document.fileName}
                            className="w-full h-auto"
                        />
                    )}

                    {!isPDF && !isImage && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="text-6xl mb-4">📎</div>
                            <p className="text-lg font-medium mb-2">
                                {t('documents.previewNotAvailable')}
                            </p>
                            <p className="text-sm text-muted mb-6">
                                {document.fileName}
                            </p>
                            <a
                                href={document.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                            >
                                ⬇️ {t('documents.download')}
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-action">
                    <a
                        href={document.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                    >
                        ⬇️ {t('documents.download')}
                    </a>
                    <button onClick={onClose} className="btn">
                        {t('common.close')}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

export default DocumentViewer;
