/**
 * Unparsed Rows Panel
 * Shows OCR rows that couldn't be fully parsed for manual mapping or ignoring
 */

function UnparsedRowsPanel({ rows, onMap, onIgnore, locale = 'en' }) {
    if (!rows || rows.length === 0) {
        return (
            <div className="unparsed-empty">
                {locale === 'es'
                    ? 'No hay filas sin procesar'
                    : 'No unparsed rows'}
            </div>
        );
    }

    return (
        <div className="unparsed-panel">
            <p className="panel-description">
                {locale === 'es'
                    ? 'Estas líneas contienen datos de cabinas pero no se pudieron procesar completamente. Puedes mapearlas o ignorarlas.'
                    : 'These lines contain cabin data but could not be fully parsed. You can map or ignore them.'}
            </p>

            <div className="unparsed-list">
                {rows.map((row, index) => (
                    <div key={row.rowId || index} className="unparsed-row">
                        <div className="row-header">
                            <span className="row-line">
                                {locale === 'es' ? 'Línea' : 'Line'} {row.lineNumber}
                            </span>
                            {row.cabinNumber && (
                                <span className="row-cabin">
                                    {locale === 'es' ? 'Cabina' : 'Cabin'}: {row.cabinNumber}
                                </span>
                            )}
                        </div>

                        <div className="row-content">
                            <code>{row.rawLine}</code>
                        </div>

                        <div className="row-issue">
                            <span className="issue-icon">⚠️</span>
                            <span>{row.issue}</span>
                        </div>

                        <div className="row-actions">
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => onMap(row)}
                            >
                                + {locale === 'es' ? 'Mapear' : 'Map'}
                            </button>
                            {onIgnore && (
                                <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => onIgnore(row)}
                                >
                                    ✕ {locale === 'es' ? 'Ignorar' : 'Ignore'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default UnparsedRowsPanel;
