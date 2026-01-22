import { useState } from 'react';
import { parseCSV, validateFamilies, transformFamilyForFirestore, downloadCSVTemplate } from '../../utils/csvParser';
import { bulkCreateFamilies } from '../../services/firestore';
import Card from '../shared/Card';
import Badge from '../shared/Badge';

const BulkFamilyImport = ({ onClose, onSuccess }) => {
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
            alert('Por favor selecciona un archivo CSV');
            return;
        }

        setFile(selectedFile);
        setParseResult(null);
        setImportResult(null);

        try {
            const text = await selectedFile.text();
            const families = parseCSV(text);
            const validation = validateFamilies(families);
            setParseResult(validation);
        } catch (error) {
            alert(`Error al procesar el archivo: ${error.message}`);
            setFile(null);
        }
    };

    const handleImport = async () => {
        if (!parseResult || parseResult.validCount === 0) {
            return;
        }

        setImporting(true);
        try {
            // Transform families to Firestore format
            const transformedFamilies = parseResult.validFamilies.map(transformFamilyForFirestore);

            // Bulk create
            const result = await bulkCreateFamilies(transformedFamilies);
            setImportResult(result);

            if (result.successful.length > 0 && onSuccess) {
                onSuccess();
            }
        } catch (error) {
            alert(`Error al importar familias: ${error.message}`);
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
                    <h2 className="modal-title">📥 Importación Masiva de Familias</h2>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>

                <div className="modal-body">
                    {/* Instructions */}
                    {!file && !importResult && (
                        <div className="mb-lg">
                            <p className="text-muted mb-md">
                                Sube un archivo CSV con la información de las familias. El archivo debe contener las siguientes columnas:
                            </p>
                            <ul className="text-small text-muted mb-md">
                                <li><strong>familyCode</strong> (requerido): Código único de la familia</li>
                                <li><strong>displayName</strong> (requerido): Apellido o nombre de la familia</li>
                                <li><strong>email</strong> (requerido): Email de contacto</li>
                                <li><strong>cabinNumbers</strong> (opcional): Números de cabina separados por punto y coma</li>
                                <li><strong>defaultPassword</strong> (opcional): Contraseña inicial</li>
                            </ul>
                            <button
                                onClick={downloadCSVTemplate}
                                className="btn btn-outline btn-sm"
                            >
                                📄 Descargar Plantilla CSV
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
                            <p className="mb-sm">Arrastra y suelta tu archivo CSV aquí</p>
                            <p className="text-muted text-small mb-md">o</p>
                            <label className="btn btn-primary">
                                Seleccionar Archivo
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
                                <h3 className="text-lg font-bold">Vista Previa</h3>
                                <button onClick={handleReset} className="btn btn-outline btn-sm">
                                    🔄 Cambiar Archivo
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-md mb-lg">
                                <Card>
                                    <div className="text-center">
                                        <p className="text-xs text-muted uppercase">Total</p>
                                        <p className="text-2xl font-bold">{parseResult.totalCount}</p>
                                    </div>
                                </Card>
                                <Card>
                                    <div className="text-center">
                                        <p className="text-xs text-success uppercase">Válidas</p>
                                        <p className="text-2xl font-bold text-success">{parseResult.validCount}</p>
                                    </div>
                                </Card>
                                <Card>
                                    <div className="text-center">
                                        <p className="text-xs text-danger uppercase">Inválidas</p>
                                        <p className="text-2xl font-bold text-danger">{parseResult.invalidCount}</p>
                                    </div>
                                </Card>
                            </div>

                            {/* Valid Families */}
                            {parseResult.validCount > 0 && (
                                <div className="mb-lg">
                                    <h4 className="text-md font-bold mb-sm text-success">✅ Familias Válidas ({parseResult.validCount})</h4>
                                    <div className="border border-light rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Código</th>
                                                    <th>Nombre</th>
                                                    <th>Email</th>
                                                    <th>Cabinas</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parseResult.validFamilies.map((family, idx) => (
                                                    <tr key={idx}>
                                                        <td><code>{family.familyCode}</code></td>
                                                        <td>{family.displayName}</td>
                                                        <td>{family.email}</td>
                                                        <td>{family.cabinNumbers || '-'}</td>
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
                                    <h4 className="text-md font-bold mb-sm text-danger">❌ Familias Inválidas ({parseResult.invalidCount})</h4>
                                    <div className="border border-danger rounded p-md" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {parseResult.invalidFamilies.map((item, idx) => (
                                            <div key={idx} className="mb-sm">
                                                <p className="font-bold text-small">
                                                    Fila {item.rowNumber}: {item.family.familyCode || '(sin código)'} - {item.family.displayName || '(sin nombre)'}
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
                            <h3 className="text-lg font-bold mb-md">Resultado de la Importación</h3>

                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-md mb-lg">
                                <Card>
                                    <div className="text-center">
                                        <p className="text-xs text-success uppercase">Exitosas</p>
                                        <p className="text-2xl font-bold text-success">{importResult.successful.length}</p>
                                    </div>
                                </Card>
                                <Card>
                                    <div className="text-center">
                                        <p className="text-xs text-danger uppercase">Fallidas</p>
                                        <p className="text-2xl font-bold text-danger">{importResult.failed.length}</p>
                                    </div>
                                </Card>
                            </div>

                            {/* Successful */}
                            {importResult.successful.length > 0 && (
                                <div className="mb-lg">
                                    <h4 className="text-md font-bold mb-sm text-success">✅ Familias Creadas</h4>
                                    <div className="border border-success rounded p-md" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {importResult.successful.map((item, idx) => (
                                            <div key={idx} className="mb-xs">
                                                <Badge variant="success">{item.familyCode}</Badge>
                                                <span className="ml-sm">{item.displayName}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Failed */}
                            {importResult.failed.length > 0 && (
                                <div className="mb-lg">
                                    <h4 className="text-md font-bold mb-sm text-danger">❌ Familias Fallidas</h4>
                                    <div className="border border-danger rounded p-md" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {importResult.failed.map((item, idx) => (
                                            <div key={idx} className="mb-sm">
                                                <p className="font-bold text-small">
                                                    <Badge variant="danger">{item.familyCode}</Badge>
                                                    <span className="ml-sm">{item.displayName}</span>
                                                </p>
                                                <p className="text-xs text-danger ml-md">Error: {item.error}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button onClick={handleReset} className="btn btn-outline w-full">
                                Importar Más Familias
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {parseResult && !importResult && (
                    <div className="modal-footer">
                        <button onClick={onClose} className="btn btn-outline">
                            Cancelar
                        </button>
                        <button
                            onClick={handleImport}
                            className="btn btn-primary"
                            disabled={importing || parseResult.validCount === 0}
                        >
                            {importing ? '⏳ Importando...' : `✅ Importar ${parseResult.validCount} Familia(s)`}
                        </button>
                    </div>
                )}

                {importResult && (
                    <div className="modal-footer">
                        <button onClick={onClose} className="btn btn-primary w-full">
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkFamilyImport;
