/**
 * OCR Debug Panel (DEV-ONLY)
 * 
 * Read-only debug panel for OCR regression testing.
 * 
 * SECURITY GATES (handled by parent ContractImportPage):
 * 1. Lazy import - component not bundled in production
 * 2. ?debug=1 query param required (default OFF)
 * 3. import.meta.env.DEV check
 * 
 * DATA SAFETY:
 * - Exposes ONLY: status flags, currency codes, counts, telemetry metadata
 * - Does NOT expose: passenger names, cabin numbers, prices, financial details
 * - Fingerprint is truncated to 16 chars
 * 
 * IMPORTANT: This component does NOT allow confirming/importing.
 * It is strictly for diagnostic purposes.
 */

import PropTypes from 'prop-types';

function OcrDebugPanel({ ocrResult }) {
    // Don't render if no result (parent already handles DEV check)
    if (!ocrResult) return null;

    const { success, needsReview, partial, data, telemetry, currencyCandidates, reviewReasons, unparsedRows } = ocrResult;

    // Calculate stats
    const cabinsParsed = data?.cabinInventory?.length || 0;
    const cabinsUnparsed = unparsedRows?.length || telemetry?.unparsedRowCount || 0;
    const parseRate = telemetry?.parseRate || (cabinsParsed > 0 ? Math.round((cabinsParsed / (cabinsParsed + cabinsUnparsed)) * 100) : 0);
    const fingerprint = telemetry?.contractFingerprint || 'N/A';

    // Status badge colors
    const getStatusBadge = (value, successValue = true) => {
        const isSuccess = value === successValue;
        return (
            <span className={`debug-badge ${isSuccess ? 'badge-success' : 'badge-warning'}`}>
                {String(value)}
            </span>
        );
    };

    return (
        <div className="ocr-debug-panel">
            <div className="debug-header">
                <span className="debug-label">🔧 DEV DEBUG PANEL</span>
                <span className="debug-sublabel">(Read-only - for regression testing)</span>
            </div>

            <div className="debug-grid">
                {/* Status Indicators */}
                <div className="debug-section">
                    <h4>Parse Status</h4>
                    <div className="debug-row">
                        <span>success:</span>
                        {getStatusBadge(success, true)}
                    </div>
                    <div className="debug-row">
                        <span>needsReview:</span>
                        {getStatusBadge(needsReview, false)}
                    </div>
                    <div className="debug-row">
                        <span>partial:</span>
                        {getStatusBadge(partial, false)}
                    </div>
                    <div className="debug-row">
                        <span>failureStage:</span>
                        <span className="debug-value">{telemetry?.failureStage || 'null'}</span>
                    </div>
                </div>

                {/* Currency Info */}
                <div className="debug-section">
                    <h4>Currency</h4>
                    <div className="debug-row">
                        <span>baseCurrency:</span>
                        <span className="debug-value">{data?.baseCurrency || 'N/A'}</span>
                    </div>
                    <div className="debug-row">
                        <span>confidence:</span>
                        <span className="debug-value">{telemetry?.currencyConfidence?.toFixed(2) || 'N/A'}</span>
                    </div>
                    {currencyCandidates && currencyCandidates.length > 0 && (
                        <div className="debug-row">
                            <span>candidates:</span>
                            <span className="debug-value">
                                {currencyCandidates.map(c => `${c.currency}(${c.confidence.toFixed(2)})`).join(', ')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Parse Stats */}
                <div className="debug-section">
                    <h4>Parse Stats</h4>
                    <div className="debug-row">
                        <span>parseRate:</span>
                        <span className={`debug-value ${parseRate >= 80 ? 'text-success' : 'text-warning'}`}>
                            {parseRate}%
                        </span>
                    </div>
                    <div className="debug-row">
                        <span>cabinsParsed:</span>
                        <span className="debug-value">{cabinsParsed}</span>
                    </div>
                    <div className="debug-row">
                        <span>cabinsUnparsed:</span>
                        <span className={`debug-value ${cabinsUnparsed > 0 ? 'text-warning' : ''}`}>
                            {cabinsUnparsed}
                        </span>
                    </div>
                    <div className="debug-row">
                        <span>unparsedRowsCount:</span>
                        <span className="debug-value">{unparsedRows?.length || 0}</span>
                    </div>
                </div>

                {/* Telemetry */}
                <div className="debug-section">
                    <h4>Telemetry</h4>
                    <div className="debug-row">
                        <span>fingerprint:</span>
                        <span className="debug-value debug-mono">{fingerprint.slice(0, 16)}...</span>
                    </div>
                    <div className="debug-row">
                        <span>parserVersion:</span>
                        <span className="debug-value">{telemetry?.parserVersion || 'N/A'}</span>
                    </div>
                    <div className="debug-row">
                        <span>schemaVersion:</span>
                        <span className="debug-value">{telemetry?.outputSchemaVersion || 'N/A'}</span>
                    </div>
                </div>
            </div>

            {/* Review Reasons */}
            {reviewReasons && reviewReasons.length > 0 && (
                <div className="debug-section debug-full">
                    <h4>Review Reasons</h4>
                    <ul className="debug-list">
                        {reviewReasons.map((reason, i) => (
                            <li key={i}>{reason}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Unparsed Rows Preview */}
            {unparsedRows && unparsedRows.length > 0 && (
                <div className="debug-section debug-full">
                    <h4>Unparsed Rows ({unparsedRows.length})</h4>
                    <div className="debug-code">
                        {unparsedRows.slice(0, 5).map((row, i) => (
                            <div key={i} className="debug-row-item">
                                {typeof row === 'object' ? row.rawLine || JSON.stringify(row) : row}
                            </div>
                        ))}
                        {unparsedRows.length > 5 && (
                            <div className="debug-more">... and {unparsedRows.length - 5} more</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

OcrDebugPanel.propTypes = {
    ocrResult: PropTypes.shape({
        success: PropTypes.bool,
        needsReview: PropTypes.bool,
        partial: PropTypes.bool,
        data: PropTypes.object,
        telemetry: PropTypes.object,
        currencyCandidates: PropTypes.array,
        reviewReasons: PropTypes.array,
        unparsedRows: PropTypes.array
    })
};

export default OcrDebugPanel;
