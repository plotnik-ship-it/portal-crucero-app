import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createGroup } from '../../services/firestore';
import { useAuth } from '../../hooks/useAuth';
import { generateGroupCode } from '../../services/passwordService';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        shipName: '',
        departureDate: '',
        returnDate: '',
        departurePort: '',
        currency: 'CAD' // Cambio: de exchangeRate a currency
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedGroupCode, setGeneratedGroupCode] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name.trim()) {
            setError(t('admin.groupNameRequired'));
            return;
        }

        if (!user?.agencyId) {
            setError(t('admin.agencyNotFound'));
            console.error('User object:', user);
            return;
        }

        setLoading(true);

        try {
            // Auto-generate group code
            const newGroupCode = generateGroupCode();

            const groupData = {
                name: formData.name.trim(),
                groupCode: newGroupCode, // Auto-generated
                shipName: formData.shipName.trim() || null,
                departureDate: formData.departureDate || null,
                returnDate: formData.returnDate || null,
                departurePort: formData.departurePort.trim() || null,
                groupCurrency: formData.currency, // Nueva propiedad
                fxRateCadToMxn: 18.50, // Mantener para compatibilidad
                agencyId: user.agencyId,
                // Default itinerary structure
                itinerary: []
            };

            const groupId = await createGroup(groupData);
            console.log('✅ Group created:', groupId, 'with code:', newGroupCode);

            // Store generated code to show in success message
            setGeneratedGroupCode(newGroupCode);

            // Reset form
            setFormData({
                name: '',
                shipName: '',
                departureDate: '',
                returnDate: '',
                departurePort: '',
                currency: 'CAD'
            });

            // Notify parent
            if (onGroupCreated) {
                onGroupCreated(groupId);
            }

            // Show success message with generated code
            alert(`✅ Group created successfully!\n\nGroup Code: ${newGroupCode}\n\nShare this code with travelers for login.`);

            onClose();
        } catch (err) {
            console.error('Error creating group:', err);
            setError(err.message || t('admin.errorCreatingGroup'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '650px', padding: '2.5rem' }}>
                <div className="modal-header">
                    <h2 className="modal-title">{t('admin.createNewCruiseGroup')}</h2>
                    <button
                        className="modal-close"
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            fontSize: '2rem',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            background: 'var(--color-bg)',
                            color: 'var(--color-text)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'var(--color-error)';
                            e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'var(--color-bg)';
                            e.target.style.color = 'var(--color-text)';
                        }}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="name">
                            {t('admin.groupName')} <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={t('admin.groupNamePlaceholder')}
                            required
                            disabled={loading}
                            style={{ padding: '0.75rem' }}
                        />
                        <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.5rem' }}>
                            {t('admin.groupNameHelp')}
                        </small>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="shipName">{t('admin.shipName')}</label>
                        <input
                            type="text"
                            id="shipName"
                            name="shipName"
                            className="form-input"
                            value={formData.shipName}
                            onChange={handleChange}
                            placeholder={t('admin.shipNamePlaceholder')}
                            disabled={loading}
                            style={{ padding: '0.75rem' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label htmlFor="departureDate">{t('admin.sailDate')}</label>
                            <input
                                type="date"
                                id="departureDate"
                                name="departureDate"
                                className="form-input"
                                value={formData.departureDate}
                                onChange={handleChange}
                                disabled={loading}
                                style={{ padding: '0.75rem' }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="returnDate">{t('admin.returnDate')}</label>
                            <input
                                type="date"
                                id="returnDate"
                                name="returnDate"
                                className="form-input"
                                value={formData.returnDate}
                                onChange={handleChange}
                                disabled={loading}
                                style={{ padding: '0.75rem' }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="departurePort">{t('admin.departurePort')}</label>
                        <input
                            type="text"
                            id="departurePort"
                            name="departurePort"
                            className="form-input"
                            value={formData.departurePort}
                            onChange={handleChange}
                            placeholder={t('admin.departurePortPlaceholder')}
                            disabled={loading}
                            style={{ padding: '0.75rem' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="currency">{t('admin.groupCurrency')}</label>
                        <select
                            id="currency"
                            name="currency"
                            className="form-input"
                            value={formData.currency}
                            onChange={handleChange}
                            disabled={loading}
                            style={{ padding: '0.75rem' }}
                        >
                            <option value="CAD">🇨🇦 CAD - Canadian Dollar</option>
                            <option value="USD">🇺🇸 USD - US Dollar</option>
                            <option value="MXN">🇲🇽 MXN - Mexican Peso</option>
                            <option value="EUR">🇪🇺 EUR - Euro</option>
                        </select>
                        <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.5rem' }}>
                            {t('admin.currencyHelp')}
                        </small>
                    </div>

                    {error && (
                        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={onClose}
                            disabled={loading}
                            style={{ flex: 1, padding: '0.75rem 1.5rem' }}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ flex: 1, padding: '0.75rem 1.5rem' }}
                        >
                            {loading ? t('admin.creating') : t('admin.createGroup')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;
