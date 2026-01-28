/**
 * Contract Import Page
 * 
 * Main page for admin contract PDF import workflow.
 * Integrates subscription gating, OCR parsing, and review flow.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAgency } from '../../../contexts/AgencyContext';
import { checkFeatureAccess } from '../../../skills/subscription/subscriptionGateService';
import {
    runOcrParse,
    findImportByFingerprint,
    confirmImport,
    validateForConfirm
} from '../../../services/contractImportService';

import ContractUploadCard from './ContractUploadCard';
import ContractPreview from './ContractPreview';
import ContractReviewModal from './ContractReviewModal';
import './ContractImport.css';

// NOTE: OcrDebugPanel is dynamically imported INSIDE component guard
// to ensure it is NEVER bundled in production builds

function ContractImportPage() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { agency } = useAgency();
    const navigate = useNavigate();
    const locale = i18n.language?.startsWith('es') ? 'es' : 'en';

    // Query params for debug mode
    const [searchParams] = useSearchParams();

    // State
    const [step, setStep] = useState('upload'); // upload | parsing | preview | review | confirming | success
    const [ocrResult, setOcrResult] = useState(null);
    const [editedData, setEditedData] = useState(null);
    const [existingImport, setExistingImport] = useState(null);
    const [error, setError] = useState(null);
    const [featureAccess, setFeatureAccess] = useState(null);

    // Debug panel state - component loaded dynamically
    const [DebugPanelComponent, setDebugPanelComponent] = useState(null);

    // Debug panel gate: DEV + ?debug=1 query param (default OFF)
    const isDebugEnabled = import.meta.env.DEV && searchParams.get('debug') === '1';

    // Dynamic import of debug panel INSIDE the guard
    // This ensures the import() call ONLY happens when DEV+debug=1
    // Production builds will NEVER execute this code path
    useEffect(() => {
        if (isDebugEnabled && !DebugPanelComponent) {
            import('./OcrDebugPanel')
                .then(module => setDebugPanelComponent(() => module.default))
                .catch(err => console.warn('[Debug] Failed to load debug panel:', err));
        }
    }, [isDebugEnabled, DebugPanelComponent]);

    // Check OCR feature access on mount
    useEffect(() => {
        if (agency) {
            const access = checkFeatureAccess(agency, 'ocr_parsing');
            setFeatureAccess(access);
        }
    }, [agency]);

    // Handle PDF upload
    const handleFileUpload = async (file) => {
        setError(null);
        setStep('parsing');

        try {
            // Run OCR parse
            const result = await runOcrParse(file, {});
            setOcrResult(result);

            // Check for duplicate fingerprint
            if (result.telemetry?.contractFingerprint && agency?.id) {
                const existing = await findImportByFingerprint({
                    agencyId: agency.id,
                    contractFingerprint: result.telemetry.contractFingerprint
                });
                if (existing) {
                    setExistingImport(existing);
                }
            }

            // Initialize edited data from OCR result
            if (result.success && result.data) {
                setEditedData({
                    baseCurrency: result.data.baseCurrency,
                    cabinInventory: result.data.cabinInventory || [],
                    keyDates: result.data.keyDates || {},
                    groupName: ''
                });
            } else {
                setEditedData({
                    baseCurrency: result.currencyCandidates?.[0]?.currency || 'USD',
                    cabinInventory: [],
                    keyDates: {},
                    groupName: ''
                });
            }

            // Determine next step
            if (result.success && !result.needsReview && !result.partial) {
                setStep('preview');
            } else {
                setStep('review');
            }
        } catch (err) {
            console.error('[ContractImport] Upload error:', err);
            setError(err.message || 'Failed to parse PDF');
            setStep('upload');
        }
    };

    // Handle confirm from preview (no edits needed)
    const handleConfirmFromPreview = async () => {
        await handleFinalConfirm(editedData);
    };

    // Handle confirm from review modal (with edits)
    const handleConfirmFromReview = async (finalData) => {
        setEditedData(finalData);
        await handleFinalConfirm(finalData);
    };

    // Final confirm logic
    const handleFinalConfirm = async (data, duplicateOfImportId = null) => {
        setStep('confirming');
        setError(null);

        try {
            const result = await confirmImport({
                agencyId: agency.id,
                editedData: data,
                ocrOriginal: ocrResult,
                telemetry: ocrResult?.telemetry || {},
                createdBy: user.uid,
                duplicateOfImportId
            });

            if (result.success) {
                setStep('success');
                // Navigate to group after short delay
                setTimeout(() => {
                    navigate(`/admin?group=${result.groupId}`);
                }, 2000);
            } else {
                setError(result.error);
                setStep('review');
            }
        } catch (err) {
            console.error('[ContractImport] Confirm error:', err);
            setError(err.message);
            setStep('review');
        }
    };

    // STRICT IDEMPOTENCY: No "Create Anyway" option in beta
    // Duplicate imports are blocked - users must open existing group

    // Handle "Open Existing" for duplicate
    const handleOpenExisting = () => {
        if (existingImport?.groupId) {
            navigate(`/admin?group=${existingImport.groupId}`);
        }
    };

    // Feature gating: show upsell if not allowed
    if (featureAccess && !featureAccess.allowed) {
        return (
            <div className="contract-import-page">
                <div className="upsell-container">
                    <div className="upsell-icon">🔒</div>
                    <h2>{locale === 'es' ? 'Función Premium' : 'Premium Feature'}</h2>
                    <p className="upsell-message">{featureAccess.upsellMessage?.[locale] || featureAccess.upsellMessage}</p>
                    <a href="/billing/plans" className="btn btn-primary">
                        {locale === 'es' ? 'Ver Planes' : 'View Plans'}
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="contract-import-page">
            <header className="import-header">
                <h1>{locale === 'es' ? 'Importar Contrato' : 'Import Contract'}</h1>
                <p className="subtitle">
                    {locale === 'es'
                        ? 'Sube un PDF de confirmación de crucero para extraer datos automáticamente'
                        : 'Upload a cruise confirmation PDF to automatically extract data'}
                </p>
            </header>

            {/* Error display */}
            {error && (
                <div className="error-banner">
                    <span className="error-icon">⚠️</span>
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* Duplicate blocking - strict idempotency
                SECURITY: Only shows minimal metadata (name/date), no internal IDs or sensitive data
            */}
            {existingImport && step !== 'confirming' && step !== 'success' && (
                <div className="duplicate-warning duplicate-blocking">
                    <span className="warning-icon">🚫</span>
                    <div className="warning-content">
                        <strong>
                            {locale === 'es'
                                ? 'Contrato duplicado detectado'
                                : 'Duplicate contract detected'}
                        </strong>
                        <p className="duplicate-meta">
                            <span className="meta-label">{locale === 'es' ? 'Grupo:' : 'Group:'}</span>
                            <span className="meta-value">{existingImport.groupName || 'Unknown'}</span>
                        </p>
                        {existingImport.sailDate && (
                            <p className="duplicate-meta">
                                <span className="meta-label">{locale === 'es' ? 'Fecha:' : 'Sail Date:'}</span>
                                <span className="meta-value">{existingImport.sailDate}</span>
                            </p>
                        )}
                    </div>
                    <div className="warning-actions">
                        <button className="btn btn-primary" onClick={handleOpenExisting}>
                            {locale === 'es' ? 'Abrir Grupo Existente' : 'Open Existing Group'}
                        </button>
                    </div>
                </div>
            )}

            {/* Upload step */}
            {step === 'upload' && (
                <ContractUploadCard
                    onFileSelect={handleFileUpload}
                    locale={locale}
                />
            )}

            {/* Parsing step */}
            {step === 'parsing' && (
                <div className="parsing-state">
                    <div className="spinner"></div>
                    <p>{locale === 'es' ? 'Analizando contrato...' : 'Analyzing contract...'}</p>
                </div>
            )}

            {/* Preview step (auto-fill ready) */}
            {step === 'preview' && editedData && (
                <ContractPreview
                    data={editedData}
                    ocrResult={ocrResult}
                    onConfirm={handleConfirmFromPreview}
                    onEdit={() => setStep('review')}
                    locale={locale}
                />
            )}

            {/* Review modal */}
            {step === 'review' && editedData && (
                <ContractReviewModal
                    isOpen={true}
                    ocrResult={ocrResult}
                    initialData={editedData}
                    onConfirm={handleConfirmFromReview}
                    onCancel={() => setStep('upload')}
                    locale={locale}
                />
            )}

            {/* Confirming step */}
            {step === 'confirming' && (
                <div className="confirming-state">
                    <div className="spinner"></div>
                    <p>{locale === 'es' ? 'Creando grupo...' : 'Creating group...'}</p>
                </div>
            )}

            {/* Success step */}
            {step === 'success' && (
                <div className="success-state">
                    <div className="success-icon">✓</div>
                    <h2>{locale === 'es' ? '¡Grupo Creado!' : 'Group Created!'}</h2>
                    <p>{locale === 'es' ? 'Redirigiendo...' : 'Redirecting...'}</p>
                </div>
            )}

            {/* DEV-ONLY Debug Panel - Read-only, for regression testing
                SECURITY: Only renders when ALL conditions are met:
                1. import.meta.env.DEV (code path not executed in prod)
                2. ?debug=1 query param present
                3. DebugPanelComponent loaded via dynamic import()
                4. ocrResult exists (after PDF parse)
            */}
            {isDebugEnabled && DebugPanelComponent && ocrResult && (
                <DebugPanelComponent ocrResult={ocrResult} />
            )}
        </div>
    );
}

export default ContractImportPage;
