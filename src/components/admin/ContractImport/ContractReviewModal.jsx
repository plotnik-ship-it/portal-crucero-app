/**
 * Contract Review Modal
 * Editable modal for currency selection, cabin table, dates, unparsed rows
 */

import { useState, useEffect } from 'react';
import { validateForConfirm } from '../../../services/contractImportService';
import UnparsedRowsPanel from './UnparsedRowsPanel';

const SUPPORTED_CURRENCIES = ['USD', 'CAD', 'EUR', 'MXN', 'GBP'];

function ContractReviewModal({
    isOpen,
    ocrResult,
    initialData,
    onConfirm,
    onCancel,
    locale = 'en'
}) {
    const [data, setData] = useState(initialData);
    const [validation, setValidation] = useState({ valid: true, errors: [], warnings: [] });
    const [activeTab, setActiveTab] = useState('cabins');

    // Initialize data from props
    useEffect(() => {
        if (initialData) {
            setData({ ...initialData });
        }
    }, [initialData]);

    // Re-validate on data change
    useEffect(() => {
        if (data) {
            const result = validateForConfirm(data);
            setValidation(result);
        }
    }, [data]);

    if (!isOpen) return null;

    const handleCurrencyChange = (currency) => {
        setData(prev => ({
            ...prev,
            baseCurrency: currency,
            cabinInventory: prev.cabinInventory.map(c => ({ ...c, currency }))
        }));
    };

    const handleCabinChange = (rowId, field, value) => {
        setData(prev => ({
            ...prev,
            cabinInventory: prev.cabinInventory.map(cabin =>
                cabin.rowId === rowId ? { ...cabin, [field]: value } : cabin
            )
        }));
    };

    const handleRemoveCabin = (rowId) => {
        setData(prev => ({
            ...prev,
            cabinInventory: prev.cabinInventory.filter(c => c.rowId !== rowId)
        }));
    };

    const handleAddCabin = () => {
        const newRowId = `manual_${Date.now()}`;
        setData(prev => ({
            ...prev,
            cabinInventory: [
                ...prev.cabinInventory,
                {
                    rowId: newRowId,
                    cabinNumber: '',
                    categoryCode: '',
                    type: '',
                    qty: 1,
                    priceCents: 0,
                    currency: prev.baseCurrency
                }
            ]
        }));
    };

    const handleDateChange = (field, value) => {
        setData(prev => ({
            ...prev,
            keyDates: { ...prev.keyDates, [field]: value }
        }));
    };

    const handleGroupNameChange = (value) => {
        setData(prev => ({ ...prev, groupName: value }));
    };

    const handleMapUnparsedRow = (rowData) => {
        const newRowId = `mapped_${Date.now()}`;
        setData(prev => ({
            ...prev,
            cabinInventory: [
                ...prev.cabinInventory,
                {
                    rowId: newRowId,
                    cabinNumber: rowData.cabinNumber || '',
                    categoryCode: '',
                    type: '',
                    qty: 1,
                    priceCents: 0,
                    currency: prev.baseCurrency,
                    rawLine: rowData.rawLine
                }
            ]
        }));
    };

    const handleConfirm = () => {
        if (validation.valid) {
            onConfirm(data);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="review-modal">
                <header className="modal-header">
                    <h2>{locale === 'es' ? 'Revisar Importación' : 'Review Import'}</h2>
                    <button className="close-btn" onClick={onCancel}>×</button>
                </header>

                {/* Review reason */}
                {ocrResult?.reason && (
                    <div className="review-reason">
                        <span className="reason-icon">ℹ️</span>
                        <span>{ocrResult.reason}</span>
                    </div>
                )}

                {/* Validation errors */}
                {validation.errors.length > 0 && (
                    <div className="validation-errors">
                        {validation.errors.map((err, i) => (
                            <div key={i} className="error-item">⚠️ {err}</div>
                        ))}
                    </div>
                )}

                {/* Validation warnings */}
                {validation.warnings.length > 0 && (
                    <div className="validation-warnings">
                        {validation.warnings.map((warn, i) => (
                            <div key={i} className="warning-item">💡 {warn}</div>
                        ))}
                    </div>
                )}

                {/* Group name */}
                <div className="form-group">
                    <label>{locale === 'es' ? 'Nombre del Grupo' : 'Group Name'}</label>
                    <input
                        type="text"
                        value={data.groupName || ''}
                        onChange={(e) => handleGroupNameChange(e.target.value)}
                        placeholder={locale === 'es' ? 'Ej: Caribe 2025' : 'Ex: Caribbean 2025'}
                    />
                </div>

                {/* Currency selector */}
                <div className="form-group">
                    <label>{locale === 'es' ? 'Moneda Base' : 'Base Currency'}</label>
                    <div className="currency-selector">
                        {SUPPORTED_CURRENCIES.map(curr => (
                            <button
                                key={curr}
                                className={`currency-btn ${data.baseCurrency === curr ? 'active' : ''}`}
                                onClick={() => handleCurrencyChange(curr)}
                            >
                                {curr}
                            </button>
                        ))}
                    </div>
                    {ocrResult?.currencyCandidates?.length > 0 && (
                        <div className="currency-candidates">
                            <span className="candidates-label">
                                {locale === 'es' ? 'Detectados:' : 'Detected:'}
                            </span>
                            {ocrResult.currencyCandidates.map(c => (
                                <span key={c.currency} className="candidate-badge">
                                    {c.currency} ({c.confidence}%)
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="review-tabs">
                    <button
                        className={`tab ${activeTab === 'cabins' ? 'active' : ''}`}
                        onClick={() => setActiveTab('cabins')}
                    >
                        {locale === 'es' ? 'Cabinas' : 'Cabins'}
                        <span className="badge">{data.cabinInventory?.length || 0}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'dates' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dates')}
                    >
                        {locale === 'es' ? 'Fechas' : 'Dates'}
                    </button>
                    {ocrResult?.unparsedRows?.length > 0 && (
                        <button
                            className={`tab ${activeTab === 'unparsed' ? 'active' : ''}`}
                            onClick={() => setActiveTab('unparsed')}
                        >
                            {locale === 'es' ? 'Sin Procesar' : 'Unparsed'}
                            <span className="badge warning">{ocrResult.unparsedRows.length}</span>
                        </button>
                    )}
                </div>

                {/* Cabins tab */}
                {activeTab === 'cabins' && (
                    <div className="tab-content">
                        <div className="cabins-table-container">
                            <table className="editable-cabins-table">
                                <thead>
                                    <tr>
                                        <th>{locale === 'es' ? 'Cabina' : 'Cabin'}</th>
                                        <th>{locale === 'es' ? 'Categoría' : 'Category'}</th>
                                        <th>{locale === 'es' ? 'Cantidad' : 'Qty'}</th>
                                        <th>{locale === 'es' ? 'Precio (centavos)' : 'Price (cents)'}</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.cabinInventory?.map((cabin) => (
                                        <tr key={cabin.rowId}>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={cabin.cabinNumber || ''}
                                                    onChange={(e) => handleCabinChange(cabin.rowId, 'cabinNumber', e.target.value)}
                                                    placeholder="#"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={cabin.categoryCode || cabin.type || ''}
                                                    onChange={(e) => handleCabinChange(cabin.rowId, 'categoryCode', e.target.value)}
                                                    placeholder="Cat"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={cabin.qty || 1}
                                                    min="1"
                                                    onChange={(e) => handleCabinChange(cabin.rowId, 'qty', parseInt(e.target.value) || 1)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={cabin.priceCents || cabin.costCents || 0}
                                                    min="0"
                                                    onChange={(e) => handleCabinChange(cabin.rowId, 'priceCents', parseInt(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    className="remove-btn"
                                                    onClick={() => handleRemoveCabin(cabin.rowId)}
                                                >
                                                    ×
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button className="btn btn-secondary add-cabin-btn" onClick={handleAddCabin}>
                            + {locale === 'es' ? 'Agregar Cabina' : 'Add Cabin'}
                        </button>
                    </div>
                )}

                {/* Dates tab */}
                {activeTab === 'dates' && (
                    <div className="tab-content dates-tab">
                        <div className="form-group">
                            <label>{locale === 'es' ? 'Fecha de Salida' : 'Sail Date'}</label>
                            <input
                                type="date"
                                value={data.keyDates?.sailDate || ''}
                                onChange={(e) => handleDateChange('sailDate', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>{locale === 'es' ? 'Depósito' : 'Deposit Due'}</label>
                            <input
                                type="date"
                                value={data.keyDates?.depositDeadline || ''}
                                onChange={(e) => handleDateChange('depositDeadline', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>{locale === 'es' ? 'Pago Final' : 'Final Payment'}</label>
                            <input
                                type="date"
                                value={data.keyDates?.finalPaymentDeadline || ''}
                                onChange={(e) => handleDateChange('finalPaymentDeadline', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>{locale === 'es' ? 'Vencimiento de Opción' : 'Option Expiration'}</label>
                            <input
                                type="date"
                                value={data.keyDates?.optionExpiration || ''}
                                onChange={(e) => handleDateChange('optionExpiration', e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* Unparsed rows tab */}
                {activeTab === 'unparsed' && ocrResult?.unparsedRows && (
                    <UnparsedRowsPanel
                        rows={ocrResult.unparsedRows}
                        onMap={handleMapUnparsedRow}
                        locale={locale}
                    />
                )}

                {/* Actions */}
                <footer className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={!validation.valid}
                    >
                        {locale === 'es' ? 'Confirmar Importación' : 'Confirm Import'}
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default ContractReviewModal;
