import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getBookingData, updateBookingData, getBookingPayments, deletePayment, addPayment } from '../../services/firestore';
import { subscribeToPaymentHistory, createPaymentRecord } from '../../services/paymentService';
import { auth, db } from '../../services/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import Card from '../shared/Card';
import { formatCurrencyWithLabel } from '../../services/currencyService';
import { formatTimestamp } from '../../utils/formatters';
import ConfirmationImport from './ConfirmationImport';

const BookingDetail = ({ family: initialFamily, onClose, onUpdate }) => {
    const { t } = useTranslation();
    const [family, setFamily] = useState(initialFamily); // Local state for immediate updates (still using 'family' variable internally for now)
    const [editing, setEditing] = useState(false);
    const [editingInfo, setEditingInfo] = useState(false); // New state for editing basic info
    const [activeTab, setActiveTab] = useState('global');
    const [payments, setPayments] = useState([]);
    const [loadingPayments, setLoadingPayments] = useState(true);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Sprint 1: Payment Requests
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);

    // Sprint 1: Agent Notes
    const [editingNotes, setEditingNotes] = useState(false);
    const [notesData, setNotesData] = useState(family.agentNotes || '');

    // Sprint 1: Selected Cabin for individual balance
    const [selectedCabinNumber, setSelectedCabinNumber] = useState(null);

    // Payment details modal
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showPaymentDetails, setShowPaymentDetails] = useState(false);
    const [editingPayment, setEditingPayment] = useState(false);
    const [editPaymentData, setEditPaymentData] = useState(null);

    // Financial Data Form
    const [formData, setFormData] = useState({
        subtotalCad: 0,
        gratuitiesCad: 0,
        paidCad: 0
    });
    // Basic Info Form
    const [infoData, setInfoData] = useState({
        displayName: '',
        email: '',
        cabinNumbers: [], // array of strings
        cabinAccountsSnapshot: [] // keep full objects to restore balances if needed, or to know what to delete
    });

    // Bulk Deposit Selection
    const [selectedDeposits, setSelectedDeposits] = useState([]);

    // Subscribe to real-time payment history
    useEffect(() => {
        const unsubscribe = subscribeToPaymentHistory(family.id, (paymentsData) => {
            setPayments(paymentsData);
            setLoadingPayments(false);
        });

        return () => unsubscribe();
    }, [family.id]);

    // Subscribe to pending payment requests
    useEffect(() => {
        const q = query(
            collection(db, 'paymentRequests'),
            where('familyId', '==', family.id),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPendingRequests(requests);
            setLoadingRequests(false);
        }, (error) => {
            console.error('Error loading payment requests:', error);
            setLoadingRequests(false);
        });

        return () => unsubscribe();
    }, [family.id]);

    // Determine current view data
    const getDisplayData = () => {
        if (activeTab === 'global') {
            return {
                ...family,
                subtotalCad: family.subtotalCadGlobal,
                gratuitiesCad: family.gratuitiesCadGlobal,
                totalCad: family.totalCadGlobal,
                paidCad: family.paidCadGlobal,
                balanceCad: family.balanceCadGlobal
            };
        } else {
            const index = parseInt(activeTab);
            return family.cabinAccounts?.[index] || null;
        }
    };

    const displayData = getDisplayData();

    // Prepare form when editing starts


    // Prepare info edit
    const startEditingInfo = () => {
        setInfoData({
            displayName: family.displayName,
            email: family.email,
            cabinNumbers: [...(family.cabinNumbers || [])],
            cabinAccountsSnapshot: family.cabinAccounts ? JSON.parse(JSON.stringify(family.cabinAccounts)) : []
        });
        setEditingInfo(true);
    };

    const addCabin = () => {
        setInfoData(prev => ({
            ...prev,
            cabinNumbers: [...prev.cabinNumbers, ''],
            cabinAccountsSnapshot: [...prev.cabinAccountsSnapshot, {
                cabinNumber: '',
                subtotalCad: 0,
                gratuitiesCad: 0,
                totalCad: 0,
                paidCad: 0,
                balanceCad: 0,
                paymentDeadlines: [],
                bookingNumber: ''
            }]
        }));
    };

    const removeCabin = (indexToRemove) => {
        if (!window.confirm(t('admin.confirmDeleteCabin'))) return;

        setInfoData(prev => ({
            ...prev,
            cabinNumbers: prev.cabinNumbers.filter((_, i) => i !== indexToRemove),
            cabinAccountsSnapshot: prev.cabinAccountsSnapshot.filter((_, i) => i !== indexToRemove)
        }));
    };

    const handleSaveInfo = async () => {
        try {
            // Validate changes
            if (!infoData.displayName || !infoData.email) {
                alert(t('admin.nameEmailRequired'));
                return;
            }

            // Reconstruct cabinAccounts based on current infoData state
            const newCabinAccounts = infoData.cabinAccountsSnapshot.map((account, idx) => ({
                ...account,
                cabinNumber: infoData.cabinNumbers[idx] || `Cabina ${idx + 1}` // Ensure name matches input
            }));

            // Recalculate Globals based on new set of cabins
            const subtotalCadGlobal = newCabinAccounts.reduce((sum, c) => sum + (c.subtotalCad || 0), 0);
            const gratuitiesCadGlobal = newCabinAccounts.reduce((sum, c) => sum + (c.gratuitiesCad || 0), 0);
            const totalCadGlobal = newCabinAccounts.reduce((sum, c) => sum + (c.totalCad || 0), 0);
            const paidCadGlobal = newCabinAccounts.reduce((sum, c) => sum + (c.paidCad || 0), 0);
            const balanceCadGlobal = Math.round((totalCadGlobal - paidCadGlobal) * 100) / 100;

            await updateBookingData(family.id, {
                displayName: infoData.displayName,
                email: infoData.email,
                cabinNumbers: infoData.cabinNumbers,
                cabinAccounts: newCabinAccounts,
                // Update globals immediately
                subtotalCadGlobal,
                gratuitiesCadGlobal,
                totalCadGlobal,
                paidCadGlobal,
                balanceCadGlobal
            });

            // Refresh local data
            const updatedFamily = await getBookingData(family.id);
            if (updatedFamily) {
                setFamily(updatedFamily);
            }

            setEditingInfo(false);
            if (onUpdate) onUpdate();
            alert(t('admin.infoUpdatedSuccess'));
        } catch (error) {
            console.error('Error updating family info:', error);
            alert(t('admin.errorUpdatingInfo'));
        }
    };

    // Bulk Deposit Functions
    const handleToggleDepositSelection = (index) => {
        setSelectedDeposits(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const handleSelectAllDeposits = () => {
        const unpaidIndices = family.cabinAccounts
            .map((cabin, idx) => !cabin.depositPaid ? idx : null)
            .filter(idx => idx !== null);
        setSelectedDeposits(unpaidIndices);
    };

    const handleDeselectAllDeposits = () => {
        setSelectedDeposits([]);
    };

    const handleApplyDepositPayments = async () => {
        if (selectedDeposits.length === 0) {
            alert(t('admin.selectAtLeastOne'));
            return;
        }

        if (!window.confirm(t('admin.confirmMarkDeposits', { count: selectedDeposits.length }))) {
            return;
        }

        try {
            const updatedAccounts = family.cabinAccounts.map((account, idx) => ({
                ...account,
                depositPaid: selectedDeposits.includes(idx) ? true : account.depositPaid
            }));

            await updateBookingData(family.id, {
                cabinAccounts: updatedAccounts
            });

            // Create payment records for each deposit
            for (const idx of selectedDeposits) {
                const account = family.cabinAccounts[idx];
                if (account && !account.depositPaid) {
                    await createPaymentRecord(family.id, {
                        cabinNumber: account.cabinNumber,
                        amountCad: account.depositCad || 0,
                        paymentMethod: 'Deposit - Quick Apply',
                        appliedBy: auth.currentUser?.uid || 'admin',
                        notes: `Depósito marcado como pagado para cabina ${account.cabinNumber}`
                    });
                }
            }

            // Refresh local data
            const updatedFamily = await getBookingData(family.id);
            if (updatedFamily) {
                setFamily(updatedFamily);
            }

            setSelectedDeposits([]);
            if (onUpdate) onUpdate();
            alert(t('admin.depositsMarkedSuccess', { count: selectedDeposits.length }));
        } catch (error) {
            console.error('Error updating deposits:', error);
            alert(t('admin.errorUpdatingDeposits'));
        }
    };

    // Start editing financial data
    const startEditing = () => {
        if (activeTab === 'global') {
            alert(t('admin.editIndividually'));
            return;
        }
        if (!displayData) return;

        setFormData({
            subtotalCad: displayData.subtotalCad,
            gratuitiesCad: displayData.gratuitiesCad,
            paidCad: displayData.paidCad,
            paymentDeadlines: displayData.paymentDeadlines ? JSON.parse(JSON.stringify(displayData.paymentDeadlines)) : []
        });
        setEditing(true);
    };

    const handleSave = async () => {
        try {
            const index = parseInt(activeTab);
            const currentCabin = family.cabinAccounts[index];

            const totalCad = formData.subtotalCad + formData.gratuitiesCad;
            // Balance recalculo
            // Note: paidCad here overrides whatever was there. 
            // Ideally we calculate paid from payments, but if admin wants to force a value:
            const balanceCad = Math.round((totalCad - formData.paidCad) * 100) / 100;

            const updatedCabin = {
                ...currentCabin,
                subtotalCad: formData.subtotalCad,
                gratuitiesCad: formData.gratuitiesCad,
                totalCad,
                paidCad: formData.paidCad,
                balanceCad,
                paymentDeadlines: formData.paymentDeadlines || []
            };

            // Update array
            const newCabinAccounts = [...family.cabinAccounts];
            newCabinAccounts[index] = updatedCabin;

            // Recalculate Globals
            const subtotalCadGlobal = newCabinAccounts.reduce((sum, c) => sum + c.subtotalCad, 0);
            const gratuitiesCadGlobal = newCabinAccounts.reduce((sum, c) => sum + c.gratuitiesCad, 0);
            const totalCadGlobal = newCabinAccounts.reduce((sum, c) => sum + c.totalCad, 0);
            const paidCadGlobal = newCabinAccounts.reduce((sum, c) => sum + c.paidCad, 0);
            const balanceCadGlobal = Math.round((totalCadGlobal - paidCadGlobal) * 100) / 100;

            await updateBookingData(family.id, {
                cabinAccounts: newCabinAccounts,
                subtotalCadGlobal,
                gratuitiesCadGlobal,
                totalCadGlobal,
                paidCadGlobal,
                balanceCadGlobal
            });

            // Refresh local data
            const updatedFamily = await getBookingData(family.id);
            if (updatedFamily) {
                setFamily(updatedFamily);
            }

            setEditing(false);
            if (onUpdate) onUpdate();

            // Success message
            alert(t('admin.cabinDataUpdated'));
        } catch (error) {
            console.error('Error updating family:', error);
            alert(t('admin.errorUpdatingData'));
        }
    };

    const handleDeletePayment = async (paymentId, paymentAmount) => {
        console.log('🗑️ Attempting to delete payment:', { paymentId, paymentAmount, familyId: family.id });

        if (!paymentId) {
            alert('Error: ID de pago no encontrado');
            console.error('Payment ID is missing');
            return;
        }

        // Simplified confirmation - just use confirm without the formatted message for now
        const confirmDelete = window.confirm(t('admin.confirmDeletePayment'));
        console.log('User confirmation:', confirmDelete);

        if (!confirmDelete) {
            console.log('User cancelled deletion');
            return;
        }

        try {
            console.log('Calling deletePayment function...');
            await deletePayment(family.id, paymentId);
            console.log('✅ Payment deleted successfully');

            // Reload payments list
            console.log('Reloading payments list...');
            const paymentsData = await getBookingPayments(family.id);
            setPayments(paymentsData);
            console.log('Payments reloaded:', paymentsData);

            // Trigger parent update to refresh family data
            if (onUpdate) onUpdate();

            alert(t('admin.paymentDeletedSuccess'));
        } catch (error) {
            console.error('❌ Error deleting payment:', {
                code: error.code,
                message: error.message,
                fullError: error
            });
            alert(`${t('admin.errorDeletingPayment')}: ${error.message}`);
        }
    };

    const handleAddPayment = async (paymentFormData) => {
        try {
            const { cabinIndex, amountCad, method, reference, note, appliedAt } = paymentFormData;
            const cabin = family.cabinAccounts[parseInt(cabinIndex)];

            await addPayment(family.id, {
                amountCad: parseFloat(amountCad),
                targetCabinIndex: parseInt(cabinIndex),
                method: method || 'Manual Entry',
                reference: reference || 'Manual Payment',
                note: note || '',
                adminUid: auth.currentUser?.uid || 'admin',
                appliedAt: appliedAt ? new Date(appliedAt) : null
            });

            // Create payment record in subcollection
            await createPaymentRecord(family.id, {
                cabinNumber: cabin.cabinNumber,
                amountCad: parseFloat(amountCad),
                paymentMethod: method || 'Manual Entry',
                appliedBy: auth.currentUser?.uid || 'admin',
                notes: note || reference || 'Pago manual agregado',
                paymentDate: appliedAt ? new Date(appliedAt) : new Date()
            });

            // Reload family data (payments will update via subscription)
            const updatedFamily = await getBookingData(family.id);
            if (updatedFamily) {
                setFamily(updatedFamily);
            }

            // Trigger parent update
            if (onUpdate) onUpdate();

            setShowAddPayment(false);
            alert(t('admin.paymentAddedSuccess'));
        } catch (error) {
            console.error('❌ Error adding manual payment:', error);
            alert(`${t('admin.errorAddingPayment')}: ${error.message}`);
        }
    };

    // Sprint 1: Approve Payment Request
    const handleApproveRequest = async (request) => {
        if (!window.confirm(`¿Aprobar solicitud de pago de $${request.requestedAmount} CAD para cabina ${request.cabinNumber}?`)) {
            return;
        }

        try {
            const cabin = family.cabinAccounts?.find(c => c.cabinNumber === request.cabinNumber);
            if (!cabin) {
                alert('Cabina no encontrada');
                return;
            }

            // 1. Create payment record
            await createPaymentRecord(family.id, {
                cabinNumber: request.cabinNumber,
                amountCad: request.requestedAmount,
                paymentMethod: 'Payment Request Approved',
                appliedBy: auth.currentUser?.uid || 'admin',
                notes: request.notes || 'Solicitud de pago aprobada'
            });

            // 2. Update cabin paid amount
            const cabinIndex = family.cabinAccounts.findIndex(c => c.cabinNumber === request.cabinNumber);
            const updatedAccounts = [...family.cabinAccounts];
            updatedAccounts[cabinIndex] = {
                ...updatedAccounts[cabinIndex],
                paidCad: (updatedAccounts[cabinIndex].paidCad || 0) + request.requestedAmount
            };

            await updateBookingData(family.id, {
                cabinAccounts: updatedAccounts
            });

            // 3. Update request status
            await updateDoc(doc(db, 'paymentRequests', request.id), {
                status: 'approved',
                approvedAt: serverTimestamp(),
                approvedBy: auth.currentUser?.uid || 'admin'
            });

            // 4. Refresh family data
            const updatedFamily = await getBookingData(family.id);
            if (updatedFamily) {
                setFamily(updatedFamily);
            }

            if (onUpdate) onUpdate();
            alert('✅ Solicitud aprobada exitosamente');
        } catch (error) {
            console.error('Error approving request:', error);
            alert(`Error al aprobar solicitud: ${error.message}`);
        }
    };

    // Sprint 1: Reject Payment Request
    const handleRejectRequest = async (request) => {
        const reason = prompt('Motivo del rechazo (opcional):');
        if (reason === null) return; // User cancelled

        try {
            await updateDoc(doc(db, 'paymentRequests', request.id), {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
                rejectedBy: auth.currentUser?.uid || 'admin',
                rejectionReason: reason || 'No especificado'
            });

            alert('❌ Solicitud rechazada');
        } catch (error) {
            console.error('Error rejecting request:', error);
            alert(`Error al rechazar solicitud: ${error.message}`);
        }
    };

    // Sprint 1: Save Agent Notes
    const handleSaveNotes = async () => {
        try {
            await updateBookingData(family.id, {
                agentNotes: notesData,
                agentNotesUpdatedAt: serverTimestamp(),
                agentNotesUpdatedBy: auth.currentUser?.uid || 'admin'
            });

            const updatedFamily = await getBookingData(family.id);
            if (updatedFamily) {
                setFamily(updatedFamily);
            }

            setEditingNotes(false);
            alert('📝 Notas guardadas exitosamente');
        } catch (error) {
            console.error('Error saving notes:', error);
            alert(`Error al guardar notas: ${error.message}`);
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
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)'
            }}>
                <Card>
                    <div className="card-header">
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                        }}>
                            {/* Title Row */}
                            <div>
                                <h3 className="card-title">{family.displayName}</h3>
                                <p className="card-subtitle">{family.bookingCode}</p>
                            </div>

                            {/* Buttons Row - Responsive */}
                            <div style={{
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    onClick={editingInfo ? () => setEditingInfo(false) : startEditingInfo}
                                    className="btn btn-sm btn-primary"
                                    style={{ flex: '1 1 auto', minWidth: '120px' }}
                                >
                                    {editingInfo ? '✕ Cancelar' : '✏️ Editar Datos'}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="btn btn-sm btn-outline"
                                    style={{ flex: '1 1 auto', minWidth: '120px' }}
                                >
                                    ✕ {t('admin.close')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card-body">
                        {/* Tabs */}
                        <div className="flex gap-md mb-lg" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1px' }}>
                            <div className="flex gap-md mb-lg" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1px' }}>
                                <button
                                    className={`btn ${activeTab === 'global' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => {
                                        setActiveTab('global');
                                        setEditing(false);
                                        setEditingInfo(false);
                                        setSelectedCabinNumber(null);
                                    }}
                                >
                                    🌐 Global
                                </button>
                                {family.cabinAccounts?.map((cabin, index) => (
                                    <button
                                        key={index}
                                        className={`btn ${activeTab === String(index) ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => {
                                            setActiveTab(String(index));
                                            setEditing(false);
                                            setSelectedCabinNumber(cabin.cabinNumber);
                                        }}
                                    >
                                        🛳️ {cabin.cabinNumber}
                                    </button>
                                ))}
                            </div>

                        </div>

                        {/* Per-Cabin Balance Display (Sprint 1) */}
                        {selectedCabinNumber && (() => {
                            const selectedCabin = family.cabinAccounts?.find(c => c.cabinNumber === selectedCabinNumber);
                            if (!selectedCabin) return null;

                            const cabinTotal = (selectedCabin.subtotalCad || 0) + (selectedCabin.gratuitiesCad || 0);
                            const cabinPaid = selectedCabin.paidCad || 0;
                            const cabinBalance = cabinTotal - cabinPaid;

                            return (
                                <div className="mb-md p-md bg-primary-light rounded border border-primary">
                                    <div className="flex justify-between items-center mb-sm">
                                        <h3 className="font-semibold text-primary">
                                            🚪 Cabina {selectedCabin.cabinNumber}
                                        </h3>
                                        {selectedCabin.cabinType && (
                                            <span className="badge badge-info">{selectedCabin.cabinType}</span>
                                        )}
                                    </div>

                                    <div className="grid grid-3 gap-md text-center mb-sm">
                                        <div>
                                            <p className="text-xs text-muted">Total Cabina</p>
                                            <p className="text-lg font-bold text-dark">
                                                ${cabinTotal.toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted">Pagado Cabina</p>
                                            <p className="text-lg font-bold text-success">
                                                ${cabinPaid.toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted">Balance Cabina</p>
                                            <p className="text-lg font-bold text-danger">
                                                ${cabinBalance.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Passenger List for this cabin */}
                                    {selectedCabin.passengers && selectedCabin.passengers.length > 0 && (
                                        <div className="pt-sm border-t">
                                            <p className="text-xs text-muted mb-xs">Pasajeros ({selectedCabin.passengers.length})</p>
                                            <div className="flex flex-wrap gap-xs">
                                                {selectedCabin.passengers.map((pax, idx) => (
                                                    <span key={idx} className="badge badge-light">
                                                        👤 {pax.firstName} {pax.lastName}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Global Balance (always visible below cabin balance) */}
                        <div className="mb-md p-sm bg-light rounded text-small">
                            <p className="text-muted mb-xs font-semibold">Balance Global (Todas las Cabinas)</p>
                            <div className="flex justify-between">
                                <span>Total: ${displayData ? ((displayData.subtotalCad || 0) + (displayData.gratuitiesCad || 0)).toFixed(2) : '0.00'}</span>
                                <span className="text-success">Pagado: ${displayData ? (displayData.paidCad || 0).toFixed(2) : '0.00'}</span>
                                <span className="text-danger font-semibold">
                                    Saldo: ${displayData ? (((displayData.subtotalCad || 0) + (displayData.gratuitiesCad || 0)) - (displayData.paidCad || 0)).toFixed(2) : '0.00'}
                                </span>
                            </div>
                        </div>

                        {/* Bulk Deposit Payment Section */}
                        {family.cabinAccounts && family.cabinAccounts.length > 0 && (
                            <div className="mb-lg p-md" style={{
                                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                                borderRadius: 'var(--radius-lg)',
                                border: '2px solid #0ea5e9'
                            }}>
                                <h4 className="font-semibold mb-sm" style={{ color: '#0369a1' }}>
                                    💰 {t('admin.bulkDepositTitle')}
                                </h4>
                                <p className="text-small text-muted mb-md">
                                    {t('admin.bulkDepositDescription')}
                                </p>

                                {/* Cabin Selection */}
                                <div className="grid grid-2 gap-sm mb-md">
                                    {family.cabinAccounts.map((cabin, idx) => (
                                        <label
                                            key={idx}
                                            className="flex items-center gap-sm p-sm rounded cursor-pointer"
                                            style={{
                                                background: selectedDeposits.includes(idx) ? '#bae6fd' : 'white',
                                                border: `2px solid ${selectedDeposits.includes(idx) ? '#0ea5e9' : '#e2e8f0'}`,
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedDeposits.includes(idx)}
                                                onChange={() => handleToggleDepositSelection(idx)}
                                                disabled={cabin.depositPaid}
                                                style={{ width: '20px', height: '20px' }}
                                            />
                                            <div className="flex-1">
                                                <span className="font-semibold">{cabin.cabinNumber}</span>
                                                {cabin.depositPaid && (
                                                    <span className="badge badge-success ml-sm">{t('admin.alreadyPaid')}</span>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-sm justify-between">
                                    <div className="flex gap-sm">
                                        <button
                                            onClick={handleSelectAllDeposits}
                                            className="btn btn-sm btn-outline"
                                            disabled={family.cabinAccounts.every(c => c.depositPaid)}
                                        >
                                            ☑️ {t('admin.selectPending')}
                                        </button>
                                        <button
                                            onClick={handleDeselectAllDeposits}
                                            className="btn btn-sm btn-outline"
                                            disabled={selectedDeposits.length === 0}
                                        >
                                            ⬜ {t('admin.deselectAll')}
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleApplyDepositPayments}
                                        className="btn btn-sm btn-success"
                                        disabled={selectedDeposits.length === 0}
                                    >
                                        ✅ {t('admin.applySelected')} ({selectedDeposits.length})
                                    </button>
                                </div>

                                {/* Status Summary */}
                                <div className="mt-sm pt-sm" style={{ borderTop: '1px solid #bae6fd' }}>
                                    <p className="text-xs text-muted">
                                        {family.cabinAccounts.filter(c => c.depositPaid).length} {t('common.of')} {family.cabinAccounts.length} {t('admin.cabinsWithDeposit')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Basic Info (Editable) */}
                        {!editingInfo ? (
                            <div className="grid grid-2 mb-lg p-md bg-light rounded relative">
                                <button
                                    onClick={startEditingInfo}
                                    className="btn btn-xs btn-outline"
                                    style={{ position: 'absolute', top: '10px', right: '10px' }}
                                >
                                    ✏️ {t('admin.editData')}
                                </button>
                                <div>
                                    <p className="text-small text-muted">{t('admin.familyName')}</p>
                                    <p className="font-semibold">{family.displayName}</p>
                                    <p className="text-small text-muted mt-sm">Email</p>
                                    <p className="font-semibold">{family.email}</p>
                                </div>
                                <div>
                                    <p className="text-small text-muted">{t('admin.cabinsAndReservations')}</p>
                                    <div className="flex flex-col gap-xs mt-xs">
                                        {(family.cabinNumbers || []).map((num, idx) => {
                                            const account = family.cabinAccounts?.find(c => c.cabinNumber === num);
                                            const booking = account?.bookingNumber || 'N/A';
                                            return (
                                                <div key={idx} className="flex justify-between text-small border-b border-light pb-xs">
                                                    <span className="font-semibold">🚪 {num}</span>
                                                    <span className="text-muted">Rsv: <span className="text-dark">{booking}</span></span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-md bg-light rounded mb-lg border-primary">
                                <h4 className="font-semibold mb-sm text-primary">{t('admin.editGeneralInfo')}</h4>
                                <div className="grid grid-2 gap-md mb-md">
                                    <div className="form-group">
                                        <label className="form-label">{t('admin.familyName')}</label>
                                        <input
                                            className="form-input"
                                            value={infoData.displayName}
                                            onChange={(e) => setInfoData({ ...infoData, displayName: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            className="form-input"
                                            value={infoData.email}
                                            onChange={(e) => setInfoData({ ...infoData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group mb-md">
                                    <label className="form-label flex justify-between">
                                        {t('admin.cabinNumbers')}
                                        <button onClick={addCabin} className="btn btn-xs btn-success">{t('admin.addCabin')}</button>
                                    </label>
                                    <div className="flex flex-col gap-sm">
                                        {infoData.cabinNumbers.map((num, idx) => (
                                            <div key={idx} className="flex items-center gap-sm">
                                                <span className="text-small text-muted" style={{ width: '20px' }}>#{idx + 1}</span>
                                                <div className="flex-1 grid grid-2 gap-sm">
                                                    <input
                                                        className="form-input"
                                                        value={num}
                                                        onChange={(e) => {
                                                            const newCabins = [...infoData.cabinNumbers];
                                                            newCabins[idx] = e.target.value;
                                                            setInfoData(prev => ({ ...prev, cabinNumbers: newCabins }));
                                                        }}
                                                        placeholder={t('admin.cabinNumber')}
                                                    />
                                                    <input
                                                        className="form-input"
                                                        value={infoData.cabinAccountsSnapshot[idx]?.bookingNumber || ''}
                                                        onChange={(e) => {
                                                            const newSnapshot = [...infoData.cabinAccountsSnapshot];
                                                            newSnapshot[idx] = { ...newSnapshot[idx], bookingNumber: e.target.value };
                                                            setInfoData(prev => ({ ...prev, cabinAccountsSnapshot: newSnapshot }));
                                                        }}
                                                        placeholder={t('admin.bookingNumber')}
                                                    />
                                                    <label className="flex items-center gap-xs text-small cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={infoData.cabinAccountsSnapshot[idx]?.depositPaid || false}
                                                            onChange={(e) => {
                                                                const newSnapshot = [...infoData.cabinAccountsSnapshot];
                                                                newSnapshot[idx] = { ...newSnapshot[idx], depositPaid: e.target.checked };
                                                                setInfoData(prev => ({ ...prev, cabinAccountsSnapshot: newSnapshot }));
                                                            }}
                                                        />
                                                        {t('admin.depositPaid')}
                                                    </label>
                                                </div>
                                                <button
                                                    onClick={() => removeCabin(idx)}
                                                    className="btn btn-xs btn-danger"
                                                    title="Eliminar cabina"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}
                                        {infoData.cabinNumbers.length === 0 && (
                                            <p className="text-small text-muted italic">{t('admin.noCabinsAssigned')}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-sm justify-end">
                                    <button onClick={() => setEditingInfo(false)} className="btn btn-sm btn-outline">{t('common.cancel')}</button>
                                    <button onClick={handleSaveInfo} className="btn btn-sm btn-primary">{t('admin.saveInfo')}</button>
                                </div>
                            </div>
                        )}

                        {displayData && (
                            !editing ? (
                                <>
                                    <div className="mb-lg">
                                        <h4 className="font-semibold mb-md">
                                            {t('admin.costs')} {activeTab === 'global' ? `(${t('admin.consolidated')})` : `(${t('admin.cabin')} ${displayData.cabinNumber})`}
                                        </h4>
                                        <div className="flex justify-between mb-sm">
                                            <span>{t('admin.subtotal')}:</span>
                                            <span>{formatCurrencyWithLabel(displayData.subtotalCad)}</span>
                                        </div>
                                        <div className="flex justify-between mb-sm">
                                            <span>{t('admin.gratuities')}:</span>
                                            <span>{formatCurrencyWithLabel(displayData.gratuitiesCad)}</span>
                                        </div>
                                        <div className="flex justify-between mb-sm font-bold">
                                            <span>{t('admin.total')}:</span>
                                            <span>{formatCurrencyWithLabel(displayData.totalCad)}</span>
                                        </div>
                                        <div className="flex justify-between mb-sm" style={{ color: 'var(--color-success)' }}>
                                            <span>{t('admin.paid')}:</span>
                                            <span>{formatCurrencyWithLabel(displayData.paidCad)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold" style={{
                                            color: displayData.balanceCad > 0 ? 'var(--color-error)' : 'var(--color-success)'
                                        }}>
                                            <span>{t('admin.balance')}:</span>
                                            <span>{formatCurrencyWithLabel(displayData.balanceCad)}</span>
                                        </div>
                                    </div>

                                    {activeTab !== 'global' && (
                                        <button onClick={startEditing} className="btn btn-primary">
                                            {t('admin.editCabinAmounts')} {displayData.cabinNumber}
                                        </button>
                                    )}
                                    {activeTab === 'global' && (
                                        <p className="text-small text-muted text-center">
                                            {t('admin.selectCabinToEdit')}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h4 className="font-semibold mb-md text-primary">
                                        {t('admin.editing')} {t('admin.cabin')} {displayData.cabinNumber}
                                    </h4>
                                    <div className="form-group">
                                        <label className="form-label">{t('admin.subtotal')} (CAD)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.subtotalCad}
                                            onChange={(e) => setFormData({ ...formData, subtotalCad: parseFloat(e.target.value) || 0 })}
                                            step="0.01"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{t('admin.gratuities')} (CAD)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.gratuitiesCad}
                                            onChange={(e) => setFormData({ ...formData, gratuitiesCad: parseFloat(e.target.value) || 0 })}
                                            step="0.01"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">{t('admin.paid')} (CAD)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.paidCad}
                                            onChange={(e) => setFormData({ ...formData, paidCad: parseFloat(e.target.value) || 0 })}
                                            step="0.01"
                                        />
                                    </div>

                                    {/* Payment Deadlines Editor */}
                                    <div className="form-group mt-md pt-md border-t border-light">
                                        <label className="form-label flex justify-between items-center mb-sm">
                                            {t('admin.paymentDeadlines')}
                                            <button
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    paymentDeadlines: [
                                                        ...(formData.paymentDeadlines || []),
                                                        { label: 'Nuevo Pago', dueDate: '', amountCad: 0, status: 'upcoming' }
                                                    ]
                                                })}
                                                className="btn btn-xs btn-success"
                                            >
                                                {t('admin.addDate')}
                                            </button>
                                        </label>

                                        <div className="flex flex-col gap-sm">
                                            {(formData.paymentDeadlines || []).map((deadline, idx) => (
                                                <div key={idx} className="p-sm bg-bg rounded border border-light grid gap-sm">
                                                    <div className="grid grid-2 gap-sm">
                                                        <div>
                                                            <label className="text-xs text-muted">{t('admin.concept')}</label>
                                                            <input
                                                                className="form-input text-xs"
                                                                value={deadline.label}
                                                                onChange={(e) => {
                                                                    const newDeadlines = [...formData.paymentDeadlines];
                                                                    newDeadlines[idx].label = e.target.value;
                                                                    setFormData({ ...formData, paymentDeadlines: newDeadlines });
                                                                }}
                                                                placeholder="Ej: Depósito Inicial"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-muted">{t('admin.dueDate')}</label>
                                                            <input
                                                                type="date"
                                                                className="form-input text-xs"
                                                                value={deadline.dueDate ? new Date(deadline.dueDate).toISOString().split('T')[0] : ''}
                                                                onChange={(e) => {
                                                                    const newDeadlines = [...formData.paymentDeadlines];
                                                                    // Store as full ISO string or just date depending on backend expectation. 
                                                                    // Using ISO string to be safe but usually date part is enough.
                                                                    // Let's stick to the value directly if it's a string, or create a date object.
                                                                    // Firestore likes Timestamps or Strings. Let's use simplified string YYYY-MM-DD for UI simplicity, 
                                                                    // or convert to date. The current data shows 'dueDate' as a timestamp probably?
                                                                    // Let's check format. 'formatDate' handles it.
                                                                    // For simplicity let's save as ISO string or Date object.
                                                                    // Better to save as standard Date object serialized.
                                                                    newDeadlines[idx].dueDate = e.target.value; // Save 'YYYY-MM-DD' string for now, backend handling might be needed if it expects Timestamp.
                                                                    setFormData({ ...formData, paymentDeadlines: newDeadlines });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-3 gap-sm items-end">
                                                        <div className="col-span-1">
                                                            <label className="text-xs text-muted">{t('admin.amount')} (CAD)</label>
                                                            <input
                                                                type="number"
                                                                className="form-input text-xs"
                                                                value={deadline.amountCad}
                                                                onChange={(e) => {
                                                                    const newDeadlines = [...formData.paymentDeadlines];
                                                                    newDeadlines[idx].amountCad = parseFloat(e.target.value) || 0;
                                                                    setFormData({ ...formData, paymentDeadlines: newDeadlines });
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className="text-xs text-muted">{t('payment.status')}</label>
                                                            <select
                                                                className="form-input text-xs"
                                                                value={deadline.status}
                                                                onChange={(e) => {
                                                                    const newDeadlines = [...formData.paymentDeadlines];
                                                                    newDeadlines[idx].status = e.target.value;
                                                                    setFormData({ ...formData, paymentDeadlines: newDeadlines });
                                                                }}
                                                            >
                                                                <option value="upcoming">Próximo</option>
                                                                <option value="paid">Pagado</option>
                                                                <option value="overdue">Vencido</option>
                                                            </select>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const newDeadlines = formData.paymentDeadlines.filter((_, i) => i !== idx);
                                                                setFormData({ ...formData, paymentDeadlines: newDeadlines });
                                                            }}
                                                            className="btn btn-xs btn-danger h-8"
                                                            title="Eliminar fecha"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(formData.paymentDeadlines || []).length === 0 && (
                                                <p className="text-xs text-muted italic text-center">{t('admin.noPaymentDates')}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-sm justify-end mt-sm">
                                            <button
                                                onClick={() => {
                                                    // Auto-calculate Final Payment based on Total - Sum(Others)
                                                    const totalCost = (formData.subtotalCad || 0) + (formData.gratuitiesCad || 0);
                                                    const deadlines = [...(formData.paymentDeadlines || [])];

                                                    // Find "Pago Final" or "Final Payment"
                                                    const finalIdx = deadlines.findIndex(d =>
                                                        d.label.toLowerCase().includes('final') ||
                                                        d.label.toLowerCase().includes('saldo')
                                                    );

                                                    if (finalIdx !== -1) {
                                                        const otherAmount = deadlines.reduce((sum, d, i) => i === finalIdx ? sum : sum + (d.amountCad || 0), 0);
                                                        deadlines[finalIdx].amountCad = Math.max(0, parseFloat((totalCost - otherAmount).toFixed(2)));
                                                        setFormData({ ...formData, paymentDeadlines: deadlines });
                                                    } else {
                                                        alert(t('admin.noFinalPaymentFound'));
                                                    }
                                                }}
                                                className="btn btn-xs btn-primary"
                                                title="Ajusta el Pago Final para cubrir el saldo restante del total"
                                            >
                                                {t('admin.adjustFinalPayment')}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // Defaults with smart calculation
                                                    const totalCost = (formData.subtotalCad || 0) + (formData.gratuitiesCad || 0);
                                                    const defaultDeposit = 500; // Standard deposit placeholder
                                                    const finalAmount = Math.max(0, totalCost - defaultDeposit);

                                                    setFormData({
                                                        ...formData,
                                                        paymentDeadlines: [
                                                            { label: 'Depósito Inicial', dueDate: '', amountCad: defaultDeposit, status: 'upcoming' },
                                                            { label: 'Pago Final', dueDate: '', amountCad: parseFloat(finalAmount.toFixed(2)), status: 'upcoming' }
                                                        ]
                                                    });
                                                }}
                                                className="btn btn-xs btn-outline"
                                            >
                                                {t('admin.loadSmartDefaults')}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-md mt-lg">
                                        <button onClick={() => setEditing(false)} className="btn btn-outline">
                                            {t('common.cancel')}
                                        </button>
                                        <button onClick={handleSave} className="btn btn-primary">
                                            {t('common.saveChanges')}
                                        </button>
                                    </div>
                                </>
                            )
                        )}

                        {/* Agent Notes - Private (Sprint 1) */}
                        <div className="mb-lg p-md bg-light rounded border">
                            <div className="flex justify-between items-center mb-sm">
                                <h4 className="font-semibold">📝 Notas Internas del Agente</h4>
                                <span className="badge badge-warning">Privado</span>
                            </div>

                            {!editingNotes ? (
                                <div>
                                    <p className="text-small whitespace-pre-wrap" style={{ minHeight: '40px' }}>
                                        {family.agentNotes || "Sin notas. Haz clic en Editar para agregar contexto interno sobre esta familia."}
                                    </p>
                                    <button
                                        onClick={() => setEditingNotes(true)}
                                        className="btn btn-xs btn-outline mt-sm"
                                    >
                                        ✏️ Editar Notas
                                    </button>
                                    {family.agentNotesUpdatedAt && (
                                        <p className="text-xs text-muted mt-xs">
                                            Última actualización: {family.agentNotesUpdatedAt?.toDate ?
                                                family.agentNotesUpdatedAt.toDate().toLocaleDateString('es-MX') :
                                                'N/A'}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <textarea
                                        className="form-input"
                                        rows="4"
                                        value={notesData}
                                        onChange={(e) => setNotesData(e.target.value)}
                                        placeholder="Ej: Cliente prefiere pagar en marzo. Cabina 14161 la paga el hijo. Contactar por WhatsApp."
                                    />
                                    <div className="flex gap-sm mt-sm">
                                        <button
                                            onClick={handleSaveNotes}
                                            className="btn btn-sm btn-primary"
                                        >
                                            💾 Guardar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingNotes(false);
                                                setNotesData(family.agentNotes || '');
                                            }}
                                            className="btn btn-sm btn-outline"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cruise Confirmation Details */}
                        {(family.confirmationNumber || family.cruiseLine || family.shipName || family.sailDate) && (
                            <div className="mb-lg p-md bg-light rounded border border-info">
                                <h4 className="font-semibold mb-sm text-info">🚢 Información del Crucero</h4>
                                <div className="grid grid-2 gap-md">
                                    {family.confirmationNumber && (
                                        <div>
                                            <p className="text-small text-muted">Número de Confirmación</p>
                                            <p className="font-semibold">{family.confirmationNumber}</p>
                                        </div>
                                    )}
                                    {family.cruiseLine && (
                                        <div>
                                            <p className="text-small text-muted">Naviera</p>
                                            <p className="font-semibold">{family.cruiseLine}</p>
                                        </div>
                                    )}
                                    {family.shipName && (
                                        <div>
                                            <p className="text-small text-muted">Barco</p>
                                            <p className="font-semibold">{family.shipName}</p>
                                        </div>
                                    )}
                                    {family.sailDate && (
                                        <div>
                                            <p className="text-small text-muted">Fecha de Zarpe</p>
                                            <p className="font-semibold">{new Date(family.sailDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Cabin Details with Passengers */}
                                {family.cabinAccounts && family.cabinAccounts.length > 0 && family.cabinAccounts.some(c => c.passengers && c.passengers.length > 0) && (
                                    <div className="mt-md pt-md" style={{ borderTop: '1px solid #ddd' }}>
                                        <p className="text-small text-muted mb-sm font-semibold">Detalles de Cabinas y Pasajeros</p>
                                        {family.cabinAccounts.map((cabin, idx) => (
                                            cabin.passengers && cabin.passengers.length > 0 && (
                                                <div key={idx} className="mb-md p-sm bg-white rounded border">
                                                    <div className="flex justify-between items-center mb-xs">
                                                        <span className="font-semibold text-primary">🚪 Cabina {cabin.cabinNumber}</span>
                                                        {cabin.cabinType && <span className="badge badge-info">{cabin.cabinType}</span>}
                                                    </div>
                                                    <div className="mt-xs">
                                                        <p className="text-xs text-muted mb-xs">Pasajeros:</p>
                                                        <div className="flex flex-col gap-xs">
                                                            {cabin.passengers.map((pax, paxIdx) => (
                                                                <div key={paxIdx} className="text-small flex justify-between">
                                                                    <span>👤 {pax.firstName} {pax.lastName}</span>
                                                                    {pax.dateOfBirth && (
                                                                        <span className="text-muted text-xs">
                                                                            {new Date(pax.dateOfBirth).toLocaleDateString('es-MX')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Payment Requests Pending (Sprint 1) */}
                        {!loadingRequests && pendingRequests.length > 0 && (
                            <div className="mb-lg p-md bg-warning-light rounded border border-warning">
                                <h4 className="font-semibold mb-sm text-warning flex items-center gap-sm">
                                    ⚠️ Solicitudes de Pago Pendientes
                                    <span className="badge badge-warning">{pendingRequests.length}</span>
                                </h4>
                                <div className="flex flex-col gap-sm">
                                    {pendingRequests.map(request => (
                                        <div key={request.id} className="p-sm bg-white rounded border flex justify-between items-center">
                                            <div className="flex-1">
                                                <p className="font-semibold text-lg">${request.requestedAmount?.toFixed(2)} CAD</p>
                                                <p className="text-small text-muted">
                                                    🚪 Cabina {request.cabinNumber} • {request.requestDate?.toDate ?
                                                        request.requestDate.toDate().toLocaleDateString('es-MX') :
                                                        'Fecha N/A'}
                                                </p>
                                                {request.notes && (
                                                    <p className="text-xs mt-xs">{request.notes}</p>
                                                )}
                                            </div>
                                            <div className="flex gap-xs">
                                                <button
                                                    onClick={() => handleApproveRequest(request)}
                                                    className="btn btn-sm btn-success"
                                                >
                                                    ✅ Aprobar
                                                </button>
                                                <button
                                                    onClick={() => handleRejectRequest(request)}
                                                    className="btn btn-sm btn-danger"
                                                >
                                                    ❌ Rechazar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Payment History Section */}
                        <div className="mb-lg">
                            <div className="flex justify-between items-center mb-md">
                                <h4 className="font-semibold">{t('admin.paymentHistory')}</h4>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => setShowImportModal(true)}
                                    >
                                        📄 Importar Confirmación
                                    </button>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => setShowAddPayment(true)}
                                    >
                                        ➕ {t('admin.addManualPayment')}
                                    </button>
                                </div>
                            </div>
                            {loadingPayments ? (
                                <p className="text-muted text-center">{t('admin.loadingPayments')}</p>
                            ) : payments.length === 0 ? (
                                <p className="text-muted text-center">{t('admin.noPaymentsApplied')}</p>
                            ) : (
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>{t('admin.date')}</th>
                                                <th>Cabina</th>
                                                <th>{t('admin.amount')}</th>
                                                <th>Método</th>
                                                <th>Nota</th>
                                                <th>{t('common.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments
                                                .filter(payment => {
                                                    // If no cabin selected (global view), show all payments
                                                    if (!selectedCabinNumber) return true;

                                                    // If cabin selected, only show payments for that cabin
                                                    return payment.cabinNumber === selectedCabinNumber ||
                                                        payment.targetCabinNumber === selectedCabinNumber;
                                                })
                                                .map((payment) => (
                                                    <tr key={payment.id}>
                                                        <td className="text-small">
                                                            {payment.paymentDate?.toDate ?
                                                                payment.paymentDate.toDate().toLocaleDateString('es-MX') :
                                                                new Date(payment.paymentDate).toLocaleDateString('es-MX')
                                                            }
                                                        </td>
                                                        <td className="text-small">
                                                            🚪 {payment.cabinNumber || 'N/A'}
                                                        </td>
                                                        <td className="font-semibold">
                                                            ${payment.amountCad?.toFixed(2)} CAD
                                                        </td>
                                                        <td className="text-small">
                                                            <span className="badge badge-info">
                                                                {payment.paymentMethod || 'Manual'}
                                                            </span>
                                                        </td>
                                                        <td className="text-small" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {payment.notes || '-'}
                                                        </td>
                                                        <td>
                                                            <div className="flex gap-xs">
                                                                <button
                                                                    className="btn btn-xs btn-outline"
                                                                    title="Ver detalles"
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedPayment(payment);
                                                                        setShowPaymentDetails(true);
                                                                    }}
                                                                >
                                                                    👁️
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeletePayment(payment.id, payment.amountCad)}
                                                                    className="btn btn-xs btn-danger"
                                                                    title={t('admin.deletePayment')}
                                                                    type="button"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Payment Details Modal */}
                {showPaymentDetails && selectedPayment && (
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
                        zIndex: 2000
                    }}>
                        <div style={{
                            background: 'white',
                            borderRadius: 'var(--radius-lg)',
                            padding: '2rem',
                            maxWidth: '500px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflow: 'auto'
                        }}>
                            <h2 className="mb-md">💳 Detalles del Pago</h2>

                            <div className="mb-md">
                                <div className="flex justify-between items-center mb-sm pb-sm border-b">
                                    <span className="text-muted">Monto</span>
                                    <span className="text-xl font-bold text-success">
                                        ${selectedPayment.amountCad?.toFixed(2)} CAD
                                    </span>
                                </div>

                                <div className="flex justify-between items-center mb-sm pb-sm border-b">
                                    <span className="text-muted">Cabina</span>
                                    <span className="font-semibold">
                                        🚪 {selectedPayment.cabinNumber || 'N/A'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center mb-sm pb-sm border-b">
                                    <span className="text-muted">Fecha de Pago</span>
                                    <span>
                                        {selectedPayment.paymentDate?.toDate ?
                                            selectedPayment.paymentDate.toDate().toLocaleDateString('es-MX', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }) :
                                            new Date(selectedPayment.paymentDate).toLocaleDateString('es-MX', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })
                                        }
                                    </span>
                                </div>

                                <div className="flex justify-between items-center mb-sm pb-sm border-b">
                                    <span className="text-muted">Método de Pago</span>
                                    <span className="badge badge-info">
                                        {selectedPayment.paymentMethod || 'Manual'}
                                    </span>
                                </div>

                                {selectedPayment.transactionId && (
                                    <div className="flex justify-between items-center mb-sm pb-sm border-b">
                                        <span className="text-muted">ID de Transacción</span>
                                        <span className="font-mono text-small">
                                            {selectedPayment.transactionId}
                                        </span>
                                    </div>
                                )}

                                <div className="mb-sm pb-sm border-b">
                                    <span className="text-muted block mb-xs">Notas</span>
                                    <p className="text-small" style={{ whiteSpace: 'pre-wrap' }}>
                                        {selectedPayment.notes || 'Sin notas'}
                                    </p>
                                </div>

                                <div className="flex justify-between items-center text-xs text-muted">
                                    <span>Creado</span>
                                    <span>
                                        {selectedPayment.createdAt?.toDate ?
                                            selectedPayment.createdAt.toDate().toLocaleString('es-MX') :
                                            'N/A'
                                        }
                                    </span>
                                </div>
                            </div>

                            {!editingPayment ? (
                                <div className="flex gap-sm">
                                    <button
                                        onClick={() => {
                                            setEditingPayment(true);
                                            setEditPaymentData({
                                                amountCad: selectedPayment.amountCad,
                                                paymentMethod: selectedPayment.paymentMethod || 'Manual Entry',
                                                notes: selectedPayment.notes || '',
                                                paymentDate: selectedPayment.paymentDate?.toDate ?
                                                    selectedPayment.paymentDate.toDate().toISOString().split('T')[0] :
                                                    new Date(selectedPayment.paymentDate).toISOString().split('T')[0]
                                            });
                                        }}
                                        className="btn btn-primary flex-1"
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('¿Eliminar este pago?')) {
                                                handleDeletePayment(selectedPayment.id, selectedPayment.amountCad);
                                                setShowPaymentDetails(false);
                                                setSelectedPayment(null);
                                            }
                                        }}
                                        className="btn btn-danger flex-1"
                                    >
                                        🗑️ Eliminar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowPaymentDetails(false);
                                            setSelectedPayment(null);
                                        }}
                                        className="btn btn-outline flex-1"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="mb-sm">Editar Pago</h3>
                                    <div className="mb-sm">
                                        <label className="block mb-xs text-small">Monto (CAD)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={editPaymentData.amountCad}
                                            onChange={(e) => setEditPaymentData({ ...editPaymentData, amountCad: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="mb-sm">
                                        <label className="block mb-xs text-small">Método de Pago</label>
                                        <select
                                            className="form-input"
                                            value={editPaymentData.paymentMethod}
                                            onChange={(e) => setEditPaymentData({ ...editPaymentData, paymentMethod: e.target.value })}
                                        >
                                            <option value="Manual Entry">Manual Entry</option>
                                            <option value="Deposit - Quick Apply">Deposit - Quick Apply</option>
                                            <option value="Card">Card</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Transfer">Transfer</option>
                                            <option value="Cheque">Cheque</option>
                                        </select>
                                    </div>
                                    <div className="mb-sm">
                                        <label className="block mb-xs text-small">Fecha de Pago</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={editPaymentData.paymentDate}
                                            onChange={(e) => setEditPaymentData({ ...editPaymentData, paymentDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-md">
                                        <label className="block mb-xs text-small">Notas</label>
                                        <textarea
                                            className="form-input"
                                            rows="3"
                                            value={editPaymentData.notes}
                                            onChange={(e) => setEditPaymentData({ ...editPaymentData, notes: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-sm">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const { updatePaymentRecord } = await import('../../services/paymentService');
                                                    await updatePaymentRecord(family.id, selectedPayment.id, {
                                                        amountCad: editPaymentData.amountCad,
                                                        paymentMethod: editPaymentData.paymentMethod,
                                                        notes: editPaymentData.notes,
                                                        paymentDate: new Date(editPaymentData.paymentDate)
                                                    });
                                                    setEditingPayment(false);
                                                    setShowPaymentDetails(false);
                                                    setSelectedPayment(null);
                                                } catch (error) {
                                                    alert('Error al actualizar el pago: ' + error.message);
                                                }
                                            }}
                                            className="btn btn-success flex-1"
                                        >
                                            💾 Guardar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingPayment(false);
                                                setEditPaymentData(null);
                                            }}
                                            className="btn btn-outline flex-1"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Manual Payment Modal */}
                {showAddPayment && (
                    <ManualPaymentModal
                        family={family}
                        onClose={() => setShowAddPayment(false)}
                        onSubmit={handleAddPayment}
                    />
                )}

                {/* PDF Confirmation Import Modal */}
                {showImportModal && (
                    <ConfirmationImport
                        family={family}
                        onClose={() => setShowImportModal(false)}
                        onSuccess={async () => {
                            // Reload family data after successful import
                            const updatedFamily = await getBookingData(family.id);
                            setFamily(updatedFamily);
                            onUpdate?.();
                        }}
                    />
                )}
            </div>
        </div>
    );
};

// Manual Payment Modal Component
const ManualPaymentModal = ({ family, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        cabinIndex: family.cabinAccounts?.[0] ? '0' : '',
        amountCad: '',
        method: 'Wire Transfer',
        reference: '',
        note: '',
        appliedAt: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.amountCad || parseFloat(formData.amountCad) <= 0) {
            alert('Por favor ingresa un monto válido');
            return;
        }
        onSubmit(formData);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
        }}>
            <div style={{
                maxWidth: '500px',
                width: '100%',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                padding: '2rem'
            }}>
                <div className="flex justify-between items-center mb-lg">
                    <h3 className="font-bold text-lg">➕ Agregar Pago Manual</h3>
                    <button onClick={onClose} className="btn btn-sm btn-outline">✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label required">Cabina</label>
                        <select
                            className="form-input"
                            value={formData.cabinIndex}
                            onChange={(e) => setFormData({ ...formData, cabinIndex: e.target.value })}
                            required
                        >
                            <option value="">Seleccionar cabina...</option>
                            {family.cabinAccounts?.map((cabin, idx) => (
                                <option key={idx} value={idx}>
                                    {cabin.cabinNumber} - Saldo: ${cabin.balanceCad?.toFixed(2) || '0.00'} CAD
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label required">Monto (CAD)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={formData.amountCad}
                            onChange={(e) => setFormData({ ...formData, amountCad: e.target.value })}
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Método de Pago</label>
                        <select
                            className="form-input"
                            value={formData.method}
                            onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                        >
                            <option value="Wire Transfer">Transferencia Bancaria</option>
                            <option value="Cash">Efectivo</option>
                            <option value="Check">Cheque</option>
                            <option value="Card">Tarjeta</option>
                            <option value="Other">Otro</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Referencia / No. Transacción</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            placeholder="Ej: TRANS-12345"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Fecha de Aplicación</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.appliedAt}
                            onChange={(e) => setFormData({ ...formData, appliedAt: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notas</label>
                        <textarea
                            className="form-input"
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            rows="3"
                            placeholder="Notas adicionales..."
                        />
                    </div>

                    <div className="flex gap-md mt-lg">
                        <button type="button" onClick={onClose} className="btn btn-outline flex-1">
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-success flex-1">
                            Agregar Pago
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default BookingDetail;
