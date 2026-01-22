import { useState, useEffect } from 'react';
import Card from '../shared/Card';
import { formatCurrencyWithLabel, convertCadToMxn } from '../../services/currencyService';
import { createPaymentRequest } from '../../services/firestore';
import { sendPaymentRequestNotification } from '../../services/emailService';
import {
    validateCardNumber,
    detectCardBrand,
    formatCardNumber,
    getCardLast4,
    validateExpiryDate,
    formatExpiryDate,
    validateCVV
} from '../../utils/cardValidation';

const PaymentRequestForm = ({ familyData, exchangeRate, onSuccess, defaultNote = '' }) => {
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Form state - Intención de pago (SIN DATOS SENSIBLES)
    const [amount, setAmount] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [notes, setNotes] = useState('');
    const [authorized, setAuthorized] = useState(false);

    // Multi-cabin distribution: [{ cabinIndex: 0, amount: 500 }, ...]
    const [cabinDistribution, setCabinDistribution] = useState([]);

    // Credit card fields
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCVV, setCardCVV] = useState('');
    const [cardBrand, setCardBrand] = useState('');

    // Update notes if defaultNote changes
    useEffect(() => {
        if (defaultNote && !notes && showForm) {
            setNotes(defaultNote);
        }
    }, [defaultNote, showForm]);

    // Validation errors
    const [errors, setErrors] = useState({});

    const amountMxn = amount ? convertCadToMxn(parseFloat(amount), exchangeRate) : 0;

    // Handle card number input with formatting and brand detection
    const handleCardNumberChange = (e) => {
        const value = e.target.value.replace(/\s/g, '');
        if (value.length <= 19 && /^\d*$/.test(value)) {
            setCardNumber(formatCardNumber(value));
            setCardBrand(detectCardBrand(value));
        }
    };

    // Handle expiry date input with formatting
    const handleExpiryChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 4) {
            setCardExpiry(formatExpiryDate(value));
        }
    };

    // Handle CVV input
    const handleCVVChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        const maxLength = cardBrand === 'American Express' ? 4 : 3;
        if (value.length <= maxLength) {
            setCardCVV(value);
        }
    };

    // Handle cabin selection (checkbox toggle)
    const handleCabinToggle = (cabinIndex) => {
        setCabinDistribution(prev => {
            const exists = prev.find(c => c.cabinIndex === cabinIndex);
            if (exists) {
                // Remove cabin
                return prev.filter(c => c.cabinIndex !== cabinIndex);
            } else {
                // Add cabin with 0 amount initially
                return [...prev, { cabinIndex, amount: 0 }];
            }
        });
    };

    // Handle amount change for a specific cabin
    const handleCabinAmountChange = (cabinIndex, value) => {
        const numValue = value === '' ? 0 : parseFloat(value);
        setCabinDistribution(prev =>
            prev.map(c =>
                c.cabinIndex === cabinIndex
                    ? { ...c, amount: numValue }
                    : c
            )
        );
    };

    // Calculate total amount distributed across cabins
    const totalDistributed = cabinDistribution.reduce((sum, c) => sum + (c.amount || 0), 0);

    const validateForm = () => {
        const newErrors = {};

        if (!amount || parseFloat(amount) <= 0) {
            newErrors.amount = 'Ingresa un monto válido';
        }

        // Optional: Check balance but allow paying more if they want? 
        // usually paying more than balance is weird, but maybe tip? 
        // Let's stick to balance limit for safety/logic.
        if (parseFloat(amount) > familyData.balanceCadGlobal && familyData.balanceCadGlobal > 0) {
            newErrors.amount = 'El monto sugerido no debería ser mayor al saldo global pendiente';
        }

        // Cardholder is required
        if (!cardholderName || cardholderName.trim().length < 3) {
            newErrors.cardholderName = 'Ingresa el nombre del titular de la tarjeta';
        }

        // Validate card number
        if (!cardNumber || !validateCardNumber(cardNumber)) {
            newErrors.cardNumber = 'Número de tarjeta inválido';
        }

        // Validate expiry date
        if (!cardExpiry || !validateExpiryDate(cardExpiry)) {
            newErrors.cardExpiry = 'Fecha de expiración inválida o vencida';
        }

        // Validate CVV
        if (!cardCVV || !validateCVV(cardCVV, cardBrand)) {
            const expectedLength = cardBrand === 'American Express' ? 4 : 3;
            newErrors.cardCVV = `CVV debe tener ${expectedLength} dígitos`;
        }

        if (!authorized) {
            newErrors.authorized = 'Debes autorizar el procesamiento de este cargo';
        }

        // Validate cabin distribution
        if (cabinDistribution.length === 0) {
            newErrors.cabins = 'Debes seleccionar al menos una cabina';
        } else {
            // Check that all selected cabins have amounts > 0
            const hasZeroAmount = cabinDistribution.some(c => !c.amount || c.amount <= 0);
            if (hasZeroAmount) {
                newErrors.cabins = 'Todas las cabinas seleccionadas deben tener un monto mayor a 0';
            }

            // Check that total distributed matches the payment amount
            const totalAmt = parseFloat(amount) || 0;
            if (Math.abs(totalDistributed - totalAmt) > 0.01) { // Allow 1 cent tolerance for rounding
                newErrors.cabins = `La suma de los montos ($${totalDistributed.toFixed(2)}) debe coincidir con el total ($${totalAmt.toFixed(2)})`;
            }

            // Check that no cabin amount exceeds its balance
            for (const dist of cabinDistribution) {
                const cabin = familyData.cabinAccounts[dist.cabinIndex];
                if (dist.amount > cabin.balanceCad) {
                    newErrors.cabins = `El monto para Cabina ${cabin.cabinNumber} ($${dist.amount.toFixed(2)}) excede su saldo ($${cabin.balanceCad.toFixed(2)})`;
                    break;
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Create payment request in Firestore (Intent only - NO SENSITIVE DATA)
            const requestData = {
                amountCad: parseFloat(amount),
                amountMxnApprox: amountMxn,
                fxRateUsed: exchangeRate,
                cardholderName: cardholderName.trim(),
                cardLast4: getCardLast4(cardNumber), // Only last 4 digits
                cardBrand: cardBrand,
                notes: notes.trim(),
                authorizationAccepted: true,
                // Multi-cabin distribution
                cabinDistribution: cabinDistribution.map(dist => ({
                    cabinIndex: dist.cabinIndex,
                    cabinNumber: familyData.cabinAccounts[dist.cabinIndex].cabinNumber,
                    amount: dist.amount
                })),
                // For backward compatibility and email display
                cabinNumbers: cabinDistribution.map(dist =>
                    familyData.cabinAccounts[dist.cabinIndex].cabinNumber
                )
            };

            await createPaymentRequest(familyData.id, requestData);

            // Send email notification to admin with FULL card data (only in email)
            await sendPaymentRequestNotification({
                familyName: familyData.displayName,
                familyCode: familyData.familyCode,
                cabinNumbers: familyData.cabinNumbers, // pass array
                email: familyData.email,
                ...requestData,
                // FULL card data - ONLY sent via email, NEVER stored in Firestore
                cardNumberFull: cardNumber.replace(/\s/g, ''),
                cardExpiry: cardExpiry,
                cardCVV: cardCVV
            });

            // Reset form
            setAmount('');
            setCardholderName('');
            setCardNumber('');
            setCardExpiry('');
            setCardCVV('');
            setCardBrand('');
            setNotes(defaultNote || '');
            setAuthorized(false);
            setCabinDistribution([]);
            setShowForm(false);
            setSuccess(true);

            // Call success callback
            if (onSuccess) {
                onSuccess();
            }

            // Hide success message after 5 seconds
            setTimeout(() => setSuccess(false), 5000);

        } catch (err) {
            console.error('Error creating payment request:', err);
            setError('Hubo un error al enviar la solicitud. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Card>
                <div className="alert alert-success">
                    <p className="font-semibold">✅ Solicitud Enviada</p>
                    <p>Envíanos tu información, aplicaremos el pago a la naviera y te confirmaremos en cuanto quede listo.</p>
                </div>
            </Card>
        );
    }

    if (!showForm) {
        return (
            <Card>
                <div className="card-body text-center">
                    <h3 className="card-title mb-md">¿Deseas realizar un adelanto?</h3>
                    <p className="text-muted mb-lg">
                        Solicita un cargo a tu cuenta. Te contactaremos para procesarlo de forma segura con la naviera.
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn btn-primary btn-lg"
                        disabled={familyData.balanceCadGlobal <= 0}
                    >
                        💳 Solicitar Adelanto
                    </button>

                    {familyData.balanceCadGlobal <= 0 && (
                        <p className="text-small text-muted mt-md">
                            ¡Felicidades! No tienes saldo pendiente.
                        </p>
                    )}
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="card-header">
                <h3 className="card-title">💳 Solicitud de Adelanto</h3>
                <p className="card-subtitle">
                    Completa el formulario para solicitar un cargo a cuenta
                </p>
            </div>

            <div className="card-body">
                {error && (
                    <div className="alert alert-error mb-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Cabin Selection with Amount Distribution */}
                    <div className="form-group">
                        <label className="form-label required">
                            Distribución de Pago por Cabina
                            {cabinDistribution.length > 0 && (
                                <span className="text-small text-muted ml-sm">
                                    (Total distribuido: ${totalDistributed.toFixed(2)} CAD)
                                </span>
                            )}
                        </label>
                        <div className="flex flex-col gap-sm">
                            {familyData.cabinAccounts?.map((cabin, index) => {
                                const isSelected = cabinDistribution.some(c => c.cabinIndex === index);
                                const cabinAmount = cabinDistribution.find(c => c.cabinIndex === index)?.amount || 0;

                                return (
                                    <div key={index} className="border rounded p-sm">
                                        <label className="flex items-center gap-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleCabinToggle(index)}
                                                className="form-checkbox"
                                            />
                                            <div className="flex-1">
                                                <div className="font-semibold">Cabina {cabin.cabinNumber}</div>
                                                <div className="text-small text-muted">
                                                    Saldo: {formatCurrencyWithLabel(cabin.balanceCad)}
                                                </div>
                                            </div>
                                        </label>

                                        {isSelected && (
                                            <div className="mt-sm ml-lg">
                                                <label className="text-small font-semibold mb-xs block">
                                                    Monto a aplicar (CAD):
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={cabinAmount || ''}
                                                    onChange={(e) => handleCabinAmountChange(index, e.target.value)}
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    min="0.01"
                                                    max={cabin.balanceCad}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {errors.cabins && <span className="form-error">{errors.cabins}</span>}
                    </div>

                    {/* Amount */}
                    <div className="form-group">
                        <label htmlFor="amount" className="form-label required">
                            Monto a Pagar (CAD)
                        </label>
                        <input
                            type="number"
                            id="amount"
                            className={`form-input ${errors.amount ? 'error' : ''}`}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0.01"
                            max={familyData.balanceCadGlobal}
                        />
                        {amount && !errors.amount && (
                            <span className="form-help">
                                Equivalente aproximado: <strong>{formatCurrencyWithLabel(amountMxn, 'MXN')}</strong>
                                <br />
                                <span className="text-xs text-muted">(Tasa: {exchangeRate.toFixed(4)})</span>
                            </span>
                        )}
                        {errors.amount && <span className="form-error">{errors.amount}</span>}
                    </div>

                    {/* Cardholder Name */}
                    <div className="form-group">
                        <label htmlFor="cardholderName" className="form-label required">
                            Nombre del Titular de la Tarjeta
                        </label>
                        <input
                            type="text"
                            id="cardholderName"
                            className={`form-input ${errors.cardholderName ? 'error' : ''}`}
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                            placeholder="Ej: JUAN PEREZ"
                        />
                        {errors.cardholderName && <span className="form-error">{errors.cardholderName}</span>}
                    </div>

                    {/* Card Number */}
                    <div className="form-group">
                        <label htmlFor="cardNumber" className="form-label required">
                            Número de Tarjeta
                            {cardBrand && <span className="text-small text-muted ml-sm">({cardBrand})</span>}
                        </label>
                        <input
                            type="text"
                            id="cardNumber"
                            className={`form-input ${errors.cardNumber ? 'error' : ''}`}
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="1234 5678 9012 3456"
                            maxLength="23"
                        />
                        {errors.cardNumber && <span className="form-error">{errors.cardNumber}</span>}
                    </div>

                    {/* Expiry and CVV - Side by side */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* Expiry Date */}
                        <div className="form-group">
                            <label htmlFor="cardExpiry" className="form-label required">
                                Fecha de Expiración
                            </label>
                            <input
                                type="text"
                                id="cardExpiry"
                                className={`form-input ${errors.cardExpiry ? 'error' : ''}`}
                                value={cardExpiry}
                                onChange={handleExpiryChange}
                                placeholder="MM/YY"
                                maxLength="5"
                            />
                            {errors.cardExpiry && <span className="form-error">{errors.cardExpiry}</span>}
                        </div>

                        {/* CVV */}
                        <div className="form-group">
                            <label htmlFor="cardCVV" className="form-label required">
                                CVV
                            </label>
                            <input
                                type="text"
                                id="cardCVV"
                                className={`form-input ${errors.cardCVV ? 'error' : ''}`}
                                value={cardCVV}
                                onChange={handleCVVChange}
                                placeholder={cardBrand === 'American Express' ? '1234' : '123'}
                                maxLength={cardBrand === 'American Express' ? '4' : '3'}
                            />
                            {errors.cardCVV && <span className="form-error">{errors.cardCVV}</span>}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="form-group">
                        <label htmlFor="notes" className="form-label">
                            Notas Adicionales
                        </label>
                        <textarea
                            id="notes"
                            className="form-input"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Pago de cabina A101, o instrucciones especiales..."
                            rows="3"
                        />
                    </div>

                    {/* Authorization Checkbox */}
                    <div className="form-group">
                        <div className="form-checkbox">
                            <input
                                type="checkbox"
                                id="authorized"
                                checked={authorized}
                                onChange={(e) => setAuthorized(e.target.checked)}
                            />
                            <label htmlFor="authorized" className="font-semibold">
                                Autorizo a Travel Point a procesar este cargo con la naviera.
                            </label>
                        </div>
                        {errors.authorized && <span className="form-error">{errors.authorized}</span>}
                    </div>

                    {/* Security Notice */}
                    <div className="alert alert-info mb-lg">
                        <p className="text-small">
                            🔒 <strong>Seguridad:</strong> Tu información de tarjeta se enviará de forma segura por email a nuestro equipo.
                            Solo almacenamos los últimos 4 dígitos en nuestra base de datos. El número completo y CVV nunca se guardan.
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-md">
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setNotes(defaultNote || '');
                                setErrors({});
                                setError('');
                            }}
                            className="btn btn-outline"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            {loading ? 'Enviando...' : 'Enviar Solicitud'}
                        </button>
                    </div>
                </form>
            </div>
        </Card>
    );
};

export default PaymentRequestForm;
