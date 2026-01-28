import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../shared/Card';
import { createQuotation } from '../../services/quotationService';
import { downloadQuotationPDF } from '../../utils/quotationPdfGenerator';
import { useAuth } from '../../hooks/useAuth';

const QuotationBuilder = ({ agencyId, onClose, onSuccess }) => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [step, setStep] = useState(1); // 1: Client Info, 2: Cruise Info, 3: Cabins, 4: Review
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form data
    const [clientInfo, setClientInfo] = useState({
        name: '',
        email: '',
        phone: ''
    });

    const [cruiseInfo, setCruiseInfo] = useState({
        cruiseLine: '',
        shipName: '',
        sailDate: '',
        duration: 7,
        departurePort: '',
        itinerary: []
    });

    const [cabins, setCabins] = useState([
        { cabinType: 'Interior', cabinCategory: '', quantity: 1, pricePerCabin: 0 }
    ]);

    const [additionalCosts, setAdditionalCosts] = useState({
        gratuities: 0,
        taxes: 0,
        insurance: 0
    });

    const [notes, setNotes] = useState('');
    const [termsAndConditions, setTermsAndConditions] = useState('Depósito no reembolsable del 25% requerido al momento de la reserva. El saldo debe pagarse 60 días antes de la salida. Los precios están sujetos a disponibilidad y pueden cambiar sin previo aviso.');

    // Add cabin
    const handleAddCabin = () => {
        setCabins([...cabins, { cabinType: 'Interior', cabinCategory: '', quantity: 1, pricePerCabin: 0 }]);
    };

    // Remove cabin
    const handleRemoveCabin = (index) => {
        setCabins(cabins.filter((_, i) => i !== index));
    };

    // Update cabin
    const handleUpdateCabin = (index, field, value) => {
        const newCabins = [...cabins];
        newCabins[index][field] = value;
        setCabins(newCabins);
    };

    // Calculate totals
    const calculateTotals = () => {
        const cabinSubtotal = cabins.reduce((sum, cabin) => {
            return sum + (cabin.pricePerCabin * cabin.quantity);
        }, 0);

        const total = cabinSubtotal + additionalCosts.gratuities + additionalCosts.taxes + additionalCosts.insurance;

        return {
            subtotal: cabinSubtotal,
            total
        };
    };

    // Create quotation
    const handleCreateQuotation = async () => {
        try {
            setLoading(true);
            setError('');

            // Validate
            if (!clientInfo.name || !clientInfo.email) {
                setError('Nombre y email del cliente son requeridos');
                return;
            }

            if (!cruiseInfo.cruiseLine || !cruiseInfo.shipName) {
                setError('Información del crucero es requerida');
                return;
            }

            if (cabins.length === 0 || cabins.some(c => c.pricePerCabin <= 0)) {
                setError('Agrega al menos una cabina con precio válido');
                return;
            }

            const quotationData = {
                agencyId,
                clientInfo,
                cruiseInfo: {
                    ...cruiseInfo,
                    sailDate: cruiseInfo.sailDate ? new Date(cruiseInfo.sailDate) : new Date()
                },
                cabins,
                additionalCosts,
                notes,
                termsAndConditions,
                currency: 'CAD',
                status: 'draft'
            };

            const createdQuotation = await createQuotation(quotationData);

            alert(t('quotation.quotationCreated'));

            if (onSuccess) onSuccess(createdQuotation);
            if (onClose) onClose();
        } catch (err) {
            console.error('Error creating quotation:', err);
            setError('Error al crear la cotización: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Preview PDF
    const handlePreviewPDF = () => {
        const totals = calculateTotals();
        const previewData = {
            quotationNumber: 'QUOT-PREVIEW',
            agencyId,
            clientInfo,
            cruiseInfo: {
                ...cruiseInfo,
                sailDate: cruiseInfo.sailDate ? new Date(cruiseInfo.sailDate) : new Date()
            },
            cabins,
            additionalCosts,
            subtotal: totals.subtotal,
            total: totals.total,
            currency: 'CAD',
            notes,
            termsAndConditions,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };

        const agencyBranding = {
            name: 'Travel Point',
            email: 'info@travelpoint.com',
            phone: '+1 (555) 123-4567',
            primaryColor: [41, 128, 185],
            secondaryColor: [52, 73, 94]
        };

        downloadQuotationPDF(previewData, agencyBranding, i18n.language);
    };

    const totals = calculateTotals();

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
            zIndex: 1000,
            padding: '1rem',
            overflow: 'auto'
        }}>
            <div style={{
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)'
            }}>
                <Card>
                    <div className="card-header">
                        <div className="flex justify-between items-center">
                            <h3 className="card-title">📝 {t('quotation.newQuotation')}</h3>
                            <button onClick={onClose} className="btn btn-sm btn-outline">
                                ✕ {t('common.close')}
                            </button>
                        </div>
                    </div>

                    <div className="card-body">
                        {error && (
                            <div className="alert alert-error mb-md">
                                {error}
                            </div>
                        )}

                        {/* Progress Steps */}
                        <div className="flex gap-sm mb-lg" style={{ borderBottom: '2px solid var(--color-border)', paddingBottom: '1rem' }}>
                            {[1, 2, 3, 4].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStep(s)}
                                    className={`btn ${step === s ? 'btn-primary' : 'btn-outline'} flex-1`}
                                >
                                    {s === 1 && '👤 Cliente'}
                                    {s === 2 && '🚢 Crucero'}
                                    {s === 3 && '🛏️ Cabinas'}
                                    {s === 4 && '📋 Revisar'}
                                </button>
                            ))}
                        </div>

                        {/* Step 1: Client Information */}
                        {step === 1 && (
                            <div>
                                <h4 className="font-semibold mb-md">{t('quotation.clientInfo')}</h4>

                                <div className="form-group">
                                    <label className="form-label required">{t('quotation.clientName')}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={clientInfo.name}
                                        onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                                        placeholder="Ej: María González"
                                    />
                                </div>

                                <div className="grid grid-2 gap-md">
                                    <div className="form-group">
                                        <label className="form-label required">{t('quotation.clientEmail')}</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={clientInfo.email}
                                            onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                                            placeholder="maria@example.com"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{t('quotation.clientPhone')}</label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            value={clientInfo.phone}
                                            onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                                            placeholder="+52 123 456 7890"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end mt-lg">
                                    <button onClick={() => setStep(2)} className="btn btn-primary">
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Cruise Information */}
                        {step === 2 && (
                            <div>
                                <h4 className="font-semibold mb-md">{t('quotation.cruiseInfo')}</h4>

                                <div className="grid grid-2 gap-md">
                                    <div className="form-group">
                                        <label className="form-label required">{t('quotation.cruiseLine')}</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={cruiseInfo.cruiseLine}
                                            onChange={(e) => setCruiseInfo({ ...cruiseInfo, cruiseLine: e.target.value })}
                                            placeholder="Ej: MSC Cruises"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label required">{t('quotation.shipName')}</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={cruiseInfo.shipName}
                                            onChange={(e) => setCruiseInfo({ ...cruiseInfo, shipName: e.target.value })}
                                            placeholder="Ej: MSC Seascape"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-3 gap-md">
                                    <div className="form-group">
                                        <label className="form-label">{t('quotation.sailDate')}</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={cruiseInfo.sailDate}
                                            onChange={(e) => setCruiseInfo({ ...cruiseInfo, sailDate: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{t('quotation.duration')}</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={cruiseInfo.duration}
                                            onChange={(e) => setCruiseInfo({ ...cruiseInfo, duration: parseInt(e.target.value) || 0 })}
                                            min="1"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{t('quotation.departurePort')}</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={cruiseInfo.departurePort}
                                            onChange={(e) => setCruiseInfo({ ...cruiseInfo, departurePort: e.target.value })}
                                            placeholder="Ej: Miami, Florida"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-md justify-between mt-lg">
                                    <button onClick={() => setStep(1)} className="btn btn-outline">
                                        ← Anterior
                                    </button>
                                    <button onClick={() => setStep(3)} className="btn btn-primary">
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Cabins */}
                        {step === 3 && (
                            <div>
                                <div className="flex justify-between items-center mb-md">
                                    <h4 className="font-semibold">{t('quotation.cabinDetails')}</h4>
                                    <button onClick={handleAddCabin} className="btn btn-sm btn-success">
                                        + {t('quotation.addCabin')}
                                    </button>
                                </div>

                                {cabins.map((cabin, index) => (
                                    <div key={index} className="p-md mb-md rounded border border-light">
                                        <div className="flex justify-between items-center mb-sm">
                                            <span className="font-semibold">Cabina #{index + 1}</span>
                                            {cabins.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveCabin(index)}
                                                    className="btn btn-xs btn-danger"
                                                >
                                                    🗑️ {t('quotation.removeCabin')}
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-4 gap-sm">
                                            <div className="form-group">
                                                <label className="form-label text-xs">{t('quotation.cabinType')}</label>
                                                <select
                                                    className="form-input text-sm"
                                                    value={cabin.cabinType}
                                                    onChange={(e) => handleUpdateCabin(index, 'cabinType', e.target.value)}
                                                >
                                                    <option value="Interior">{t('quotation.cabinTypes.interior')}</option>
                                                    <option value="Oceanview">{t('quotation.cabinTypes.oceanview')}</option>
                                                    <option value="Balcony">{t('quotation.cabinTypes.balcony')}</option>
                                                    <option value="Suite">{t('quotation.cabinTypes.suite')}</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label text-xs">{t('quotation.cabinCategory')}</label>
                                                <input
                                                    type="text"
                                                    className="form-input text-sm"
                                                    value={cabin.cabinCategory}
                                                    onChange={(e) => handleUpdateCabin(index, 'cabinCategory', e.target.value)}
                                                    placeholder="Ej: B2"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label text-xs">{t('quotation.quantity')}</label>
                                                <input
                                                    type="number"
                                                    className="form-input text-sm"
                                                    value={cabin.quantity}
                                                    onChange={(e) => handleUpdateCabin(index, 'quantity', parseInt(e.target.value) || 1)}
                                                    min="1"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label text-xs">{t('quotation.pricePerCabin')} (CAD)</label>
                                                <input
                                                    type="number"
                                                    className="form-input text-sm"
                                                    value={cabin.pricePerCabin}
                                                    onChange={(e) => handleUpdateCabin(index, 'pricePerCabin', parseFloat(e.target.value) || 0)}
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-xs text-right text-sm font-semibold">
                                            Subtotal: ${(cabin.pricePerCabin * cabin.quantity).toFixed(2)} CAD
                                        </div>
                                    </div>
                                ))}

                                <div className="p-md bg-light rounded mt-md">
                                    <h5 className="font-semibold mb-sm">{t('quotation.additionalCosts')}</h5>
                                    <div className="grid grid-3 gap-md">
                                        <div className="form-group">
                                            <label className="form-label text-sm">{t('admin.gratuities')} (CAD)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={additionalCosts.gratuities}
                                                onChange={(e) => setAdditionalCosts({ ...additionalCosts, gratuities: parseFloat(e.target.value) || 0 })}
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label text-sm">{t('admin.taxes')} (CAD)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={additionalCosts.taxes}
                                                onChange={(e) => setAdditionalCosts({ ...additionalCosts, taxes: parseFloat(e.target.value) || 0 })}
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label text-sm">{t('quotation.insurance')} (CAD)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={additionalCosts.insurance}
                                                onChange={(e) => setAdditionalCosts({ ...additionalCosts, insurance: parseFloat(e.target.value) || 0 })}
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-md justify-between mt-lg">
                                    <button onClick={() => setStep(2)} className="btn btn-outline">
                                        ← Anterior
                                    </button>
                                    <button onClick={() => setStep(4)} className="btn btn-primary">
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Review */}
                        {step === 4 && (
                            <div>
                                <h4 className="font-semibold mb-md">📋 Revisar Cotización</h4>

                                {/* Summary */}
                                <div className="grid grid-2 gap-md mb-md">
                                    <div className="p-md bg-light rounded">
                                        <h5 className="font-semibold mb-sm">👤 Cliente</h5>
                                        <p className="text-sm"><strong>Nombre:</strong> {clientInfo.name}</p>
                                        <p className="text-sm"><strong>Email:</strong> {clientInfo.email}</p>
                                        {clientInfo.phone && <p className="text-sm"><strong>Teléfono:</strong> {clientInfo.phone}</p>}
                                    </div>

                                    <div className="p-md bg-light rounded">
                                        <h5 className="font-semibold mb-sm">🚢 Crucero</h5>
                                        <p className="text-sm"><strong>Naviera:</strong> {cruiseInfo.cruiseLine}</p>
                                        <p className="text-sm"><strong>Barco:</strong> {cruiseInfo.shipName}</p>
                                        <p className="text-sm"><strong>Duración:</strong> {cruiseInfo.duration} días</p>
                                    </div>
                                </div>

                                {/* Cabins Summary */}
                                <div className="p-md bg-light rounded mb-md">
                                    <h5 className="font-semibold mb-sm">🛏️ Cabinas ({cabins.length})</h5>
                                    {cabins.map((cabin, index) => (
                                        <div key={index} className="flex justify-between text-sm mb-xs">
                                            <span>{cabin.quantity}x {cabin.cabinType} {cabin.cabinCategory && `(${cabin.cabinCategory})`}</span>
                                            <span className="font-semibold">${(cabin.pricePerCabin * cabin.quantity).toFixed(2)} CAD</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals */}
                                <div className="p-md bg-success-light rounded mb-md">
                                    <div className="flex justify-between mb-xs">
                                        <span>Subtotal Cabinas:</span>
                                        <span className="font-semibold">${totals.subtotal.toFixed(2)} CAD</span>
                                    </div>
                                    {additionalCosts.gratuities > 0 && (
                                        <div className="flex justify-between mb-xs text-sm">
                                            <span>Propinas:</span>
                                            <span>${additionalCosts.gratuities.toFixed(2)} CAD</span>
                                        </div>
                                    )}
                                    {additionalCosts.taxes > 0 && (
                                        <div className="flex justify-between mb-xs text-sm">
                                            <span>Impuestos:</span>
                                            <span>${additionalCosts.taxes.toFixed(2)} CAD</span>
                                        </div>
                                    )}
                                    {additionalCosts.insurance > 0 && (
                                        <div className="flex justify-between mb-xs text-sm">
                                            <span>Seguro:</span>
                                            <span>${additionalCosts.insurance.toFixed(2)} CAD</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between mt-sm pt-sm border-t border-success" style={{ fontSize: '1.2rem' }}>
                                        <span className="font-bold">TOTAL:</span>
                                        <span className="font-bold text-success">${totals.total.toFixed(2)} CAD</span>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="form-group">
                                    <label className="form-label">{t('quotation.notes')}</label>
                                    <textarea
                                        className="form-input"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows="3"
                                        placeholder="Promoción válida hasta..."
                                    />
                                </div>

                                {/* Terms */}
                                <div className="form-group">
                                    <label className="form-label">{t('quotation.termsAndConditions')}</label>
                                    <textarea
                                        className="form-input"
                                        value={termsAndConditions}
                                        onChange={(e) => setTermsAndConditions(e.target.value)}
                                        rows="4"
                                    />
                                </div>

                                <div className="flex gap-md justify-between mt-lg">
                                    <button onClick={() => setStep(3)} className="btn btn-outline">
                                        ← Anterior
                                    </button>
                                    <div className="flex gap-sm">
                                        <button onClick={handlePreviewPDF} className="btn btn-outline">
                                            👁️ Vista Previa PDF
                                        </button>
                                        <button
                                            onClick={handleCreateQuotation}
                                            className="btn btn-success"
                                            disabled={loading}
                                        >
                                            {loading ? 'Creando...' : '✅ Crear Cotización'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default QuotationBuilder;
