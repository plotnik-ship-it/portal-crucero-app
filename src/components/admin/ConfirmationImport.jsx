import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { processPDFConfirmation, saveConfirmationData } from '../../services/confirmationParser';

const ConfirmationImport = ({ family, onClose, onSuccess }) => {
    const { t } = useTranslation();

    // UI State
    const [mode, setMode] = useState('choose'); // 'choose', 'pdf', 'manual', 'cabinSelect', 'review'
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    // Data State
    const [extractedData, setExtractedData] = useState(null);
    const [editedData, setEditedData] = useState(null);

    // Multi-cabin support
    const [selectedCabinIndex, setSelectedCabinIndex] = useState(null);

    /**
     * Handle PDF file upload and processing
     */
    const handlePDFUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setProcessing(true);
        setError(null);

        try {
            const result = await processPDFConfirmation(file);

            if (!result.success) {
                // Handle scanned PDF or other warnings
                setError(result.message);
                setMode('choose'); // Go back to mode selection
                return;
            }

            setExtractedData(result.data);
            setEditedData(JSON.parse(JSON.stringify(result.data))); // Deep copy for editing

            // Check if family has multiple cabins
            if (family.cabinAccounts && family.cabinAccounts.length > 1) {
                setMode('cabinSelect');
            } else if (family.cabinAccounts && family.cabinAccounts.length === 1) {
                // Single cabin - auto-select it
                setSelectedCabinIndex(0);
                setMode('review');
            } else {
                // No cabins yet - will create first one
                setSelectedCabinIndex(null);
                setMode('review');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    /**
     * Handle manual entry mode
     */
    const handleManualEntry = () => {
        const emptyData = {
            groupMeta: {
                confirmationNumber: '',
                cruiseLine: '',
                shipName: '',
                sailDate: ''
            },
            cabins: [{
                number: '',
                type: '',
                passengers: [],
                pricing: {
                    subtotal: 0,
                    gratuities: 0,
                    total: 0,
                    currency: 'CAD'
                }
            }],
            confidence: 100,
            warnings: []
        };

        setExtractedData(emptyData);
        setEditedData(emptyData);
        setMode('manual');
    };

    /**
     * Add passenger to cabin
     */
    const handleAddPassenger = (cabinIndex) => {
        const newData = { ...editedData };
        if (!newData.cabins[cabinIndex].passengers) {
            newData.cabins[cabinIndex].passengers = [];
        }
        newData.cabins[cabinIndex].passengers.push({
            firstName: '',
            lastName: '',
            dateOfBirth: ''
        });
        setEditedData(newData);
    };

    /**
     * Remove passenger from cabin
     */
    const handleRemovePassenger = (cabinIndex, passengerIndex) => {
        const newData = { ...editedData };
        newData.cabins[cabinIndex].passengers.splice(passengerIndex, 1);
        setEditedData(newData);
    };

    /**
     * Update field value
     */
    const handleFieldChange = (path, value) => {
        const newData = { ...editedData };
        const keys = path.split('.');
        let current = newData;

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
        setEditedData(newData);
    };

    /**
     * Save confirmation data
     */
    const handleConfirm = async () => {
        setProcessing(true);
        setError(null);

        try {
            await saveConfirmationData(
                family.id,
                editedData,
                {
                    importSource: mode === 'manual' ? 'manual' : 'pdf',
                    importedAt: new Date().toISOString(),
                    importedByUid: 'current-user-uid' // TODO: Get from auth context
                },
                {
                    targetCabinIndex: selectedCabinIndex
                }
            );

            onSuccess?.();
            onClose();
        } catch (err) {
            setError('Error al guardar: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '700px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: '2rem'
            }}>
                {/* Mode Selection */}
                {mode === 'choose' && (
                    <div>
                        <h2 style={{ marginBottom: '1rem' }}>📄 Importar Confirmación</h2>
                        <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
                            ¿Cómo deseas agregar la información de la reserva?
                        </p>

                        {error && (
                            <div style={{
                                padding: '1rem',
                                background: '#fee',
                                border: '1px solid #fcc',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '1rem',
                                color: '#c00'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setMode('pdf')}
                                style={{ flex: '1 1 200px' }}
                            >
                                📄 Subir PDF
                                <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '0.25rem' }}>
                                    Extracción automática con IA
                                </div>
                            </button>

                            <button
                                className="btn btn-outline"
                                onClick={handleManualEntry}
                                style={{ flex: '1 1 200px' }}
                            >
                                ✏️ Entrada Manual
                                <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '0.25rem' }}>
                                    Captura tradicional
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="btn btn-outline"
                            style={{ marginTop: '2rem', width: '100%' }}
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                {/* PDF Upload Mode */}
                {mode === 'pdf' && (
                    <div>
                        <h2 style={{ marginBottom: '1rem' }}>📄 Subir PDF de Confirmación</h2>

                        <div style={{
                            border: '2px dashed var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            marginBottom: '1.5rem',
                            background: 'var(--color-background)'
                        }}>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handlePDFUpload}
                                disabled={processing}
                                style={{ display: 'none' }}
                                id="pdf-upload"
                            />
                            <label
                                htmlFor="pdf-upload"
                                style={{ cursor: processing ? 'not-allowed' : 'pointer' }}
                            >
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                    {processing ? '⏳ Procesando PDF...' : 'Haz clic para seleccionar PDF'}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                    Máximo 10MB
                                </div>
                            </label>
                        </div>

                        {processing && (
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <div>Extrayendo texto del PDF...</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                    Esto puede tardar unos segundos
                                </div>
                            </div>
                        )}

                        {error && (
                            <div style={{
                                padding: '1rem',
                                background: '#fee',
                                border: '1px solid #fcc',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '1rem'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            onClick={() => setMode('choose')}
                            className="btn btn-outline"
                            disabled={processing}
                        >
                            ← Volver
                        </button>
                    </div>
                )}

                {/* Cabin Selection Mode (Multi-cabin support) */}
                {mode === 'cabinSelect' && (
                    <div>
                        <h2 style={{ marginBottom: '0.5rem' }}>🚪 Seleccionar Cabina</h2>
                        <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
                            Esta familia tiene {family.cabinAccounts.length} cabinas.
                            ¿A cuál corresponde este PDF?
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            {family.cabinAccounts.map((cabin, idx) => (
                                <label
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        border: selectedCabinIndex === idx ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        background: selectedCabinIndex === idx ? 'var(--color-primary-light)' : 'white',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="cabin-select"
                                        value={idx}
                                        checked={selectedCabinIndex === idx}
                                        onChange={() => setSelectedCabinIndex(idx)}
                                        style={{ marginRight: '1rem', width: '20px', height: '20px' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                            🚪 Cabina {cabin.cabinNumber}
                                        </div>
                                        {cabin.passengers && cabin.passengers.length > 0 && (
                                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                                👥 {cabin.passengers.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                            Total: ${((cabin.subtotalCad || 0) + (cabin.gratuitiesCad || 0)).toFixed(2)} CAD
                                            {cabin.paidCad > 0 && ` • Pagado: $${cabin.paidCad.toFixed(2)}`}
                                        </div>
                                    </div>
                                </label>
                            ))}

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    border: selectedCabinIndex === 'new' ? '2px solid var(--color-success)' : '1px dashed var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    background: selectedCabinIndex === 'new' ? '#f0fdf4' : 'white',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <input
                                    type="radio"
                                    name="cabin-select"
                                    value="new"
                                    checked={selectedCabinIndex === 'new'}
                                    onChange={() => setSelectedCabinIndex('new')}
                                    style={{ marginRight: '1rem', width: '20px', height: '20px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--color-success)' }}>
                                        ➕ Nueva Cabina
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                        Agregar una cabina adicional a esta familia
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setMode('review')}
                                disabled={selectedCabinIndex === null}
                                style={{ flex: 1 }}
                            >
                                Continuar →
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() => setMode('choose')}
                            >
                                ← Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Review/Edit Mode */}
                {(mode === 'review' || mode === 'manual') && editedData && (
                    <div>
                        <h2 style={{ marginBottom: '0.5rem' }}>
                            {mode === 'review' ? '✅ Revisar Datos Extraídos' : '✏️ Entrada Manual'}
                        </h2>

                        {mode === 'review' && (
                            <div style={{
                                marginBottom: '1.5rem',
                                padding: '0.75rem',
                                background: extractedData.confidence >= 80 ? '#efe' : '#ffe',
                                border: `1px solid ${extractedData.confidence >= 80 ? '#cfc' : '#ffc'}`,
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <strong>Confianza: {extractedData.confidence}%</strong>
                                {extractedData.warnings?.length > 0 && (
                                    <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                        ⚠️ {extractedData.warnings.join(', ')}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Información General</h3>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label>Número de Confirmación</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={editedData.groupMeta?.confirmationNumber || ''}
                                        onChange={(e) => handleFieldChange('groupMeta.confirmationNumber', e.target.value)}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label>Naviera</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={editedData.groupMeta?.cruiseLine || ''}
                                            onChange={(e) => handleFieldChange('groupMeta.cruiseLine', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label>Barco</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={editedData.groupMeta?.shipName || ''}
                                            onChange={(e) => handleFieldChange('groupMeta.shipName', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label>Fecha de Zarpe</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={editedData.groupMeta?.sailDate || ''}
                                        onChange={(e) => handleFieldChange('groupMeta.sailDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Cabin Information */}
                        {editedData.cabins?.map((cabin, cabinIndex) => (
                            <div key={cabinIndex} style={{
                                marginBottom: '1.5rem',
                                padding: '1rem',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <h3 style={{ marginBottom: '1rem' }}>Cabina {cabinIndex + 1}</h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label>Número de Cabina</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={cabin.number || ''}
                                            onChange={(e) => handleFieldChange(`cabins.${cabinIndex}.number`, e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label>Tipo de Cabina</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={cabin.type || ''}
                                            onChange={(e) => handleFieldChange(`cabins.${cabinIndex}.type`, e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Passengers (Optional) */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <label>Pasajeros (Opcional)</label>
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={() => handleAddPassenger(cabinIndex)}
                                        >
                                            + Agregar Pasajero
                                        </button>
                                    </div>

                                    {cabin.passengers?.map((passenger, passengerIndex) => (
                                        <div key={passengerIndex} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr auto',
                                            gap: '0.5rem',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Nombre"
                                                value={passenger.firstName || ''}
                                                onChange={(e) => handleFieldChange(`cabins.${cabinIndex}.passengers.${passengerIndex}.firstName`, e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Apellido"
                                                value={passenger.lastName || ''}
                                                onChange={(e) => handleFieldChange(`cabins.${cabinIndex}.passengers.${passengerIndex}.lastName`, e.target.value)}
                                            />
                                            <input
                                                type="date"
                                                className="input"
                                                placeholder="Fecha Nac."
                                                value={passenger.dateOfBirth || ''}
                                                onChange={(e) => handleFieldChange(`cabins.${cabinIndex}.passengers.${passengerIndex}.dateOfBirth`, e.target.value)}
                                            />
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => handleRemovePassenger(cabinIndex, passengerIndex)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Pricing */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label>Subtotal</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={cabin.pricing?.subtotal || 0}
                                            onChange={(e) => handleFieldChange(`cabins.${cabinIndex}.pricing.subtotal`, parseFloat(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label>Propinas</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={cabin.pricing?.gratuities || 0}
                                            onChange={(e) => handleFieldChange(`cabins.${cabinIndex}.pricing.gratuities`, parseFloat(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label>Total</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={cabin.pricing?.total || 0}
                                            onChange={(e) => handleFieldChange(`cabins.${cabinIndex}.pricing.total`, parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {error && (
                            <div style={{
                                padding: '1rem',
                                background: '#fee',
                                border: '1px solid #fcc',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '1rem'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleConfirm}
                                disabled={processing}
                                style={{ flex: 1 }}
                            >
                                {processing ? '⏳ Guardando...' : '✅ Confirmar y Guardar'}
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={onClose}
                                disabled={processing}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfirmationImport;
