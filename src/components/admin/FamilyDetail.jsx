import { useState, useEffect } from 'react';
import { getFamilyData, updateFamilyData, getFamilyPayments, deletePayment } from '../../services/firestore';
import Card from '../shared/Card';
import { formatCurrencyWithLabel } from '../../services/currencyService';
import { formatTimestamp } from '../../utils/formatters';

const FamilyDetail = ({ family: initialFamily, onClose, onUpdate }) => {
    const [family, setFamily] = useState(initialFamily); // Local state for immediate updates
    const [editing, setEditing] = useState(false);
    const [editingInfo, setEditingInfo] = useState(false); // New state for editing basic info
    const [activeTab, setActiveTab] = useState('global');
    const [payments, setPayments] = useState([]);
    const [loadingPayments, setLoadingPayments] = useState(true);

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

    // Load payments when component mounts
    useEffect(() => {
        const loadPayments = async () => {
            try {
                const paymentsData = await getFamilyPayments(family.id);
                setPayments(paymentsData);
            } catch (error) {
                console.error('Error loading payments:', error);
            } finally {
                setLoadingPayments(false);
            }
        };
        loadPayments();
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
        if (!window.confirm('¿Estás seguro de eliminar esta cabina? Se perderán sus datos financieros.')) return;

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
                alert('Nombre y Email son requeridos');
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

            await updateFamilyData(family.id, {
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
            const updatedFamily = await getFamilyData(family.id);
            if (updatedFamily) {
                setFamily(updatedFamily);
            }

            setEditingInfo(false);
            if (onUpdate) onUpdate();
            alert('Información actualizada exitosamente');
        } catch (error) {
            console.error('Error updating family info:', error);
            alert('Error al actualizar la información');
        }
    };

    // Start editing financial data
    const startEditing = () => {
        if (activeTab === 'global') {
            alert('Para mantener la consistencia de datos, por favor edita cada cabina individualmente.');
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

            await updateFamilyData(family.id, {
                cabinAccounts: newCabinAccounts,
                subtotalCadGlobal,
                gratuitiesCadGlobal,
                totalCadGlobal,
                paidCadGlobal,
                balanceCadGlobal
            });

            // Refresh local data
            const updatedFamily = await getFamilyData(family.id);
            if (updatedFamily) {
                setFamily(updatedFamily);
            }

            setEditing(false);
            if (onUpdate) onUpdate();

            // Success message
            alert('Datos de cabina actualizados exitosamente.');
        } catch (error) {
            console.error('Error updating family:', error);
            alert('Error al actualizar los datos');
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
        const confirmDelete = window.confirm('¿Eliminar este pago? Esta acción no se puede deshacer.');
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
            const paymentsData = await getFamilyPayments(family.id);
            setPayments(paymentsData);
            console.log('Payments reloaded:', paymentsData);

            // Trigger parent update to refresh family data
            if (onUpdate) onUpdate();

            alert('✅ Pago eliminado exitosamente');
        } catch (error) {
            console.error('❌ Error deleting payment:', {
                code: error.code,
                message: error.message,
                fullError: error
            });
            alert(`❌ Error al eliminar el pago: ${error.message}`);
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
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="card-title">{family.displayName}</h3>
                                <p className="card-subtitle">{family.familyCode}</p>
                            </div>
                            <button onClick={onClose} className="btn btn-sm btn-outline">
                                ✕ Cerrar
                            </button>
                        </div>
                    </div>

                    <div className="card-body">
                        {/* Tabs */}
                        <div className="flex gap-md mb-lg" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1px' }}>
                            <div className="flex gap-md mb-lg" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1px' }}>
                                <button
                                    className={`btn ${activeTab === 'global' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => { setActiveTab('global'); setEditing(false); setEditingInfo(false); }}
                                >
                                    🌐 Global
                                </button>
                                {family.cabinAccounts?.map((cabin, index) => (
                                    <button
                                        key={index}
                                        className={`btn ${activeTab === String(index) ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => { setActiveTab(String(index)); setEditing(false); }}
                                    >
                                        🛳️ {cabin.cabinNumber}
                                    </button>
                                ))}
                            </div>

                        </div>

                        {/* Basic Info (Editable) */}
                        {!editingInfo ? (
                            <div className="grid grid-2 mb-lg p-md bg-light rounded relative">
                                <button
                                    onClick={startEditingInfo}
                                    className="btn btn-xs btn-outline"
                                    style={{ position: 'absolute', top: '10px', right: '10px' }}
                                >
                                    ✏️ Editar Datos
                                </button>
                                <div>
                                    <p className="text-small text-muted">Nombre Familia</p>
                                    <p className="font-semibold">{family.displayName}</p>
                                    <p className="text-small text-muted mt-sm">Email</p>
                                    <p className="font-semibold">{family.email}</p>
                                </div>
                                <div>
                                    <p className="text-small text-muted">Cabinas y Reservas</p>
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
                                <h4 className="font-semibold mb-sm text-primary">Editar Información General</h4>
                                <div className="grid grid-2 gap-md mb-md">
                                    <div className="form-group">
                                        <label className="form-label">Nombre Familia</label>
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
                                        Números de Cabina
                                        <button onClick={addCabin} className="btn btn-xs btn-success">+ Agregar Cabina</button>
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
                                                        placeholder="No. Cabina (Ej: A101)"
                                                    />
                                                    <input
                                                        className="form-input"
                                                        value={infoData.cabinAccountsSnapshot[idx]?.bookingNumber || ''}
                                                        onChange={(e) => {
                                                            const newSnapshot = [...infoData.cabinAccountsSnapshot];
                                                            newSnapshot[idx] = { ...newSnapshot[idx], bookingNumber: e.target.value };
                                                            setInfoData(prev => ({ ...prev, cabinAccountsSnapshot: newSnapshot }));
                                                        }}
                                                        placeholder="No. Reserva / Booking #"
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
                                                        Depósito Pagado
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
                                            <p className="text-small text-muted italic">No hay cabinas asignadas.</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-sm justify-end">
                                    <button onClick={() => setEditingInfo(false)} className="btn btn-sm btn-outline">Cancelar</button>
                                    <button onClick={handleSaveInfo} className="btn btn-sm btn-primary">Guardar Info</button>
                                </div>
                            </div>
                        )}

                        {displayData && (
                            !editing ? (
                                <>
                                    <div className="mb-lg">
                                        <h4 className="font-semibold mb-md">
                                            Costos {activeTab === 'global' ? '(Consolidado)' : `(Cabina ${displayData.cabinNumber})`}
                                        </h4>
                                        <div className="flex justify-between mb-sm">
                                            <span>Subtotal:</span>
                                            <span>{formatCurrencyWithLabel(displayData.subtotalCad)}</span>
                                        </div>
                                        <div className="flex justify-between mb-sm">
                                            <span>Propinas:</span>
                                            <span>{formatCurrencyWithLabel(displayData.gratuitiesCad)}</span>
                                        </div>
                                        <div className="flex justify-between mb-sm font-bold">
                                            <span>Total:</span>
                                            <span>{formatCurrencyWithLabel(displayData.totalCad)}</span>
                                        </div>
                                        <div className="flex justify-between mb-sm" style={{ color: 'var(--color-success)' }}>
                                            <span>Pagado:</span>
                                            <span>{formatCurrencyWithLabel(displayData.paidCad)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold" style={{
                                            color: displayData.balanceCad > 0 ? 'var(--color-error)' : 'var(--color-success)'
                                        }}>
                                            <span>Saldo:</span>
                                            <span>{formatCurrencyWithLabel(displayData.balanceCad)}</span>
                                        </div>
                                    </div>

                                    {activeTab !== 'global' && (
                                        <button onClick={startEditing} className="btn btn-primary">
                                            Editar Montos Cabina {displayData.cabinNumber}
                                        </button>
                                    )}
                                    {activeTab === 'global' && (
                                        <p className="text-small text-muted text-center">
                                            Selecciona una cabina para editar montos.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h4 className="font-semibold mb-md text-primary">
                                        Editando Cabina {displayData.cabinNumber}
                                    </h4>
                                    <div className="form-group">
                                        <label className="form-label">Subtotal (CAD)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.subtotalCad}
                                            onChange={(e) => setFormData({ ...formData, subtotalCad: parseFloat(e.target.value) || 0 })}
                                            step="0.01"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Propinas (CAD)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.gratuitiesCad}
                                            onChange={(e) => setFormData({ ...formData, gratuitiesCad: parseFloat(e.target.value) || 0 })}
                                            step="0.01"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Pagado (CAD)</label>
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
                                            Fechas de Pago (Deadlines)
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
                                                + Agregar Fecha
                                            </button>
                                        </label>

                                        <div className="flex flex-col gap-sm">
                                            {(formData.paymentDeadlines || []).map((deadline, idx) => (
                                                <div key={idx} className="p-sm bg-bg rounded border border-light grid gap-sm">
                                                    <div className="grid grid-2 gap-sm">
                                                        <div>
                                                            <label className="text-xs text-muted">Concepto</label>
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
                                                            <label className="text-xs text-muted">Fecha Límite</label>
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
                                                            <label className="text-xs text-muted">Monto (CAD)</label>
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
                                                            <label className="text-xs text-muted">Estado</label>
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
                                                <p className="text-xs text-muted italic text-center">No hay fechas de pago configuradas.</p>
                                            )}
                                        </div>
                                        <div className="flex gap-sm justify-end mt-sm">
                                            <button
                                                onClick={() => {
                                                    // Helper to add default deadlines
                                                    setFormData({
                                                        ...formData,
                                                        paymentDeadlines: [
                                                            { label: 'Depósito Inicial', dueDate: '', amountCad: 0, status: 'upcoming' },
                                                            { label: 'Segundo Pago', dueDate: '', amountCad: 0, status: 'upcoming' },
                                                            { label: 'Pago Final', dueDate: '', amountCad: 0, status: 'upcoming' }
                                                        ]
                                                    });
                                                }}
                                                className="btn btn-xs btn-outline"
                                            >
                                                ↺ Cargar Defaults
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-md mt-lg">
                                        <button onClick={() => setEditing(false)} className="btn btn-outline">
                                            Cancelar
                                        </button>
                                        <button onClick={handleSave} className="btn btn-primary">
                                            Guardar Cambios
                                        </button>
                                    </div>
                                </>
                            )
                        )}

                        {/* Payment History Section */}
                        <div className="mt-xl pt-lg" style={{ borderTop: '2px solid var(--color-border)' }}>
                            <h4 className="font-semibold mb-md">💳 Historial de Pagos Aplicados</h4>
                            {loadingPayments ? (
                                <p className="text-muted text-center">Cargando pagos...</p>
                            ) : payments.length === 0 ? (
                                <p className="text-muted text-center">No hay pagos aplicados</p>
                            ) : (
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th>
                                                <th>Monto</th>
                                                <th>Método</th>
                                                <th>Referencia</th>
                                                <th>Cabina</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map((payment) => (
                                                <tr key={payment.id}>
                                                    <td className="text-small">
                                                        {formatTimestamp(payment.appliedAt)}
                                                    </td>
                                                    <td className="font-semibold">
                                                        {formatCurrencyWithLabel(payment.amountCad)}
                                                    </td>
                                                    <td className="text-small">
                                                        {payment.method || 'N/A'}
                                                    </td>
                                                    <td className="text-small">
                                                        {payment.reference || 'N/A'}
                                                    </td>
                                                    <td className="text-small">
                                                        {payment.targetCabinNumber || 'Global'}
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => handleDeletePayment(payment.id, payment.amountCad)}
                                                            className="btn btn-xs btn-danger"
                                                            title="Eliminar pago"
                                                            type="button"
                                                        >
                                                            🗑️ Eliminar
                                                        </button>
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
            </div>
        </div>
    );
};

export default FamilyDetail;
