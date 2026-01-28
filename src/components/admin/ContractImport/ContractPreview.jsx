/**
 * Contract Preview
 * Read-only preview when OCR succeeds with no review needed
 */

function ContractPreview({ data, ocrResult, onConfirm, onEdit, locale = 'en' }) {
    const formatCents = (cents) => {
        if (!cents || typeof cents !== 'number') return '$0.00';
        return new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', {
            style: 'currency',
            currency: data.baseCurrency || 'USD'
        }).format(cents / 100);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString(
                locale === 'es' ? 'es-MX' : 'en-US',
                { year: 'numeric', month: 'short', day: 'numeric' }
            );
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="contract-preview">
            <div className="preview-header">
                <h2>{locale === 'es' ? 'Vista Previa' : 'Preview'}</h2>
                <div className="preview-confidence">
                    <span className="confidence-badge success">
                        ✓ {locale === 'es' ? 'Datos Extraídos' : 'Data Extracted'}
                    </span>
                </div>
            </div>

            {/* Currency */}
            <section className="preview-section">
                <h3>{locale === 'es' ? 'Moneda Base' : 'Base Currency'}</h3>
                <div className="currency-display">
                    <span className="currency-code">{data.baseCurrency}</span>
                    {ocrResult?.data?.baseCurrencyConfidence && (
                        <span className="confidence-indicator">
                            {ocrResult.data.baseCurrencyConfidence}% {locale === 'es' ? 'confianza' : 'confidence'}
                        </span>
                    )}
                </div>
            </section>

            {/* Key Dates */}
            <section className="preview-section">
                <h3>{locale === 'es' ? 'Fechas Clave' : 'Key Dates'}</h3>
                <div className="dates-grid">
                    <div className="date-item">
                        <label>{locale === 'es' ? 'Fecha de Salida' : 'Sail Date'}</label>
                        <span>{formatDate(data.keyDates?.sailDate)}</span>
                    </div>
                    <div className="date-item">
                        <label>{locale === 'es' ? 'Depósito' : 'Deposit Due'}</label>
                        <span>{formatDate(data.keyDates?.depositDeadline)}</span>
                    </div>
                    <div className="date-item">
                        <label>{locale === 'es' ? 'Pago Final' : 'Final Payment'}</label>
                        <span>{formatDate(data.keyDates?.finalPaymentDeadline)}</span>
                    </div>
                </div>
            </section>

            {/* Cabin Inventory */}
            <section className="preview-section">
                <h3>
                    {locale === 'es' ? 'Inventario de Cabinas' : 'Cabin Inventory'}
                    <span className="count-badge">{data.cabinInventory?.length || 0}</span>
                </h3>
                {data.cabinInventory?.length > 0 ? (
                    <table className="cabins-table">
                        <thead>
                            <tr>
                                <th>{locale === 'es' ? 'Cabina/Categoría' : 'Cabin/Category'}</th>
                                <th>{locale === 'es' ? 'Tipo' : 'Type'}</th>
                                <th>{locale === 'es' ? 'Precio' : 'Price'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.cabinInventory.map((cabin, idx) => (
                                <tr key={cabin.rowId || idx}>
                                    <td>{cabin.cabinNumber || cabin.categoryCode || `#${idx + 1}`}</td>
                                    <td>{cabin.type || cabin.categoryCode || '—'}</td>
                                    <td>{formatCents(cabin.costCents || cabin.priceCents)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="no-data">
                        {locale === 'es'
                            ? 'No se detectaron cabinas'
                            : 'No cabins detected'}
                    </p>
                )}
            </section>

            {/* Telemetry info */}
            {ocrResult?.telemetry && (
                <section className="preview-section telemetry">
                    <details>
                        <summary>{locale === 'es' ? 'Información Técnica' : 'Technical Info'}</summary>
                        <div className="telemetry-grid">
                            <span>Parser: v{ocrResult.telemetry.parserVersion}</span>
                            <span>Schema: {ocrResult.telemetry.outputSchemaVersion}</span>
                            <span>Parse Rate: {ocrResult.telemetry.parseRate}%</span>
                        </div>
                    </details>
                </section>
            )}

            {/* Actions */}
            <div className="preview-actions">
                <button className="btn btn-secondary" onClick={onEdit}>
                    {locale === 'es' ? 'Editar' : 'Edit'}
                </button>
                <button className="btn btn-primary" onClick={onConfirm}>
                    {locale === 'es' ? 'Confirmar Importación' : 'Confirm Import'}
                </button>
            </div>
        </div>
    );
}

export default ContractPreview;
