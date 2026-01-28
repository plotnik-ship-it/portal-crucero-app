import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    deleteDocument,
    getFileIcon,
    formatFileSize
} from '../../../services/documentService';
import DocumentViewer from './DocumentViewer';
import ShareLinkModal from './ShareLinkModal';

const DocumentList = ({ documents, onDocumentDeleted }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewerDocument, setViewerDocument] = useState(null);
    const [shareDocument, setShareDocument] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const categories = [
        { value: 'all', label: t('documents.allCategories'), icon: '📁' },
        { value: 'passports', label: t('documents.categories.passports'), icon: '🛂' },
        { value: 'invoices', label: t('documents.categories.invoices'), icon: '🧾' },
        { value: 'contracts', label: t('documents.categories.contracts'), icon: '📋' },
        { value: 'itineraries', label: t('documents.categories.itineraries'), icon: '🗺️' },
        { value: 'others', label: t('documents.categories.others'), icon: '📎' }
    ];

    // Filter documents
    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleDelete = async (doc) => {
        if (!window.confirm(t('documents.deleteConfirm'))) return;

        setDeleting(doc.id);
        try {
            await deleteDocument(doc.id, doc.storagePath);
            if (onDocumentDeleted) {
                onDocumentDeleted(doc.id);
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            alert(t('documents.deleteError'));
        } finally {
            setDeleting(null);
        }
    };

    const handleDownload = (doc) => {
        window.open(doc.downloadUrl, '_blank');
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <>
            <div className="card bg-base-100 shadow-sm">
                <div className="card-body">
                    <h3 className="card-title text-lg">
                        📚 {t('documents.myDocuments')}
                    </h3>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        {/* Search */}
                        <div className="form-control flex-1">
                            <input
                                type="text"
                                placeholder={t('documents.search')}
                                className="input input-bordered w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="form-control md:w-64">
                            <select
                                className="select select-bordered w-full"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.icon} {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Document List */}
                    {filteredDocuments.length === 0 ? (
                        <div className="text-center py-12 text-muted">
                            <div className="text-6xl mb-4">📭</div>
                            <p>{t('documents.noDocuments')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredDocuments.map(doc => (
                                <div
                                    key={doc.id}
                                    className="border border-base-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* File Icon */}
                                        <div className="text-4xl flex-shrink-0">
                                            {getFileIcon(doc.fileType)}
                                        </div>

                                        {/* File Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium truncate">
                                                {doc.fileName}
                                            </h4>
                                            <div className="flex flex-wrap gap-2 text-xs text-muted mt-1">
                                                <span>
                                                    {categories.find(c => c.value === doc.category)?.icon}{' '}
                                                    {categories.find(c => c.value === doc.category)?.label}
                                                </span>
                                                <span>•</span>
                                                <span>{formatFileSize(doc.fileSize)}</span>
                                                <span>•</span>
                                                <span>{formatDate(doc.uploadedAt)}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-2">
                                            {/* View */}
                                            <button
                                                className="btn btn-sm btn-ghost"
                                                onClick={() => setViewerDocument(doc)}
                                                title={t('documents.view')}
                                            >
                                                👁️
                                            </button>

                                            {/* Download */}
                                            <button
                                                className="btn btn-sm btn-ghost"
                                                onClick={() => handleDownload(doc)}
                                                title={t('documents.download')}
                                            >
                                                ⬇️
                                            </button>

                                            {/* Share */}
                                            <button
                                                className="btn btn-sm btn-ghost"
                                                onClick={() => setShareDocument(doc)}
                                                title={t('documents.share')}
                                            >
                                                🔗
                                            </button>

                                            {/* Delete */}
                                            <button
                                                className="btn btn-sm btn-ghost text-error"
                                                onClick={() => handleDelete(doc)}
                                                disabled={deleting === doc.id}
                                                title={t('documents.delete')}
                                            >
                                                {deleting === doc.id ? (
                                                    <span className="loading loading-spinner loading-xs"></span>
                                                ) : (
                                                    '🗑️'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Document Viewer Modal */}
            {viewerDocument && (
                <DocumentViewer
                    document={viewerDocument}
                    onClose={() => setViewerDocument(null)}
                />
            )}

            {/* Share Link Modal */}
            {shareDocument && (
                <ShareLinkModal
                    document={shareDocument}
                    onClose={() => setShareDocument(null)}
                />
            )}
        </>
    );
};

export default DocumentList;
