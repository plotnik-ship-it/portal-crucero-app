import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { uploadDocument, validateFile } from '../../../services/documentService';

const FileUploader = ({ agencyId, groupId, familyCode, onUploadComplete }) => {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('others');
    const [error, setError] = useState(null);

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0]; // Handle one file at a time
        setError(null);

        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const metadata = {
                agencyId,
                groupId,
                familyCode,
                category: selectedCategory
            };

            const document = await uploadDocument(file, metadata, (progress) => {
                setUploadProgress(progress);
            });

            // Success
            setUploading(false);
            setUploadProgress(0);
            if (onUploadComplete) {
                onUploadComplete(document);
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(t('documents.uploadError'));
            setUploading(false);
            setUploadProgress(0);
        }
    }, [agencyId, groupId, familyCode, selectedCategory, onUploadComplete, t]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        disabled: uploading
    });

    const categories = [
        { value: 'passports', label: t('documents.categories.passports'), icon: '🛂' },
        { value: 'invoices', label: t('documents.categories.invoices'), icon: '🧾' },
        { value: 'contracts', label: t('documents.categories.contracts'), icon: '📋' },
        { value: 'itineraries', label: t('documents.categories.itineraries'), icon: '🗺️' },
        { value: 'others', label: t('documents.categories.others'), icon: '📎' }
    ];

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
                <h3 className="card-title text-lg">
                    📁 {t('documents.upload')}
                </h3>

                {/* Category Selector */}
                <div className="form-control">
                    <label className="label">
                        <span className="label-text">{t('documents.category')}</span>
                    </label>
                    <select
                        className="select select-bordered w-full"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        disabled={uploading}
                    >
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>
                                {cat.icon} {cat.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Dropzone */}
                <div
                    {...getRootProps()}
                    className={`
                        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                        transition-all duration-200
                        ${isDragActive ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary/50'}
                        ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <input {...getInputProps()} />

                    {uploading ? (
                        <div className="space-y-4">
                            <div className="text-4xl">⏳</div>
                            <p className="text-sm font-medium">{t('documents.uploading')}</p>
                            <progress
                                className="progress progress-primary w-full"
                                value={uploadProgress}
                                max="100"
                            />
                            <p className="text-xs text-muted">{Math.round(uploadProgress)}%</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-4xl">
                                {isDragActive ? '📥' : '📤'}
                            </div>
                            <p className="text-sm font-medium">
                                {isDragActive
                                    ? t('documents.dropHere')
                                    : t('documents.dragDrop')
                                }
                            </p>
                            <p className="text-xs text-muted">
                                {t('documents.allowedTypes')}
                            </p>
                            <p className="text-xs text-muted">
                                {t('documents.maxSize')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="alert alert-error">
                        <span>❌ {error}</span>
                    </div>
                )}

                {/* Success Message */}
                {!uploading && uploadProgress === 0 && !error && (
                    <p className="text-xs text-muted text-center">
                        💡 {t('documents.uploadHint')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default FileUploader;
