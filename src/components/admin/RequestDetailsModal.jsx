import React, { useState } from 'react';
import { approveRequest, rejectRequest, cancelBetaAccess, generateSignupLink } from '../../services/requestService';
import './RequestDetailsModal.css';

export default function RequestDetailsModal({ request, onClose, adminEmail }) {
    const [loading, setLoading] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectionNotes, setRejectionNotes] = useState('');
    const [copiedLink, setCopiedLink] = useState(false);

    const handleApprove = async () => {
        if (!window.confirm('¿Estás seguro de aprobar esta solicitud?')) {
            return;
        }

        setLoading(true);
        try {
            await approveRequest(request.id, adminEmail);
            alert('✅ Solicitud aprobada exitosamente');
            onClose();
        } catch (error) {
            alert('❌ Error al aprobar la solicitud');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!window.confirm('¿Estás seguro de rechazar esta solicitud?')) {
            return;
        }

        setLoading(true);
        try {
            await rejectRequest(request.id, adminEmail, rejectionNotes);
            alert('✅ Solicitud rechazada');
            onClose();
        } catch (error) {
            alert('❌ Error al rechazar la solicitud');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        const link = generateSignupLink(request.approvalCode, request.contactEmail);
        navigator.clipboard.writeText(link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleCancelAccess = async () => {
        if (!window.confirm('¿Estás seguro de cancelar el acceso beta? Esto revocará el acceso de la agencia.')) {
            return;
        }

        if (!request.agencyId) {
            alert('❌ No se puede cancelar: no hay agencia asociada');
            return;
        }

        setLoading(true);
        try {
            await cancelBetaAccess(request.id, request.agencyId, adminEmail);
            alert('✅ Acceso beta cancelado exitosamente');
            onClose();
        } catch (error) {
            alert('❌ Error al cancelar el acceso beta');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { label: 'Pendiente', className: 'status-pending', icon: '⏳' },
            approved: { label: 'Aprobado', className: 'status-approved', icon: '✅' },
            rejected: { label: 'Rechazado', className: 'status-rejected', icon: '❌' },
            cancelled: { label: 'Cancelado', className: 'status-rejected', icon: '🚫' }
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={`status-badge-large ${badge.className}`}>
                <span className="badge-icon">{badge.icon}</span>
                {badge.label}
            </span>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>Detalles de Solicitud</h2>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Status Section */}
                    <div className="detail-section status-section">
                        <div className="status-header">
                            {getStatusBadge(request.status)}
                            {request.approvalCode && (
                                <div className="approval-code">
                                    <span className="code-label">Código:</span>
                                    <span className="code-value">{request.approvalCode}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Request Info */}
                    <div className="detail-section">
                        <h3>Información de la Solicitud</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>Agencia</label>
                                <div className="detail-value">{request.agencyName}</div>
                            </div>
                            <div className="detail-item">
                                <label>Email de Contacto</label>
                                <div className="detail-value">{request.contactEmail}</div>
                            </div>
                            <div className="detail-item">
                                <label>Teléfono</label>
                                <div className="detail-value">{request.phoneNumber || 'No proporcionado'}</div>
                            </div>
                            <div className="detail-item">
                                <label>Tipo de Grupo</label>
                                <div className="detail-value">
                                    <span className="type-badge">{request.groupType}</span>
                                </div>
                            </div>
                            <div className="detail-item full-width">
                                <label>Mensaje</label>
                                <div className="detail-value message">
                                    {request.message || 'Sin mensaje adicional'}
                                </div>
                            </div>
                            <div className="detail-item">
                                <label>Fecha de Solicitud</label>
                                <div className="detail-value">{formatDate(request.createdAt)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Approval/Rejection History */}
                    {(request.status === 'approved' || request.status === 'rejected') && (
                        <div className="detail-section">
                            <h3>Historial</h3>
                            <div className="detail-grid">
                                {request.status === 'approved' && (
                                    <>
                                        <div className="detail-item">
                                            <label>Aprobado por</label>
                                            <div className="detail-value">{request.approvedBy}</div>
                                        </div>
                                        <div className="detail-item">
                                            <label>Fecha de Aprobación</label>
                                            <div className="detail-value">{formatDate(request.approvedAt)}</div>
                                        </div>
                                    </>
                                )}
                                {request.status === 'rejected' && (
                                    <>
                                        <div className="detail-item">
                                            <label>Rechazado por</label>
                                            <div className="detail-value">{request.rejectedBy}</div>
                                        </div>
                                        <div className="detail-item">
                                            <label>Fecha de Rechazo</label>
                                            <div className="detail-value">{formatDate(request.rejectedAt)}</div>
                                        </div>
                                        {request.rejectionNotes && (
                                            <div className="detail-item full-width">
                                                <label>Notas de Rechazo</label>
                                                <div className="detail-value message">{request.rejectionNotes}</div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Rejection Form */}
                    {showRejectForm && request.status === 'pending' && (
                        <div className="detail-section reject-form">
                            <h3>Motivo de Rechazo (Opcional)</h3>
                            <textarea
                                value={rejectionNotes}
                                onChange={(e) => setRejectionNotes(e.target.value)}
                                placeholder="Escribe el motivo del rechazo..."
                                rows="4"
                                className="reject-textarea"
                            />
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="modal-footer">
                    {request.status === 'pending' && (
                        <>
                            {!showRejectForm ? (
                                <>
                                    <button
                                        onClick={() => setShowRejectForm(true)}
                                        className="btn-reject"
                                        disabled={loading}
                                    >
                                        ❌ Rechazar
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        className="btn-approve"
                                        disabled={loading}
                                    >
                                        {loading ? 'Procesando...' : '✅ Aprobar'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowRejectForm(false);
                                            setRejectionNotes('');
                                        }}
                                        className="btn-cancel"
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        className="btn-reject"
                                        disabled={loading}
                                    >
                                        {loading ? 'Procesando...' : 'Confirmar Rechazo'}
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {request.status === 'approved' && (
                        <>
                            <button
                                onClick={handleCopyLink}
                                className="btn-copy-link"
                            >
                                {copiedLink ? '✓ Copiado!' : '📋 Copiar Link de Registro'}
                            </button>
                            {request.agencyId && (
                                <button
                                    onClick={handleCancelAccess}
                                    className="btn-reject"
                                    disabled={loading}
                                >
                                    {loading ? 'Procesando...' : '🚫 Cancelar Acceso'}
                                </button>
                            )}
                        </>
                    )}

                    {request.status === 'rejected' && (
                        <button onClick={onClose} className="btn-close-modal">
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
