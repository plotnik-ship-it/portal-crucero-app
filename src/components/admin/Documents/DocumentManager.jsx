import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { getDocumentsByFamily } from '../../../services/documentService';
import FileUploader from './FileUploader';
import DocumentList from './DocumentList';

const DocumentManager = ({ groupId, agencyId }) => {
    const { t } = useTranslation();
    const [families, setFamilies] = useState([]);
    const [selectedFamilyCode, setSelectedFamilyCode] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load families
    useEffect(() => {
        if (!groupId || !agencyId) {
            setLoading(false);
            return;
        }

        loadFamilies();
    }, [groupId, agencyId]);

    // Load documents when family is selected
    useEffect(() => {
        if (!selectedFamilyCode || !groupId || !agencyId) {
            setDocuments([]);
            return;
        }

        loadDocuments();
    }, [selectedFamilyCode, groupId, agencyId]);

    const loadFamilies = async () => {
        setLoading(true);
        try {
            console.log('Loading families for:', { agencyId, groupId });
            const familiesRef = collection(db, 'agencies', agencyId, 'groups', groupId, 'families');
            const snapshot = await getDocs(familiesRef);
            console.log('Families snapshot size:', snapshot.size);

            const familyList = snapshot.docs.map(doc => {
                const data = doc.data();
                console.log('Family data:', data);
                return {
                    id: doc.id,
                    code: data.code || doc.id,
                    name: data.name || 'Sin nombre',
                    ...data
                };
            });

            console.log('Loaded families:', familyList);
            setFamilies(familyList);
        } catch (err) {
            console.error('Error loading families:', err);
            setError(t('admin.documents.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const loadDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
            const docs = await getDocumentsByFamily(agencyId, groupId, selectedFamilyCode);
            setDocuments(docs);
        } catch (err) {
            console.error('Error loading documents:', err);
            setError(t('admin.documents.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleUploadComplete = (newDocument) => {
        setDocuments(prev => [newDocument, ...prev]);
    };

    const handleDocumentDeleted = (documentId) => {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    };

    // If no group selected
    if (!groupId || !agencyId) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">📁</div>
                <p className="text-lg font-medium">{t('admin.documents.selectbooking')}</p>
                <p className="text-sm text-muted mt-2">{t('admin.documents.selectBookingHint')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">
                        📁 {t('admin.documents.title')}
                    </h2>
                    <p className="text-sm text-muted mt-1">
                        {t('admin.documents.subtitle')}
                    </p>
                </div>
            </div>

            {/* Family Selector */}
            <div className="card">
                <div className="card-body">
                    <label className="form-label">{t('admin.documents.selectbooking')}</label>
                    <select
                        value={selectedFamilyCode || ''}
                        onChange={(e) => setSelectedFamilyCode(e.target.value)}
                        className="form-input"
                    >
                        <option value="">{t('admin.documents.selectbooking')}</option>
                        {families.map(family => (
                            <option key={family.code} value={family.code}>
                                {family.code} - {family.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Show content only when family is selected */}
            {selectedFamilyCode && (
                <>
                    {/* File Uploader */}
                    <FileUploader
                        agencyId={agencyId}
                        groupId={groupId}
                        familyCode={selectedFamilyCode}
                        onUploadComplete={handleUploadComplete}
                    />

                    {/* Error Message */}
                    {error && (
                        <div className="alert alert-error">
                            <span>❌ {error}</span>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
                        <div className="text-center py-12">
                            <span className="loading loading-spinner loading-lg"></span>
                            <p className="text-sm text-muted mt-4">{t('common.loading')}</p>
                        </div>
                    ) : (
                        /* Document List */
                        <DocumentList
                            documents={documents}
                            onDocumentDeleted={handleDocumentDeleted}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default DocumentManager;
