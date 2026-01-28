import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseCSV, validateBookings, mergeBookingsByCode, transformMergedBookingForFirestore, downloadCSVTemplate } from '../../utils/csvParser';
import { bulkCreateBookings } from '../../services/firestore';
import Card from '../shared/Card';
import Badge from '../shared/Badge';

const BulkBookingImport = ({ onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [file, setFile] = useState(null);
    const [parseResult, setParseResult] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleFileSelect = async (selectedFile) => {
        if (!selectedFile.name.endsWith('.csv')) {
            alert(t('admin.bulkImportErrorSelectCSV'));
            return;
        }

        setFile(selectedFile);
        setParseResult(null);
        setImportResult(null);

        try {
            const text = await selectedFile.text();
            const families = parseCSV(text);
            const validation = validateBookings(families);

            // Merge families by bookingCode
            const mergedBookings = mergeBookingsByCode(validation.validFamilies);

            setParseResult({
                ...validation,
                mergedBookings, // Add merged families to result
                mergedCount: mergedBookings.length
            });
        } catch (error) {
            alert(`${t('admin.bulkImportErrorProcessing')} ${error.message}`);
            setFile(null);
        }
    };

    const handleImport = async () => {
        if (!parseResult || parseResult.validCount === 0) {
            return;
        }

        setImporting(true);
        try {
            // Transform merged families to Firestore format
            const transformPromises = parseResult.mergedBookings.map(family =>
                transformMergedBookingForFirestore(family)
            );
            const transformedFamilies = await Promise.all(transformPromises);

            // Bulk create
            const result = await bulkCreateBookings(transformedFamilies);
            setImportResult(result);

            if (result.successful.length > 0 && onSuccess) {
                onSuccess();
            }
        } catch (error) {
            alert(`${t('admin.bulkImportErrorImporting')} ${error.message}`);
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setParseResult(null);
        setImportResult(null);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">📥 {t('admin.bulkImportTitle')}</h2>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>

                <div className="modal-body">
                    {/* Instructions */}
                    {!file && !importResult && (
                        <div className="mb-lg">
                            <p className="text-muted mb-md">
                                {t('admin.bulkImportInstructions')}
                            </p>
                            <ul className="text-small text-muted mb-md">
                                <li><strong>{t('admin.bulkImportBookingCode')}</strong> {t('admin.bulkImportBookingCodeDesc')}</li>
                                <li><strong>{t('admin.bulkImportDisplayName')}</strong> {t('admin.bulkImportDisplayNameDesc')}</li>
                                <li><strong>{t('admin.bulkImportEmail')}</strong> {t('admin.bulkImportEmailDesc')}</li>
                                <li><strong>{t('admin.bulkImportCabinNumbers')}</strong> {t('admin.bulkImportCabinNumbersDesc')}</li>
                            </ul>
                            <div className="alert alert-info mb-md">
                                <strong>💡 {t('admin.bulkImportMultipleCabins')}</strong> {t('admin.bulkImportMultipleCabinsDesc')} <code>{t('admin.bulkImportBookingCode')}</code>{t('admin.bulkImportMultipleCabinsDesc2')}
                            </div>
                            <button
                                onClick={downloadCSVTemplate}
                                className="btn btn-outline btn-sm"
                            >
                                📄 {t('admin.bulkImportDownloadTemplate')}
                            </button>
                        </div>
                    )}

                    {/* File Upload Area */}
                    {!file && !importResult && (
                        <div
                            className={`border-2 border-dashed rounded p-xl text-center ${dragActive ? 'border-primary bg-primary-light' : 'border-light'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <div className="mb-md">
                                <span style={{ fontSize: '3rem' }}>📂</span>
                            </div>
                            <p className="mb-sm">{t('admin.bulkImportDragDrop')}</p>
                            <p className="text-muted text-small mb-md">{t('admin.bulkImportOr')}</p>
                            <label className="btn btn-primary">
                                {t('admin.bulkImportSelectFile')}
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileInput}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>
                    )}

                    {/* Parse Results Preview */}
                    {parseResult && !importResult && (
                        <div>
                            <div className="flex justify-between items-center mb-md">
                                <h3 className="text-lg font-bold">{t('admin.bulkImportPreview')}</h3>
                                <button onClick={handleReset} className="btn btn-outline btn-sm">
                                    🔄 {t('admin.bulkImportChangeFile')}
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-md mb-lg">
                                <Card>
                                    <div className="text-center">
                                        <p className="text-xs text-muted uppercase">{t('admin.bulkImportTotal')}</p>
                                        <p className="text-2xl font-bold">{parseResult.totalCount}</p>
                                    </div>
                                </Card>
                                <Card>
                                    <div className="text-center">
                                        <p className="text-xs text-success uppercase">{t('admin.bulkImportValid')}</p>
                                        <p className="text-2xl font-bold text-success">{parseResult.validCount}</p>
                                    </div>
                                </Card>
                                <Card>
                                    <div className="text-center">
                                        <p className="text-xs text-danger uppercase">{t('admin.bulkImportInvalid')}</p>
                                        <p className="text-2xl font-bold text-danger">{parseResult.invalidCount}</p>
                                    </div>
                                </Card>
                            </div>

                            {/* Merged Families Preview */}
                            {parseResult.mergedCount > 0 && (
                                <div className="mb-lg">
                                    <h4 className="text-md font-bold mb-sm text-success">✅ {t('admin.bulkImportFamiliesToImport')} ({parseResult.mergedCount})</h4>
                                    <p className="text-small text-muted mb-sm">
                                        {parseResult.validCount} {t('admin.bulkImportValidRows')} → {parseResult.mergedCount} {t('admin.bulkImportMergedFamilies')}
                                    </p>
                                    <div className="border border-light rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>{t('admin.code')}</th>
                                                    <th>{t('admin.name')}</th>
                                                    <th>{t('admin.emailLabel')}</th>
                                                    <th>{t('admin.cabins')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parseResult.mergedBookings.map((family, idx) => (
                                                    <tr key={idx}>
                                                        <td><code>{family.bookingCode}</code></td>
                                                        <td>{family.displayName}</td>
                                                        <td>{family.email}</td>
                                                        <td>
                                                            {family.cabinNumbers.length > 0 ? (
                                                                <span>
                                                                    {family.cabinNumbers.join(', ')}
                                                                    <Badge variant="info" className="ml-sm">{family.cabinNumbers.length}</Badge>
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Invalid Families */}
                            {parseResult.invalidCount > 0 && (
                                <div className="mb-lg">
                                    <h4 className="text-md font-bold mb-sm text-danger">❌ {t('admin.bulkImportInvalidRows')} ({parseResult.invalidCount})</h4>
                                    <div className="border border-danger rounded p-md" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {parseResult.invalidFamilies.map((item, idx) => (
                                            <div key={idx} className="mb-sm">
                                                <p className="font-bold text-small">
                                                    {t('admin.bulkImportRow')} {item.rowNumber}: {item.family.bookingCode || '(sin código)'} - {item.family.displayName || '(sin nombre)'}
                                                </p>
                                                <ul className="text-xs text-danger ml-md">
                                                    {item.errors.map((error, errIdx) => (
                                                        <li key={errIdx}>• {error}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Import Results */}
                    {importResult && (
                        <div>
                            <h3 className="text-lg font-bold mb-md">{t('admin.bulkImportResults')}</h3>

                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-md mb-lg">
                                <Card>
                                    <div className="text-center">
                                        <p className="text-xs text-success uppercase">{t('admin.bulkImportSuccessful')}</p>
                                        <p className="text-2xl font-bold text-success">{importResult.successful.length}</p>
                                    </div>
                                </Card>
                                <Card>
                                    <div className="text-center">
                                        <p className="text-xs text-danger uppercase">{t('admin.bulkImportFailed')}</p>
                                        <p className="text-2xl font-bold text-danger">{importResult.failed.length}</p>
                                    </div>
                                </Card>
                            </div>

                            {/* Successful */}
                            {importResult.successful.length > 0 && (
                                <div className="mb-lg">
                                    <h4 className="text-md font-bold mb-sm text-success">✅ {t('admin.bulkImportFamiliesToImport')}</h4>
                                    <div className="border border-success rounded p-md" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {importResult.successful.map((item, idx) => (
                                            <div key={idx} className="mb-xs">
                                                <Badge variant="success">{item.bookingCode}</Badge>
                                                <span className="ml-sm">{item.displayName}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Failed */}
                            {importResult.failed.length > 0 && (
                                <div className="mb-lg">
                                    <h4 className="text-md font-bold mb-sm text-danger">❌ {t('admin.bulkImportFailedList')}</h4>
                                    <div className="border border-danger rounded p-md" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {importResult.failed.map((item, idx) => (
                                            <div key={idx} className="mb-sm">
                                                <p className="font-bold text-small">
                                                    <Badge variant="danger">{item.bookingCode}</Badge>
                                                    <span className="ml-sm">{item.displayName}</span>
                                                </p>
                                                <p className="text-xs text-danger ml-md">{t('admin.bulkImportError')}: {item.error}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button onClick={handleReset} className="btn btn-outline w-full">
                                {t('admin.bulkImportDownloadTemplate')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {parseResult && !importResult && (
                    <div className="modal-footer">
                        <button onClick={onClose} className="btn btn-outline">
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleImport}
                            className="btn btn-primary"
                            disabled={importing || parseResult.mergedCount === 0}
                        >
                            {importing ? `⏳ ${t('admin.bulkImportImporting')}` : `✅ ${t('admin.bulkImportStartImport')} (${parseResult.mergedCount})`}
                        </button>
                    </div>
                )}

                {importResult && (
                    <div className="modal-footer">
                        <button onClick={onClose} className="btn btn-primary w-full">
                            {t('admin.bulkImportClose')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkBookingImport;
