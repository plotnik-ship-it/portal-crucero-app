import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    getAllPendingPaymentRequests,
    applyPaymentRequest,
    rejectPaymentRequest,
    updatePaymentRequestNotificationStatus,
    deletePaymentRequest
} from '../../services/firestore';
import { sendFamilyApprovedEmail, sendFamilyRejectedEmail } from '../../services/emailService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../shared/Card';
import { formatCurrencyWithLabel } from '../../services/currencyService';
import { formatTimestamp } from '../../utils/formatters';

const PaymentRequestsList = ({ onUpdate }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [modalData, setModalData] = useState({
        amountCad: '',
        reference: '',
        targetCabinIndex: '', // empty = global/unassigned? Or force 0?
        adminNote: ''
    });

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const data = await getAllPendingPaymentRequests();
            setRequests(data);
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const openApproveModal = (request) => {
        setSelectedRequest(request);
        // Default to request's targetCabinIndex if valid (or 0 if array exists), else empty string to force selection
        const defaultCabinIndex = request.targetCabinIndex !== undefined && request.targetCabinIndex !== null
            ? String(request.targetCabinIndex)
            : (request.cabinNumbers && request.cabinNumbers.length > 0 ? '0' : '');

        setModalData({
            amountCad: request.amountCad,
            reference: '',
            targetCabinIndex: defaultCabinIndex,
            adminNote: request.notes ? `Nota de familia: ${request.notes}` : ''
        });
        setShowModal(true);
    };

    const handleConfirmApprove = async (e) => {
        e.preventDefault();
        if (!selectedRequest) return;

        const amountAppliedCad = parseFloat(modalData.amountCad);

        setProcessing(selectedRequest.id);
        try {
            // 1. Transactional Update (DB + Status)
            await applyPaymentRequest(selectedRequest.bookingId, selectedRequest.id, {
                amountCad: amountAppliedCad,
                targetCabinIndex: modalData.targetCabinIndex !== '' ? parseInt(modalData.targetCabinIndex) : null,
                reference: modalData.reference,
                adminNote: modalData.adminNote,
                method: 'Card Request',
                adminUid: user.uid
            });

            // 2. Refresh UI immediately to show "Applied"
            await loadRequests();
            setShowModal(false);

            // 3. Send Email (Async)
            // Calculate updated balance (Approximation based on context or refetch if needed)
            // Ideally we refetch the family to get the true new balance, but for now we can infer or let user check.
            // For the Email, we need data to look good.

            try {
                await sendFamilyApprovedEmail({
                    familyEmail: selectedRequest.email || (selectedRequest.bookingId + '@example.com'), // Fallback if email not in request, but it usually is seeded
                    variables: {
                        familyName: selectedRequest.familyName,
                        familyCode: selectedRequest.familyCode,
                        amountAppliedCad: amountAppliedCad,
                        amountAppliedMxnApprox: selectedRequest.amountMxnApprox, // Approximate
                        // Resolve cabin number from request or modal if possible
                        targetCabinNumber: selectedRequest.cabinNumbers?.[parseInt(modalData.targetCabinIndex)] || 'N/A',
                        fx_rate: selectedRequest.fxRateUsed,
                        appliedAt: { seconds: Date.now() / 1000 },
                        // Ship/Date hardcoded/default in service for now
                    }
                });

                // 4a. Success Hook
                await updatePaymentRequestNotificationStatus(
                    selectedRequest.bookingId,
                    selectedRequest.id,
                    'sent'
                );
                alert('Pago aplicado y notificación enviada.');

            } catch (emailError) {
                // 4b. Failure Hook
                console.error("Email failed", emailError);
                await updatePaymentRequestNotificationStatus(
                    selectedRequest.bookingId,
                    selectedRequest.id,
                    'failed',
                    emailError.message
                );
                alert('Pago aplicado, pero falló el envío del email. Intente reenviar desde la lista.');
            }

            setSelectedRequest(null);
            await loadRequests();
            if (onUpdate) onUpdate();

        } catch (error) {
            console.error('Error approving request:', error);
            alert('Error al aplicar el pago');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (request) => {
        const note = prompt('Razón del rechazo:');
        if (note === null) return;

        setProcessing(request.id);
        try {
            const reason = note || 'Rechazado por admin';
            // 1. Transactional Update
            await rejectPaymentRequest(request.bookingId, request.id, reason, user.uid);

            // 2. Refresh to show rejected
            await loadRequests();

            // 3. Send Email
            try {
                await sendFamilyRejectedEmail({
                    familyEmail: request.email || (request.bookingId + '@example.com'),
                    variables: {
                        familyName: request.familyName,
                        familyCode: request.familyCode,
                        amountRequestedCad: request.amountCad,
                        amountRequestedMxnApprox: request.amountMxnApprox,
                        fxRateUsed: request.fxRateUsed,
                        rejectionReason: reason,
                        rejectedAt: { seconds: Date.now() / 1000 }
                    }
                });

                // 4a. Success
                await updatePaymentRequestNotificationStatus(request.bookingId, request.id, 'sent');
                alert('Solicitud rechazada y notificada.');

            } catch (emailError) {
                // 4b. Fail
                console.error("Email failed", emailError);
                await updatePaymentRequestNotificationStatus(request.bookingId, request.id, 'failed', emailError.message);
                alert('Solicitud rechazada, pero falló el envío del email.');
            }

            await loadRequests();
            if (onUpdate) onUpdate();

        } catch (error) {
            console.error('Error rejecting request:', error);
            alert('Error al rechazar la solicitud');
        } finally {
            setProcessing(null);
        }
    };

    const handleRetryEmail = async (request) => {
        if (!request.notificationType) return; // Should not happen for new ones
        setProcessing(request.id);

        try {
            if (request.notificationType === 'approved') {
                await sendFamilyApprovedEmail({
                    familyEmail: request.email || (request.bookingId + '@example.com'),
                    variables: {
                        familyName: request.familyName,
                        familyCode: request.familyCode,
                        amountAppliedCad: request.appliedAmountCad || request.amountCad,
                        amountAppliedMxnApprox: request.amountMxnApprox,
                        fxRateUsed: request.fxRateUsed,
                        appliedAt: request.appliedAt || { seconds: Date.now() / 1000 }
                    }
                });
            } else if (request.notificationType === 'rejected') {
                await sendFamilyRejectedEmail({
                    familyEmail: request.email || (request.bookingId + '@example.com'),
                    variables: {
                        familyName: request.familyName,
                        familyCode: request.familyCode,
                        amountRequestedCad: request.amountCad,
                        amountRequestedMxnApprox: request.amountMxnApprox,
                        fxRateUsed: request.fxRateUsed,
                        rejectionReason: request.rejectedReason || 'No especificado',
                        rejectedAt: request.rejectedAt || { seconds: Date.now() / 1000 }
                    }
                });
            }

            await updatePaymentRequestNotificationStatus(request.bookingId, request.id, 'sent');
            await loadRequests();
            alert('Email reenviado correctamente');
        } catch (error) {
            console.error('Retry failed', error);
            await updatePaymentRequestNotificationStatus(request.bookingId, request.id, 'failed', error.message);
            alert('Falló el reintento del email');
        } finally {
            setProcessing(null);
        }
    };

    const handleDelete = async (request) => {
        if (!window.confirm(`¿Estás seguro de eliminar esta solicitud de ${request.familyName}?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        setProcessing(request.id);
        try {
            await deletePaymentRequest(request.bookingId, request.id);
            await loadRequests();
            if (onUpdate) onUpdate();
            alert('Solicitud eliminada exitosamente');
        } catch (error) {
            console.error('Error deleting request:', error);
            alert('Error al eliminar la solicitud');
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <>
            <Card>
                <div className="card-header">
                    <h3 className="card-title">📋 {t('admin.pendingRequestsCount', { count: requests.length })}</h3>
                </div>
                <div className="card-body">
                    {requests.length === 0 ? (
                        <p className="text-muted text-center">{t('admin.noPendingRequests')}</p>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{t('admin.date')}</th>
                                        <th>{t('admin.family')}</th>
                                        <th>{t('admin.amount')}</th>
                                        <th>{t('admin.details')}</th>
                                        <th>{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map((request) => (
                                        <tr key={request.id}>
                                            <td className="text-small">
                                                {formatTimestamp(request.createdAt)}
                                            </td>
                                            <td>
                                                <div className="font-semibold">{request.familyName}</div>
                                                <div className="text-small text-muted">{request.familyCode}</div>
                                                {request.cabinNumbers && (
                                                    <div className="text-xs badge badge-info mt-xs" style={{ display: 'inline-block' }}>
                                                        {request.cabinNumbers.join(', ')}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="font-semibold">
                                                    {formatCurrencyWithLabel(request.amountCad)}
                                                </div>
                                                <div className="text-small text-muted">
                                                    ≈ {formatCurrencyWithLabel(request.amountMxnApprox, 'MXN')}
                                                </div>
                                            </td>
                                            <td className="text-small">
                                                {request.cardholderName && (
                                                    <div>👤 {request.cardholderName}</div>
                                                )}
                                                {request.notes && (
                                                    <div className="text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        📝 {request.notes}
                                                    </div>
                                                )}
                                                {/* Notification Status Badge for already processed items if we were showing history here, 
                                                    BUT this list is usually for PENDING. 
                                                    However, if we have logic to show recent, or if failed items stick around:
                                                */}
                                                {request.notificationStatus === 'failed' && (
                                                    <div className="badge badge-error mt-xs">
                                                        {t('admin.emailFailed')}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex gap-sm">
                                                    {request.status === 'Pending' ? (
                                                        <>
                                                            <button
                                                                onClick={() => openApproveModal(request)}
                                                                className="btn btn-sm btn-success"
                                                                disabled={processing === request.id}
                                                            >
                                                                ✓ {t('admin.apply')}
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(request)}
                                                                className="btn btn-sm btn-danger"
                                                                disabled={processing === request.id}
                                                            >
                                                                ✗ {t('admin.reject')}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(request)}
                                                                className="btn btn-sm btn-outline"
                                                                disabled={processing === request.id}
                                                                title={t('admin.deleteRequest')}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
                                                    ) : (
                                                        // Fallback for non-pending handling if list logic changes
                                                        null
                                                    )}

                                                    {/* Retry Button if Failed */}
                                                    {request.notificationStatus === 'failed' && (
                                                        <button
                                                            onClick={() => handleRetryEmail(request)}
                                                            className="btn btn-sm btn-outline"
                                                            disabled={processing === request.id}
                                                        >
                                                            {t('admin.resendEmail')}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>

            {/* Approval Modal */}
            {showModal && selectedRequest && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        width: '90%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <Card>
                            <div className="card-header">
                                <h3 className="card-title">{t('admin.approvePayment')} - {selectedRequest.familyCode}</h3>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleConfirmApprove}>
                                    {/* Amount */}
                                    <div className="form-group">
                                        <label className="form-label required">{t('admin.realAmount')}</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={modalData.amountCad}
                                            onChange={(e) => setModalData({ ...modalData, amountCad: e.target.value })}
                                            step="0.01"
                                            required
                                        />
                                    </div>

                                    {/* Target Cabin */}
                                    <div className="form-group">
                                        <label className="form-label required">{t('admin.applyToCabin')}</label>
                                        <select
                                            className="form-select"
                                            value={modalData.targetCabinIndex}
                                            onChange={(e) => setModalData({ ...modalData, targetCabinIndex: e.target.value })}
                                            required
                                        >
                                            <option value="" disabled>{t('admin.selectCabin')}</option>
                                            {selectedRequest.cabinNumbers?.map((cabin, index) => (
                                                <option key={index} value={index}>
                                                    {t('admin.cabin')} {cabin}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="form-help">
                                            {t('admin.selectCabinHelp')}
                                        </div>
                                    </div>

                                    {/* Reference */}
                                    <div className="form-group">
                                        <label className="form-label required">{t('admin.reference')}</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={modalData.reference}
                                            onChange={(e) => setModalData({ ...modalData, reference: e.target.value })}
                                            placeholder="Ej. Auth 123456"
                                            required
                                        />
                                    </div>

                                    {/* Note */}
                                    <div className="form-group">
                                        <label className="form-label">{t('admin.internalNote')}</label>
                                        <textarea
                                            className="form-input"
                                            value={modalData.adminNote}
                                            onChange={(e) => setModalData({ ...modalData, adminNote: e.target.value })}
                                            rows="2"
                                        />
                                    </div>

                                    <div className="alert alert-info text-small mb-md">
                                        {t('admin.approvalNote')}
                                    </div>

                                    <div className="flex gap-md justify-end">
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={() => setShowModal(false)}
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                        >
                                            {t('admin.confirmApply')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </>
    );
};

export default PaymentRequestsList;
